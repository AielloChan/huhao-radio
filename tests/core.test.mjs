import {test} from 'node:test';
import assert from 'node:assert/strict';
import bank from '../data/questions.json' with {type:'json'};
import {makeSession, correct, recordAnswer, finishExam, remainingSeconds, progress} from '../src/core.js';
import {emptyState, validateState} from '../src/storage.js';
const byId=new Map(bank.questions.map(q=>[q.id,q]));

test('模拟组卷包含 32 单选和 8 多选，无重复和缺图题',()=>{
  const session=makeSession(bank.questions,'exam',1000);
  assert.equal(session.ids.length,40);
  assert.equal(new Set(session.ids).size,40);
  assert.equal(session.ids.filter(id=>byId.get(id).answers.length===1).length,32);
  assert.equal(session.ids.filter(id=>byId.get(id).answers.length>1).length,8);
  assert.ok(session.ids.every(id=>!byId.get(id).issue));
  assert.equal(remainingSeconds(session,61000),2340);
  assert.equal(remainingSeconds(session,9999999),0);
  for(const id of session.ids)assert.deepEqual([...session.order[id]].sort(),['A','B','C','D']);
});
test('多选不计部分分数，选项顺序不影响判断',()=>{
  const q=bank.questions.find(q=>q.answers.length===2);
  assert.equal(correct(q,[...q.answers].reverse()),true);
  assert.equal(correct(q,q.answers.slice(0,1)),false);
  assert.equal(correct(q,['A','B','C','D']),false);
  assert.equal(correct(q,[]),false);
});
test('重复练习累积记录，答对不擅自移除错题',()=>{
  const state=emptyState(),q=bank.questions[0];
  recordAnswer(state,q,[],1000);
  recordAnswer(state,q,q.answers,2000);
  assert.equal(state.records[q.id].attempts,2);
  assert.equal(state.records[q.id].correct,1);
  assert.equal(state.records[q.id].lastCorrect,true);
  assert.equal(state.wrong[q.id],true);
  assert.equal(progress(state,bank.questions).seen,1);
  assert.equal(progress(state,bank.questions).accuracy,50);
});
test('交卷计分与错题入库仅执行一次，未作答记错',()=>{
  const state=emptyState();state.exam=makeSession(bank.questions,'exam',1000);
  for(const id of state.exam.ids.slice(0,30))state.exam.answers[id]=byId.get(id).answers;
  const completed=finishExam(state,byId,2000);
  assert.equal(completed.score,30);
  assert.equal(Object.keys(state.wrong).length,10);
  assert.equal(Object.keys(state.records).length,40);
  assert.equal(state.history.length,1);
  assert.equal(state.exam,null);
  assert.equal(finishExam(state,byId,3000),null);
  assert.equal(state.history.length,1);
});
test('恢复记录保留试卷、选项顺序与绝对截止时间',()=>{
  const state=emptyState();state.exam=makeSession(bank.questions,'exam',1000);
  const copy=validateState(JSON.parse(JSON.stringify(state)),byId);
  assert.deepEqual(copy,state);
});
test('损坏的备份和不合法选项被拒绝',()=>{
  assert.throws(()=>validateState({},byId));
  const state=emptyState();state.exam=makeSession(bank.questions,'exam');
  state.exam.answers[state.exam.ids[0]]=['A','A'];
  assert.throws(()=>validateState(state,byId));
});
test('题库更新保留学习记录，丢弃已移除题目的旧会话',()=>{
  const state=emptyState();state.practice=makeSession(bank.questions,'sequence');
  const q=bank.questions[0];recordAnswer(state,q,q.answers);
  state.practice.ids.push('removed');
  const restored=validateState(state,byId);
  assert.equal(restored.practice,null);
  assert.equal(restored.records[q.id].attempts,1);
});
