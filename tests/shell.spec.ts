import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const routes = ['/', '/how-it-works', '/compatibility', '/pricing', '/demo/calls', '/demo/live', '/demo/calls/delivery-example', '/sign-in', '/staff-sign-in'];

test('local navigation opens the inbox, a transcript, and all four simulated controls', async ({ page }) => {
  const externalRequests: string[] = [];
  const errors: string[] = [];
  page.on('request', request => { if (new URL(request.url()).hostname !== '127.0.0.1') externalRequests.push(request.url()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('link', { name: 'Explore the demo', exact: true }).click();
  await expect(page.getByText('Local simulation.', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: /Jordan.*Delivery company/ }).click();
  await expect(page.getByRole('heading', { name: 'The conversation' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Schedule callback' })).toBeVisible();
  await page.goto('/demo/live');
  for (const name of ['Insider', 'Gavel', 'Audible', 'Directory']) await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  expect(externalRequests).toEqual([]);
  expect(errors).toEqual([]);
});
test('private trees reject anonymous and forged role/demo input without reflecting redirects', async ({ request }) => {
  for (const prefix of ['/app', '/ops']) {
    for (const suffix of ['', '/calls', '/call-console/other-workspace', '/customers/private']) {
      for (const forged of [false, true]) {
        const response = await request.get(`${prefix}${suffix}?demo=true&role=platform_admin&next=https://example.com`, {
          maxRedirects: 0,
          headers: forged ? { cookie: 'role=platform_admin; tenant_admin=true; demo=true', authorization: 'Bearer forged' } : {},
        });
        expect(response.status()).toBe(307);
        expect(response.headers().location).toBe(prefix === '/ops' ? '/staff-sign-in' : '/sign-in');
        expect(response.headers()['x-robots-tag']).toContain('noindex');
        expect(await response.text()).not.toContain('Jordan');
      }
    }
  }
});

test('preview does not collect credentials and protects indexing and media permissions', async ({ page, request }) => {
  for (const route of ['/sign-in', '/staff-sign-in']) {
    await page.goto(route);
      if (route.startsWith('/demo')) await expect(page.locator('.workspace-heading')).toBeVisible();
    await expect(page.locator('input, form')).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  }
  const response = await request.get('/');
  expect(response.headers()['permissions-policy']).toContain('microphone=()');
  expect(await (await request.get('/robots.txt')).text()).toContain('Disallow: /');
  const missing = await request.post('/api/v1/calls/example/gavel');
  expect(missing.status()).toBe(404);
});

test('keyboard skip link and mobile disclosure work without a mouse', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
  await page.getByRole('button', { name: 'Menu' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Menu' })).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'How it works', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Menu' })).toBeFocused();
  await expect(page.getByRole('navigation', { name: 'Public navigation' })).toBeHidden();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/how-it-works$/);
  await expect(page.getByRole('navigation', { name: 'Public navigation' })).toBeHidden();
});

for (const width of [360, 390, 768, 1024, 1440]) {
  test(`routes fit a ${width}px viewport and keep one main heading`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      await page.goto(route);
      if (route.startsWith('/demo')) await expect(page.locator('.workspace-heading')).toBeVisible();
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
    if (width === 1440) {
      await page.goto('/');
      await page.screenshot({ path: 'test-results/home-1440.png', fullPage: true });
      await page.goto('/demo/calls');
      await page.screenshot({ path: 'test-results/calls-1440.png', fullPage: true });
    }
    if (width === 390) {
      await page.goto('/');
      await page.screenshot({ path: 'test-results/home-390.png', fullPage: true });
    }
  });
}

for (const width of [390, 1440]) {
  test(`automated WCAG checks at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      await page.goto(route);
      if (route.startsWith('/demo')) await expect(page.locator('.workspace-heading')).toBeVisible();
      const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(result.violations, route).toEqual([]);
    }
  });
}

test('large text and reduced motion preserve readable layouts', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 720, height: 900 });
  for (const route of ['/', '/pricing', '/demo/calls', '/staff-sign-in']) {
    await page.goto(route);
      if (route.startsWith('/demo')) await expect(page.locator('.workspace-heading')).toBeVisible();
    await page.addStyleTag({ content: 'html { font-size: 200%; }' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test('unknown synthetic call cannot resolve to a different example', async ({ page }) => {
  await page.goto('/demo/calls/not-a-real-call');
  await expect(page.getByRole('heading', { name: 'Message unavailable' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The conversation' })).toHaveCount(0);
});

