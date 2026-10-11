import {test, expect} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';

let server;
let origin;
const brokenWorker=`
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>event.respondWith(new Response('旧 Worker 错误拦截所有请求',{headers:{'Content-Type':'text/html; charset=utf-8'}})));
`;

test.beforeAll(async()=>{
  execFileSync(process.execPath,['scripts/build-recovery.mjs']);
  server=createServer(async(req,res)=>{
    const url=new URL(req.url,'http://localhost');
    if(url.pathname.endsWith('/broken-sw.js')){
      res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'});
      return res.end(brokenWorker);
    }
    try {
      const file=url.pathname==='/huhao-radio-recovery/'
        ? new URL('../../recovery-dist/index.html',import.meta.url)
        : new URL('../../dist/'+url.pathname.slice('/huhao-radio/'.length)+(url.pathname.endsWith('/')?'index.html':''),import.meta.url);
      const type=file.pathname.endsWith('.js')?'text/javascript':file.pathname.endsWith('.css')?'text/css':file.pathname.endsWith('.json')?'application/json':file.pathname.endsWith('.png')?'image/png':'text/html';
      res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});
      res.end(await readFile(file));
    } catch {res.writeHead(404);res.end('Not found');}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  origin=`http://127.0.0.1:${server.address().port}`;
});

test.afterAll(async()=>{await new Promise(resolve=>server.close(resolve));});

test('独立入口绕过拦截全部请求的旧 Worker，保留同域其他应用',async({page})=>{
  await page.goto(origin+'/huhao-radio/');
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await page.evaluate(async()=>{
    localStorage.setItem('recovery-record-proof','保留学习记录');
    await caches.open('radio-a-stale');
    await caches.open('other-app-cache');
    await navigator.serviceWorker.register('/other-app/broken-sw.js');
    await navigator.serviceWorker.register('/huhao-radio-a/broken-sw.js');
    await navigator.serviceWorker.register('/huhao-radio/broken-sw.js');
  });
  await expect.poll(()=>page.evaluate(()=>navigator.serviceWorker.controller?.scriptURL)).toContain('/huhao-radio/broken-sw.js');
  await page.goto(origin+'/huhao-radio/force-update/');
  await expect(page.getByText('旧 Worker 错误拦截所有请求')).toBeVisible();
  const recovery=await page.goto(origin+'/huhao-radio-recovery/');
  expect(recovery.fromServiceWorker()).toBe(false);
  await expect(page.getByRole('heading',{name:'清理完成'})).toBeVisible();
  expect(await page.evaluate(()=>navigator.serviceWorker.controller)).toBeNull();
  expect(await page.evaluate(()=>caches.keys())).toEqual(['other-app-cache']);
  expect(await page.evaluate(()=>navigator.serviceWorker.getRegistrations().then(items=>items.map(item=>new URL(item.scope).pathname)))).toEqual(['/other-app/']);
  expect(await page.evaluate(()=>localStorage.getItem('recovery-record-proof'))).toBe('保留学习记录');
  const home=await page.waitForResponse(response=>new URL(response.url()).searchParams.has('force-update') && response.request().isNavigationRequest());
  expect(home.fromServiceWorker()).toBe(false);
  await expect(page.getByRole('heading',{name:'业余无线电考试在线题库'})).toBeVisible();
});
