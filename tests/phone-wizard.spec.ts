import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('Android walkthrough advances one step at a time without touching contacts or device APIs', async ({ page }) => {
  await page.goto('/demo/contacts');
  await expect(page.locator('.record-row').first()).toBeVisible();
  const before = await page.locator('.record-row').count();
  const writes: string[] = [];
  page.on('request', request => { if (request.method() === 'POST') writes.push(request.url()); });
  await page.getByRole('button', { name: 'Phone setup simulator' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toHaveAttribute('data-step','0');
  await page.getByRole('button',{name:'Start walkthrough'}).click();
  await expect(dialog).toHaveAttribute('data-step','1');
  await expect(dialog.getByRole('button',{name:'Continue',exact:true})).toBeDisabled();
  await expect.poll(()=>dialog.locator('.wizard-phone-screen').evaluate(el=>getComputedStyle(el).opacity)).toBe('1');
  await page.screenshot({path:'test-results/phone-wizard-desktop.png'});
  for (const action of ['Simulate scanning the QR','Simulate sign-in','Simulate adding shortcut','Simulate sharing contacts']) {
    await dialog.getByRole('button',{name:action,exact:true}).click();
    await expect(dialog.getByRole('status')).toBeVisible();
    if(action==='Simulate adding shortcut') {
      await expect.poll(()=>dialog.locator('.wizard-phone-screen').evaluate(el=>getComputedStyle(el).opacity)).toBe('1');
      await page.screenshot({path:'test-results/phone-wizard-spacing-desktop.png'});
    }
    await dialog.getByRole('button',{name:'Continue',exact:true}).click();
  }
  await expect(dialog).toHaveAttribute('data-step','5');
  await dialog.getByRole('button',{name:'Clear',exact:true}).click();
  await expect(dialog.getByRole('button',{name:'Simulate importing 0'})).toBeDisabled();
  await dialog.getByRole('button',{name:'Select all',exact:true}).click();
  await dialog.getByRole('button',{name:'Simulate importing 3'}).click();
  await dialog.getByRole('button',{name:'Continue',exact:true}).click();
  await expect(dialog).toHaveAttribute('data-step','6');
  await expect(dialog).toContainText('did not change your device');
  await dialog.getByRole('button',{name:'Replay walkthrough'}).click();
  await expect(dialog).toHaveAttribute('data-step','0');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button',{name:'Phone setup simulator'})).toBeFocused();
  expect(await page.locator('.record-row').count()).toBe(before);
  expect(writes).toEqual([]);
});

test('iPhone path supports skipping, back navigation, mobile layout and reduced motion', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/demo/contacts');
  await page.getByRole('button',{name:'Phone setup simulator'}).click();
  const dialog=page.getByRole('dialog');
  await dialog.getByRole('button',{name:/iPhone Safari browser/}).click();
  await dialog.getByRole('button',{name:'Start walkthrough'}).click();
  await expect(dialog).toHaveAttribute('data-device','iPhone');
  expect(await dialog.locator('.wizard-scan-line').evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
  for (const action of ['Simulate scanning the QR','Simulate sign-in']) {
    await dialog.getByRole('button',{name:action}).click();await dialog.getByRole('button',{name:'Continue',exact:true}).click();
  }
  await expect(dialog).toContainText('In Safari, open Share');
  await dialog.getByRole('button',{name:'Skip shortcut'}).click();
  await expect(dialog).toHaveAttribute('data-step','4');
  await expect(dialog).toContainText('browser picker is not available on iPhone');
  await dialog.getByRole('button',{name:'Back',exact:true}).click();
  await expect(dialog).toHaveAttribute('data-step','3');
  await dialog.getByRole('button',{name:'Skip shortcut'}).click();
  await page.screenshot({path:'test-results/phone-wizard-mobile.png'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect((await new AxeBuilder({page}).include('[role="dialog"]').withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
  await dialog.getByRole('button',{name:'Close phone setup'}).click();
  await expect(dialog).toHaveCount(0);
});
