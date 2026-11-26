import { test, expect } from '@playwright/test';
test.beforeEach(async ({ page }) => { await page.clock.install({ time: new Date('2026-11-26T17:00:00Z') }); await page.goto('/'); });
async function dock(page) { await page.locator('#photo-stage').click(); await expect(page.locator('#navigation')).toBeVisible(); }
test('Pure Photos starts unobstructed with no permanent navigation or removed modules', async ({ page }) => {
  await expect(page.locator('#board')).toHaveAttribute('data-mode', 'pure'); await expect(page.locator('#overlays')).toHaveCSS('opacity', '0'); await expect(page.locator('#navigation')).toBeHidden();
  await expect(page.locator('#demo-status')).toBeVisible(); await expect(page.locator('#demo-status')).toContainText('Your album is not connected yet');
  await expect(page.locator('#photo-a')).toHaveJSProperty('complete', true); expect(await page.locator('#photo-a').evaluate(n => n.naturalWidth)).toBeGreaterThan(1000);
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(768); expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(1024);
  await expect(page.locator('audio')).toHaveCount(0); await page.screenshot({ animations: 'disabled', path: 'test-results/' + test.info().project.name + '-pure.png' });
});
test('Ambient Photos uses restrained overlays and Today/Weekly Outlook render real working views', async ({ page }) => {
  await dock(page); await page.getByRole('button', { name: 'Ambient Photos', exact: true }).click(); await expect(page.locator('#overlays')).toHaveCSS('opacity', '1'); await expect(page.locator('#clock')).toHaveText('12:00');
  await page.clock.fastForward(9000); await expect(page.locator('#navigation')).toBeHidden();
  await page.screenshot({ animations: 'disabled', path: 'test-results/' + test.info().project.name + '-ambient.png' }); await dock(page);
  await page.getByRole('button', { name: 'Today', exact: true }).click(); await expect(page.locator('#today')).toContainText('Lemon chicken'); await expect(page.getByRole('heading', { name: 'Tonight’s dinner', exact: true })).toBeVisible(); await expect(page.locator('#today-meals .meal')).toHaveCount(1); await expect(page.locator('#hourly .hour')).toHaveCount(7);
  await page.clock.fastForward(9000); await page.screenshot({ animations: 'disabled', path: 'test-results/' + test.info().project.name + '-today.png' }); await page.locator('#today').click();
  await page.getByRole('button', { name: 'Weekly Outlook', exact: true }).click(); await expect(page.locator('.week-day')).toHaveCount(7); await page.clock.fastForward(9000); await page.screenshot({ animations: 'disabled', path: 'test-results/' + test.info().project.name + '-week.png' });
});
test('photo controls preserve crossfade and pause', async ({ page }) => {
  await dock(page); await page.getByRole('button', { name: 'Next photo', exact: true }).click(); await expect(page.locator('#photo-count')).not.toHaveText('1 / 4');
  const count = await page.locator('#photo-count').textContent(); await page.getByRole('button', { name: 'Pause slideshow' }).click(); await page.clock.fastForward(50000); await expect(page.locator('#photo-count')).toHaveText(count);
});
test('rotation is photo-first and manual Today returns to photos after inactivity', async ({ page }) => {
  await page.clock.fastForward(271000); await expect(page.locator('#board')).toHaveAttribute('data-mode', 'ambient');
  await dock(page); await page.getByRole('button', { name: 'Today', exact: true }).click(); await page.clock.fastForward(61000);
  await expect(page.locator('#board')).toHaveAttribute('data-mode', 'pure'); await expect(page.locator('#navigation')).toBeHidden();
});
test('mode preferences, overlay placement, font and location persist', async ({ page }) => {
  await dock(page); await page.getByRole('button', { name: 'Display', exact: true }).click();
  await page.locator('[name="layout"]').selectOption('bottom'); await page.locator('[name="fontSize"]').selectOption('large'); await page.locator('[name="location"]').fill('Durham, NC'); await page.locator('[name="week"]').uncheck();
  await page.getByRole('button', { name: 'Save preferences' }).click(); await page.reload(); await expect(page.locator('#board')).toHaveClass('layout-bottom large-type'); await dock(page); await expect(page.getByRole('button', { name: 'Weekly Outlook', exact: true })).toBeHidden();
});
test('weather failure stays honest and household API unauthorized state clears content', async ({ page }) => {
  await page.route('https://api.open-meteo.com/**', route => route.abort()); await dock(page); await page.getByRole('button', { name: 'Display', exact: true }).click(); await page.getByRole('button', { name: 'Refresh weather', exact: true }).click(); await expect(page.locator('#notice')).toContainText('could not refresh');
  await page.route('**/api/snapshot', route => route.fulfill({ status: 401, json: { error: 'Authorization required' } })); await page.reload(); await expect(page.locator('#locked')).toBeVisible(); await expect(page.locator('#photo-a')).not.toHaveAttribute('src');
});
test('admin demo saves preferences but private source configuration stays locked', async ({ page }) => {
  await page.goto('/admin.html'); await expect(page.locator('#mode-status')).toContainText('Demonstration'); await expect(page.locator('#connections')).toBeHidden();
  await page.locator('#admin-preferences').fill('{"interval":60,"layout":"minimal"}'); await page.getByRole('button', { name: 'Save display preferences' }).click(); await expect(page.locator('#admin-status')).toContainText('Saved to this browser');
});
test('portrait and desktop modes avoid horizontal overflow', async ({ page }) => {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport); await page.reload(); await dock(page);
    for (const name of ['Ambient Photos', 'Today', 'Weekly Outlook', 'Pure Photos']) { await page.getByRole('button', { name, exact: true }).click(); expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width); }
  }
});
test.describe('offline playback', () => {
test.use({ serviceWorkers: 'allow' });
test('public photo cache supports offline relaunch without caching private API data', async ({ page, context }) => {
  await page.evaluate(async () => { const registration = await navigator.serviceWorker.ready; await registration.active; });
  await page.reload(); await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await expect.poll(() => page.evaluate(async () => { const c = await caches.open('adventuresdisplay-demo-v5'); return !!await c.match('/demo-mode'); })).toBe(true);
  await context.setOffline(true); await page.reload(); await expect(page.locator('#photo-a')).toHaveJSProperty('complete', true); await expect(page.locator('#locked')).toBeHidden();
});
});
test('sample clip decodes inline, starts muted, permits gesture sound and advances on completion', async ({ page }) => {
  await dock(page); await page.getByRole('button', { name: 'Sample clip', exact: true }).click();
  const clip = page.locator('#album-video'); await expect(clip).toHaveClass('album-video active'); await expect(clip).toHaveJSProperty('muted', true); await expect(clip).toHaveAttribute('playsinline', '');
  await expect.poll(() => clip.evaluate(v => v.currentTime)).toBeGreaterThan(.1);
  // Keep automated tests inaudible while exercising the real unmute gesture.
  await clip.evaluate(v => { v.volume = 0; });
  await page.getByRole('button', { name: 'Enable clip sound', exact: true }).click(); await expect(clip).toHaveJSProperty('muted', false);
  await clip.evaluate(v => { v.currentTime = v.duration - .2; }); await expect(clip).not.toHaveClass('album-video active'); await expect(clip).toHaveJSProperty('paused', true);
});
test('leaving the frame pauses and mutes video; video preferences can disable clips', async ({ page }) => {
  await dock(page); await page.getByRole('button', { name: 'Sample clip', exact: true }).click(); await expect(page.locator('#album-video')).toHaveClass('album-video active');
  await page.getByRole('button', { name: 'Today', exact: true }).click(); await expect(page.locator('#album-video')).toHaveJSProperty('paused', true); await expect(page.locator('#album-video')).toHaveJSProperty('muted', true);
  await page.getByRole('button', { name: 'Display', exact: true }).click(); await page.locator('[name="videos"]').uncheck(); await page.getByRole('button', { name: 'Save preferences', exact: true }).click(); await expect(page.locator('#album-video')).not.toHaveClass('album-video active');
});
test('blocked muted playback offers a tap rather than attempting audible autoplay', async ({ page }) => {
  await page.evaluate(() => { HTMLMediaElement.prototype.play = function () { return Promise.reject(new Error('NotAllowedError')); }; });
  await dock(page); await page.getByRole('button', { name: 'Sample clip', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Tap to play video', exact: true })).toBeVisible(); await expect(page.locator('#album-video')).toHaveJSProperty('muted', true);
});

 test('household setup strips its one-time token from the address bar and requires matching passwords', async ({ page }) => {
  let submitted = 0;
  await page.route('**/api/setup', async route => { submitted++; const body = route.request().postDataJSON(); expect(body.token).toBe('a'.repeat(64)); expect(body.password).toBe('a-fictional-long-password'); await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Setup link invalid or expired' }) }); });
  await page.goto('/setup.html#' + 'a'.repeat(64)); await expect(page).toHaveURL(/\/setup\.html$/);
  await page.getByLabel('New administrator password', { exact: true }).fill('a-fictional-long-password'); await page.getByLabel('Confirm password', { exact: true }).fill('a-different-long-password'); await page.getByRole('button', { name: 'Create administrator', exact: true }).click(); expect(submitted).toBe(0);
  await page.getByLabel('Confirm password', { exact: true }).fill('a-fictional-long-password'); await page.getByRole('button', { name: 'Create administrator', exact: true }).click(); await expect(page.locator('#setup-status')).toHaveText('Setup link invalid or expired'); expect(submitted).toBe(1); await expect(page.getByLabel('New administrator password', { exact: true })).toHaveValue('');
});
 test('household setup without a private link does not expose a password creation form', async ({ page }) => { await page.goto('/setup.html'); await expect(page.locator('#setup-form')).toBeHidden(); await expect(page.locator('#setup-status')).toContainText('Open your private setup link'); });
