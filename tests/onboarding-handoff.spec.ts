import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { carrierOptions, draftSchema, initialDraft } from '../src/lib/landing/onboarding';

const origin = 'http://127.0.0.1:3210', headers = { origin };
const completed = { ...initialDraft, fullName: 'Taylor Local', email: 'taylor@example.test', phone: '(480) 555-0149', carrier: 'Boost Mobile', connectionReviewed: true, checksReviewed: true, provider: 'own', providerName: 'Example voice provider', voice: 'Warm', screening: 'all', acknowledgeLocal: true, step: 7, complete: true };

test('all carrier choices are accepted by the shared contract, with unknown values rejected', () => {
  for (const carrier of carrierOptions) expect(draftSchema.safeParse({ ...initialDraft, carrier }).success).toBe(true);
  expect(draftSchema.safeParse({ ...initialDraft, carrier: 'Invented provider' }).success).toBe(false);
});

test('completion persists one account shared by member and admin with isolation, revisions and deletion', async ({ request, playwright }) => {
  const foreign = await playwright.request.newContext({ baseURL: origin });
  try {
    const response = await request.post('/api/onboarding', { headers, data: { version: 0, draft: completed } });
    expect(response.status()).toBe(201);
    let saved = (await response.json()).saved;
    const accountId = saved.submission.accountId;
    expect(saved.expiresAt).toBe(null);
    expect(response.headers()['set-cookie']).toContain('HttpOnly');
    expect(response.headers()['set-cookie']).toContain('SameSite=strict');
    const persisted = JSON.parse(await readFile(path.join(process.cwd(), '.redial', 'onboarding', `${saved.id}.json`), 'utf8'));
    expect(persisted.submission.accountId).toBe(accountId);
    const member = (await (await request.get('/api/onboarding/account')).json()).account;
    const admin = (await (await request.get('/api/onboarding/management')).json()).account;
    expect(member).toEqual(admin);
    expect(member.submission.profile).toEqual(saved.draft);
    expect(member.submission.profile.providerName).toBe('Example voice provider');
    for (const route of ['account', 'management']) expect((await foreign.get(`/api/onboarding/${route}?id=${saved.id}`)).status()).toBe(404);
    expect((await request.get('/api/onboarding/account', { headers: { host: 'example.com' } })).status()).toBe(403);
    const data = { version: saved.version, status: 'needs_information', note: 'Please confirm the line owner.' };
    expect((await request.patch('/api/onboarding/management', { headers: { origin: 'https://elsewhere.example' }, data })).status()).toBe(403);
    expect((await request.patch('/api/onboarding/management', { headers, data: { ...data, status: 'active' } })).status()).toBe(400);
    expect((await request.patch('/api/onboarding/management', { headers, data: { ...data, accountId } })).status()).toBe(400);
    const review = await request.patch('/api/onboarding/management', { headers, data });
    expect(review.status()).toBe(200);
    const reviewed = (await review.json()).account;
    expect((await request.patch('/api/onboarding/management', { headers, data })).status()).toBe(409);
    expect((await (await request.get('/api/onboarding/account')).json()).account.submission.note).toBe(data.note);
    // An unchanged repeat keeps the account identity and review state.
    saved = (await (await request.post('/api/onboarding', { headers, data: { version: reviewed.version, draft: completed } })).json()).saved;
    expect(saved.submission.accountId).toBe(accountId); expect(saved.submission.status).toBe('needs_information');
    const edited = { ...completed, fullName: 'Taylor Updated', carrier: 'Mint Mobile', complete: false };
    saved = (await (await request.post('/api/onboarding', { headers, data: { version: saved.version, draft: edited } })).json()).saved;
    expect((await (await request.get('/api/onboarding/account')).json()).account.submission.profile.fullName).toBe('Taylor Local');
    saved = (await (await request.post('/api/onboarding', { headers, data: { version: saved.version, draft: { ...edited, complete: true } } })).json()).saved;
    expect(saved.submission.accountId).toBe(accountId); expect(saved.submission.status).toBe('pending_review');
    expect((await (await request.get('/api/onboarding/management')).json()).account.submission.profile.carrier).toBe('Mint Mobile');
    const demo = await request.post('/api/demo/session', { headers });
    expect(demo.ok()).toBe(true);
    expect(await demo.text()).not.toContain(completed.email);
    expect((await request.post('/api/onboarding', { headers, data: { version: saved.version, draft: { ...completed, step: 1 } } })).status()).toBe(400);
  } finally {
    await request.delete('/api/onboarding', { headers }); await foreign.dispose();
  }
  expect((await request.get('/api/onboarding/account')).status()).toBe(404);
  expect((await request.get('/api/onboarding/management')).status()).toBe(404);
});

for (const theme of ['light', 'dark']) test(`member and management views remain usable on mobile in ${theme}`, async ({ page }) => {
  await page.addInitScript(value => localStorage.setItem('redial-appearance', value), theme);
  await page.setViewportSize({ width: 390, height: 844 });
  const response = await page.request.post('/api/onboarding', { headers, data: { version: 0, draft: completed } });
  expect(response.status()).toBe(201);
  try {
    for (const route of ['account', 'admin']) {
      await page.goto(`/local/${route}`);
      await expect(page.getByRole('heading', { name: 'Taylor Local' })).toBeVisible();
      await expect(page.locator('.setup-details')).toContainText('Boost Mobile');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `test-results/setup-${theme}-${route}-mobile.png`, fullPage: true });
      const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(audit.violations).toEqual([]);
    }
    await page.getByRole('button', { name: 'Delete saved setup', exact: true }).click();
    await page.getByRole('button', { name: 'Delete from both views', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'No submitted setup yet.' })).toBeVisible();
  } finally { await page.request.delete('/api/onboarding', { headers }); }
});
