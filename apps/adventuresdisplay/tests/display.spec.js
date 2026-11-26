import { test, expect } from '@playwright/test';
test.beforeEach(async ({ page }) => { await page.clock.install({ time: new Date('2026-11-26T17:00:00Z') }); await page.route('https://api.open-meteo.com/**', route => route.fulfill({ json: { current:{temperature_2m:68,weather_code:2,time:'2026-11-26T12:00'},hourly:{time:Array.from({length:7},(_,i)=>'2026-11-26T'+String(i+12).padStart(2,'0')+':00'),temperature_2m:[68,70,71,72,70,67,64],precipitation_probability:[5,5,10,10,15,10,5]},daily:{time:Array.from({length:7},(_,i)=>new Date(Date.UTC(2026,10,26+i)).toISOString().slice(0,10)),temperature_2m_max:[72,74,69,65,68,71,73],temperature_2m_min:[54,56,52,48,50,53,55],precipitation_probability_max:[10,20,60,30,10,5,15]} } })); await page.goto('/'); });
async function dock(page) { await page.locator('#photo-stage').click(); await expect(page.locator('#navigation')).toBeVisible(); }
test('Pure Photos starts unobstructed with no permanent navigation or removed modules', async ({ page }) => {
  await dock(page); await page.getByRole('button', {name:'Pure Photos',exact:true}).click(); await page.clock.fastForward(9000);
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
  await page.clock.fastForward(271000); await expect(page.locator('#board')).toHaveAttribute('data-mode', 'pure');
  await dock(page); await page.getByRole('button', { name: 'Today', exact: true }).click(); await page.clock.fastForward(61000);
  await expect(page.locator('#board')).toHaveAttribute('data-mode', 'ambient'); await expect(page.locator('#navigation')).toBeHidden();
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
  await expect.poll(() => page.evaluate(async () => { const c = await caches.open('adventuresdisplay-demo-v7'); return !!await c.match('/demo-mode'); })).toBe(true);
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
  await page.route('**/api/setup', async route => { submitted++; const body = route.request().postDataJSON(); expect(body.token).toBe('a'.repeat(64)); expect(body.password).toBe('eight-ok'); await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Setup link invalid or expired' }) }); });
  await page.goto('/setup.html#' + 'a'.repeat(64)); await expect(page).toHaveURL(/\/setup\.html$/);
  await page.getByLabel('New administrator password', { exact: true }).fill('eight-ok'); await page.getByLabel('Confirm password', { exact: true }).fill('a-different-long-password'); await page.getByRole('button', { name: 'Create administrator', exact: true }).click(); expect(submitted).toBe(0);
  await page.getByLabel('Confirm password', { exact: true }).fill('eight-ok'); await page.getByRole('button', { name: 'Create administrator', exact: true }).click(); await expect(page.locator('#setup-status')).toHaveText('Setup link invalid or expired'); expect(submitted).toBe(1); await expect(page.getByLabel('New administrator password', { exact: true })).toHaveValue('');
});
 test('household setup without a private link does not expose a password creation form', async ({ page }) => { await page.goto('/setup.html'); await expect(page.locator('#setup-form')).toBeHidden(); await expect(page.locator('#setup-status')).toContainText('Open your private setup link'); });

test('kitchen overlays place the clock, live weather and planned dinners in separate corners',async({page})=>{
 await expect(page.locator('#board')).toHaveAttribute('data-mode','ambient'); await expect(page.locator('#board')).toHaveClass('layout-kitchen'); await expect(page.locator('#dinner-week-list li')).toHaveCount(5); await expect(page.locator('#dinner-week-list')).not.toContainText('Unplanned'); await expect(page.locator('#highlow')).toBeVisible(); await expect(page.locator('#highlow')).toHaveText('High 72° · Low 54°'); await expect(page.locator('#weather-source')).toBeHidden(); await expect(page.locator('#dinner-week-list li').first()).toContainText('Lemon chicken'); await expect(page.locator('#weather-source')).toContainText('Updated'); await expect(page.locator('#overlay-condition')).toHaveText('Partly cloudy');
 const clock=await page.locator('.time-block').boundingBox(),weather=await page.locator('.weather-overlay').boundingBox(),dinners=await page.locator('#dinner-week-overlay').boundingBox(); expect(clock.x).toBeLessThan(80);expect(weather.x).toBeGreaterThan(700);expect(clock.x+clock.width).toBeLessThan(weather.x);expect(dinners.x).toBeGreaterThan(600);expect(dinners.y).toBeGreaterThan(weather.y+weather.height+40);expect(dinners.y+dinners.height).toBeLessThan(768);
 await page.clock.fastForward(9000);await page.screenshot({path:'test-results/'+test.info().project.name+'-kitchen-overlays.png',animations:'disabled'});
});
test('existing display preferences migrate once to kitchen overlays while preserving photo settings',async({page})=>{
 await page.evaluate(()=>{localStorage.removeItem('adventuresdisplay.preferences.v3');localStorage.setItem('adventuresdisplay.preferences.v2',JSON.stringify({interval:80,fit:'cover',clock:false,temperature:false,layout:'minimal'}));});await page.reload();await expect(page.locator('#board')).toHaveClass('layout-kitchen');await expect(page.locator('#dinner-week-overlay')).toBeVisible();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('adventuresdisplay.preferences.v3')).interval)).toBe(80);await expect(page.locator('#clock')).toBeVisible();
});

test('dinner overlay shows assigned dates only and hides when the week is empty',async({page})=>{
 await page.setViewportSize({width:1280,height:600});
 var planned=[{day:'2026-11-30',title:'Roasted vegetables with lemon rice and a creamy tahini dressing'},{day:'2026-12-02',title:'Lemon pasta'}];
 await page.route('**/api/snapshot',route=>route.fulfill({json:{demo:false,events:[],meals:planned,photos:[{id:'fictional-photo',type:'photo',src:'/photos/lake.jpg',addedAt:'2026-11-26'}]}}));await page.reload();
 await expect(page.locator('#dinner-week-list li')).toHaveCount(2);await expect(page.locator('#dinner-week-list time')).toHaveText(['Mon','Wed']);await expect(page.locator('#dinner-week-list .dinner-name').first()).toHaveCSS('-webkit-line-clamp','2');await page.clock.fastForward(9000);await page.screenshot({path:'test-results/'+test.info().project.name+'-planned-dinners-wide.png',animations:'disabled'});await expect(page.locator('#dinner-week-list')).not.toContainText('Unplanned');
 planned=[];await page.reload();await expect(page.locator('#dinner-week-list li')).toHaveCount(0);await expect(page.locator('#dinner-week-overlay')).toBeHidden();
});
test('existing iPads enable the day range once and retain a later choice to hide it',async({page})=>{
 await page.evaluate(()=>{var p=JSON.parse(localStorage.getItem('adventuresdisplay.preferences.v3'));p.highlow=false;localStorage.setItem('adventuresdisplay.preferences.v3',JSON.stringify(p));localStorage.removeItem('adventuresdisplay.weather-range.v1');});await page.reload();await expect(page.locator('#highlow')).toBeVisible();
 await page.evaluate(()=>{var p=JSON.parse(localStorage.getItem('adventuresdisplay.preferences.v3'));p.highlow=false;localStorage.setItem('adventuresdisplay.preferences.v3',JSON.stringify(p));});await page.reload();await expect(page.locator('#highlow')).toBeHidden();
});
