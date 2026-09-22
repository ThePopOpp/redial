import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const toggle = 'Toggle light and dark mode';

test('appearance persists across the landing page, public pages, member and staff dashboards', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: toggle, exact: true }).click();
  await expect(page.locator('html')).toHaveClass('light');
  for (const route of ['/compatibility', '/demo/overview', '/demo/ops', '/#onboarding']) {
    await page.goto(route);
    await expect(page.locator('html')).toHaveClass('light');
    await expect(page.getByRole('button', { name: toggle, exact: true })).toBeVisible();
  }
  await page.reload();
  await expect(page.locator('html')).toHaveClass('light');
  await page.getByRole('button', { name: toggle, exact: true }).click();
  await expect(page.locator('html')).toHaveClass('dark');
  await page.goto('/demo/settings');
  await expect(page.locator('html')).toHaveClass('dark');
});

for (const theme of ['light', 'dark']) test(`custom callback calendar and time menus validate and persist in ${theme} mode`, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/demo/callbacks');
  if (theme === 'light') await page.getByRole('button', { name: toggle }).click();
  await expect(page.locator('html')).toHaveClass(theme);
  await page.getByRole('button', { name: 'Schedule callback' }).click();
  const dialog = page.getByRole('dialog', { name: 'Make time to reconnect', exact: true });
  await dialog.getByLabel('Name', { exact: true }).fill(`Calendar ${theme}`);
  await dialog.getByRole('button', { name: 'Save locally' }).click();
  await expect(dialog.getByRole('alert')).toHaveText('Choose a date and time for your reminder.');
  const date = dialog.locator('[data-slot=date-picker-trigger]');
  await expect(date).toBeFocused();
  await expect(page.locator('input[type=datetime-local], input[type=date], input[type=time]')).toHaveCount(0);
  await date.click();
  const calendar = page.getByRole('dialog', { name: 'Choose callback date' });
  await expect(calendar.getByRole('grid')).toBeVisible();
  await expect(calendar.getByRole('button', { name: 'Go to the next month' })).toBeVisible();
  const bounds = await calendar.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  await page.screenshot({ path: `test-results/calendar-${theme}-390.png`, fullPage: true });
  await calendar.getByRole('button', { name: 'Tomorrow', exact: true }).click();
  await expect(date).toBeFocused();
  await expect(dialog.getByRole('alert')).toHaveCount(0);
  // The calendar grid itself supports month navigation and keyboard selection.
  await date.click();
  await calendar.getByRole('button', { name: 'Go to the next month' }).click();
  await calendar.locator('.rdp-day:not(.rdp-outside) button').filter({ hasText: /^10$/ }).focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect(calendar).toHaveCount(0);
  await expect(dialog.locator('input[name=scheduledAt]')).toHaveValue(/-11T09:00$/);
  await date.click();
  await expect(calendar.locator('.rdp-selected')).toHaveText('11');
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  await page.keyboard.press('Escape');
  await dialog.getByRole('combobox', { name: 'Hour', exact: true }).click();
  await page.getByRole('option', { name: '03', exact: true }).click();
  await dialog.getByRole('combobox', { name: 'Minute', exact: true }).click();
  await page.getByRole('option', { name: '30', exact: true }).click();
  await dialog.getByRole('combobox', { name: 'AM or PM' }).click();
  await expect(page.getByRole('option', { name: 'AM', exact: true })).toBeFocused();
  await page.keyboard.press('End');
  await expect(page.getByRole('option', { name: 'PM', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  const canonical = await dialog.locator('input[name=scheduledAt]').inputValue();
  expect(canonical).toMatch(/T15:30$/);
  await dialog.getByLabel('What to discuss').fill('Calendar selection review');
  await dialog.getByRole('button', { name: 'Save locally' }).click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.record-row').filter({ hasText: `Calendar ${theme}` })).toContainText('Calendar selection review');
  await expect(page.locator('html')).toHaveClass(theme);
  await page.getByRole('button', { name: 'Schedule callback' }).click();
  await date.click();
  await page.keyboard.press('Escape');
  await expect(calendar).toHaveCount(0);
  await expect(date).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Schedule callback' })).toBeFocused();
});

for (const width of [390, 1440]) test(`light mode contrast and layout across public and dashboard forms at ${width}px`, async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: toggle }).click();
  for (const route of ['/#onboarding', '/how-it-works', '/demo/overview', '/demo/settings', '/demo/screening', '/demo/agent', '/demo/ops/settings', '/demo/ops/support']) {
    await page.goto(route);
    if (route.startsWith('/demo')) await expect(page.locator('.workspace-heading')).toBeVisible();
    await expect(page.locator('html')).toHaveClass('light');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), route).toBe(true);
    const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(audit.violations, route).toEqual([]);
    if (route === '/#onboarding') await page.locator('.onboard-card').screenshot({ path: `test-results/onboarding-light-${width}.png` });
    if (route === '/demo/overview') await page.screenshot({ path: `test-results/workspace-light-${width}.png`, fullPage: true });
  }
});
