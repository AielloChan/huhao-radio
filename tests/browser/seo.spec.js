import {test, expect} from '@playwright/test';

const origin = 'https://aiellochan.github.io/huhao-radio/';

test('无 JavaScript 也能阅读首页与三类题库，规范地址和站点地图一致',async({browser,request})=>{
  const context = await browser.newContext({javaScriptEnabled:false});
  const page = await context.newPage();
  try {
    await page.goto('http://localhost:4173/');
    await expect(page.getByRole('heading',{level:1})).toHaveText('业余无线电考试在线题库');
    const sitemap = await (await request.get('/sitemap.xml')).text();
    const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match=>match[1]);
    expect(urls).toEqual([origin, ...['a','b','c'].map(id=>`${origin}${id}/`)]);
    for (const [id,count] of [['A',683],['B',1143],['C',1282]]) {
      await page.getByRole('link',{name:`${id} 类题库与模拟考试 →`}).click();
      await expect(page.getByRole('heading',{level:1})).toHaveText(`业余无线电 ${id} 类考试题库`);
      await expect(page).toHaveTitle(new RegExp(`${count} 题`));
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href',`${origin}${id.toLowerCase()}/`);
      const data = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
      expect(data.url).toBe(`${origin}${id.toLowerCase()}/`);
      expect(data.breadcrumb.itemListElement[1].item).toBe(data.url);
      await page.locator('summary').first().click();
      await expect(page.locator('details[open] p')).not.toBeEmpty();
    }
  } finally { await context.close(); }
});

test('说明页可离线访问，入口选择 B 类且不覆盖已有 A 类记录',async({page,context})=>{
  await page.goto('/');
  await expect(page.getByRole('button',{name:/开始顺序刷题/})).toBeVisible();
  await page.getByRole('button',{name:'开始顺序刷题'}).click();
  await page.locator('.option').first().click();
  const savedA = await page.evaluate(()=>localStorage.getItem('radio-a:progress:v1'));
  await page.getByRole('button',{name:'返回',exact:true}).click();
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
  await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.getByRole('link',{name:'B 类题库与模拟考试 →'}).click();
  await expect(page.getByRole('heading',{level:1})).toHaveText('业余无线电 B 类考试题库');
  await page.reload();
  await page.getByRole('link',{name:'进入 B 类模拟考试',exact:true}).click();
  await expect(page.getByRole('heading',{name:'B 类模拟考试',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>localStorage.getItem('radio-a:progress:v1'))).toBe(savedA);
  expect(await page.evaluate(()=>new URL(location.href).searchParams.has('class'))).toBe(false);
  await page.reload();
  await expect(page.getByRole('heading',{name:'B 类模拟考试',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'A 类',exact:true}).click();
  await expect(page.getByRole('heading',{name:'A 类模拟考试',exact:true})).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading',{name:'A 类模拟考试',exact:true})).toBeVisible();
});
