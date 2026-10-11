import {test, expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

test('直接打开安装图标在线和离线均返回原图，未知路径保留 404',async({page,context})=>{
  await page.goto('/');
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);
  const iconPath=await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
  const expected=await readFile(new URL('../../public/icons/apple-touch-icon.png',import.meta.url));
  for(const offline of [false,true]){
    await context.setOffline(offline);
    const response=await page.goto(new URL(iconPath,'http://localhost:4173/').href);
    expect(response.fromServiceWorker()).toBe(true);
    expect(response.headers()['content-type']).toContain('image/png');
    expect(await response.body()).toEqual(expected);
    await expect(page.locator('img')).toBeVisible();
    expect(await page.locator('img').evaluate(img=>img.naturalWidth)).toBe(180);
    await page.goto('/?source=home-screen#practice');
    await expect(page.getByRole('heading',{name:'今天，也来一点电波。'})).toBeVisible();
  }
  await context.setOffline(false);
  const missing=await page.goto('/icons/missing.png');
  expect(missing.status()).toBe(404);
  await expect(page.getByText('正在接收信号…')).toHaveCount(0);
});
