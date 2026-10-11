import {readFile, writeFile, mkdir, readdir, cp, rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {CLASS_IDS, classConfig} from '../src/catalog.js';

const root = fileURLToPath(new URL('../', import.meta.url));
async function listFiles(directory, prefix = '') {
  const entries = await readdir(directory, {withFileTypes:true});
  const result = [];
  for (const entry of entries.sort((a,b)=>a.name.localeCompare(b.name))) {
    const relative = `${prefix}${entry.name}`;
    if (entry.isDirectory()) result.push(...await listFiles(path.join(directory,entry.name),`${relative}/`));
    else result.push(relative);
  }
  return result;
}
const src = path.join(root, 'src');
const files = (await readdir(src)).sort();
const banks = await Promise.all(CLASS_IDS.map(async classId => {
  const source = classId === 'A' ? 'data/questions.json' : `data/${classId.toLowerCase()}/questions.json`;
  const text = await readFile(path.join(root, source), 'utf8');
  const bank = JSON.parse(text);
  if (!bank.questions?.length) throw new Error(`${classId} 类题库为空，请先导入`);
  return {classId, text, count:bank.questions.length, file:classConfig(classId).file};
}));
const {version: release} = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
if (!/^\d+\.\d+\.\d+$/.test(release)) throw new Error('应用版本号须为 主版本.次版本.补丁版本');
const hash = createHash('sha256').update(release);
for (const bank of banks) hash.update(bank.classId).update(bank.text);
hash.update(await readFile(fileURLToPath(import.meta.url)));
for (const file of files) hash.update(await readFile(path.join(src, file)));
hash.update(await readFile(path.join(root, 'index.html')));
const publicFiles = await listFiles(path.join(root,'public'));
for (const file of publicFiles) hash.update(file).update(await readFile(path.join(root, 'public', file)));
const version = hash.digest('hex').slice(0, 12);
const dist = path.join(root, 'dist');
await rm(dist, {recursive: true, force: true});
const assets = `assets/${version}`;
await mkdir(path.join(dist, assets), {recursive: true});
await cp(path.join(root, 'public'), dist, {recursive: true});
await cp(src, path.join(dist, assets), {recursive: true});
await cp(path.join(root, 'public/icons/apple-touch-icon.png'), path.join(dist, assets, 'apple-touch-icon.png'));
for (const bank of banks) await writeFile(path.join(dist, assets, bank.file), bank.text);
await writeFile(path.join(dist, assets, 'version.json'), JSON.stringify({version, release}));
const html = (await readFile(path.join(root, 'index.html'), 'utf8')).replaceAll('__ASSETS__', `./${assets}`);
await writeFile(path.join(dist, 'index.html'), html);
const cached = ['./', './index.html', ...publicFiles.filter(f=>!f.startsWith('_') && !f.startsWith('force-update/')).map(f=>`./${f}`), ...files.map(f => `./${assets}/${f}`), ...banks.map(bank=>`./${assets}/${bank.file}`), `./${assets}/version.json`, `./${assets}/apple-touch-icon.png`];
await writeFile(path.join(dist, 'sw.js'), `// Generated from the complete application content.\nconst CACHE = 'radio-a-${version}';\nconst ASSETS = ${JSON.stringify(cached)};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener('message', event => {
  if (event.data?.type === 'ACTIVATE_UPDATE') self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    // Retain the previous release for tabs that have not yet reloaded.
    const keys = (await caches.keys()).filter(key => key.startsWith('radio-a-') && key !== CACHE);
    await Promise.all(keys.slice(0, -1).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const scope = new URL(self.registration.scope);
  if (event.request.method !== 'GET' || url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  // Keep recovery independent of application caches and navigation fallback.
  if (url.pathname === scope.pathname + 'force-update' || url.pathname.startsWith(scope.pathname + 'force-update/')) {
    event.respondWith(fetch(event.request, {cache: 'no-store'}));
    return;
  }
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const isAppEntry = url.pathname === scope.pathname || url.pathname === scope.pathname + 'index.html';
    if (event.request.mode === 'navigate' && isAppEntry) return (await cache.match('./index.html')) || fetch(event.request);
    return (await cache.match(event.request)) || (await caches.match(event.request)) || fetch(event.request);
  })());
});\n`);
console.log(`Built ${banks.map(bank=>`${bank.classId}: ${bank.count}`).join(', ')} questions → dist (${version})`);
