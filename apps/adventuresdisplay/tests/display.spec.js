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
  await page.clock.fastForward(271000); await expect(page.locator('#board')).toHaveAttribute('data-mode', 'ambient'); await expect(page.locator('#overlays')).toHaveCSS('opacity', '1');
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
  await expect.poll(() => page.evaluate(async () => { const c = await caches.open('adventuresdisplay-demo-v13'); return !!await c.match('/demo-mode'); })).toBe(true);
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

async function swipeFrame(page, dx, dy = 0, options = {}) {
  await page.locator('#photo-stage').evaluate((stage, args) => {
    function dispatch(type, touches, changedTouches) {
      const event = new Event(type, { bubbles:true, cancelable:true });
      Object.defineProperties(event, { touches:{value:touches}, changedTouches:{value:changedTouches} });
      stage.dispatchEvent(event);
    }
    const start = {identifier:1,clientX:512,clientY:380};
    const end = {identifier:1,clientX:512+args.dx,clientY:380+args.dy};
    dispatch('touchstart', [start], [start]);
    if (args.options.multitouch) dispatch('touchstart', [start,{identifier:2,clientX:530,clientY:390}], []);
    dispatch('touchmove', [end], [end]);
    if (args.options.cancel) dispatch('touchcancel', [], [end]);
    dispatch('touchend', [], [end]);
    if (args.options.click) stage.click();
  }, {dx,dy,options});
}

async function stillPhotos(page) {
  await page.evaluate(() => { const key='adventuresdisplay.preferences.v3'; const p=JSON.parse(localStorage.getItem(key)); p.videos=false;localStorage.setItem(key,JSON.stringify(p)); });
  await page.reload(); await expect(page.locator('#photo-a')).toHaveJSProperty('complete',true);
}
test('swipe left and right revisit photos during shuffle without revealing controls', async ({page}) => {
  await stillPhotos(page);
  await swipeFrame(page,-180,5,{click:true});
  await expect(page.locator('#photo-count')).not.toHaveText('1 / 4');
  const second = await page.locator('#photo-count').textContent();
  await expect(page.locator('#navigation')).toBeHidden();await expect(page.locator('#photo-controls')).toBeHidden();
  await page.clock.fastForward(2100);
  await swipeFrame(page,-180);
  await expect(page.locator('#photo-count')).not.toHaveText(second);
  await page.clock.fastForward(2100);
  await swipeFrame(page,180);
  await expect(page.locator('#photo-count')).toHaveText(second);
  await page.clock.fastForward(2100);
  await swipeFrame(page,180);
  await expect(page.locator('#photo-count')).toHaveText('1 / 4');
  await page.clock.fastForward(2100);
  await swipeFrame(page,-180);
  await expect(page.locator('#photo-count')).toHaveText(second);
  await expect(page.locator('#navigation')).toBeHidden();await expect(page.locator('#photo-controls')).toBeHidden();
});
test('vertical, short, cancelled and multi-finger gestures do not change photos',async({page})=>{
  await expect(page.locator('#photo-a')).toHaveJSProperty('complete',true);
  for(const gesture of [[10,180,{}],[-25,0,{}],[-180,0,{cancel:true}],[-180,0,{multitouch:true}]]) {
    await swipeFrame(page,...gesture);await expect(page.locator('#photo-count')).toHaveText('1 / 4');
  }
  await expect(page.locator('#navigation')).toBeHidden();
  await page.locator('#photo-stage').click();await expect(page.locator('#navigation')).toBeVisible();
});
test('a swipe resets the automatic slideshow countdown',async({page})=>{
  await stillPhotos(page);await page.clock.fastForward(40000);
  await swipeFrame(page,-180);
  await expect(page.locator('#photo-count')).not.toHaveText('1 / 4');
  const current = await page.locator('#photo-count').textContent();
  await page.clock.fastForward(6000);await expect(page.locator('#photo-count')).toHaveText(current);
  await page.clock.fastForward(40000);await expect(page.locator('#photo-count')).not.toHaveText(current);
});
test('native touch swipe changes photos without showing navigation',async({page,context,browserName})=>{
  test.skip(browserName!=='chromium','Native touch injection uses Chromium DevTools; gesture handling is also covered in WebKit.');
  await stillPhotos(page);
  const cdp=await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:700,y:380}]});
  for(const x of [670,620,560,500,440]) await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:380}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await expect(page.locator('#photo-count')).not.toHaveText('1 / 4');
  await expect(page.locator('#navigation')).toBeHidden();await expect(page.locator('#photo-controls')).toBeHidden();
});

test('video sound button stays visible with hidden navigation and toggles audio without advancing',async({page})=>{
  const toggle=page.locator('#video-sound'), clip=page.locator('#album-video');
  await expect(toggle).toBeHidden();
  await dock(page);await page.getByRole('button',{name:'Sample clip',exact:true}).click();
  await expect(clip).toHaveClass('album-video active');
  await page.clock.fastForward(9000);
  await expect(page.locator('#navigation')).toBeHidden();await expect(page.locator('#photo-controls')).toBeHidden();
  await expect(toggle).toBeVisible();await expect(toggle).toHaveText('Sound off');await expect(toggle).toHaveAttribute('aria-pressed','false');
  const bounds=await toggle.boundingBox();expect(bounds.width).toBeGreaterThanOrEqual(48);expect(bounds.height).toBeGreaterThanOrEqual(48);
  const count=await page.locator('#photo-count').textContent();
  await clip.evaluate(v=>{v.volume=0;});
  await toggle.click();await expect(clip).toHaveJSProperty('muted',false);await expect(toggle).toHaveText('Sound on');await expect(toggle).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#photo-count')).toHaveText(count);await expect(page.locator('#navigation')).toBeHidden();
  await toggle.click();await expect(clip).toHaveJSProperty('muted',true);await expect(toggle).toHaveText('Sound off');
  await page.screenshot({path:'test-results/'+test.info().project.name+'-video-sound.png',animations:'disabled'});
  await swipeFrame(page,180);await expect(clip).not.toHaveClass('album-video active');await expect(toggle).toBeHidden();
});

test('background comparison shows four matching photo samples and saves a selected shade',async({page})=>{
  await dock(page);await page.getByRole('button',{name:'Backgrounds',exact:true}).click();
  const preview=page.locator('#background-preview');await expect(preview).toBeVisible();await expect(page.locator('.background-option')).toHaveCount(4);
  const sources=await page.locator('.background-photo img').evaluateAll(imgs=>imgs.map(i=>i.getAttribute('src')));expect(sources.length).toBe(4);expect(new Set(sources).size).toBe(1);
  const boxes=await page.locator('.background-option').evaluateAll(nodes=>nodes.map(n=>{const b=n.getBoundingClientRect();return{x:b.x,y:b.y,width:b.width,height:b.height};}));
  expect(boxes[0].x).toBeLessThan(boxes[1].x);expect(boxes[0].y).toBe(boxes[1].y);expect(boxes[2].y).toBeGreaterThan(boxes[0].y);expect(boxes[2].x).toBe(boxes[0].x);
  const count=await page.locator('#photo-count').textContent();await page.clock.fastForward(46000);await expect(page.locator('#photo-count')).toHaveText(count);
  await page.screenshot({path:'test-results/'+test.info().project.name+'-background-comparison.png',animations:'disabled'});
  await page.getByRole('button',{name:'Use Slate blue background',exact:true}).click();await expect(preview).toBeHidden();await expect(page.locator('#photos')).toHaveCSS('background-color','rgb(48, 62, 75)');
  await page.route('**/api/snapshot',route=>route.fulfill({json:{demo:false,preferences:{background:'evergreen'},photos:[{id:'test-lake',src:'/photos/lake.jpg'}],events:[],meals:[]}}));
  await page.reload();await expect(page.locator('#demo-status')).toBeHidden();await expect(page.locator('#photos')).toHaveCSS('background-color','rgb(48, 62, 75)');await expect(page.locator('#album-video')).toHaveCSS('background-color','rgb(48, 62, 75)');
  await dock(page);await page.getByRole('button',{name:'Backgrounds',exact:true}).click();await page.getByRole('button',{name:'Close background comparison'}).click();await expect(page.locator('#photos')).toHaveCSS('background-color','rgb(48, 62, 75)');
  await expect(page.locator('.background-photo img[src]')).toHaveCount(0);
});
test('background comparison handles phone size, inactivity and privacy lock',async({page})=>{
  await page.setViewportSize({width:390,height:844});await dock(page);await page.getByRole('button',{name:'Backgrounds',exact:true}).click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);await expect(page.locator('.background-option').last()).toBeInViewport();
  await page.clock.fastForward(61000);await expect(page.locator('#background-preview')).toBeHidden();
  await dock(page);await page.getByRole('button',{name:'Backgrounds',exact:true}).click();
  await page.route('**/api/snapshot',route=>route.fulfill({status:401,json:{error:'Authorization required'}}));await page.clock.fastForward(900000);
  await expect(page.locator('#locked')).toBeVisible();await expect(page.locator('#background-preview')).toBeHidden();await expect(page.locator('.background-photo img[src]')).toHaveCount(0);
});

async function recipeSnapshot(page,context) {
  await context.route('https://app.plantoeat.com/recipes/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Fictional recipe</title><h1>Sample dinner</h1>'}));
  await page.route('**/api/snapshot',route=>route.fulfill({json:{demo:false,photos:[{id:'test-photo',src:'/photos/lake.jpg'}],meals:[{day:'2026-11-26',title:'Sample dinner',recipeURL:'https://app.plantoeat.com/recipes/12345?private=discarded'},{day:'2026-11-27',title:'Another dinner',recipeURL:'https://app.plantoeat.com/recipes/23456'}],events:[]}}));
  await page.reload();await expect(page.locator('#demo-status')).toBeHidden();
}
test('planned meals link to recipes from photo, Today and weekly views and return manually',async({page,context})=>{
  await recipeSnapshot(page,context);
  const meal=page.locator('#dinner-week-list a').first();await expect(meal).toHaveAttribute('href','https://app.plantoeat.com/recipes/12345');
  await page.screenshot({path:'test-results/'+test.info().project.name+'-recipe-links.png',animations:'disabled'});
  const popupReady=page.waitForEvent('popup');await meal.click();const popup=await popupReady;await popup.waitForURL('https://app.plantoeat.com/recipes/12345');expect(await popup.evaluate(()=>{try{return !!window.opener.document;}catch(e){return 'cross-origin blocked';}})).toBe('cross-origin blocked');
  await expect(page.locator('#recipe-return')).toBeVisible();await expect(page.locator('#navigation')).toBeHidden();
  await page.getByRole('button',{name:'Return to display',exact:true}).click();await expect.poll(()=>popup.isClosed()).toBe(true);await expect(page.locator('#recipe-return')).toBeHidden();await expect(page.locator('#board')).toHaveAttribute('data-mode','ambient');
  await dock(page);await page.getByRole('button',{name:'Today',exact:true}).click();await expect(page.locator('#today-meals a')).toHaveAttribute('href','https://app.plantoeat.com/recipes/12345');
  await page.getByRole('button',{name:'Weekly Outlook',exact:true}).click();await expect(page.locator('#week-days a.recipe-link')).toHaveCount(2);
});
test('recipe visit resets after one hour and the display remains ready',async({page,context})=>{
  await recipeSnapshot(page,context);const ready=page.waitForEvent('popup');await page.locator('#dinner-week-list a').first().click();const popup=await ready;await popup.waitForURL('https://app.plantoeat.com/recipes/12345');
  await page.clock.fastForward(3599000);expect(popup.isClosed()).toBe(false);await expect(page.locator('#recipe-return')).toBeVisible();
  await page.clock.fastForward(2000);await expect.poll(()=>popup.isClosed()).toBe(true);await expect(page.locator('#recipe-return')).toBeHidden();await expect(page.locator('#board')).toHaveAttribute('data-mode','ambient');
});
test('blocked recipe tabs offer a retry; untrusted recipe URLs never become links',async({page,context})=>{
  await recipeSnapshot(page,context);await page.evaluate(()=>{window.open=()=>null;});await page.locator('#dinner-week-list a').first().click();await expect(page.locator('#notice')).toContainText('Allow pop-ups');await expect(page.locator('#recipe-return')).toBeHidden();
  await page.route('**/api/snapshot',route=>route.fulfill({json:{demo:false,photos:[],events:[],meals:[{day:'2026-11-26',title:'Unsafe example',recipeURL:'javascript:alert(1)'}]}}));await page.reload();await expect(page.locator('#dinner-week-list a')).toHaveCount(0);await expect(page.locator('#dinner-week-list')).toContainText('Unsafe example');
});

test('clock weather and dinner overlays survive the former Pure Photos interval and household refresh',async({page})=>{
  await page.route('**/api/snapshot',route=>route.fulfill({json:{demo:false,preferences:{pure:true,ambient:true,videos:false},photos:[{id:'regression-photo',src:'/photos/lake.jpg'}],events:[],meals:[{day:'2026-11-26',title:'Sample dinner'}]}}));await page.reload();await expect(page.locator('#demo-status')).toBeHidden();
  let previous=0;for(const seconds of [260,280,520,620,880,1120,1510,1820]) {
    await page.clock.fastForward((seconds-previous)*1000);previous=seconds;
    await expect(page.locator('#board')).toHaveAttribute('data-mode','ambient');await expect(page.locator('#overlays')).toHaveCSS('opacity','1');await expect(page.locator('#clock')).toBeVisible();await expect(page.locator('#temperature')).toBeVisible();await expect(page.locator('#dinner-week-overlay')).toBeVisible();
  }
});
test('unobstructed automatic intervals require an explicit saved preference',async({page})=>{
  await dock(page);await page.getByRole('button',{name:'Display',exact:true}).click();const option=page.locator('[name=rotatePure]');await expect(option).not.toBeChecked();await option.check();await page.locator('[name=videos]').uncheck();await page.getByRole('button',{name:'Save preferences',exact:true}).click();
  await page.reload();await page.clock.fastForward(271000);await expect(page.locator('#board')).toHaveAttribute('data-mode','pure');await expect(page.locator('#overlays')).toHaveCSS('opacity','0');
  await dock(page);await page.getByRole('button',{name:'Display',exact:true}).click();await expect(page.locator('[name=rotatePure]')).toBeChecked();
});

test('slideshow uses every album photo before repeating and keeps forward swipes in the same pool',async({page})=>{
  const photos=Array.from({length:8},(_,i)=>({id:'shuffle-photo-'+i,src:'/photos/lake.jpg',addedAt:'2026-11-26'}));
  await page.route('**/api/snapshot',route=>route.fulfill({json:{demo:false,preferences:{interval:10,today:false,week:false,videos:false},photos,events:[],meals:[]}}));await page.reload();await expect(page.locator('#photo-b')).toHaveClass('photo active');
  const sequence=[await page.locator('#photo-count').textContent()];
  for(let i=1;i<24;i++) {
    if(i%3===0){await page.clock.fastForward(2100);await swipeFrame(page,-180);}else await page.clock.fastForward(12000);
    await expect(page.locator('#photo-count')).not.toHaveText(sequence[sequence.length-1]);sequence.push(await page.locator('#photo-count').textContent());
  }
  for(let start=0;start<24;start+=8)expect(new Set(sequence.slice(start,start+8)).size).toBe(8);
  await expect(page.locator('#navigation')).toBeHidden();
});
