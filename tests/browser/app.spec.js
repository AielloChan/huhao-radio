import {test, expect} from '@playwright/test';
import bank from '../../data/questions.json' with {type:'json'};
import {readFile, writeFile} from 'node:fs/promises';
const key='radio-a:progress:v1';

async function state(page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);}
async function ready(page){await page.goto('/');await expect(page.getByRole('heading',{name:'今天，也来一点电波。'})).toBeVisible();}

test('点击当前底部导航可返回首页且保留答题进度',async({page})=>{
  await ready(page);
  await page.locator('.bottom-nav').getByRole('link',{name:'刷题',exact:true}).click();
  await page.getByRole('button',{name:'开始顺序刷题'}).click();
  await page.locator('.option').first().click();
  const practice=(await state(page)).practice;
  await page.locator('.bottom-nav').getByRole('link',{name:'刷题',exact:true}).click();
  await expect(page.getByRole('button',{name:'继续上次练习'})).toBeVisible();
  expect((await state(page)).practice).toEqual(practice);
  await page.locator('.bottom-nav').getByRole('link',{name:'模拟考试'}).click();
  await page.getByRole('button',{name:'开始模拟考试'}).click();
  await page.locator('.bottom-nav').getByRole('link',{name:'模拟考试'}).click();
  await expect(page.getByRole('button',{name:'继续未完成的考试'})).toBeVisible();
});

test('手机刷题、多选判分、错题、恢复与移出',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await ready(page);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:'开始顺序刷题'}).click();
  const s=(await state(page)).practice;
  const q=bank.questions.find(q=>q.id===s.ids[0]);
  const incorrect=q.options.find(o=>!q.answers.includes(o.id));
  await page.locator(`[data-action="select"][data-id="${incorrect.id}"]`).click();
  await page.getByRole('button',{name:'确认答案'}).click();
  await expect(page.getByText('这道题，再记住一次。')).toBeVisible();
  await page.reload();
  await page.getByRole('button',{name:'继续上次练习'}).click();
  await expect(page.getByText('这道题，再记住一次。')).toBeVisible();
  await page.locator('.bottom-nav').getByRole('link',{name:'错题本'}).click();
  await expect(page.locator('.wrong-item')).toHaveCount(1);
  await page.getByRole('button',{name:'移出错题本'}).click();
  await page.getByRole('button',{name:'确认移出'}).click();
  await expect(page.getByRole('heading',{name:'错题本很清爽'})).toBeVisible();
  expect(errors).toEqual([]);
});

test('考试隐藏答案、恢复选项、计时过期自动交卷且不重复入库',async({page})=>{
  await ready(page);await page.locator('.bottom-nav').getByRole('link',{name:'模拟考试'}).click();
  await page.getByRole('button',{name:'开始模拟考试'}).click();
  const original=(await state(page)).exam;
  await page.locator('[data-action="select"]').first().click();
  await expect(page.locator('.answer-feedback')).toHaveCount(0);
  await page.reload();
  await page.getByRole('button',{name:'继续未完成的考试'}).click();
  expect((await state(page)).exam.order).toEqual(original.order);
  await page.evaluate(key=>{const s=JSON.parse(localStorage.getItem(key));s.exam.deadline=Date.now()-1000;localStorage.setItem(key,JSON.stringify(s));},key);
  await page.reload();
  await expect(page.locator('.result-card')).toBeVisible();
  expect((await state(page)).history).toHaveLength(1);
  expect((await state(page)).exam).toBeNull();
  await page.reload();expect((await state(page)).history).toHaveLength(1);
});

test('离线刷新后可练习，记录保留',async({page,context})=>{
  await ready(page);
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText('离线模式',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'开始顺序刷题'}).click();
  await expect(page.locator('.option')).toHaveCount(4);
  await page.locator('.option').first().click();
  await page.getByRole('button',{name:'确认答案'}).click();
  await page.reload();
  await page.getByRole('button',{name:'继续上次练习'}).click();
  await expect(page.locator('.answer-feedback')).toBeVisible();
});

test('官方附图在离线刷题时正常显示',async({page,context})=>{
  await ready(page);await page.evaluate(()=>navigator.serviceWorker.ready);
  await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);
  await page.getByRole('button',{name:'开始顺序刷题'}).click();
  const data=await state(page);
  data.practice.index=data.practice.ids.indexOf('MC1-0665');
  await page.evaluate(({key,data})=>localStorage.setItem(key,JSON.stringify(data)),{key,data});
  await context.setOffline(true);await page.reload();
  await page.getByRole('button',{name:'继续上次练习'}).click();
  const image=page.locator('.question-figure img');
  await expect(image).toBeVisible();
  expect(await image.evaluate(img=>img.complete && img.naturalWidth>0)).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('备份导出、清空、导入可恢复',async({page})=>{
  await ready(page);await page.getByRole('button',{name:'开始顺序刷题'}).click();
  await page.locator('.option').first().click();await page.getByRole('button',{name:'确认答案'}).click();
  const before=await state(page);
  await page.locator('.bottom-nav').getByRole('link',{name:'我的',exact:true}).click();
  const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'导出学习记录'}).click();
  const download=await downloaded;expect(download.suggestedFilename()).toContain('.json');
  await page.getByRole('button',{name:'清空记录',exact:true}).click();await page.getByRole('button',{name:'确认清空'}).click();
  expect(Object.keys((await state(page)).records)).toHaveLength(0);
  await page.locator('#import-file').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(before))});
  await page.getByRole('button',{name:'确认导入'}).click();
  expect((await state(page)).records).toEqual(before.records);
});

test('新版本提示、考试期间延后更新、交卷后更新保留记录',async({page})=>{
  await ready(page);
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);
  await page.locator('.bottom-nav').getByRole('link',{name:'模拟考试'}).click();
  await page.getByRole('button',{name:'开始模拟考试'}).click();
  await page.locator('.option').first().click();
  const workerPath=new URL('../../dist/sw.js',import.meta.url);
  const original=await readFile(workerPath,'utf8');
  try {
    await writeFile(workerPath,original.replace(/const CACHE = '([^']+)'/,"const CACHE = '$1-update-test'"));
    await page.evaluate(async()=>{await (await navigator.serviceWorker.getRegistration()).update();});
    await expect(page.locator('#update')).toBeVisible();
    await page.locator('#update').getByRole('button',{name:'更新',exact:true}).click();
    await expect(page.getByText('考试正在进行，请交卷后再更新')).toBeVisible();
    expect((await state(page)).exam).not.toBeNull();
    await page.getByRole('button',{name:'交卷',exact:true}).click();
    await page.getByRole('button',{name:'确认交卷',exact:true}).click();
    const before=await state(page);
    await page.locator('#update').getByRole('button',{name:'更新',exact:true}).click();
    await expect(page.locator('#update')).toBeHidden();
    await expect(page.getByRole('button',{name:'开始模拟考试'})).toBeVisible();
    expect((await state(page)).records).toEqual(before.records);
    expect((await state(page)).history).toEqual(before.history);
  } finally { await writeFile(workerPath,original); }
});
