# 呼号之前 · 无线电 A / B / C 类题库

[在线使用](https://aiellochan.github.io/huhao-radio/) · [部署记录](https://github.com/AielloChan/huhao-radio/deployments)

面向手机的离线题库 PWA。原生 JavaScript + CSS，无后端、无账号、无运行时第三方依赖。部署于 GitHub Pages，也兼容 Netlify。

## 功能

- A 类 683 题、B 类 1,143 题、C 类 1,282 题，顶部一键切换，记住上次选择；按章节、顺序、随机刷题，每轮打乱选项。
- 各类刷题进度、错题本和考试记录分别保存，题号重叠也不会串记录；每题即时保存，错题可手动移出。
- 模拟考试按所选类别组卷、计时与判分（见下表）。多选须完全一致；考试进行中须先交卷再切换类别。
- 考试提交前不揭晓答案，可通过答题卡跳转、修改；后台按绝对截止时间计时，超时自动交卷。
- 每类最近 30 次考试成绩及逐题回顾；答题记录、学习天数、正确率。
- 当前类别记录 JSON 导出、导入与清空；拒绝跨类别导入，损坏记录不自动覆盖。旧 A 类记录和备份兼容保留。
- Service Worker 预缓存三类完整题库、代码、图标和 53 张官方附图，首次联网完成缓存后，未打开过的类别也可离线切换、答题和考试。
- 检测新版本、用户确认后更新；进行中的考试不触发刷新，更新保留本地记录。
- iPhone 主屏幕图标、独立窗口模式、安全区域与底部导航。

模拟考试规则依据 [CRAC 2025 考核标准](https://www.crac.org.cn/userfiles/file/20250728/20250728133610_2877.pdf)：

| 类别 | 题数 | 单选 / 多选 | 时间 | 合格线 |
| --- | --- | --- | --- | --- |
| A | 40 | 32 / 8 | 40 分钟 | 答对 30 题 |
| B | 60 | 45 / 15 | 60 分钟 | 答对 45 题 |
| C | 90 | 70 / 20 | 90 分钟 | 答对 70 题 |

A 类继续使用原存储键 `radio-a:progress:v1`；B、C 类使用独立存储键。备份带有类别标记，无类别标记的旧版备份按 A 类处理。更新和强制清缓存均保留这些学习记录。

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

### 强制更新入口

应用无法正常更新时，联网打开 [force-update 恢复页](https://aiellochan.github.io/huhao-radio/force-update/)。页面会自动注销本应用的 Service Worker（包括仓库改名前的作用域），删除全部 `radio-a-` / `huhao-radio-` 应用缓存，成功后倒计时 3 秒返回带时间戳的首页，重新下载当前版本。清理失败会显示原因和重试按钮，不会自动跳转。

恢复页的脚本和样式全部内置，不依赖应用代码；不加入预缓存，Service Worker 对 `/force-update` 和 `/force-update/` 下的请求只使用 `fetch(..., {cache: 'no-store'})`，不读取或写入 Cache Storage。Netlify 另外设置 `Cache-Control: no-store`；GitHub Pages 不支持自定义此响应头。网页脚本无法清空浏览器全部 HTTP 缓存，返回首页时通过时间戳绕过旧首页缓存。

该入口保留 localStorage 中的刷题、错题和考试记录，也不会清理同域其他应用的缓存或 Service Worker。使用前请关闭其他题库标签页，避免仍运行的旧页面重新写入缓存。Safari 和主屏幕 App 的存储可能独立，需在发生故障的环境中打开恢复入口。

**独立备用入口：** 若上面的地址也被旧 Worker 拦住，直接打开 [独立恢复页](https://aiellochan.github.io/huhao-radio-recovery/)。它在同域的独立目录发布，位于 `/huhao-radio/` 与旧 `/huhao-radio-a/` 作用域之外，不注册 Worker，因此不依赖主应用 Worker 配合。该方式只恢复当前浏览器存储环境，不能跨 Safari 与独立 PWA 的存储隔离。

独立站点由 [huhao-radio-recovery 仓库](https://github.com/AielloChan/huhao-radio-recovery) 发布。唯一源文件仍是本仓库的 `public/force-update/index.html`；修改后运行 `npm run build:recovery`，将 `recovery-dist/` 全部文件（包括 `.nojekyll`）同步到独立仓库根目录并提交发布。此入口不注册 Worker，勿将它纳入主应用 Worker 的作用域。GitHub Pages 的 HTTP 缓存仍受平台控制，必要时在恢复地址加 `?t=任意新值`。

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

A 类原始文本在 `data/source.md`，运行 `npm run import` 可重新生成题库和导入报告。也可以运行 `node scripts/import-questions.mjs /path/to/new-source.md` 导入新文件。解析器对已知 PDF 文本错位使用逐题校正；遇到新的不完整字段会拒绝猜测，需要人工核对。图片在 `public/question-images/`，新图片必须与题目字段一起加入。更新时保留稳定题号，已有练习记录会继续对应；删除题目的旧会话会被丢弃，其他记录保留。

B、C 类原始抽取文本、结构化题库和导入报告分别位于 `data/b/`、`data/c/`。重建需要 Python、Poppler 的 `pdftotext` 和 `pypdf`（附图提取还需 Pillow），使用未修改的官方 PDF：

```sh
python3 scripts/import-pdf-banks.py \
  --b-pdf /path/to/B.pdf \
  --c-pdf /path/to/C.pdf \
  --image-pdf /path/to/总题库附图标记.pdf
npm run build:pages
```

导入器校验这版 PDF 的 SHA256，源文件变更会中止；更新官方版本时应先重新核对字段与附图映射，再更新摘要和题数断言。

## 题库与来源

A 类以用户提供的 Markdown 为基础。与用户提供的官方 PDF、CRAC 官方 A 类 PDF 逐题核对，恢复了 43 题的文本抽取错位；答案未猜测或改写。具体 before/after、输入摘要及来源记录在 `data/import-report.json`。

- [官方 2025 年版题库发布页](https://www.crac.org.cn/?p=1287)
- [官方考核标准](https://www.crac.org.cn/userfiles/file/20250728/20250728133610_2877.pdf)
- [官方 B 类 PDF](https://www.crac.org.cn/userfiles/file/20250809/20250809124234_5845.pdf)
- [官方 C 类 PDF](https://www.crac.org.cn/userfiles/file/20250809/20250809124246_6142.pdf)
- [官方配套附图](https://www.crac.org.cn/userfiles/file/20250728/20250728134354_1198.pdf)

B、C 类用户 PDF 与官网下载文件逐字节一致。已用两个独立抽取引擎逐字段比对题号、章节、题干、选项和答案（忽略排版空白），无字段差异。C 类逐页移除了 309 个页码。附图从官方 3 页附录的内嵌原图提取，共 53 张，A 类原 LK0944 图保留；跨页图号和一处缺字标签的对应关系记录在导入报告中。图内标记保留原样，不随答题选项重新排列。应用只展示原题库答案，不生成未经核实的解题分析。模拟考试按单选和多选数量随机组卷，不宣称复现官方的章节配比。

## 验证

```sh
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

测试包含三类题库导入、各类别组卷与精确判分、旧 A 类数据兼容、切换隔离、跨类别备份拒绝、错题与恢复、超时交卷、防重复记录、移动端离线切换、附图缓存和新版本激活。浏览器用例采用 iPhone 尺寸的 Chromium 环境；iPhone Safari 主屏幕安装仍需要在实际部署后由真机确认。

## 目录

- `src/`：类别与考试规则配置、应用控制、界面、答题逻辑、本地存储、PWA 更新
- `data/`：原题库、结构化数据、核对报告（原文和报告不发布到网站）
- `public/`：安装清单、图标、附图、Netlify 缓存响应头
- `scripts/`：导入、构建、本地预览
- `tests/`：逻辑与浏览器验证
- `dist/`：可部署静态产物（构建生成）
- `docs/`：GitHub Pages 发布目录，由 `npm run build:pages` 生成并纳入版本管理

网站不会上传学习记录，也没有统计跟踪或远程字体请求。
