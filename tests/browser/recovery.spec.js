import {test, expect} from '@playwright/test';

const key='radio-a:progress:v1';

test('强制更新绕过缓存、保留记录，注销后从网络返回首页',async({page})=>{
  await page.goto('/');
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);
  await page.getByRole('button',{name:'开始顺序刷题'}).click();
  await page.locator('.option').first().click();
  await page.getByRole('button',{name:'确认答案'}).click();
  const before=await page.evaluate(key=>localStorage.getItem(key),key);
  expect(await page.evaluate(async()=>{
    for(const name of await caches.keys()){
      if(await (await caches.open(name)).match('/force-update/')) return true;
    }
    return false;
  })).toBe(false);
  await page.evaluate(async()=>{
    const stale=await caches.open('radio-a-stale');
    await stale.put('/force-update/',new Response('错误的恢复页缓存'));
    await caches.open('other-app-cache');
  });
  const response=await page.goto('/force-update/');
  expect((await response.text()).includes('错误的恢复页缓存')).toBe(false);
  await expect(page.getByRole('heading',{name:'清理完成'})).toBeVisible();
  expect(await page.evaluate(()=>caches.keys())).toEqual(['other-app-cache']);
  expect(await page.evaluate(()=>navigator.serviceWorker.getRegistrations().then(items=>items.length))).toBe(0);
  expect(await page.evaluate(key=>localStorage.getItem(key),key)).toBe(before);
  const homeResponse=await page.waitForResponse(response=>new URL(response.url()).searchParams.has('force-update') && response.request().isNavigationRequest());
  expect(homeResponse.fromServiceWorker()).toBe(false);
  await expect(page.getByRole('heading',{name:'业余无线电考试在线题库'})).toBeVisible();
  expect(JSON.parse(await page.evaluate(key=>localStorage.getItem(key),key)).records).toEqual(JSON.parse(before).records);
});

test('缓存删除失败时显示错误并停止跳转，可重新尝试',async({page})=>{
  await page.addInitScript(()=>{
    const original=CacheStorage.prototype.delete;
    CacheStorage.prototype.delete=function(name){
      if(!sessionStorage.getItem('retry-delete')) return Promise.reject(new Error('测试缓存删除失败'));
      return original.call(this,name);
    };
  });
  await page.goto('/');
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await page.goto('/force-update/');
  await expect(page.getByRole('heading',{name:'暂未完成更新'})).toBeVisible();
  await expect(page.getByRole('status')).toContainText('测试缓存删除失败');
  await page.clock.install();
  await page.clock.fastForward(5000);
  expect(new URL(page.url()).pathname).toBe('/force-update/');
  await page.evaluate(()=>sessionStorage.setItem('retry-delete','1'));
  await page.getByRole('button',{name:'重新尝试'}).click();
  await expect(page.getByRole('heading',{name:'清理完成'})).toBeVisible();
});
