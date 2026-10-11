import {classConfig} from './catalog.js';
export const CHAPTERS = {'1': '法规与管理', '2': '通信规程与操作', '3': '设备、天线与传播', '4': '电工基础与测量', '5': '技术规范与安全'};

export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function correct(question, selected = []) {
  return selected.length === question.answers.length && question.answers.every(id => selected.includes(id));
}

export function makeSession(questions, mode, now = Date.now(), classId = 'A') {
  const exam = classConfig(classId).exam;
  let pool = questions.filter(q => !q.issue);
  if (mode === 'exam') {
    const singles = pool.filter(q => q.answers.length === 1);
    const multiples = pool.filter(q => q.answers.length > 1);
    if (singles.length < exam.single || multiples.length < exam.multiple) throw new Error('可用题目不足，无法生成试卷');
    pool = shuffle([...shuffle(singles).slice(0, exam.single), ...shuffle(multiples).slice(0, exam.multiple)]);
  } else if (mode === 'random' || mode === 'wrong') pool = shuffle(pool);
  if (!pool.length) throw new Error('当前没有可练习的题目');
  return {
    id: globalThis.crypto.randomUUID(), classId, mode, startedAt: now,
    deadline: mode === 'exam' ? now + exam.minutes * 60_000 : null,
    ids: pool.map(q => q.id),
    order: Object.fromEntries(pool.map(q => [q.id, shuffle(q.options.map(o => o.id))])),
    answers: {}, checked: {}, index: 0, finishedAt: null
  };
}

export function recordAnswer(state, question, selected, now = Date.now()) {
  const isCorrect = correct(question, selected);
  const previous = state.records[question.id] || {attempts: 0, correct: 0, wrong: 0};
  state.records[question.id] = {
    attempts: previous.attempts + 1, correct: previous.correct + Number(isCorrect),
    wrong: previous.wrong + Number(!isCorrect), lastCorrect: isCorrect,
    lastAt: now, selected: [...selected]
  };
  if (!isCorrect) state.wrong[question.id] = true;
  const date = new Date(now);
  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  state.days[key] = (state.days[key] || 0) + 1;
  return isCorrect;
}

export function finishExam(state, questionsById, now = Date.now()) {
  const session = state.exam;
  if (!session || session.finishedAt) return null;
  let score = 0;
  for (const id of session.ids) score += Number(recordAnswer(state, questionsById.get(id), session.answers[id] || [], now));
  session.finishedAt = now;
  session.score = score;
  state.history.unshift(structuredClone(session));
  state.history = state.history.slice(0, 30);
  state.exam = null;
  return session;
}

export function remainingSeconds(session, now = Date.now()) {
  return Math.max(0, Math.ceil((session.deadline - now) / 1000));
}

export function progress(state, questions) {
  const eligible = questions.filter(q => !q.issue);
  const records = eligible.map(q => state.records[q.id]).filter(Boolean);
  const attempts = records.reduce((n, r) => n + r.attempts, 0);
  const right = records.reduce((n, r) => n + r.correct, 0);
  return {total: eligible.length, seen: records.length, mastered: records.filter(r => r.lastCorrect).length,
    attempts, accuracy: attempts ? Math.round(right / attempts * 100) : 0};
}
