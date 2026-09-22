import { test, expect, type Page } from '@playwright/test';

async function scrub(page: Page, position: number) {
  await page.evaluate(value => {
    const story = document.querySelector<HTMLElement>('.call-story')!, offset = innerWidth < 768 ? 70 : 80;
    scrollTo({ top: story.offsetTop - offset + value / 9 * (story.offsetHeight - innerHeight + offset), behavior: 'instant' });
  }, position);
  await expect.poll(async () => Number(await page.locator('.story-scene').getAttribute('data-progress'))).toBeCloseTo(position / 9, 3);
}

for (const theme of ['dark', 'light']) for (const width of [390, 768, 1440]) test(`form stays on the phone through zoom and rewind: ${theme}, ${width}px`, async ({ page }) => {
  await page.addInitScript(value => localStorage.setItem('redial-appearance', value), theme);
  await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  const scene = page.locator('.story-scene'), viewport = page.locator('.onboarding-viewport'), form = page.locator('.onboard-card');
  await expect(scene).toHaveAttribute('data-rendered', 'true');
  await expect(form).toHaveCount(1);
  await page.locator('#setup-fullName').evaluate(element => { element.dataset.zoomIdentity = 'original'; });
  let previousWidth = 0;
  for (const position of [8, 8.25, 8.6, 8.95, 8.998]) {
    await scrub(page, position);
    await expect(scene).toHaveAttribute('data-outline', '0.000');
    await expect(scene).toHaveAttribute('data-trace', '0.000');
    await expect(viewport).toHaveAttribute('data-embedded', 'true');
    await expect(page.locator('.landing-onboarding')).toHaveAttribute('inert', '');
    const phone = (await page.locator('.story-screen-host').boundingBox())!, actual = (await viewport.boundingBox())!;
    expect(Math.abs(actual.x - phone.x)).toBeLessThan(1);
    expect(Math.abs(actual.y - phone.y)).toBeLessThan(1);
    expect(Math.abs(actual.width - phone.width)).toBeLessThan(1);
    expect(actual.width).toBeGreaterThanOrEqual(previousWidth); previousWidth = actual.width;
    if (position !== 8.998) await page.screenshot({ path: `test-results/form-zoom-${theme}-${width}-${position}.png` });
  }
  const before = (await viewport.boundingBox())!;
  await scrub(page, 9);
  await expect(viewport).toHaveAttribute('data-embedded', 'false');
  await expect(page.locator('.story-scene canvas')).toHaveCSS('opacity', '1');
  await expect(page.locator('.landing-onboarding')).not.toHaveAttribute('inert');
  const after = (await viewport.boundingBox())!;
  expect(Math.abs(after.x - before.x)).toBeLessThan(2); expect(Math.abs(after.y - before.y)).toBeLessThan(2);
  expect(Math.abs(after.width - before.width)).toBeLessThan(1);
  await page.getByLabel('Your name', { exact: true }).fill('Avery Zoom');
  await page.getByLabel('Your email', { exact: true }).fill('avery@example.test');
  await page.screenshot({ path: `test-results/form-zoom-${theme}-${width}-ready.png` });
  await page.locator('.onboard-card button[type="submit"]').scrollIntoViewIfNeeded();
  await expect.poll(() => viewport.evaluate(element => getComputedStyle(element, '::before').opacity)).toBe('1');
  await page.screenshot({ path: `test-results/form-zoom-${theme}-${width}-lower-fields.png` });
  await scrub(page, 8.25);
  await expect(viewport).toHaveAttribute('data-embedded', 'true');
  await scrub(page, 9);
  await expect(page.getByLabel('Your name', { exact: true })).toHaveValue('Avery Zoom');
  await expect(page.locator('#setup-fullName')).toHaveAttribute('data-zoom-identity', 'original');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('reduced motion and WebGL loss release the embedded form without losing input', async ({ page }) => {
  await page.goto('/#onboarding');
  await expect(page.locator('.landing-onboarding')).not.toHaveAttribute('inert');
  await page.getByLabel('Your name', { exact: true }).fill('Avery Fallback');
  await scrub(page, 8.6);
  await expect(page.locator('.onboarding-viewport')).toHaveAttribute('data-embedded', 'true');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.landing-experience')).toHaveAttribute('data-motion', 'reduced');
  await expect(page.locator('.onboarding-viewport')).toHaveCSS('transform', 'none');
  await expect(page.getByLabel('Your name', { exact: true })).toHaveValue('Avery Fallback');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('.story-scene')).toHaveAttribute('data-rendered', 'true');
  await scrub(page, 8.6);
  await expect(page.locator('.onboarding-viewport')).toHaveAttribute('data-embedded', 'true');
  await page.locator('.story-scene canvas').dispatchEvent('webglcontextlost', { cancelable: true });
  await expect(page.locator('.landing-experience')).toHaveAttribute('data-motion', 'reduced');
  await expect(page.locator('.onboarding-viewport')).toHaveCSS('transform', 'none');
  await expect(page.getByLabel('Your name', { exact: true })).toHaveValue('Avery Fallback');
  await expect(page.locator('.onboard-card')).toHaveCount(1);
});
