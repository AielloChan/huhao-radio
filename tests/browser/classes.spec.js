import {test, expect} from '@playwright/test';
import aBank from '../../data/questions.json' with {type:'json'};
import bBank from '../../data/b/questions.json' with {type:'json'};
import cBank from '../../data/c/questions.json' with {type:'json'};
import {makeSession, recordAnswer} from '../../src/core.js';
import {emptyState, storageKey} from '../../src/storage.js';

async function switchTo(page,id) {
  if(await page.locator('.immersive').count())await page.getByRole('button',{name:'返回',exact:true}).click();
  await page.getByRole('button',{name:`${id} 类`,exact:true}).click();
  await expect(page.getByRole('button',{name:`${id} 类`,exact:true})).toHaveAttribute('aria-pressed','true');
}
async function state(page,id) { return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),storageKey(id)); }

test('保留旧 A 类记录，切换 B/C 后分别保存进度、错题和备份类别',async({page})=>{
  const legacy=emptyState();
  legacy.practice=makeSession(aBank.questions,'sequence');
  recordAnswer(legacy,aBank.questions[0],[]);
  delete legacy.classId;delete legacy.practice.classId;
  await page.goto('/');
  await page.evaluate(({key,legacy})=>localStorage.setItem(key,JSON.stringify(legacy)),{key:storageKey('A'),legacy});
  await page.reload();
  await expect(page.getByRole('button',{name:'继续上次练习'})).toBeVisible();
  await switchTo(page,'B');
  await page.getByRole('button',{name:'开始顺序刷题'}).click();
  const q=bBank.questions[0];
  const wrong=q.options.find(o=>!q.answers.includes(o.id));
  await page.locator(`[data-action="select"][data-id="${wrong.id}"]`).click();
  await page.getByRole('button',{name:'确认答案'}).click();
  const bState=await state(page,'B');
  expect(bState.wrong[q.id]).toBe(true);
  await switchTo(page,'C');
  await expect(page.getByRole('button',{name:'开始顺序刷题'})).toBeVisible();
  await page.locator('.bottom-nav').getByRole('link',{name:'错题本'}).click();
  await expect(page.getByRole('heading',{name:'错题本很清爽'})).toBeVisible();
  await page.locator('.bottom-nav').getByRole('link',{name:'我的',exact:true}).click();
  await page.locator('#import-file').setInputFiles({name:'B.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bState))});
  await expect(page.locator('#toast')).toContainText('备份类别不匹配');
  await switchTo(page,'B');
  await page.getByRole('button',{name:'清空记录',exact:true}).click();
  await page.getByRole('button',{name:'确认清空',exact:true}).click();
  expect(Object.keys((await state(page,'B')).records)).toHaveLength(0);
  await page.locator('#import-file').setInputFiles({name:'B.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bState))});
  await page.getByRole('button',{name:'确认导入',exact:true}).click();
  expect((await state(page,'B')).records).toEqual(bState.records);
  await switchTo(page,'A');
  const aState=await state(page,'A');
  expect(aState.records).toEqual(legacy.records);
  expect(aState.practice).toEqual(legacy.practice);
  await switchTo(page,'B');
  await page.reload();
  await expect(page.getByRole('button',{name:'B 类',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.locator('.bottom-nav').getByRole('link',{name:'刷题',exact:true}).click();
  await page.getByRole('button',{name:'继续上次练习'}).click();
  await expect(page.locator('.answer-feedback')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('未打开过的 B/C 题库可离线组卷、交卷、恢复计时及附图',async({page,context})=>{
  await page.goto('/');
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  for(const [classId,bank,total,single,minutes,pass] of [['B',bBank,60,45,60,45],['C',cBank,90,70,90,70]]){
    await switchTo(page,classId);
    await page.locator('.bottom-nav').getByRole('link',{name:'模拟考试'}).click();
    await expect(page.getByRole('heading',{name:`${classId} 类模拟考试`,exact:true})).toBeVisible();
    await page.getByRole('button',{name:'开始模拟考试'}).click();
    const saved=await state(page,classId);
    const byId=new Map(bank.questions.map(q=>[q.id,q]));
    expect(saved.exam.ids).toHaveLength(total);
    expect(saved.exam.ids.filter(id=>byId.get(id).answers.length===1)).toHaveLength(single);
    expect(saved.exam.deadline-saved.exam.startedAt).toBe(minutes*60000);
    await expect(page.locator('.class-switcher')).toHaveCount(0);
    await page.getByRole('button',{name:'返回',exact:true}).click();
    await expect(page.getByRole('button',{name:'A 类',exact:true})).toBeDisabled();
    if(classId==='B'){
      for(const id of saved.exam.ids.slice(0,pass))saved.exam.answers[id]=byId.get(id).answers;
    } else saved.exam.deadline=Date.now()-1000;
    await page.evaluate(({key,saved})=>localStorage.setItem(key,JSON.stringify(saved)),{key:storageKey(classId),saved});
    await page.reload();
    if(classId==='B'){
      await page.getByRole('button',{name:'继续未完成的考试'}).click();
      expect((await state(page,classId)).exam.order).toEqual(saved.exam.order);
      await expect(page.locator('.answer-feedback')).toHaveCount(0);
      await page.getByRole('button',{name:'交卷',exact:true}).click();
      await page.getByRole('button',{name:'确认交卷',exact:true}).click();
      await expect(page.locator('.result-label')).toHaveText('模拟考试合格');
    }
    await expect(page.locator('.result-score')).toContainText(`/ ${total}`);
    expect((await state(page,classId)).history).toHaveLength(1);
    await page.locator('.bottom-nav').getByRole('link',{name:'刷题',exact:true}).click();
    await page.getByRole('button',{name:'开始顺序刷题'}).click();
    const practiceState=await state(page,classId);
    const diagram=bank.questions.find(q=>q.image && q.code!=='LK0944');
    practiceState.practice.index=practiceState.practice.ids.indexOf(diagram.id);
    await page.evaluate(({key,saved})=>localStorage.setItem(key,JSON.stringify(saved)),{key:storageKey(classId),saved:practiceState});
    await page.reload();
    await expect(page.locator('.question-figure img')).toBeVisible();
    expect(await page.locator('.question-figure img').evaluate(img=>img.complete && img.naturalWidth>0)).toBe(true);
  }
  expect((await state(page,'B')).history[0].score).toBe(45);
  expect((await state(page,'C')).history[0].score).toBe(0);
});
