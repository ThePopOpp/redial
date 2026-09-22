import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { guidanceChoices, overlayMotion, sampleCall, sampleTimeFor, screeningWordMotion } from '../src/lib/landing/story-demo';
import { timeline } from '../src/lib/landing/timeline';

async function scrub(page: Page, position: number) {
  await page.evaluate(value => {
    const story = document.querySelector<HTMLElement>('.call-story')!, offset = innerWidth < 768 ? 70 : 80;
    scrollTo({ top: story.offsetTop - offset + value / 9 * (story.offsetHeight - innerHeight + offset), behavior: 'instant' });
  }, position);
  await expect.poll(async () => Number(await page.locator('.story-scene').getAttribute('data-progress'))).toBeCloseTo(position / 9, 3);
}

test('overlay and transcript positions reverse without losing reading time', () => {
  for (let chapter = 0; chapter < 8; chapter++) {
    const start = overlayMotion(chapter, chapter), grown = overlayMotion(chapter + .6, chapter);
    expect(grown.scale).toBeGreaterThan(start.scale + .15);
    expect(grown.opacity).toBe(1);
    expect(overlayMotion(chapter + .6, chapter)).toEqual(grown);
  }
  expect(screeningWordMotion(0).opacity).toBe(0);
  expect(screeningWordMotion(2).opacity).toBe(0);
  expect(screeningWordMotion(1.7).blur).toBeGreaterThan(screeningWordMotion(1.1).blur);
  expect(screeningWordMotion(1.7).opacity).toBeLessThan(screeningWordMotion(1.1).opacity);
  expect(sampleTimeFor(2.75)).toBeGreaterThan(sampleTimeFor(2.60));
  expect(sampleCall.turns.at(-1)!.end).toBeCloseTo(sampleCall.duration, 2);
});

test('all eight sections present the phone before a glowing card and rewind completely', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.goto('/');
  const scene = page.locator('.story-scene'), card = page.locator('.story-callout');
  await expect(scene).toHaveAttribute('data-rendered', 'true');
  for (let chapter = 0; chapter < 8; chapter++) {
    await scrub(page, chapter + .03); const small = (await card.boundingBox())!;
    await expect(scene).toHaveAttribute('data-phone-opacity', '1.000');
    await expect(page.locator('.story-css-renderer')).toHaveCSS('opacity', '1');
    await page.screenshot({ path: `test-results/staged-${chapter}-phone.png` });
    await scrub(page, chapter + .38); const held = (await card.boundingBox())!;
    expect(held.width).toBeCloseTo(small.width, 0); expect(held.y).toBeCloseTo(small.y, 0);
    await expect(scene).toHaveAttribute('data-outline', '0.000');
    await expect(page.locator('.story-css-renderer')).toHaveCSS('opacity', '1');
    if (chapter >= 1 && chapter <= 4) await expect(page.locator('.callout-reveal-details')).toHaveAttribute('inert');
    await scrub(page, chapter + .52);
    const midway = Number(await scene.getAttribute('data-phone-opacity'));
    expect(midway).toBeGreaterThan(0); expect(midway).toBeLessThan(.6);
    await page.screenshot({ path: `test-results/staged-${chapter}-dissolve.png` });
    await scrub(page, chapter + .68); const large = (await card.boundingBox())!;
    expect(large.width).toBeGreaterThan(small.width * 1.8);
    expect(large.y).toBeLessThan(small.y - 250);
    await expect(card).toHaveCSS('opacity', '1');
    await expect(scene).toHaveAttribute('data-phone-opacity', '0.000');
    await expect(page.locator('.story-css-renderer')).toHaveCSS('opacity', '0');
    expect(await card.evaluate(el => getComputedStyle(el).getPropertyValue('--callout-glow').trim())).toBe('1');
    if (chapter === 1) await expect(page.getByRole('button', { name: 'Play screening audio sample' })).toBeEnabled();
    if (chapter >= 1 && chapter <= 4) await expect(page.locator('.callout-reveal-details')).not.toHaveAttribute('inert');
    await page.screenshot({ path: `test-results/staged-${chapter}-card.png` });
    await scrub(page, chapter + .03);
    await expect(scene).toHaveAttribute('data-phone-opacity', '1.000');
    const rewound = (await card.boundingBox())!;
    expect(rewound.width).toBeCloseTo(small.width, 0); expect(rewound.y).toBeCloseTo(small.y, 0);
  }
  expect(timeline(8.25 / 9).phoneOpacity).toBe(1);
});

test('every phone overlay grows and rises, with background typography only in screening', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.goto('/');
  await expect(page.locator('.story-scene')).toHaveAttribute('data-rendered', 'true');
  const card = page.locator('.story-callout');
  for (let chapter = 0; chapter < 8; chapter++) {
    await scrub(page, chapter + .05); const start = (await card.boundingBox())!;
    if (!chapter) await page.screenshot({ path: 'test-results/callout-incoming-start.png' });
    await scrub(page, chapter + .59); const end = (await card.boundingBox())!;
    expect(end.width).toBeGreaterThan(start.width * 1.13);
    expect(end.y).toBeLessThan(start.y - 140);
    await expect(card).toHaveCSS('opacity', '1');
    if (!chapter) await page.screenshot({ path: 'test-results/callout-incoming-grown.png' });
  }
  await expect(page.locator('.story-feature-word')).toHaveCount(1);
  await expect(page.locator('.story-feature-word')).toHaveAttribute('data-feature', 'screening');
  await expect(page.locator('.story-feature-word')).toHaveCSS('opacity', '0');
  await scrub(page, 1.1); const start = await page.locator('.story-feature-word').evaluate(el => ({ opacity: Number(getComputedStyle(el).opacity), blur: getComputedStyle(el).filter, transform: getComputedStyle(el).transform, glow: getComputedStyle(el).textShadow }));
  expect(start.blur).toBe('blur(0px)'); expect(start.glow).not.toBe('none'); expect(start.opacity).toBeGreaterThan(.5);
  await page.screenshot({ path: 'test-results/callout-screening-word.png' });
  await scrub(page, 1.65); const end = await page.locator('.story-feature-word').evaluate(el => ({ opacity: Number(getComputedStyle(el).opacity), blur: getComputedStyle(el).filter, transform: getComputedStyle(el).transform }));
  expect(end.opacity).toBeLessThan(start.opacity); expect(end.blur).not.toBe(start.blur); expect(end.transform).not.toBe(start.transform);
  await scrub(page, .05); await expect(card.getByRole('heading')).toHaveText('A call, considered.');
});

for (const theme of ['dark', 'light']) test(`SCREEN CALLS is fully readable without masking in ${theme} mode`, async ({ page }) => {
  await page.addInitScript(theme => localStorage.setItem('redial-appearance', theme), theme);
  for (const [width, height] of [[1440, 1000], [1440, 900], [1024, 768], [768, 1024], [390, 844], [360, 667]]) {
    await page.setViewportSize({ width, height }); await page.goto('/');
    await expect(page.locator('.story-scene')).toHaveAttribute('data-rendered', 'true'); await scrub(page, 1.1);
    const word = page.locator('.story-feature-word'), bounds = (await word.boundingBox())!;
    const copy = (await page.locator('#story-screening .story-kicker').boundingBox())!;
    await expect(word).toHaveText('SCREEN CALLS'); await expect(word).toHaveCSS('filter', 'blur(0px)');
    await expect(page.locator('.story-feature-backdrop')).toHaveCSS('mask-image', 'none');
    expect(bounds.x).toBeGreaterThanOrEqual(16); expect(bounds.x + bounds.width).toBeLessThanOrEqual(width - 16);
    expect(bounds.y).toBeGreaterThan(height < 740 ? 105 : 110);
    expect(bounds.y + bounds.height).toBeLessThan(copy.y);
    if (width >= 768) {
      const phone = (await page.locator('.story-screen-host').boundingBox())!;
      expect(bounds.x).toBeGreaterThan(phone.x + phone.width);
    }
    await page.screenshot({ path: `test-results/screen-readable-${theme}-${width}-${height}.png` });
  }
});

test('audio requires opt-in, plays actual local media, seeks on scroll, and stops outside the sample', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.goto('/');
  await expect(page.locator('.story-scene')).toHaveAttribute('data-rendered', 'true');
  const audio = page.getByTestId('story-sample-audio');
  await scrub(page, 1.65);
  expect(await audio.evaluate((el: HTMLAudioElement) => el.paused)).toBe(true);
  await page.getByRole('button', { name: 'Play screening audio sample' }).click();
  await expect.poll(() => audio.evaluate((el: HTMLAudioElement) => el.paused)).toBe(false);
  await expect.poll(() => audio.evaluate((el: HTMLAudioElement) => el.duration)).toBeCloseTo(sampleCall.duration, 1);
  const before = await audio.evaluate((el: HTMLAudioElement) => el.currentTime);
  expect(before).toBeLessThan(2); // The newly unfolded player starts with the greeting.
  await expect.poll(() => audio.evaluate((el: HTMLAudioElement) => el.currentTime)).toBeGreaterThan(before + .2);
  expect(await audio.evaluate((el: HTMLAudioElement) => el.muted || el.volume === 0)).toBe(false);
  const decodedPeak = await page.evaluate(async src => {
    const bytes = await (await fetch(src)).arrayBuffer(); const context = new OfflineAudioContext(1, 1, 22050);
    const buffer = await context.decodeAudioData(bytes), samples = buffer.getChannelData(0);
    return samples.reduce((peak, sample) => Math.max(peak, Math.abs(sample)), 0);
  }, sampleCall.src);
  expect(decodedPeak).toBeGreaterThan(.05);
  await scrub(page, 2.3); await expect.poll(() => audio.evaluate((el: HTMLAudioElement) => el.paused)).toBe(true);
  await scrub(page, 3.76); await expect.poll(() => audio.evaluate((el: HTMLAudioElement) => el.paused)).toBe(false);
  await expect.poll(() => audio.evaluate((el: HTMLAudioElement) => el.currentTime)).toBeGreaterThan(21);
  await scrub(page, 3.1); await expect.poll(() => audio.evaluate((el: HTMLAudioElement) => el.currentTime)).toBeLessThan(7);
  await page.getByRole('button', { name: 'Mute sample', exact: true }).click();
  await scrub(page, 3.65); await expect.poll(() => audio.evaluate((el: HTMLAudioElement) => el.paused)).toBe(true);
  await page.getByRole('button', { name: 'Play Insider audio sample' }).click();
  await expect.poll(() => audio.evaluate((el: HTMLAudioElement) => el.paused)).toBe(false);
  await scrub(page, 4.25); await expect.poll(() => audio.evaluate((el: HTMLAudioElement) => el.paused)).toBe(true);
});

test('transcript scroll and keyboard scrubbing show the matching sample turn in the card and phone', async ({ page }) => {
  await page.goto('/'); await expect(page.locator('.story-scene')).toHaveAttribute('data-rendered', 'true');
  await scrub(page, 2.05); const transcript = page.locator('.story-transcript-demo');
  await expect(transcript).toHaveAttribute('data-turn', '0');
  await scrub(page, 2.75); await expect(transcript).toHaveAttribute('data-turn', '3');
  await expect(page.locator('.story-screen-host')).toContainText('Around ten.');
  await scrub(page, 2.60); await expect(transcript).toHaveAttribute('data-turn', '0');
  const slider = page.getByRole('slider', { name: 'Sample transcript position' });
  await slider.focus(); await page.keyboard.press('End');
  await expect(transcript).toHaveAttribute('data-turn', '4');
  await expect(transcript).toContainText('make sure Alex has the details');
  await page.keyboard.press('Home'); await expect(transcript).toHaveAttribute('data-turn', '0');
  await expect(page.getByTestId('story-sample-audio')).toHaveJSProperty('paused', true);
});

test('all three Audible choices update the private instruction and a separate simulated conversation', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.goto('/');
  await expect(page.locator('.story-scene')).toHaveAttribute('data-rendered', 'true'); await scrub(page, 4.66);
  const choices = page.getByRole('group', { name: 'Try a private instruction' });
  for (const choice of guidanceChoices) {
    const button = choices.getByRole('button', { name: new RegExp(choice.label) }); await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(choices.locator('[aria-pressed=true]')).toHaveCount(1);
    await expect(page.locator('.guidance-private')).toContainText(choice.instruction);
    await expect(page.locator('.guidance-response')).toContainText(choice.agent);
    await expect(page.locator('.guidance-response')).toContainText(choice.caller);
    await expect(page.locator('.guidance-response')).not.toContainText(choice.instruction);
    await expect(page.locator('.story-screen-host .audible-panel p')).toHaveText(choice.instruction);
  }
  await page.screenshot({ path: 'test-results/callout-audible-interactive.png', animations: 'disabled' });
  await scrub(page, 3.25); await expect(page.locator('.sample-transcript-window')).not.toContainText(guidanceChoices[2].instruction);
  await scrub(page, 4.66); await expect(choices.getByRole('button', { name: /Get a reference/ })).toHaveAttribute('aria-pressed', 'true');
});

test('blocked sample playback offers a retry and keeps the transcript usable', async ({ page }) => {
  await page.addInitScript(() => { HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException('Blocked sample', 'NotAllowedError')); });
  await page.goto('/'); await expect(page.locator('.story-scene')).toHaveAttribute('data-rendered', 'true'); await scrub(page, 1.65);
  await page.getByRole('button', { name: 'Play screening audio sample' }).click();
  await expect(page.getByRole('status')).toContainText('Audio could not play');
  await expect(page.getByRole('button', { name: 'Play screening audio sample' })).toBeEnabled();
  await scrub(page, 2.65); await expect(page.getByRole('slider', { name: 'Sample transcript position' })).toBeVisible();
});

for (const theme of ['light', 'dark']) test(`interactive cards fit mobile and stay accessible in ${theme} mode`, async ({ page }) => {
  await page.addInitScript(theme => localStorage.setItem('redial-appearance', theme), theme);
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/');
  await expect(page.locator('.story-scene')).toHaveAttribute('data-rendered', 'true');
  for (const position of [.03, .68, 1.1, 1.68, 2.68, 3.68, 4.68, 5.68, 6.68, 7.68]) {
    await scrub(page, position);
    if (Math.floor(position) === 4) await page.getByRole('button', { name: /Check the signature/ }).click();
    const card = (await page.locator('.story-callout').boundingBox())!;
    expect(card.x).toBeGreaterThanOrEqual(12); expect(card.x + card.width).toBeLessThanOrEqual(378); expect(card.y + card.height).toBeLessThan(800);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/callout-${theme}-390-${position}.png`, animations: 'disabled' });
  }
  await page.setViewportSize({ width: 360, height: 667 });
  for (const position of [.03, .68, 1.1, 1.68, 2.68, 3.68, 4.68, 5.68, 6.68, 7.68]) {
    await scrub(page, position);
    const trialCard = (await page.locator('.story-callout').boundingBox())!;
    expect(trialCard.x).toBeGreaterThanOrEqual(12); expect(trialCard.x + trialCard.width).toBeLessThanOrEqual(348);
    expect(trialCard.y).toBeGreaterThan(250); expect(trialCard.y + trialCard.height).toBeLessThan(642);
    if (position >= 2 && position < 5) {
      const cue = (await page.locator('.story-bottom').boundingBox())!;
      expect(trialCard.y + trialCard.height).toBeLessThan(cue.y - 5);
    }
    await page.screenshot({ path: `test-results/staged-${theme}-360-${position}.png` });
  }
  await page.setViewportSize({ width: 360, height: 667 }); await scrub(page, 4.68);
  const shortCard = (await page.locator('.story-callout').boundingBox())!;
  const shortCopy = (await page.locator('#story-audible .story-description').boundingBox())!;
  expect(shortCard.y).toBeGreaterThan(shortCopy.y + shortCopy.height);
  expect(shortCard.y + shortCard.height).toBeLessThan(642);
  await page.screenshot({ path: `test-results/callout-${theme}-360-short.png`, animations: 'disabled' });
  const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze(); expect(audit.violations).toEqual([]);
  await page.emulateMedia({ reducedMotion: 'reduce' }); await expect(page.locator('.story-scene canvas')).toHaveCount(0);
  await expect(page.locator('.callout-stationary')).toHaveCount(4);
  await page.locator('.callout-stationary.callout-4').getByRole('button', { name: /Get a reference/ }).click();
  await expect(page.locator('.callout-stationary .guidance-response')).toContainText('RD-0142');
});
