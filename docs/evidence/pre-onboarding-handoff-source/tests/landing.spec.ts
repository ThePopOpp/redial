import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { timeline } from '../src/lib/landing/timeline';
import { initialDraft, validateStep, validateDraft } from '../src/lib/landing/onboarding';

async function scrollStory(page: Page, position: number) {
  await page.evaluate(value => {
    const story = document.querySelector<HTMLElement>('.call-story')!;
    const offset = window.innerWidth < 768 ? 70 : 80;
    window.scrollTo({ top: story.offsetTop - offset + value / 9 * (story.offsetHeight - innerHeight + offset), behavior: 'instant' });
  }, position);
  await expect(page.locator('.story-scene')).toHaveAttribute('data-progress', new RegExp(`^${(position / 9).toFixed(2).slice(0, -1)}`));
}
test('scroll timeline is deterministic and reverses every feature state', () => {
  const forward = Array.from({ length: 91 }, (_, index) => timeline(index / 90));
  for (let index = 90; index >= 0; index--) expect(timeline(index / 90)).toEqual(forward[index]);
  expect(timeline(1).formReveal).toBe(1);
  expect(timeline(1).sceneOpacity).toBe(0);
  expect(timeline(-1).position).toBe(0);
});
test('setup validates identity fields, disclosure and completion without granting activation', () => {
  expect(Object.keys(validateStep(initialDraft, 1))).toEqual(['fullName', 'email', 'phone', 'carrier']);
  expect(validateStep({ ...initialDraft, greeting: 'Hello, I am your friend and will answer.' }, 6).greeting).toContain('AI');
  expect(Object.keys(validateDraft({ ...initialDraft, step: 7, complete: true })).length).toBeGreaterThan(3);
});
test('Three.js journey renders, scrubs both ways and hands off to a real form', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await expect(page.locator('.landing-experience')).toHaveAttribute('data-motion', 'full');
  await expect(page.locator('.story-scene')).toHaveAttribute('data-rendered', 'true');
  await expect(page.locator('.story-scene canvas')).toBeVisible();
  await page.screenshot({ path: 'test-results/landing-hero-1440.png' });
  for (const [position, chapter] of [[2.2, 'transcript'], [3.2, 'insider'], [4.2, 'audible'], [5.2, 'gavel'], [6.2, 'directory'], [7.2, 'summary']] as const) {
    await scrollStory(page, position);
    await expect(page.locator('.call-story')).toHaveAttribute('data-chapter', chapter);
    await expect(page.locator(`.story-chapter#story-${chapter}`)).toBeVisible();
    if (chapter === 'insider' || chapter === 'gavel') await page.screenshot({ path: `test-results/landing-${chapter}-1440.png` });
  }
  await scrollStory(page, 8.85);
  await page.screenshot({ path: 'test-results/landing-zoom-1440.png' });
  await page.locator('a[href="#onboarding"]').click();
  await expect(page.locator('.landing-onboarding')).not.toHaveAttribute('inert');
  await expect(page.getByLabel('Your name', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/landing-onboarding-1440.png' });
  await scrollStory(page, 3.2);
  await expect(page.locator('.call-story')).toHaveAttribute('data-chapter', 'insider');
  await expect(page.locator('.story-screen-host')).toContainText('Your microphone stays off');
  expect(errors).toEqual([]);
});
test('seven-step setup saves real form input, resumes, and deletes independently of the demo', async ({ page }) => {
  await page.goto('/#onboarding');
  await expect(page.locator('.landing-onboarding')).not.toHaveAttribute('inert');
  const form = page.locator('.onboard-card');
  await form.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(form.getByText('Enter your name.', { exact: true })).toBeVisible();
  await form.getByLabel('Your name', { exact: true }).fill('Morgan Review');
  await form.getByLabel('Your email', { exact: true }).fill('morgan@example.test');
  await form.getByLabel('The number people call you on').fill('(480) 555-0142');
  await form.getByRole('combobox', { name: 'Who’s your carrier?' }).click();
  await page.getByRole('option', { name: 'T-Mobile', exact: true }).click();
  await form.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(form).toHaveAttribute('data-step', '2');
  await page.reload();
  await expect(form).toHaveAttribute('data-step', '2');
  await form.getByRole('radio', { name: /Give me a screened number/ }).check();
  await form.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(form).toHaveAttribute('data-step', '3');
  await expect(form).toContainText('No number is purchased or reserved');
  await form.getByRole('checkbox', { name: /saves my connection preference/ }).check();
  await form.getByRole('button', { name: 'Continue', exact: true }).click();
  await form.getByRole('checkbox', { name: /complete the route and fallback checks/ }).check();
  await form.getByRole('button', { name: 'Continue', exact: true }).click();
  await form.getByRole('radio', { name: 'Warm', exact: true }).check();
  await form.getByRole('button', { name: 'Continue', exact: true }).click();
  await form.getByRole('radio', { name: /Every call/ }).check();
  await form.getByLabel('Opening line').fill('Hi, you’ve reached Morgan’s AI assistant. What can I help you with?');
  await form.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(form).toHaveAttribute('data-step', '7');
  await expect(form).toContainText('Morgan Review');
  await expect(form).toContainText('Dedicated number');
  await form.getByRole('checkbox', { name: /Save my details on this computer/ }).check();
  await form.getByRole('button', { name: 'Save setup request', exact: true }).click();
  await expect(form).toHaveAttribute('data-complete', 'true');
  await expect(form).toContainText('Your number is not connected yet');
  await page.reload();
  await expect(form).toHaveAttribute('data-complete', 'true');
  await form.getByRole('button', { name: 'Delete saved details' }).click();
  await form.getByRole('button', { name: 'Delete my local draft' }).click();
  await expect(form).toHaveAttribute('data-step', '1');
  await expect(form.getByLabel('Your name', { exact: true })).toHaveValue('');
});
test('setup API enforces origin, session isolation, stale versions and completion rules', async ({ request, playwright }) => {
  const origin = 'http://127.0.0.1:3210';
  expect((await request.post('/api/onboarding', { data: { version: 0, draft: initialDraft } })).status()).toBe(403);
  expect((await request.get('/api/onboarding')).status()).toBe(200);
  const saved = await request.post('/api/onboarding', { headers: { origin }, data: { version: 0, draft: { ...initialDraft, fullName: 'Private Draft' } } });
  expect(saved.status()).toBe(201);
  expect(saved.headers()['set-cookie']).toContain('HttpOnly');
  expect(saved.headers()['set-cookie']).toContain('Path=/api/onboarding');
  const fresh = await playwright.request.newContext({ baseURL: origin });
  expect((await (await fresh.get('/api/onboarding')).json()).saved).toBe(null); await fresh.dispose();
  expect((await request.post('/api/onboarding', { headers: { origin }, data: { version: 0, draft: initialDraft } })).status()).toBe(409);
  expect((await request.post('/api/onboarding', { headers: { origin }, data: { version: 1, draft: { ...initialDraft, step: 7, complete: true } } })).status()).toBe(400);
  expect((await request.delete('/api/onboarding', { headers: { origin: 'https://example.com' } })).status()).toBe(403);
  expect((await request.delete('/api/onboarding', { headers: { origin } })).status()).toBe(200);
  expect((await (await request.get('/api/onboarding')).json()).saved).toBe(null);
});
test('mobile journey and reduced-motion onboarding stay accessible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('.story-scene')).toHaveAttribute('data-rendered', 'true');
  await page.screenshot({ path: 'test-results/landing-hero-390.png' });
  await scrollStory(page, 4.2);
  await page.screenshot({ path: 'test-results/landing-audible-390.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.landing-experience')).toHaveAttribute('data-motion', 'reduced');
  await expect(page.locator('.story-scene canvas')).toHaveCount(0);
  await page.goto('/#onboarding');
  await expect(page.getByLabel('Your name', { exact: true })).toBeVisible();
  const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(audit.violations).toEqual([]);
  await page.screenshot({ path: 'test-results/landing-onboarding-390.png' });
  await page.getByLabel('Your name', { exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Your email', { exact: true })).toBeFocused();
});
test('unavailable WebGL retains a readable journey and usable form', async ({ page }) => {
  await page.addInitScript(() => { const original = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: Parameters<typeof original>) { if (String(args[0]).includes('webgl')) return null; return original.apply(this, args); } as typeof original; });
  await page.goto('/');
  await expect(page.locator('.landing-experience')).toHaveAttribute('data-motion', 'reduced');
  await expect(page.getByRole('heading', { name: /Your phone rings/ })).toBeVisible();
  await page.locator('a[href="#onboarding"]').click();
  await expect(page.getByLabel('Your name', { exact: true })).toBeVisible();
});
