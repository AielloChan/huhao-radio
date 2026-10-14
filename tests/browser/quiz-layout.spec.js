import {test, expect} from '@playwright/test';
import {VIEW_KEY} from '../../src/view-state.js';
import bank from '../../data/questions.json' with {type:'json'};
const longest=bank.questions.reduce((a,b)=>a.prompt.length+a.options.reduce((n,o)=>n+o.text.length,0)>b.prompt.length+b.options.reduce((n,o)=>n+o.text.length,0)?a:b);

for(const viewport of [{width:390,height:844},{width:375,height:667},{width:844,height:390},{width:1280,height:600}]){
  test(`答题区独立滚动，顶部和底部按钮保持固定 ${viewport.width}×${viewport.height}`,async({page})=>{
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.getByRole('button',{name:'开始顺序刷题'}).click();
    const number=await page.evaluate(id=>JSON.parse(localStorage.getItem('radio-a:progress:v1')).practice.ids.indexOf(id)+1,longest.id);
    await page.getByRole('button',{name:'打开答题卡'}).click();
    await page.getByRole('button',{name:`第 ${number} 题`,exact:true}).click();
    const footer=page.locator('.quiz-actions');
    const header=page.locator('.quiz-top');
    const before=await footer.boundingBox();
    expect(before.y+before.height).toBeLessThanOrEqual(viewport.height);
    expect(viewport.height-before.y-before.height).toBeLessThanOrEqual(30);
    const headerBefore=await header.boundingBox();
    const content=page.getByRole('region',{name:'题目与答案'});
    expect(await content.evaluate(el=>el.scrollHeight>el.clientHeight)).toBe(true);
    await content.evaluate(el=>el.scrollTop=el.scrollHeight);
    await expect.poll(()=>content.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
    expect(await footer.boundingBox()).toEqual(before);
    expect(await header.boundingBox()).toEqual(headerBefore);
    expect(await page.evaluate(()=>window.scrollY)).toBe(0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.locator('.option').last().click();
    await page.getByRole('button',{name:'确认答案'}).click();
    await expect(page.locator('.answer-feedback')).toBeInViewport();
    expect(await footer.boundingBox()).toEqual(before);
    await page.getByRole('button',{name:'下一题'}).click();
    await expect(content).toHaveJSProperty('scrollTop',0);
  });
}

test('内部滚动在选择选项、状态刷新和冷启动后保留，退出后首页正常滚动',async({page,context})=>{
  await page.setViewportSize({width:390,height:667});
  await page.goto('/');
  await expect(page.locator('.connection')).toHaveText('离线已就绪');
  await page.getByRole('button',{name:'开始顺序刷题'}).click();
  const content=page.getByRole('region',{name:'题目与答案'});
  await page.locator('.option').last().scrollIntoViewIfNeeded();
  const offset=await content.evaluate(el=>el.scrollTop);
  expect(offset).toBeGreaterThan(0);
  await page.locator('.option').last().click();
  await expect(content).toHaveJSProperty('scrollTop',offset);
  await page.evaluate(()=>window.dispatchEvent(new Event('online')));
  await expect(content).toHaveJSProperty('scrollTop',offset);
  await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).scrollY,VIEW_KEY)).toBe(offset);
  await page.close();
  const reopened=await context.newPage();
  await reopened.goto('/');
  const restored=reopened.getByRole('region',{name:'题目与答案'});
  await expect(restored).toHaveJSProperty('scrollTop',offset);
  await reopened.getByRole('button',{name:'返回',exact:true}).click();
  await reopened.evaluate(()=>window.scrollTo(0,400));
  await expect.poll(()=>reopened.evaluate(()=>window.scrollY)).toBe(400);
});

test('附图延迟加载时，重绘题目仍保留内部滚动位置',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:667},serviceWorkers:'block'});
  try{
    const page=await context.newPage();
    await context.route('**/question-images/**',async route=>{
      await new Promise(resolve=>setTimeout(resolve,150));
      await route.continue();
    });
    await page.goto('http://localhost:4173/');
    await page.getByRole('button',{name:'开始顺序刷题'}).click();
    const number=await page.evaluate(()=>JSON.parse(localStorage.getItem('radio-a:progress:v1')).practice.ids.indexOf('MC1-0665')+1);
    await page.getByRole('button',{name:'打开答题卡'}).click();
    await page.getByRole('button',{name:`第 ${number} 题`,exact:true}).click();
    const image=page.locator('.question-figure img');
    await expect.poll(()=>image.evaluate(el=>el.complete && el.naturalWidth>0)).toBe(true);
    const content=page.getByRole('region',{name:'题目与答案'});
    await content.evaluate(el=>el.scrollTop=el.scrollHeight);
    const offset=await content.evaluate(el=>el.scrollTop);
    expect(offset).toBeGreaterThan(0);
    await page.evaluate(()=>{
      window.dispatchEvent(new Event('online'));
      window.dispatchEvent(new Event('online'));
    });
    await expect.poll(()=>image.evaluate(el=>el.complete && el.naturalWidth>0)).toBe(true);
    await expect(content).toHaveJSProperty('scrollTop',offset);
    await page.locator('.option').last().click();
    await expect(content).toHaveJSProperty('scrollTop',offset);
  }finally{await context.close();}
});
