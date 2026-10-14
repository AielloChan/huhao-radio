import {test, expect} from '@playwright/test';

async function ready(page) {
  await page.goto('/');
  await expect(page.locator('.connection')).toHaveText('离线已就绪');
}
async function questionMotion(page) {
  return page.locator('.question-card').evaluate(el=>el.getAnimations().map(animation=>animation.effect.getKeyframes()[0].transform));
}
async function completedPractice(page) {
  await page.getByRole('button',{name:'开始顺序刷题'}).click();
  await page.evaluate(()=>{
    const key='radio-a:progress:v1';
    const state=JSON.parse(localStorage.getItem(key));
    state.practice.checked=Object.fromEntries(state.practice.ids.slice(0,20).map(id=>[id,true]));
    localStorage.setItem(key,JSON.stringify(state));
  });
  await page.reload();
  await expect(page.locator('.quiz-progress strong')).toHaveText('1');
}

test('切题方向、题号进退与底部固定操作一致，动画不延迟保存',async({page})=>{
  await ready(page);
  await completedPractice(page);
  await page.getByRole('button',{name:'打开答题卡'}).click();
  await page.getByRole('button',{name:'第 9 题',exact:true}).click();
  await expect(page.locator('.quiz-progress strong')).toHaveText('9');
  const footer=await page.locator('.quiz-actions').boundingBox();
  const width=await page.locator('.quiz-progress strong').evaluate(el=>el.getBoundingClientRect().width);
  await page.getByRole('button',{name:'上一题'}).click();
  expect((await questionMotion(page)).some(transform=>transform.includes('-24px'))).toBe(true);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('radio-a:progress:v1')).practice.index)).toBe(7);
  await expect(page.locator('.quiz-progress strong')).toHaveText('8');
  await page.getByRole('button',{name:'下一题'}).click();
  expect((await questionMotion(page)).some(transform=>transform.includes('24px') && !transform.includes('-24px'))).toBe(true);
  await expect(page.locator('.quiz-progress strong')).toHaveText('9');
  await page.getByRole('button',{name:'下一题'}).click();
  await expect(page.locator('.number-reel')).toHaveCount(1);
  expect(await page.locator('.quiz-progress strong').evaluate(el=>el.getBoundingClientRect().width)).toBe(width);
  await expect(page.locator('.quiz-progress strong')).toHaveText('10');
  expect(await page.locator('.quiz-actions').boundingBox()).toEqual(footer);
});

test('快速连续切题只保留最后题目，状态刷新不重播，动画正常收尾',async({page})=>{
  await ready(page);
  await completedPractice(page);
  await page.evaluate(()=>{
    for(let i=0;i<8;i++)document.querySelector('[data-action="next"]').click();
  });
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('radio-a:progress:v1')).practice.index)).toBe(8);
  await expect(page.locator('.quiz-progress strong')).toHaveText('9');
  await expect(page.locator('.number-reel')).toHaveCount(0);
  await page.evaluate(()=>window.dispatchEvent(new Event('online')));
  expect(await questionMotion(page)).toEqual([]);
  expect(await page.evaluate(()=>document.getAnimations().every(animation=>animation.effect.target.isConnected))).toBe(true);
});

test('减少动态效果立即停止切题、数字和首页持续动画，功能仍正常',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await ready(page);
  expect(await page.locator('.radio-unit').evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
  await completedPractice(page);
  await page.getByRole('button',{name:'下一题'}).click();
  await expect(page.locator('.quiz-progress strong')).toHaveText('2');
  expect(await questionMotion(page)).toEqual([]);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.getByRole('button',{name:'下一题'}).click();
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(page.locator('.number-reel')).toHaveCount(0);
  await expect(page.locator('.quiz-progress strong')).toHaveText('3');
  expect(await questionMotion(page)).toEqual([]);
});

test('首页电波扩散与电台运动在滚出视口后暂停，页面切换有轻量过渡',async({page})=>{
  await ready(page);
  await expect(page.locator('.radio-art')).toHaveClass(/is-motion-visible/);
  const waves=page.locator('.radio-art .orbit');
  expect(await waves.evaluateAll(elements=>elements.every(el=>getComputedStyle(el).animationName==='radio-wave'))).toBe(true);
  await page.evaluate(()=>window.scrollTo(0,1000));
  await expect(page.locator('.radio-art')).not.toHaveClass(/is-motion-visible/);
  expect(await waves.evaluateAll(elements=>elements.every(el=>getComputedStyle(el).animationPlayState==='paused'))).toBe(true);
  await page.locator('.bottom-nav').getByRole('link',{name:'模拟考试'}).click();
  expect(await page.locator('#main').evaluate(el=>el.getAnimations().length)).toBeGreaterThan(0);
  await expect(page.getByRole('heading',{name:'A 类模拟考试',exact:true})).toBeVisible();
});
