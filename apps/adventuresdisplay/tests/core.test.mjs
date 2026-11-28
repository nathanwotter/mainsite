import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { parse } from 'acorn';
await import('../public/core.js');
const C = globalThis.AdventuresDisplayCore;
test('settings validate ranges and always enable a photograph mode', () => {
  const p = C.settings({ pure: false, ambient: false, today: true, interval: -1, nightStart: 29, latitude: 100, location: '<kitchen>', unknown: 'secret' });
  assert.equal(p.pure, true); assert.equal(p.interval, 45); assert.equal(p.nightStart, 22); assert.equal(p.latitude, 35.7796); assert.equal(p.unknown, undefined);
});
test('automatic rotation stays in photos while information modes remain available', () => {
  const p = C.settings(); assert.equal(C.photoShare(p), 100);
  assert.equal(C.modeAt(p, 269), 'ambient'); assert.equal(C.modeAt(p, 270), 'ambient'); assert.equal(C.modeAt(p, 540), 'ambient'); assert.equal(C.modeAt(p, 570), 'ambient'); assert.equal(C.modeAt(p, 600), 'ambient');
  assert.equal(C.rotation(C.settings({ today: false, week: false })).length, 2);
  assert.ok(C.photoShare(C.settings({ outlookEvery: 3 })) > 90);
});
test('shuffle covers every album item once per pass and avoids recent repeats across passes', () => {
  const photos=Array.from({length:12},(_,i)=>({id:'photo-'+i,addedAt:'2026-11-26'}));
  const shuffle=C.createPhotoShuffle();let current=-1, seed=45, sequence=[];
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let pass=0;pass<15;pass++) {const shown=[];for(let i=0;i<photos.length;i++){const next=shuffle.next(photos,current,random);assert.notEqual(next,current);if(i===0&&pass>0)assert.ok(!sequence.slice(-4).includes(next));shown.push(next);sequence.push(next);current=next;}assert.equal(new Set(shown).size,12);}
  assert.notDeepEqual(sequence.slice(0,12),sequence.slice(12,24));
});
test('shuffle handles small albums, membership changes and an already-visible first photo',()=>{
  for(const size of [1,2,3,500]) {const photos=Array.from({length:size},(_,i)=>({id:String(i)}));const shuffle=C.createPhotoShuffle();let current=0,seen=[0];for(let i=1;i<size;i++){current=shuffle.next(photos,current,()=>.25);seen.push(current);}assert.equal(new Set(seen).size,size);if(size===1)assert.equal(shuffle.next(photos,0),0);}
  const shuffle=C.createPhotoShuffle(),photos=[{id:'a'},{id:'b'},{id:'c'}];assert.equal(shuffle.next(photos,0,()=>0),1);
  assert.equal(shuffle.next([{id:'a'},{id:'new'},{id:'c'}],0,()=>.99),1);
  assert.equal(shuffle.next([],0),-1);
});

test('Eastern dates, month rollover and fictional dinners', () => {
  assert.equal(C.zonedDay(new Date('2026-01-01T02:00:00Z')), '2025-12-31'); assert.equal(C.addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(C.sampleEvents('2026-12-31')[3].day, '2027-01-01'); assert.equal(C.sampleMeals('2026-11-26').filter(m => m.day === '2026-11-26').length, 1); assert.equal(C.sampleMeals('2026-11-26')[0].title, 'Lemon chicken & herby potatoes');
});
test('weather interpretation', () => { assert.equal(C.condition(0), 'Clear skies'); assert.equal(C.condition(75), 'Snow'); assert.equal(C.condition(95), 'Thunderstorms'); });
test('all display scripts parse as ES2018 and removed capabilities stay out of the app', async () => {
  for (const file of ['core.js', 'app.js', 'admin.js', 'setup.js', 'sw.js']) parse(await readFile(new URL('../public/' + file, import.meta.url), 'utf8'), { ecmaVersion: 2018 });
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8'); assert.doesNotMatch(html, /<audio|WUNC|Todoist|timer-form|dashboard/);
  for (const photo of ['lake', 'coast', 'mountains']) assert.ok((await stat(new URL('../public/photos/' + photo + '.jpg', import.meta.url))).size < 600000);
});
test('configured private subscription and album tokens never occur in publishable assets', async () => {
  const { readdir } = await import('node:fs/promises');
  const envText = await readFile(new URL('../.env', import.meta.url), 'utf8').catch(() => '');
  const sources = envText.split('\n').filter(l => /^(PLAN_TO_EAT_FEED_URL|ICLOUD_ALBUM_URL)=/.test(l)).map(l => l.slice(l.indexOf('=') + 1).trim()).filter(Boolean);
  for (const url of sources) {
  const parsed = new URL(url), token = parsed.hostname === 'photos.icloud.com' ? parsed.pathname.split('/').pop() : parsed.hash ? parsed.hash.slice(1) : parsed.pathname.split('/')[2];
  for (const file of await readdir(new URL('../public/', import.meta.url), { recursive: true })) {
    if (/\.(js|html|json|webmanifest|css)$/.test(file)) { const text = await readFile(new URL('../public/' + file.replaceAll('\\', '/'), import.meta.url), 'utf8'); assert.equal(text.includes(url), false, 'Subscription must not be published'); if (token && token.length > 10) assert.equal(text.includes(token), false, 'Subscription token must not be published'); }
  }
  }
});

test('photo background accepts known shades and rejects arbitrary CSS',()=>{assert.equal(C.settings().background,'evergreen');for(const color of ['charcoal','taupe','slate','ink'])assert.equal(C.settings({background:color}).background,color);assert.equal(C.settings({background:'url(https://example.com)'}).background,'evergreen');});

test('recipe links accept only Plan to Eat numeric recipe pages and remove query strings',()=>{
  assert.equal(C.recipeURL('https://app.plantoeat.com/recipes/12345?secret=example#notes'),'https://app.plantoeat.com/recipes/12345');
  for(const value of ['javascript:alert(1)','http://app.plantoeat.com/recipes/12345','https://app.plantoeat.com.evil.example/recipes/12345','https://user:pass@app.plantoeat.com/recipes/12345','https://app.plantoeat.com/planner/private/recipes/plantoeat-ical.ics','https://app.plantoeat.com/recipes/12345/edit'])assert.equal(C.recipeURL(value),'');
});

test('automatic photo overlays persist for legacy settings, with unobstructed intervals opt-in',()=>{
  const legacy=C.settings({pure:true,ambient:true,pureSeconds:270,ambientSeconds:270});
  for(const layout of ['kitchen','corners','bottom','minimal']) {
    const p=C.settings({...legacy,layout});for(let seconds=0;seconds<540;seconds++)assert.equal(C.modeAt(p,seconds),'ambient');assert.equal(C.photoShare(p),100);
  }
  assert.equal(C.modeAt(C.settings({rotatePure:true}),270),'pure');
  assert.equal(C.modeAt(C.settings({ambient:false}),0),'pure');
  assert.equal(C.rotation(C.settings({pure:false})).filter(s=>s.mode==='ambient').length,1);
});
