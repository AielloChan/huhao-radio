import {CLASS_IDS} from './catalog.js';
import {correct} from './core.js';

export const VIEW_KEY = 'huhao-radio:view:v1';
export const TABS = ['study','exam','wrong','profile'];

export function loadView() {
  try {
    const raw = localStorage.getItem(VIEW_KEY);
    // Distinguish a first launch from an incompatible checkpoint.
    if (raw === null) return undefined;
    const view = JSON.parse(raw);
    if (!view || view.schema !== 1 || !CLASS_IDS.includes(view.classId) || !TABS.includes(view.tab)) return null;
    if (!['home','quiz','result'].includes(view.screen) || !Number.isFinite(view.scrollY) || view.scrollY < 0) return null;
    if (typeof view.wrongSearch !== 'string') return null;
    return view;
  } catch { return null; }
}

export function saveView(view) {
  try {
    localStorage.setItem(VIEW_KEY,JSON.stringify({...view,schema:1}));
    return true;
  } catch { return false; }
}

// Store references to validated learning records, never a second copy of answers.
export function restoreView(view, state, bankMap) {
  if (!view || view.classId !== state.classId) return null;
  const restored = {tab:view.tab, screen:view.screen, sessionKind:null, result:null, review:null,
    wrongSearch:view.wrongSearch, scrollY:view.scrollY};
  if (view.screen === 'home') return restored;
  if (view.screen === 'quiz' && ['practice','exam'].includes(view.sessionKind)) {
    if (!state[view.sessionKind] || state[view.sessionKind].id !== view.sessionId) return null;
    restored.sessionKind = view.sessionKind;
    return restored;
  }
  const result = state.history.find(session=>session.id===view.resultId);
  if (!result) return null;
  restored.result = result;
  if (view.screen === 'result') return restored;
  if (view.screen !== 'quiz' || !['all','errors'].includes(view.reviewMode)) return null;
  restored.review = structuredClone(result);
  if (view.reviewMode === 'errors') restored.review.ids = result.ids.filter(id=>!correct(bankMap.get(id),result.answers[id]||[]));
  if (!Number.isInteger(view.reviewIndex) || view.reviewIndex < 0 || view.reviewIndex >= restored.review.ids.length) return null;
  restored.review.index = view.reviewIndex;
  return restored;
}
