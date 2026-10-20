import { test, expect } from '@playwright/test';

// The workspace shell needs a signed-in Supabase session, so no browser test
// can reach /app. What can be reached is the stylesheet, which is global: this
// mounts the sidebar's real markup on a page that loads it and measures the
// result.
//
// Worth having because the collapsed rail broke in exactly the way a type
// checker and a build cannot see — an edit spliced the sign-out rules into the
// middle of the selector list that hides the labels, so the declaration block
// landed on the wrong selector, every label stayed visible in a 72px rail, and
// the account email was hidden instead. Everything still compiled.
const sidebar = `
<div class="app-shell">
  <aside class="app-sidebar" data-collapsed="true">
    <div class="app-sidebar-head">
      <a class="brand" href="/"><span class="brand-mark">R</span><span>Redial</span></a>
      <button class="app-collapse" data-tip="Expand navigation"><svg width="16" height="16"></svg></button>
    </div>
    <nav aria-label="Workspace navigation">
      <div class="app-nav-group">
        <p class="app-nav-caption">Your space</p>
        <a id="probe" href="#" data-tip="Call inbox"><svg width="17" height="17"></svg><span>Call inbox</span></a>
      </div>
    </nav>
    <div class="app-sidebar-foot">
      <a href="/" data-tip="Back to website"><svg width="16" height="16"></svg><span>Back to website</span></a>
      <p>someone@example.test</p>
    </div>
  </aside>
  <div class="app-body"></div>
</div>`;

async function mount(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(markup => {
    const host = document.createElement('div');
    host.id = 'shell-probe';
    host.innerHTML = markup;
    document.body.append(host);
  }, sidebar);
}

test('a collapsed rail shows icons only, and keeps the labels for assistive technology', async ({ page }) => {
  await mount(page);

  const label = page.locator('#probe span');
  // Still in the accessibility tree: present, named, and reachable.
  await expect(label).toHaveText('Call inbox');
  await expect(page.locator('#probe')).toHaveAccessibleName('Call inbox');

  // But carrying no visual width, which is what "icons only" has to mean.
  const box = await label.boundingBox();
  expect(box, 'the label should still be laid out, just clipped').not.toBeNull();
  expect(box!.width, 'a visible label is what made the rail unreadable').toBeLessThanOrEqual(2);

  // The group caption and the account email go the same way.
  expect((await page.locator('#shell-probe .app-nav-caption').boundingBox())!.width).toBeLessThanOrEqual(2);
  expect((await page.locator('#shell-probe .app-sidebar-foot p').boundingBox())!.width).toBeLessThanOrEqual(2);

  // The brand mark stays: it is the icon, not a label.
  expect((await page.locator('#shell-probe .brand-mark').boundingBox())!.width).toBeGreaterThan(8);

  // And the rail itself is a rail.
  const rail = (await page.locator('#shell-probe .app-sidebar').boundingBox())!.width;
  expect(rail).toBeGreaterThan(44);
  expect(rail).toBeLessThan(110);
});

test('a collapsed rail names each icon on hover, in Redial colours', async ({ page }) => {
  await mount(page);
  const probe = page.locator('#probe');

  const hidden = await probe.evaluate(el => getComputedStyle(el, '::after').opacity);
  expect(hidden, 'the pop-out should be invisible until asked for').toBe('0');

  await probe.hover();
  // The pop-out fades in, so poll rather than read mid-transition.
  await expect.poll(() => probe.evaluate(el => getComputedStyle(el, '::after').opacity)).toBe('1');
  const shown = await probe.evaluate(el => ({
    opacity: getComputedStyle(el, '::after').opacity,
    content: getComputedStyle(el, '::after').content,
    background: getComputedStyle(el, '::after').backgroundColor,
    panel: getComputedStyle(document.querySelector('#shell-probe .app-sidebar')!).getPropertyValue('--card'),
  }));
  expect(shown.content).toContain('Call inbox');
  // Themed from the tokens rather than the operating system's own tooltip.
  expect(shown.background).not.toBe('rgba(0, 0, 0, 0)');
});

test('an expanded rail reads normally', async ({ page }) => {
  await mount(page);
  await page.locator('#shell-probe .app-sidebar').evaluate(el => el.setAttribute('data-collapsed', 'false'));

  await expect(page.locator('#probe span')).toBeVisible();
  expect((await page.locator('#probe span').boundingBox())!.width).toBeGreaterThan(30);
  expect((await page.locator('#shell-probe .app-nav-caption').boundingBox())!.width).toBeGreaterThan(30);

  const rail = (await page.locator('#shell-probe .app-sidebar').boundingBox())!.width;
  expect(rail).toBeGreaterThan(200);

  // No pop-out when there is a label to read.
  const tip = await page.locator('#probe').evaluate(el => getComputedStyle(el, '::after').content);
  expect(tip === 'none' || tip === 'normal').toBe(true);
});

// A password box you can read back. Worth asserting rather than eyeballing:
// the control starts hidden, it must never submit the form, and the type has
// to return to `password` so a browser does not keep the value visible after
// the field is left.
test('the registration password can be revealed and hidden again', async ({ page }) => {
  await page.goto('/register');
  const field = page.locator('#register-password');
  const toggle = page.locator('#register-password ~ .auth-password-toggle, .auth-password-toggle').first();

  await field.fill('a-long-enough-passphrase');
  await expect(field).toHaveAttribute('type', 'password');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');

  await toggle.click();
  await expect(field).toHaveAttribute('type', 'text');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  // Revealing must not have submitted the form on the way.
  await expect(page).toHaveURL(/\/register$/);
  await expect(field).toHaveValue('a-long-enough-passphrase');

  await toggle.click();
  await expect(field).toHaveAttribute('type', 'password');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
});

test('the sign-in password carries the same control', async ({ page }) => {
  await page.goto('/sign-in');
  const field = page.locator('#auth-password');
  await expect(field).toHaveAttribute('type', 'password');
  await page.locator('.auth-password-toggle').first().click();
  await expect(field).toHaveAttribute('type', 'text');
  await expect(page).toHaveURL(/\/sign-in$/);
});

// A sent confirmation has to look like an outcome, not a rejection. The form
// used to stay on the page under a quiet grey line, which read as "that did not
// work" to the person who built it, twice.
test('a submitted registration replaces the form with a finished state', async ({ page }) => {
  await page.goto('/register?notice=email');
  await expect(page.getByRole('heading', { name: 'Check your inbox' })).toBeVisible();
  // Nothing left to type: a field here invites a second attempt.
  await expect(page.locator('#register-password')).toHaveCount(0);
  await expect(page.locator('#register-email')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Back to sign in' })).toBeVisible();
});

test('the registration form is still there before it is submitted', async ({ page }) => {
  await page.goto('/register');
  await expect(page.locator('#register-password')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Check your inbox' })).toHaveCount(0);
});

test('a requested password reset says so instead of re-offering the form', async ({ page }) => {
  await page.goto('/forgot-password?notice=email');
  await expect(page.getByRole('heading', { name: 'Check your inbox' })).toBeVisible();
  await expect(page.locator('input[type="email"]')).toHaveCount(0);
});
