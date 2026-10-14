import {test, expect} from '@playwright/test';
import {VIEW_KEY} from '../../src/view-state.js';
const progressKey='radio-a:progress:v1';

async function reopen(page,context) {
  await page.close();
  const reopened=await context.newPage();
  await reopened.goto('/');
  return reopened;
}

test('没有退出回调时重新打开 PWA，直接恢复刷题题号和未提交的选项',async({page,context})=>{
  await context.addInitScript(()=>{
    window.addEventListener('pagehide',event=>event.stopImmediatePropagation(),true);
    document.addEventListener('visibilitychange',event=>event.stopImmediatePropagation(),true);
  });
  await page.goto('/');
  await page.getByRole('button',{name:'开始顺序刷题'}).click();
  await page.getByRole('button',{name:'打开答题卡'}).click();
  await page.getByRole('button',{name:'第 12 题',exact:true}).click();
  await page.locator('.option').first().click();
  const prompt=await page.locator('.question-prompt').textContent();
  const option=await page.locator('.option.selected').textContent();
  expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).screen,VIEW_KEY)).toBe('quiz');
  const reopened=await reopen(page,context);
  await expect(reopened.locator('.question-prompt')).toHaveText(prompt);
  await expect(reopened.locator('.quiz-progress strong')).toHaveText('12');
  await expect(reopened.locator('.option.selected')).toHaveText(option);
  await expect(reopened.locator('.topbar')).toHaveCount(0);
});

test('离线冷启动恢复 C 类考试，保留题序、答案和原截止时间',async({page,context})=>{
  await page.goto('/?class=C');
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);
  await page.locator('.bottom-nav').getByRole('link',{name:'模拟考试'}).click();
  await page.getByRole('button',{name:'开始模拟考试'}).click();
  await page.getByRole('button',{name:'答题卡',exact:true}).click();
  await page.getByRole('button',{name:'第 34 题',exact:true}).click();
  await page.locator('.option').first().click();
  const key='huhao-radio:c:progress:v1';
  const original=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).exam,key);
  // A stale preference must not select a different bank from the saved screen.
  await page.evaluate(()=>localStorage.setItem('huhao-radio:class:v1','A'));
  await context.setOffline(true);
  const reopened=await reopen(page,context);
  await expect(reopened.locator('.quiz-progress strong')).toHaveText('34');
  await expect(reopened.locator('#timer')).toBeVisible();
  await expect(reopened.locator('.option.selected')).toHaveCount(1);
  expect(await reopened.evaluate(key=>JSON.parse(localStorage.getItem(key)).exam,key)).toEqual(original);
});

test('恢复成绩和错题回顾的位置，返回首页后不再自动进入答题',async({page,context})=>{
  await page.goto('/#exam');
  await page.getByRole('button',{name:'开始模拟考试'}).click();
  await page.getByRole('button',{name:'交卷',exact:true}).click();
  await page.getByRole('button',{name:'确认交卷',exact:true}).click();
  await page.reload();
  await expect(page.locator('.result-card')).toBeVisible();
  await page.getByRole('button',{name:'只看错题'}).click();
  await page.getByRole('button',{name:'下一题'}).click();
  const prompt=await page.locator('.question-prompt').textContent();
  const reopened=await reopen(page,context);
  await expect(reopened.locator('.question-prompt')).toHaveText(prompt);
  await expect(reopened.locator('.quiz-progress strong')).toHaveText('2');
  await expect(reopened.locator('.answer-feedback')).toBeVisible();
  await reopened.getByRole('button',{name:'考试结果',exact:true}).click();
  await reopened.getByRole('button',{name:'返回模拟考试'}).click();
  await reopened.reload();
  await expect(reopened.getByRole('heading',{name:'A 类模拟考试',exact:true})).toBeVisible();
  await expect(reopened.locator('.immersive')).toHaveCount(0);
});

test('错题搜索和页面滚动位置在重新打开后恢复',async({page,context})=>{
  await page.goto('/');
  await page.evaluate(key=>{
    const state=JSON.parse(localStorage.getItem(key)) || {schema:1,classId:'A',records:{},wrong:{},days:{},practice:null,exam:null,history:[]};
    for(let i=1;i<=40;i++)state.wrong[`MC1-${String(i).padStart(4,'0')}`]=true;
    localStorage.setItem(key,JSON.stringify(state));
  },progressKey);
  await page.reload();
  await page.locator('.bottom-nav').getByRole('link',{name:'错题本'}).click();
  await page.getByRole('searchbox',{name:'搜索错题'}).fill('MC1');
  await page.evaluate(()=>window.scrollTo(0,600));
  await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).scrollY,VIEW_KEY)).toBe(600);
  const reopened=await reopen(page,context);
  await expect(reopened.getByRole('searchbox',{name:'搜索错题'})).toHaveValue('MC1');
  await expect.poll(()=>reopened.evaluate(()=>window.scrollY)).toBe(600);
  // Explicit links take precedence over the previous screen.
  await reopened.goto('/#profile');
  await expect(reopened.getByRole('heading',{name:'学习，有迹可循。'})).toBeVisible();
  await reopened.goto('/?class=B');
  await expect(reopened.getByRole('heading',{name:'业余无线电考试在线题库'})).toBeVisible();
  await expect(reopened.getByRole('button',{name:'B 类',exact:true})).toHaveAttribute('aria-pressed','true');
});

test('未来版本、未知页面或已失效的会话均回首页，学习记录保留',async({page,context})=>{
  await context.addInitScript(()=>{
    window.addEventListener('pagehide',event=>event.stopImmediatePropagation(),true);
    document.addEventListener('visibilitychange',event=>event.stopImmediatePropagation(),true);
  });
  await page.goto('/');
  await expect(page.locator('.connection')).toHaveText('离线已就绪');
  await page.getByRole('button',{name:'开始顺序刷题'}).click();
  await page.locator('.option').first().click();
  const original=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),progressKey);
  const view=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),VIEW_KEY);
  for(const invalid of [{...view,schema:99},{...view,screen:'removed-route'},{...view,sessionId:'removed-session'}]){
    await page.evaluate(({key,invalid})=>localStorage.setItem(key,JSON.stringify(invalid)),{key:VIEW_KEY,invalid});
    await page.reload();
    await expect(page.getByRole('heading',{name:'业余无线电考试在线题库'})).toBeVisible();
    expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),progressKey)).toEqual(original);
  }
  for(const tab of ['exam','wrong','profile']){
    await page.goto(`/#${tab}`);
    await page.evaluate(({key,view,tab})=>localStorage.setItem(key,JSON.stringify({...view,schema:99,tab})),{key:VIEW_KEY,view,tab});
    await page.reload();
    await expect(page.getByRole('heading',{name:'业余无线电考试在线题库'})).toBeVisible();
  }
  await page.goto('/#removed-route');
  await expect(page.getByRole('heading',{name:'业余无线电考试在线题库'})).toBeVisible();
  await page.getByRole('button',{name:'继续上次练习'}).click();
  await page.evaluate(key=>{
    const state=JSON.parse(localStorage.getItem(key));
    state.practice.ids[0]='removed-question';
    localStorage.setItem(key,JSON.stringify(state));
  },progressKey);
  await page.reload();
  await expect(page.getByRole('heading',{name:'业余无线电考试在线题库'})).toBeVisible();
  await expect(page.locator('.storage-warning')).toHaveCount(0);
});
