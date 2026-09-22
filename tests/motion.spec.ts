import { test, expect, type Page } from '@playwright/test';
import { timeline } from '../src/lib/landing/timeline';

async function scrub(page: Page, position: number) {
  await page.evaluate(value => {
    const element = document.querySelector<HTMLElement>('.call-story')!;
    const offset = innerWidth < 768 ? 70 : 80;
    scrollTo({ top: element.offsetTop - offset + value / 9 * (element.offsetHeight - innerHeight + offset), behavior: 'instant' });
  }, position);
  await expect.poll(async () => Number(await page.locator('.story-scene').getAttribute('data-progress'))).toBeCloseTo(position / 9, 3);
}

test('material tracing returns to solid, descends between chapters, and rewinds exactly', () => {
  for (const position of [0, 1.35, 2.4, 3.4, 4.5, 5.55, 6.6, 7.4, 8.4, 8.8, 9]) expect(timeline(position / 9).outline).toBe(0);
  for (const position of [.24, 3.24, 7.24]) {
    const frame = timeline(position / 9);
    expect(frame.outline).toBe(1); expect(frame.traceDraw).toBeGreaterThan(.96);
  }
  const samples = Array.from({ length: 901 }, (_, index) => timeline(index / 900));
  for (let index = 900; index >= 0; index--) expect(timeline(index / 900)).toEqual(samples[index]);
  expect(timeline(.81 / 9).pose[1]).toBeLessThan(-.5);
  expect(timeline(3.4 / 9).tone).not.toEqual(timeline(5.4 / 9).tone);
  expect(timeline(1).formReveal).toBe(1);
});

test('rendered phone traces and reforms with pointer depth, preserving the native cursor', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/'); const scene = page.locator('.story-scene');
  await expect(scene).toHaveAttribute('data-rendered', 'true');
  await page.screenshot({ path: 'test-results/motion-rendered.png' });
  await page.mouse.move(1100, 380);
  await expect(page.locator('.story-pointer')).toHaveAttribute('data-visible', 'true');
  await expect.poll(async () => Number((await scene.getAttribute('data-pointer'))!.split(',')[0])).toBeGreaterThan(.4);
  await expect(page.locator('body')).not.toHaveCSS('cursor', 'none');
  await page.getByRole('button', { name: 'Follow the call', exact: true }).hover();
  await expect(page.locator('.story-pointer')).toHaveAttribute('data-hover', 'true');
  await page.screenshot({ path: 'test-results/motion-pointer.png' });
  await page.mouse.move(0, 0);
  await expect(page.locator('.story-pointer')).toHaveAttribute('data-visible', 'false');
  await scrub(page, .24);
  await expect(scene).toHaveAttribute('data-outline', '1.000');
  await expect(page.locator('.story-css-renderer')).toHaveCSS('opacity', '0');
  await page.screenshot({ path: 'test-results/motion-outline.png' });
  await scrub(page, 1.35);
  await expect(scene).toHaveAttribute('data-outline', '0.000');
  await expect(page.locator('.story-css-renderer')).toHaveCSS('opacity', '1');
  await page.screenshot({ path: 'test-results/motion-reformed.png' });
  await scrub(page, .24);
  await expect(scene).toHaveAttribute('data-outline', '1.000');
  await scrub(page, 0);
  await expect(scene).toHaveAttribute('data-outline', '0.000');
  await page.getByRole('button', { name: 'Follow the call', exact: true }).focus();
  await expect(page.getByRole('button', { name: 'Follow the call', exact: true })).toBeFocused();
  expect(errors).toEqual([]);
});

test('phone microanimations preserve handoff order and leave all four controls inside the device', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.goto('/');
  await expect(page.locator('.story-scene')).toHaveAttribute('data-rendered', 'true');
  await scrub(page, 5.04);
  const steps = page.locator('.handoff-screen .handoff-step');
  await expect(steps.nth(1)).toHaveCSS('opacity', '0');
  await expect(page.locator('.handoff-screen .handoff-active')).toHaveCSS('opacity', '0');
  await scrub(page, 5.28);
  await expect(steps.nth(1)).toHaveCSS('opacity', '1');
  await expect(page.locator('.handoff-screen .handoff-active')).toHaveCSS('opacity', '0');
  await scrub(page, 5.55);
  await expect(page.locator('.handoff-screen .handoff-active')).toHaveCSS('opacity', '1');
  await page.screenshot({ path: 'test-results/motion-gavel.png' });
  await scrub(page, 5.04);
  await expect(steps.nth(1)).toHaveCSS('opacity', '0');
  await expect(page.locator('.handoff-screen .handoff-active')).toHaveCSS('opacity', '0');
  await scrub(page, 4.10);
  const earlyGuidance = await page.locator('.audible-panel p').textContent();
  await scrub(page, 4.52);
  await expect(page.locator('.audible-panel p')).toHaveText('Ask whether 10 AM works.');
  expect(earlyGuidance!.length).toBeLessThan(23);
  await page.screenshot({ path: 'test-results/motion-audible.png' });
  for (const chapter of [1, 2, 3, 4, 5, 6]) {
    await scrub(page, chapter + .52);
    expect(await page.locator('.story-phone-ui').evaluate(element => element.scrollHeight <= element.clientHeight), `Chapter ${chapter} must fit the display`).toBe(true);
    expect(await page.locator('.phone-control-bar').evaluate(element => { const control = element as HTMLElement; return control.offsetTop + control.offsetHeight <= 620; })).toBe(true);
  }
});

test('motion works in light mode on touch and hands over to the untransformed form', async ({ browser }) => {
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:3210', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await context.addInitScript(() => localStorage.setItem('redial-appearance', 'light'));
  const page = await context.newPage(); await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/light/);
  await expect(page.locator('.story-scene')).toHaveAttribute('data-rendered', 'true');
  for (const value of [0, .64, 3.4, 4.52]) {
    await scrub(page, value);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/motion-light-mobile-${value}.png` });
  }
  await page.locator('a[href="#onboarding"]').click();
  await expect(page.locator('.landing-onboarding')).not.toHaveAttribute('inert');
  await expect(page.getByLabel('Your name', { exact: true })).toBeVisible();
  await expect(page.locator('.story-pointer')).not.toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.story-scene canvas')).toHaveCount(0);
  await expect(page.locator('.story-pointer')).toHaveCount(0);
  await page.getByLabel('Your name', { exact: true }).fill('Motion Review');
  await expect(page.getByLabel('Your name', { exact: true })).toHaveValue('Motion Review');
  await context.close();
});

