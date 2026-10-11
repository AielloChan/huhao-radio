# 呼号之前 · 无线电 A 类题库

[在线使用](https://aiellochan.github.io/huhao-radio-a/) · [部署记录](https://github.com/AielloChan/huhao-radio-a/deployments)

面向手机的离线题库 PWA。原生 JavaScript + CSS，无后端、无账号、无运行时第三方依赖。部署于 GitHub Pages，也兼容 Netlify。

## 功能

- 683 道题，按章节、顺序、随机刷题；单选、多选分别作答，每轮打乱选项。
- 每题即时保存，刷新或重新打开后可以继续；错题自动收录，手动移出。
- 模拟考试：32 道单选 + 8 道多选，40 分钟，答对 30 题合格。多选须完全一致。
- 考试提交前不揭晓答案，可通过答题卡跳转、修改；后台按绝对截止时间计时，超时自动交卷。
- 最近 30 次考试成绩及逐题回顾；答题记录、学习天数、正确率。
- 本地记录 JSON 导出和导入；损坏记录不自动覆盖。
- Service Worker 缓存完整题库、代码、图标和附图，断网可刷新、答题和考试。
- 检测新版本、用户确认后更新；进行中的考试不触发刷新，更新保留本地记录。
- iPhone 主屏幕图标、独立窗口模式、安全区域与底部导航。

## 本地运行

需要 Node.js 22 或更新版本。

```sh
npm ci
npm run build
npm start
```

打开终端显示的本地地址，默认 `http://localhost:4173`。Service Worker 需要 HTTPS 或 localhost，直接双击 `index.html` 无法使用。构建无需第三方运行时依赖；Playwright 仅用于测试。

## GitHub Pages 部署与更新

本仓库使用 GitHub Pages 自带的分支发布功能，发布目录是 `main` 分支下的 `/docs`。`docs/` 是已构建的静态站点；推送该目录的更新后 GitHub 自动发布，不需要自定义 Actions 工作流或访问令牌。

仓库的 Settings → Pages → Build and deployment → Source 应设为 **Deploy from a branch**，选择 `main` 和 `/docs`。Fork 到其他账号后也需启用该设置，并修改本 README 中的站点链接。

应用资源、安装清单与 Service Worker 都使用相对路径，支持 `/<仓库名>/` 项目路径。GitHub Pages 提供 HTTPS，满足 Service Worker 的安全上下文要求；缓存作用域限定在应用目录内。GitHub Pages 不使用 Netlify 的 `_headers` 文件，应用通过内容版本目录和 `updateViaCache: 'none'` 检查 Service Worker 更新。

修改应用或题库后执行：

```sh
npm test
npm run build:pages
git add src scripts public data package.json package-lock.json docs README.md
git commit -m "feat: 更新题库应用"
git push origin main
```

`npm run build:pages` 会重新生成 `dist/` 和 `docs/`，不要直接编辑 `docs/`。必须把更新的 `docs/` 一起提交，仅推送 `src/` 不会重新构建网站。构建与逻辑测试仅依赖 Node.js 内置模块。

待 GitHub Pages 发布成功，用户重新打开应用或点击「我的 → 检查更新」，会在新版本缓存完整后看到更新提示。考试过程中延后激活更新，学习记录保留。若换域名或仓库地址，请先导出备份再迁移。

## 可选：Netlify 部署

### 直接拖拽

1. 在本地运行 `npm run build`。
2. 把 `dist/` 文件夹（包含 `index.html`、`sw.js`、`assets/`）拖入 Netlify 手动部署页面。
3. 打开生成的 HTTPS 地址，等待右上角出现「离线已就绪」。

如果自行构建，直接部署整个 `dist/` 目录。不要把整个源码目录当成静态产物上传。

### 连接 Git 仓库

将本目录作为项目根目录上传至自己的仓库。已包含 `netlify.toml`：

- Build command：`npm run build`
- Publish directory：`dist`
- Node.js：22
- 无需环境变量和后端服务

如果本项目放在仓库子目录，需要将 Netlify 的 Base directory 设置为该目录。

## 安装到 iPhone

使用 Safari 打开部署后的 HTTPS 地址，等待「离线已就绪」，然后选择「分享 → 添加到主屏幕 → 添加」。首次从主屏幕启动时保持联网，确认离线缓存准备完成后再测试飞行模式。

学习记录绑定当前网站地址和浏览器存储。Safari 与主屏幕应用的存储可能独立；换设备、换域名或清除网站数据前，先在「我的」中导出，再在新环境导入。iOS 可能回收网站存储，建议定期备份。关闭应用后系统不会允许后台脚本一直运行，因此超时的考试会在应用下次获得运行机会时按原截止时间自动交卷。

## 更新应用和题库

GitHub Pages 使用上述自动发布流程；如选择 Netlify 手动部署，则修改源码后运行 `npm run build`，将整个新 `dist/` 部署到同一个站点。构建按内容生成版本号和资源目录，Service Worker 成功缓存全部文件后才会提示更新。用户点击「更新」后激活新缓存，浏览器的本地学习记录不受影响。也可在「我的 → 检查更新」手动触发。

原始文本在 `data/source.md`，运行 `npm run import` 可重新生成题库和导入报告。也可以运行 `node scripts/import-questions.mjs /path/to/new-source.md` 导入新文件。解析器对已知 PDF 文本错位使用逐题校正；遇到新的不完整字段会拒绝猜测，需要人工核对。图片在 `public/question-images/`，新图片必须与题目字段一起加入。更新时保留稳定题号，已有练习记录会继续对应；删除题目的旧会话会被丢弃，其他记录保留。

## 题库与来源

以用户提供的 Markdown 为基础。与用户提供的官方 PDF、CRAC 官方 A 类 PDF 逐题核对，恢复了 43 题的文本抽取错位；答案未猜测或改写。具体 before/after、输入摘要及来源记录在 `data/import-report.json`。

- [官方 2025 年版题库发布页](https://www.crac.org.cn/?p=1287)
- [官方考核标准](https://www.crac.org.cn/userfiles/file/20250728/20250728133610_2877.pdf)
- [官方配套附图](https://www.crac.org.cn/userfiles/file/20250728/20250728134354_1198.pdf)

题库 PDF 中的 MC1-0665 仅含图片编号，因此从官方附图 PDF 提取了 LK0944 原图。图中的 A/B/C 是图示方案标记，选项内容仍按原文保留。应用只展示原题库答案，不生成未经核实的解题分析。模拟考试按单选和多选数量随机组卷，不宣称复现官方的章节配比。

## 验证

```sh
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

测试包含题库导入、精确判分、错题与恢复、超时交卷、防重复记录、备份、移动端离线刷新、附图缓存和新版本激活。浏览器用例采用 iPhone 尺寸的 Chromium 环境；iPhone Safari 主屏幕安装仍需要在实际部署后由真机确认。

## 目录

- `src/`：应用控制、界面、答题逻辑、本地存储、PWA 更新
- `data/`：原题库、结构化数据、核对报告（原文和报告不发布到网站）
- `public/`：安装清单、图标、附图、Netlify 缓存响应头
- `scripts/`：导入、构建、本地预览
- `tests/`：逻辑与浏览器验证
- `dist/`：可部署静态产物（构建生成）
- `docs/`：GitHub Pages 发布目录，由 `npm run build:pages` 生成并纳入版本管理

网站不会上传学习记录，也没有统计跟踪或远程字体请求。
