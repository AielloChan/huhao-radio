import {makeSession, recordAnswer, finishExam, remainingSeconds, correct, CHAPTERS} from './core.js';
import {loadState, saveState, emptyState, validateState, storageKey} from './storage.js';
import {CLASS_IDS, classConfig, selectedClass, SELECTED_CLASS_KEY} from './catalog.js';
import {shell, studyView, examView, wrongView, profileView, quizView, resultView} from './views.js';
import {escape as e, button, icon, showDialog, closeDialog} from './ui.js';
import {setupPwa, checkUpdate, offlineReady, appVersion} from './pwa.js';
import {TABS, loadView, saveView, restoreView} from './view-state.js';
import {setupMotion} from './motion.js';
import './press-feedback.js';

const root = document.querySelector('#app');
const motion = setupMotion(root);
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
let switching = false;
const loadedBanks = new Map();
let viewSaveFailed = false;
let scrollSaveTimer;
let pendingScroll = null;

async function loadClass(classId) {
  if (!loadedBanks.has(classId)) {
    const response = await fetch(new URL(classConfig(classId).file, import.meta.url));
    if (!response.ok) throw new Error(`${classId} 类题库加载失败`);
    loadedBanks.set(classId, {...await response.json(), classId});
  }
  const nextBank = loadedBanks.get(classId);
  const nextMap = new Map(nextBank.questions.map(q=>[q.id,q]));
  let nextState;
  saveBlocked = false; storageMessage = '';
  try { nextState = loadState(nextMap,classId); }
  catch {
    nextState = emptyState(classId); saveBlocked = true;
    storageMessage = `无法读取 ${classId} 类已有记录，已暂停保存以保护原数据。可先下载原始记录，再导入备份或清空当前类别记录。`;
  }
  bank = nextBank; bankMap = nextMap; state = nextState;
}

async function switchClass(classId) {
  if (switching || classId === bank.classId) return;
  if (state.exam) return toast('考试计时中，请交卷后再切换题库');
  if (!persist()) return toast('当前记录未能保存，请先导出备份后再切换');
  switching = true; render();
  try {
    await loadClass(classId);
    try { localStorage.setItem(SELECTED_CLASS_KEY,classId); } catch { toast('无法记住题库选择，下次打开将使用默认类别'); }
    result = null; wrongSearch = '';
    navigate(tab); tick();
  } catch (error) { toast(error.message); }
  finally { switching = false; render(); }
}

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
function scrollPosition() { return screen === 'quiz' ? document.querySelector('.quiz-content')?.scrollTop ?? 0 : window.scrollY; }
function persistView() {
  if (!bank || switching) return;
  const saved = saveView({classId:bank.classId, tab, screen, sessionKind:review ? null : sessionKind,
    sessionId:currentSession()?.id ?? null, resultId:result?.id ?? null,
    reviewMode:review ? (review.ids.length === result.ids.length ? 'all' : 'errors') : null,
    reviewIndex:review?.index ?? null, wrongSearch, scrollY:pendingScroll ?? scrollPosition()});
  if (!saved && !viewSaveFailed) toast('当前无法保存页面位置，下次打开可能回到首页。学习记录可在「我的」中导出备份。');
  viewSaveFailed = !saved;
}
function top() {
  pendingScroll=null;
  document.querySelector('.quiz-content')?.scrollTo({top:0,behavior:'instant'});
  window.scrollTo({top:0, behavior:'instant'});
  persistView();
}
function restoreScroll() {
  if (pendingScroll === null) return;
  const scroller = screen === 'quiz' ? document.querySelector('.quiz-content') : window;
  scroller?.scrollTo({top:pendingScroll,behavior:'instant'});
  if ([...root.querySelectorAll('img')].every(image=>image.complete)) pendingScroll=null;
  persistView();
}
function render() {
  if (!bank) return;
  motion.beforeRender();
  const quizScroll = document.querySelector('.quiz-content')?.scrollTop ?? 0;
  const previousImage = root.querySelector('.question-figure img');
  const imageWidth = previousImage?.naturalWidth || Number(previousImage?.getAttribute('width'));
  const imageHeight = previousImage?.naturalHeight || Number(previousImage?.getAttribute('height'));
  const imageSize = imageWidth > 0 && imageHeight > 0 ? {src:previousImage.getAttribute('src'),width:imageWidth,height:imageHeight} : null;
  const status = {online:navigator.onLine, ready:offlineReady, version:appVersion, classId:bank.classId, switching, examActive:!!state.exam};
  let body;
  if (screen === 'quiz' && currentSession()) body = quizView(currentSession(),bankMap,!!review);
  else if (screen === 'result' && result) body = resultView(result,bankMap);
  else {
    screen = 'home';
    body = tab === 'exam' ? examView(state,bank.classId) : tab === 'wrong' ? wrongView(state,bank,wrongSearch) : tab === 'profile' ? profileView(state,bank,status) : studyView(state,bank);
  }
  document.body.classList.toggle('is-quizzing',screen==='quiz');
  root.innerHTML = shell(tab, `${storageMessage ? `<div class="storage-warning" role="alert">${e(storageMessage)} ${saveBlocked ? button('下载原始记录','export-raw','text-button') : ''}</div>` : ''}${body}`,status,screen==='quiz');
  const nextImage = root.querySelector('.question-figure img');
  if (imageSize && nextImage?.getAttribute('src') === imageSize.src) {
    nextImage.width = imageSize.width;
    nextImage.height = imageSize.height;
  }
  document.querySelector('.quiz-content')?.scrollTo({top:quizScroll,behavior:'instant'});
  if (location.hash !== `#${tab}`) history.replaceState(null,'',`#${tab}`);
  persistView();
  if (pendingScroll !== null) {
    requestAnimationFrame(restoreScroll);
    root.querySelectorAll('img').forEach(image=>{
      image.addEventListener('load',restoreScroll,{once:true});
      image.addEventListener('error',restoreScroll,{once:true});
    });
  }
  const session = screen === 'quiz' ? currentSession() : null;
  motion.afterRender({page:`${bank.classId}:${tab}:${screen}:${session?.id ?? result?.id ?? ''}:${review ? 'review' : sessionKind ?? ''}`,
    tab, screen, index:session?.index ?? 0, question:session?.ids[session.index] ?? null,
    selection:session ? [...(session.answers[session.ids[session.index]] || [])].sort().join(',') : '',
    checked:session ? !!(review || session.checked[session.ids[session.index]]) : false});
}
function navigate(next) {
  tab = TABS.includes(next) ? next : 'study';
  screen = 'home'; review = null; sessionKind = null;
  render(); top();
}
function launchPractice(mode, questions = bank.questions) {
  const launch = () => {
    try { state.practice = makeSession(questions, mode, Date.now(), bank.classId); }
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
  try { state.exam = makeSession(bank.questions,'exam',Date.now(),bank.classId); }
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
function exportState() { download(`呼号之前-${bank.classId}类-学习备份-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(state,null,2)); }

const actions = {
  'switch-class': switchClass,
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
  'export-raw': () => {try{download(`呼号之前-${bank.classId}类-原始记录.json`,localStorage.getItem(storageKey(bank.classId))||'{}');}catch{toast('无法读取原始记录');}},
  import: () => document.querySelector('#import-file').click(),
  reset: () => confirmAction(`清空 ${bank.classId} 类学习记录？`,'仅删除当前类别的答题进度、错题本和考试记录，其他类别不受影响。建议先导出备份，这个操作无法撤销。','确认清空',()=>{
    state=emptyState(bank.classId);saveBlocked=false;persist();screen='home';review=null;result=null;closeDialog();render();toast(`${bank.classId} 类学习记录已清空`);
  })
};
document.addEventListener('click', event => {
  pendingScroll = null;
  if (switching) { event.preventDefault(); return; }
  const navigation = event.target.closest('a[href^="#"]');
  if (navigation) {
    event.preventDefault();
    if (navigation.hash !== location.hash) history.pushState(null,'',navigation.hash);
    navigate(navigation.hash.slice(1));
    return;
  }
  const target=event.target.closest('[data-action]');
  if (target && !target.disabled) actions[target.dataset.action]?.(target.dataset.id);
});
document.addEventListener('input', event => {
  pendingScroll = null;
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
    const imported=validateState(JSON.parse(await file.text()),bankMap,bank.classId);
    confirmAction(`导入 ${bank.classId} 类学习记录？`,`将用备份中的 ${Object.keys(imported.records).length} 道答题记录替换当前类别数据，其他类别不受影响。建议先导出当前记录。`,'确认导入',()=>{
      state=imported;saveBlocked=false;persist();review=null;result=null;screen='home';closeDialog();tick();render();toast('备份已导入');
    });
  }catch(error){toast(`导入失败：${error.message}`);}
  event.target.value='';
});
window.addEventListener('hashchange',event=>navigate(new URL(event.newURL).hash.slice(1)));
window.addEventListener('online',render);
window.addEventListener('offline',render);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick();else persistView();});
window.addEventListener('pagehide',persistView);
for (const type of ['pointerdown','wheel','keydown']) document.addEventListener(type,()=>{pendingScroll=null;},{passive:true});
document.addEventListener('scroll',event=>{
  if (event.target !== document && !event.target.matches?.('.quiz-content')) return;
  if (scrollSaveTimer) return;
  scrollSaveTimer=setTimeout(()=>{scrollSaveTimer=null;persistView();},100);
},{passive:true,capture:true});
window.addEventListener('storage',event=>{
  if(!bank || event.key!==storageKey(bank.classId) || saveBlocked)return;
  try {state=loadState(bankMap,bank.classId);review=null;result=null;screen='home';render();toast('已同步另一窗口的学习记录');tick();}catch{toast('另一窗口的记录无法读取，请导出备份后重试');}
});

async function init() {
  try {
    const entry = new URL(location.href);
    const requestedClass = entry.searchParams.get('class');
    const explicitClass = entry.searchParams.has('class');
    const savedView = loadView();
    await loadClass(CLASS_IDS.includes(requestedClass) ? requestedClass : savedView?.classId ?? selectedClass());
    if (entry.searchParams.has('class')) {
      if (CLASS_IDS.includes(requestedClass)) {
        try { localStorage.setItem(SELECTED_CLASS_KEY,requestedClass); } catch { /* Practice remains usable without storage. */ }
      }
      entry.searchParams.delete('class');
      history.replaceState(null,'',entry);
    }
    const requestedTab = entry.hash.slice(1);
    const shouldRestore = !explicitClass && !saveBlocked && savedView && (!requestedTab || requestedTab === savedView.tab);
    const restored = shouldRestore ? restoreView(savedView,state,bankMap) : null;
    if (restored) {
      ({tab,screen,sessionKind,result,review,wrongSearch} = restored);
      pendingScroll = restored.scrollY;
      render();
    } else navigate(!shouldRestore && (explicitClass || savedView !== null) && TABS.includes(requestedTab) ? requestedTab : 'study');
    tick();
    setInterval(tick,1000);
    setupPwa(render,()=>!state.exam,toast);
  }catch(error){root.innerHTML=`<main class="loading"><h1>信号暂时中断</h1><p>${e(error.message)}，请联网后重新加载。</p><button onclick="location.reload()">重新加载</button></main>`;}
}
init();
