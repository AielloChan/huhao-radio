import {test} from 'node:test';
import assert from 'node:assert/strict';
import bank from '../data/questions.json' with {type:'json'};
import {classConfig} from '../src/catalog.js';
import {makeSession, finishExam, recordAnswer} from '../src/core.js';
import {emptyState, validateState, loadState, saveState, storageKey} from '../src/storage.js';
const byId = new Map(bank.questions.map(q=>[q.id,q]));

for (const [classId,total,single,multiple,minutes,pass] of [['B',60,45,15,60,45],['C',90,70,20,90,70]]) {
  test(`${classId} 类组卷、倒计时、合格线与记录恢复使用对应规则`,()=>{
    const state=emptyState(classId);
    state.exam=makeSession(bank.questions,'exam',1000,classId);
    assert.equal(state.exam.ids.length,total);
    assert.equal(new Set(state.exam.ids).size,total);
    assert.equal(state.exam.ids.filter(id=>byId.get(id).answers.length===1).length,single);
    assert.equal(state.exam.ids.filter(id=>byId.get(id).answers.length>1).length,multiple);
    assert.equal(state.exam.deadline,1000+minutes*60000);
    assert.deepEqual(validateState(state,byId,classId),state);
    for(const id of state.exam.ids.slice(0,pass))state.exam.answers[id]=byId.get(id).answers;
    const result=finishExam(state,byId,2000);
    assert.equal(result.score,classConfig(classId).exam.pass);
    assert.equal(Object.keys(state.wrong).length,total-pass);
    assert.deepEqual(validateState(state,byId,classId).history,[result]);
  });
}

test('旧版 A 类记录和未完成考试无损恢复，继续使用原存储键',()=>{
  const original=emptyState();
  original.exam=makeSession(bank.questions,'exam');
  delete original.classId;
  delete original.exam.classId;
  recordAnswer(original,bank.questions[0],[]);
  const restored=validateState(original,byId,'A');
  assert.deepEqual(restored,{...original,classId:'A'});
  assert.equal(storageKey('A'),'radio-a:progress:v1');
});

test('即便题号相同，也拒绝把其他类别或旧 A 类备份导入当前类别',()=>{
  for(const source of ['A','B','C']){
    const state=emptyState(source);
    recordAnswer(state,bank.questions[0],[]);
    for(const target of ['A','B','C'].filter(id=>id!==source)){
      assert.throws(()=>validateState(state,byId,target),/类别不匹配/);
    }
  }
  const legacy=emptyState();delete legacy.classId;
  assert.throws(()=>validateState(legacy,byId,'B'),/切换到 A 类/);
});

test('三个类别分别读写和清空，学习记录不会串到其他类别',t=>{
  const values=new Map();
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)}});
  t.after(()=>{if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else delete globalThis.localStorage;});
  for(const classId of ['A','B','C']){
    const state=emptyState(classId);
    recordAnswer(state,bank.questions[0],classId==='B'?bank.questions[0].answers:[]);
    saveState(state);
  }
  assert.equal(values.size,3);
  saveState(emptyState('B'));
  assert.equal(Object.keys(loadState(byId,'B').records).length,0);
  assert.equal(Object.keys(loadState(byId,'A').wrong).length,1);
  assert.equal(Object.keys(loadState(byId,'C').wrong).length,1);
});
