import {escape as e, icon} from './ui.js';

const resources = [
  {title:'CRAC 官网', detail:'中国无线电协会业余无线电分会', url:'https://www.crac.org.cn/'},
  {title:'考试报名', detail:'官方考生入口 · 智谱系统', url:'https://zhipu.allspectrum.cn:9528/CRAC/crac/login_student.html'},
  {title:'考试通知', detail:'查看考核安排与报名要求', url:'https://www.crac.org.cn/?cat=12'},
  {title:'官方题库', detail:'2025 年版题库与考核标准', url:'https://www.crac.org.cn/?p=1287'}
];

export function resourceLinks() {
  return `<section class="resources" aria-labelledby="resources-title"><div class="section-title"><h2 id="resources-title">常用链接</h2><span>从练习，到正式出发</span></div><div class="resource-grid">${resources.map(({title,detail,url})=>`<a class="resource-link" href="${e(url)}" target="_blank" rel="noopener noreferrer"><div><h3>${e(title)}</h3><p>${e(detail)}</p></div><span aria-hidden="true">↗</span></a>`).join('')}</div><p class="fineprint">外部网站需联网访问，报名安排以考核机构通知为准。</p></section>`;
}

export function siteFooter(version) {
  return `<footer class="site-footer"><div class="footer-author"><span>${icon('radio')} 作者 <strong>Aiello Chan</strong></span><a href="mailto:aiello.chan@gmail.com">aiello.chan@gmail.com</a></div><div class="footer-meta"><a href="https://github.com/AielloChan/huhao-radio" target="_blank" rel="noopener noreferrer">GitHub ↗</a><span class="release-version">${e(version || '版本加载中')}</span></div></footer>`;
}
