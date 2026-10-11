import {readFile, writeFile, mkdir} from 'node:fs/promises';

const output = new URL('../recovery-dist/', import.meta.url);
const source = await readFile(new URL('../public/force-update/index.html', import.meta.url), 'utf8');
await mkdir(output, {recursive:true});
await writeFile(new URL('index.html', output), source.replace('name="recovery-home" content="../"', 'name="recovery-home" content="/huhao-radio/"'));
await writeFile(new URL('.nojekyll', output), '');
await writeFile(new URL('README.md', output), `# 呼号之前 · 应急恢复入口

[打开恢复页](https://aiellochan.github.io/huhao-radio-recovery/)

此站点与题库同域，位于主应用和旧版应用的 Service Worker 作用域之外，不注册 Service Worker。即使主应用 Worker 拦截所有导航，该地址仍能从网络打开。

页面自动注销 /huhao-radio/ 和 /huhao-radio-a/ 的 Worker，清理 radio-a- / huhao-radio- 应用缓存，保留学习记录，3 秒后返回题库首页。使用前请关闭其他题库页面，保持联网，并在出现故障的浏览器存储环境中打开。Safari 与主屏幕 App 的存储可能独立。

唯一源文件位于 [主仓库](https://github.com/AielloChan/huhao-radio) 的 public/force-update/index.html。修改后在主仓库运行 npm run build:recovery，将 recovery-dist/ 的全部文件（包括 .nojekyll）复制到本仓库、提交并推送。

GitHub Pages 使用 main 分支根目录发布；请勿在此站点注册 Worker，也不要直接编辑生成的 index.html。
`);
console.log('Standalone recovery site generated in recovery-dist/');
