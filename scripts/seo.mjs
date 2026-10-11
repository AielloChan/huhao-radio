import {CLASS_IDS, classConfig} from '../src/catalog.js';
import {CHAPTERS} from '../src/core.js';
import {escape as e} from '../src/ui.js';
import {discoveryLinks, QUESTION_SOURCE, EXAM_SOURCE} from '../src/discovery.js';

export const siteUrl = new URL(process.env.SITE_URL || 'https://aiellochan.github.io/huhao-radio/');
if (!['https:', 'http:'].includes(siteUrl.protocol) || siteUrl.search || siteUrl.hash || !siteUrl.pathname.endsWith('/')) {
  throw new Error('SITE_URL 必须是以 / 结尾、无查询参数和片段的 HTTP(S) 站点地址');
}
export const homeTitle = '业余无线电考试题库｜A/B/C 类在线刷题与模拟考试 - 呼号之前';
const homeDescription = '呼号之前：免费业余无线电 A、B、C 类考试题库，采用 CRAC 2025 年版题库，支持在线刷题、错题本、计时模拟考试与手机 PWA 离线练习，无需注册，进度本地保存。';
const jsonLd = value => JSON.stringify(value).replace(/</g, '\\u003c');

export function metadata(title = homeTitle, description = homeDescription, route = '') {
  const url = new URL(route, siteUrl).href;
  const image = new URL('icons/icon-512.png', siteUrl).href;
  const data = route ? {
    '@context':'https://schema.org', '@type':'WebPage', name:title, description, url, inLanguage:'zh-CN',
    isPartOf:{'@type':'WebSite',name:'呼号之前',url:siteUrl.href},
    breadcrumb:{'@type':'BreadcrumbList',itemListElement:[
      {'@type':'ListItem',position:1,name:'业余无线电考试题库',item:siteUrl.href},
      {'@type':'ListItem',position:2,name:`${route[0].toUpperCase()} 类题库`,item:url}
    ]}
  } : {
    '@context':'https://schema.org', '@type':'WebApplication', name:'呼号之前', description, url,
    applicationCategory:'EducationalApplication', operatingSystem:'Any', inLanguage:'zh-CN',
    isAccessibleForFree:true, author:{'@type':'Person',name:'Aiello Chan',url:'https://github.com/AielloChan'},
    offers:{'@type':'Offer',price:'0',priceCurrency:'CNY'}
  };
  return `<title>${e(title)}</title>
  <meta name="description" content="${e(description)}">
  <link rel="canonical" href="${e(url)}">
  <link rel="sitemap" type="application/xml" href="${e(new URL('sitemap.xml', siteUrl).href)}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="zh_CN">
  <meta property="og:site_name" content="呼号之前">
  <meta property="og:title" content="${e(title)}">
  <meta property="og:description" content="${e(description)}">
  <meta property="og:url" content="${e(url)}">
  <meta property="og:image" content="${e(image)}">
  <meta property="og:image:alt" content="呼号之前绿色收音机图标">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${e(title)}">
  <meta name="twitter:description" content="${e(description)}">
  <meta name="twitter:image" content="${e(image)}">
  <script type="application/ld+json">${jsonLd(data)}</script>`;
}

export function homeFallback() {
  return `<main class="guide-page"><h1>业余无线电考试在线题库</h1>${discoveryLinks()}<p role="status">正在加载刷题应用…</p></main>`;
}

export function classPage(bank, assets, release) {
  const id = bank.classId;
  const questions = JSON.parse(bank.text).questions;
  const exam = classConfig(id).exam;
  const singles = questions.filter(q=>q.answers.length === 1).length;
  const title = `业余无线电 ${id} 类考试题库｜${questions.length} 题与模拟考试 - 呼号之前`;
  const description = `业余无线电 ${id} 类在线题库共 ${questions.length} 题，采用 CRAC 2025 年版题库。模拟考试 ${exam.total} 题、${exam.minutes} 分钟，答对 ${exam.pass} 题合格；支持错题复习、章节练习和手机离线刷题。`;
  const chapters = Object.entries(CHAPTERS).map(([key, name]) => ({name,questions:questions.filter(q=>q.chapter.startsWith(`${key}.`))})).filter(chapter=>chapter.questions.length);
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#f5f4ef">
  ${metadata(title, description, `${id.toLowerCase()}/`)}
  <link rel="icon" type="image/png" href="../icons/icon-192.png">
  <link rel="stylesheet" href="../${assets}/styles.css">
</head><body><main class="guide-page">
  <nav aria-label="面包屑"><a href="../">呼号之前 · 首页</a> / ${id} 类题库</nav>
  <h1>业余无线电 ${id} 类考试题库</h1>
  <p>${e(description)}</p>
  <div class="guide-actions"><a class="primary" href="../?class=${id}#study">进入 ${id} 类刷题</a><a class="secondary" href="../?class=${id}#exam">进入 ${id} 类模拟考试</a></div>
  <section><h2>${id} 类题库包含什么？</h2><p>本类共 ${questions.length} 道原始题目，其中单选题 ${singles} 道、多选题 ${questions.length - singles} 道。按以下章节整理，可在应用中按章节练习，也可顺序或随机刷题。</p>
  <ul>${chapters.map(chapter=>`<li>${e(chapter.name)}：${chapter.questions.length} 题</li>`).join('')}</ul></section>
  <section><h2>${id} 类模拟考试规则</h2><p>每套 ${exam.total} 题，包括 ${exam.single} 道单选和 ${exam.multiple} 道多选，限时 ${exam.minutes} 分钟，答对至少 ${exam.pass} 题合格。多选题须全部选对，多选或漏选均不得分。</p><p>模拟考试交卷后显示成绩和答案，错题自动加入错题本。应用按单选和多选数量随机组卷，不宣称复现官方的章节配比。规则依据 <a href="${EXAM_SOURCE}">CRAC 2025 年考核标准</a>。</p></section>
  <section><h2>题目示例</h2><p>以下选取不同章节的原题供预览，答案来自题库；正式练习时选项会随机排列。</p>${chapters.slice(0,3).map(chapter=> {
    const q = chapter.questions.find(q=>!q.issue && !q.image);
    if (!q) return '';
    return `<article class="guide-question"><h3>${e(chapter.name)} · ${e(q.id)}</h3><p>${e(q.prompt)}</p><ul>${q.options.map(option=>`<li>${e(option.id)}. ${e(option.text)}</li>`).join('')}</ul><details><summary>查看正确答案</summary><p>${q.answers.map(e).join('、')}</p></details></article>`;
  }).join('')}</section>
  <section><h2>如何安排练习？</h2><ol><li>先按章节完成一轮，熟悉法规、操作规程与无线电技术知识。</li><li>通过错题本重复练习薄弱项，再随机刷题检查掌握情况。</li><li>使用 ${exam.minutes} 分钟计时模拟考试训练答题节奏。模拟成绩只作学习参考。</li></ol></section>
  <section><h2>在哪里报名？</h2><p>先查阅 <a href="https://www.crac.org.cn/?cat=12">CRAC 考试通知</a>及当地考核机构公告，确认报考条件、报名时间与地点，再按通知前往 <a href="https://zhipu.allspectrum.cn:9528/CRAC/crac/login_student.html">官方考生报名入口</a>。本网站只提供学习工具，不受理报名，也不颁发证书。</p></section>
  <section><h2>手机上可以离线刷题吗？</h2><p>可以。联网进入题库并等待“离线已就绪”后，即可离线刷题和模拟考试；iPhone 可通过 Safari 分享菜单添加到主屏幕。A、B、C 类学习记录分别保存在当前浏览器，不会自动跨设备同步，可在“我的”中导出备份。</p></section>
  ${discoveryLinks('../')}
  <footer class="site-footer"><span>作者 <a href="mailto:aiello.chan@gmail.com">Aiello Chan</a></span><a href="https://github.com/AielloChan/huhao-radio">GitHub</a><span>v${e(release)}</span></footer>
</main><script type="module" src="../${assets}/press-feedback.js"></script></body></html>`;
}

export function sitemap() {
  const routes = ['', ...CLASS_IDS.map(id=>`${id.toLowerCase()}/`)];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map(route=>`<url><loc>${e(new URL(route,siteUrl).href)}</loc></url>`).join('')}</urlset>\n`;
}
