import {CLASS_IDS} from './catalog.js';

export const QUESTION_SOURCE = 'https://www.crac.org.cn/?p=1287';
export const EXAM_SOURCE = 'https://www.crac.org.cn/userfiles/file/20250728/20250728133610_2877.pdf';

export function discoveryLinks(prefix = './') {
  return `<section class="discovery" aria-labelledby="discovery-title"><h2 id="discovery-title">业余无线电考试题库与备考</h2><p>呼号之前提供 A、B、C 类在线刷题、错题复习和模拟考试，采用 CRAC 2025 年版题库。免费使用，无需注册；完成首次缓存后可离线练习，学习记录保存在当前设备。</p><nav class="guide-links" aria-label="各类题库介绍">${CLASS_IDS.map(id=>`<a href="${prefix}${id.toLowerCase()}/">${id} 类题库与模拟考试 →</a>`).join('')}</nav><p class="fineprint">个人开发的学习工具，非官方报名或发证平台。<a href="${QUESTION_SOURCE}">查看官方题库来源</a>；考核安排以当地考核机构通知为准。</p></section>`;
}
