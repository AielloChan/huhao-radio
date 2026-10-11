import {makeSession, recordAnswer, finishExam, remainingSeconds, correct, CHAPTERS} from './core.js';
import {loadState, saveState, emptyState, validateState, STORAGE_KEY} from './storage.js';
import {shell, studyView, examView, wrongView, profileView, quizView, resultView} from './views.js';
import {escape as e, button, icon, showDialog, closeDialog} from './ui.js';
import {setupPwa, checkUpdate, offlineReady, appVersion} from './pwa.js';

const root = document.querySelector('#app');
let bank, bankMap, state;
let tab = 'study';
let screen = 'home';
let sessionKind = null;
let result = null;
let review = null;
let wrongSearch = '';
let saveBlocked = false;
let storageMessage = '';
let toastTimer;

function toast(message) {
  const box = document.querySelector('#toast');
  box.textContent = message;
  box.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {box.hidden = true;}, 4200);
}
function persist() {
  if (saveBlocked) return false;
  try { saveState(state); storageMessage = ''; return true; }
  catch { storageMessage = '当前无法保存记录，请先导出备份。'; toast(storageMessage); return false; }
}
function currentSession() { return review || (sessionKind === 'exam' ? state.exam : state.practice); }
function top() { window.scrollTo({top:0, behavior:'instant'}); }
function render() {
  if (!bank) return;
  const status = {online:navigator.onLine, ready:offlineReady, version:appVersion};
  let body;
  if (screen === 'quiz' && currentSession()) body = quizView(currentSession(),bankMap,!!review);
  else if (screen === 'result' && result) body = resultView(result,bankMap);
  else {
    screen = 'home';
    body = tab === 'exam' ? examView(state) : tab === 'wrong' ? wrongView(state,bank,wrongSearch) : tab === 'profile' ? profileView(state,bank,status) : studyView(state,bank);
  }
  root.innerHTML = shell(tab, `${storageMessage ? `<div class="storage-warning" role="alert">${e(storageMessage)} ${saveBlocked ? button('下载原始记录','export-raw','text-button') : ''}</div>` : ''}${body}`,status,screen==='quiz');
}
function navigate(next) {
  tab = ['study','exam','wrong','profile'].includes(next) ? next : 'study';
  screen = 'home'; review = null; sessionKind = null;
  render(); top();
}
function launchPractice(mode, questions = bank.questions) {
  const launch = () => {
    try { state.practice = makeSession(questions, mode); }
    catch (error) { return toast(error.message); }
    sessionKind = 'practice'; review = null; screen = 'quiz';
    persist(); closeDialog(); render(); top();
  };
  if (state.practice && Object.keys(state.practice.checked).length < state.practice.ids.length) {
    confirmAction('开始新的练习？','之前的答题记录和错题会保留，未完成的练习进度将被替换。','开始新练习',launch);
  } else launch();
}
function launchExam() {
  if (state.exam) { sessionKind = 'exam'; review = null; screen='quiz'; render(); return; }
  try { state.exam = makeSession(bank.questions,'exam'); }
  catch (error) { return toast(error.message); }
  sessionKind = 'exam'; review = null; screen='quiz'; tab='exam';
  persist(); render(); top();
}
function endExam(automatic = false) {
  const completed = finishExam(state,bankMap);
  if (!completed) return;
  result = completed; review = null; sessionKind = null; screen='result'; tab='exam';
  persist(); closeDialog(); render(); top();
  if (automatic) toast('考试时间已到，已自动交卷');
}
function tick() {
  if (!state?.exam) return;
  const seconds = remainingSeconds(state.exam);
  if (!seconds) return endExam(true);
  const timer = document.querySelector('#timer b');
  if (timer) {
    timer.textContent = `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
    timer.parentElement.classList.toggle('urgent',seconds < 300);
  }
}
function confirmAction(title, description, label, callback) {
  showDialog(`<h2>${e(title)}</h2><p>${e(description)}</p><div class="dialog-actions">${button('取消','cancel-dialog','secondary')}${button(e(label),'confirm-dialog')}</div>`);
  document.querySelector('[data-action="confirm-dialog"]').onclick = callback;
}
function answerSheet() {
  const s = currentSession();
  const isExam = s.mode === 'exam' && !review;
  showDialog(`<div class="section-title"><h2>答题卡</h2>${button(icon('close'),'cancel-dialog','icon-button','aria-label="关闭答题卡"')}</div><p>${isExam ? '绿色代表已作答，点击题号跳转' : '绿色为答对，橙色为答错，空白为未作答'}</p><div class="answer-grid">${s.ids.map((id,index) => {
    const answered = (s.answers[id] || []).length > 0;
    const checked = review || s.checked[id];
    const cls = isExam ? (answered ? 'done' : '') : checked ? (correct(bankMap.get(id),s.answers[id]) ? 'done' : 'missed') : '';
    return `<button data-action="jump" data-id="${index}" class="${cls} ${index===s.index?'current':''}" aria-label="第 ${index+1} 题">${index+1}</button>`;
  }).join('')}</div>${isExam ? button('交卷并查看结果','submit-exam','primary wide') : ''}`);
}
function download(name, content) {
  const url = URL.createObjectURL(new Blob([content], {type:'application/json'}));
  const a = document.createElement('a'); a.href=url; a.download=name; document.body.append(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
}
function exportState() { download(`呼号之前-学习备份-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(state,null,2)); }

const actions = {
  sequence: () => launchPractice('sequence'),
  random: () => launchPractice('random'),
  chapter: id => launchPractice('chapter',bank.questions.filter(q=>q.chapter.startsWith(`${id}.`))),
  'practice-wrong': () => launchPractice('wrong',bank.questions.filter(q=>state.wrong[q.id])),
  'review-wrong': id => launchPractice('wrong',bank.questions.filter(q=>q.id===id)),
  'resume-practice': () => {sessionKind='practice';review=null;screen='quiz';render();top();},
  'start-exam': launchExam,
  'resume-exam': () => {sessionKind='exam';review=null;screen='quiz';tick();render();top();},
  'leave-quiz': () => {
    if (review) {review=null;screen='result';render();top();}
    else navigate(sessionKind==='exam'?'exam':'study');
  },
  select: id => {
    const s=currentSession(); if (!s || review || s.checked[s.ids[s.index]]) return;
    const q=bankMap.get(s.ids[s.index]);
    const selection=s.answers[q.id] || [];
    s.answers[q.id]=q.answers.length===1 ? [id] : selection.includes(id) ? selection.filter(x=>x!==id) : [...selection,id];
    persist(); render();
  },
  'check-answer': () => {
    const s=currentSession(); if (!s || review || s.mode==='exam') return;
    const id=s.ids[s.index]; if (s.checked[id] || !s.answers[id]?.length) return;
    recordAnswer(state,bankMap.get(id),s.answers[id]); s.checked[id]=true; persist();render();
    document.querySelector('.answer-feedback')?.scrollIntoView({behavior:'smooth',block:'nearest'});
  },
  previous: () => {const s=currentSession();s.index=Math.max(0,s.index-1);if(!review)persist();render();top();},
  next: () => {const s=currentSession();s.index=Math.min(s.ids.length-1,s.index+1);if(!review)persist();render();top();},
  'answer-sheet': answerSheet,
  jump: id => {currentSession().index=Number(id);if(!review)persist();closeDialog();render();top();},
  'submit-exam': () => {
    if (!state.exam) return;
    const unanswered=state.exam.ids.filter(id=>!state.exam.answers[id]?.length).length;
    confirmAction('确认交卷？',unanswered ? `还有 ${unanswered} 道题未作答，未答题将计为错误。` : '已完成全部题目，交卷后查看成绩和答案。','确认交卷',()=>endExam());
  },
  'complete-practice': () => {
    const s=state.practice;
    const unanswered=s.ids.filter(id=>!s.checked[id]);
    if (unanswered.length) {
      confirmAction('还有题目未完成',`还有 ${unanswered.length} 道题未提交答案，可以继续练习。已完成的记录会保留。`,'返回未答题',()=>{s.index=s.ids.indexOf(unanswered[0]);persist();closeDialog();render();top();});
    } else {state.practice=null;persist();navigate('study');toast('本轮练习完成，学习记录已保存');}
  },
  history: id => {result=state.history.find(s=>s.id===id);screen='result';render();top();},
  'show-result': () => {review=null;screen='result';render();top();},
  'review-all': () => {review=structuredClone(result);review.index=0;screen='quiz';render();top();},
  'review-errors': () => {
    review=structuredClone(result);review.ids=review.ids.filter(id=>!correct(bankMap.get(id),review.answers[id]||[]));review.index=0;screen='quiz';render();top();
  },
  'exam-home': () => navigate('exam'),
  'remove-wrong': id => confirmAction('移出错题本？','历史答题记录会保留；以后再答错时仍会自动收录。','确认移出',()=>{delete state.wrong[id];persist();closeDialog();render();}),
  'cancel-dialog': closeDialog,
  'check-update': () => checkUpdate(toast),
  export: exportState,
  'export-raw': () => {try{download('呼号之前-原始记录.json',localStorage.getItem(STORAGE_KEY)||'{}');}catch{toast('无法读取原始记录');}},
  import: () => document.querySelector('#import-file').click(),
  reset: () => confirmAction('清空所有学习记录？','答题进度、错题本和考试记录都会删除。建议先导出备份，这个操作无法撤销。','确认清空',()=>{
    state=emptyState();saveBlocked=false;persist();screen='home';review=null;result=null;closeDialog();render();toast('学习记录已清空');
  })
};
document.addEventListener('click', event => {
  const navigation = event.target.closest('a[href^="#"]');
  if (navigation && navigation.hash === location.hash) {
    event.preventDefault();
    navigate(navigation.hash.slice(1));
    return;
  }
  const target=event.target.closest('[data-action]');
  if (target && !target.disabled) actions[target.dataset.action]?.(target.dataset.id);
});
document.addEventListener('input', event => {
  if(event.target.id==='wrong-search') {
    wrongSearch=event.target.value;
    const cursor=event.target.selectionStart;
    render();const input=document.querySelector('#wrong-search');input.focus();
    try{input.setSelectionRange(cursor,cursor);}catch{}
  }
});
document.addEventListener('change', async event => {
  if(event.target.id!=='import-file')return;
  const file=event.target.files[0];if(!file)return;
  try {
    if(file.size>10_000_000)throw new Error('备份文件过大，请选择本应用导出的 JSON');
    const imported=validateState(JSON.parse(await file.text()),bankMap);
    confirmAction('导入这份学习记录？',`将用备份中的 ${Object.keys(imported.records).length} 道答题记录替换当前数据。建议先导出当前记录。`,'确认导入',()=>{
      state=imported;saveBlocked=false;persist();review=null;result=null;screen='home';closeDialog();tick();render();toast('备份已导入');
    });
  }catch(error){toast(`导入失败：${error.message}`);}
  event.target.value='';
});
window.addEventListener('hashchange',()=>navigate(location.hash.slice(1)));
window.addEventListener('online',render);
window.addEventListener('offline',render);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick();});
window.addEventListener('storage',event=>{
  if(event.key!==STORAGE_KEY || saveBlocked)return;
  try {state=loadState(bankMap);render();toast('已同步另一窗口的学习记录');tick();}catch{toast('另一窗口的记录无法读取，请导出备份后重试');}
});

async function init() {
  try {
    const response=await fetch(new URL('./questions.json',import.meta.url));
    if(!response.ok)throw new Error('题库加载失败');
    bank=await response.json();bankMap=new Map(bank.questions.map(q=>[q.id,q]));
    try{state=loadState(bankMap);}catch{
      state=emptyState();saveBlocked=true;
      storageMessage='无法读取已有记录，已暂停保存以保护原数据。可先下载原始记录，再到「我的」导入备份或清空记录。';
    }
    navigate(location.hash.slice(1));tick();
    setInterval(tick,1000);
    setupPwa(render,()=>!state.exam,toast);
  }catch(error){root.innerHTML=`<main class="loading"><h1>信号暂时中断</h1><p>${e(error.message)}，请联网后重新加载。</p><button onclick="location.reload()">重新加载</button></main>`;}
}
init();
