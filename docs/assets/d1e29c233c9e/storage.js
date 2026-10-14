import {classConfig} from './catalog.js';

export const STORAGE_KEY = 'radio-a:progress:v1';
export function storageKey(classId = 'A') {
  classConfig(classId);
  return classId === 'A' ? STORAGE_KEY : `huhao-radio:${classId.toLowerCase()}:progress:v1`;
}
export function emptyState(classId = 'A') {
  classConfig(classId);
  return {schema: 1, classId, records: {}, wrong: {}, days: {}, practice: null, exam: null, history: []};
}
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const safeKey = key => !['__proto__', 'constructor', 'prototype'].includes(key);
const count = value => Number.isInteger(value) && value >= 0;
const selection = value => Array.isArray(value) && value.length <= 4 && new Set(value).size === value.length && value.every(v => /^[ABCD]$/.test(v));

function validSession(session, questionsById, classId) {
  if (session === null) return true;
  if (!object(session) || typeof session.id !== 'string' || !['exam', 'sequence', 'random', 'wrong', 'chapter'].includes(session.mode)) return false;
  if ((session.classId ?? 'A') !== classId) return false;
  if (!Array.isArray(session.ids) || !session.ids.length || new Set(session.ids).size !== session.ids.length || !session.ids.every(id => questionsById.has(id))) return false;
  if (!count(session.index) || session.index >= session.ids.length || !Number.isFinite(session.startedAt)) return false;
  if (session.mode === 'exam' && (!Number.isFinite(session.deadline) || session.ids.length !== classConfig(classId).exam.total)) return false;
  if (!object(session.order) || !object(session.answers) || !object(session.checked)) return false;
  if (!Object.entries(session.answers).every(([id, values]) => session.ids.includes(id) && selection(values))) return false;
  if (!Object.entries(session.checked).every(([id, value]) => session.ids.includes(id) && typeof value === 'boolean')) return false;
  return session.ids.every(id => selection(session.order[id]) && session.order[id].length === questionsById.get(id).options.length);
}

export function validateState(value, questionsById, classId = 'A') {
  if (!object(value) || value.schema !== 1 || !object(value.records) || !object(value.wrong) || !object(value.days) || !Array.isArray(value.history)) throw new Error('备份格式不正确或版本不兼容');
  if ((value.classId ?? 'A') !== classId) throw new Error(`备份类别不匹配，请切换到 ${value.classId ?? 'A'} 类题库后导入`);
  const state = emptyState(classId);
  for (const [id, record] of Object.entries(value.records)) {
    if (!safeKey(id) || !object(record) || !count(record.attempts) || !count(record.correct) || !count(record.wrong) || record.attempts !== record.correct + record.wrong || typeof record.lastCorrect !== 'boolean' || !Number.isFinite(record.lastAt) || !selection(record.selected)) throw new Error('答题记录损坏');
    if (questionsById.has(id)) state.records[id] = record;
  }
  for (const [id, present] of Object.entries(value.wrong)) {
    if (!safeKey(id) || present !== true) throw new Error('错题记录损坏');
    if (questionsById.has(id)) state.wrong[id] = true;
  }
  for (const [day, attempts] of Object.entries(value.days)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !count(attempts)) throw new Error('学习记录损坏');
    state.days[day] = attempts;
  }
  for (const key of ['practice', 'exam']) {
    // A bank update may remove a question; preserve records but discard its obsolete session.
    const session = value[key];
    if (session && Array.isArray(session.ids) && session.ids.some(id => !questionsById.has(id))) continue;
    if (!validSession(session, questionsById, classId)) throw new Error('答题进度损坏');
    if (session && (key === 'exam') !== (session.mode === 'exam')) throw new Error('答题模式不匹配');
    state[key] = session;
  }
  state.history = value.history.filter(session => validSession(session, questionsById, classId) && session?.mode === 'exam' && Number.isFinite(session.finishedAt) && count(session.score) && session.score <= classConfig(classId).exam.total).slice(0, 30);
  return state;
}

export function loadState(questionsById, classId = 'A') {
  const raw = localStorage.getItem(storageKey(classId));
  return raw ? validateState(JSON.parse(raw), questionsById, classId) : emptyState(classId);
}
export function saveState(state) {
  localStorage.setItem(storageKey(state.classId ?? 'A'), JSON.stringify(state));
}
