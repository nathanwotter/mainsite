import test from 'node:test';
import assert from 'node:assert/strict';
import { scryptSync } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { parseFeed, deduplicate } from '../server/ical.mjs';
import { validateURL, publicAddress } from '../server/fetch-private.mjs';
import { issueSession, verifyPassword, encrypt, decrypt, cookieName } from '../server/security.mjs';
import { createAPI } from '../server/api.mjs';
import { MemoryStore } from '../server/store.mjs';
import { synchronize } from '../server/sync.mjs';
import { albumToken, icloudManifest } from '../server/icloud.mjs';
const fixture = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:fictional-meal-1\r\nDTSTART;VALUE=DATE:20261126\r\nDTEND;VALUE=DATE:20261127\r\nSUMMARY:Lemon pasta\r\nURL:https://app.plantoeat.com/recipes/12345\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nUID:fictional-note\r\nDTSTART;VALUE=DATE:20261126\r\nDTEND;VALUE=DATE:20261127\r\nSUMMARY:Chop vegetables\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`;
const window = { from: '2026-11-26', until: '2026-12-03' };
const env = { ADVENTURESDISPLAY_MODE: 'household', CONFIG_ENCRYPTION_KEY: 'f'.repeat(64), ADMIN_PASSWORD_HASH: 'a'.repeat(32) + ':' + scryptSync('long-fictional-password', 'a'.repeat(32), 64).toString('hex') };
const req = (path, token, body, origin = 'https://frame.example') => new Request('https://frame.example/api/' + path, { method: body === undefined ? 'GET' : 'POST', headers: { ...(token ? { cookie: cookieName + '=' + token } : {}), origin, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
test('recipes exclude notes and need no meal-category field for this dinner-only household', () => {
  const meals = parseFeed(fixture, { ...window, recipesOnly: true }); assert.equal(meals.length, 1); assert.equal('slot' in meals[0], false); assert.equal(meals[0].time, 'All day');
  assert.equal(deduplicate(parseFeed(fixture, window), meals).length, 1);
});
test('recurrences and cancellations are expanded in a bounded window', () => {
  const recurring = fixture.replace('UID:fictional-note', 'UID:fictional-note').replace('SUMMARY:Chop vegetables', 'RRULE:FREQ=DAILY;COUNT=3\r\nSUMMARY:Chop vegetables');
  assert.equal(parseFeed(recurring, window).length, 4);
  assert.equal(parseFeed(fixture.replace('SUMMARY:Lemon pasta', 'STATUS:CANCELLED\r\nSUMMARY:Lemon pasta'), { ...window, recipesOnly: true }).length, 0);
});
test('source fetch validation rejects SSRF, credentials, HTTP and private addresses', () => {
  for (const value of ['http://app.plantoeat.com/x', 'https://127.0.0.1/x', 'https://evil.example/x', 'https://user:pass@app.plantoeat.com/x']) assert.throws(() => validateURL(value, ['app.plantoeat.com']));
  for (const address of ['10.0.0.1', '127.0.0.1', '169.254.169.254', '192.168.1.1', '::1', '100.64.0.1']) assert.equal(publicAddress(address), false);
  assert.equal(publicAddress('8.8.8.8'), true); assert.equal(validateURL('webcal://app.plantoeat.com/example', ['app.plantoeat.com']).protocol, 'https:');
});
test('encrypted config roundtrips and wrong password/key fails', () => {
  const encrypted = encrypt({ mealURL: 'fictional-private-subscription' }, env.CONFIG_ENCRYPTION_KEY); assert.doesNotMatch(JSON.stringify(encrypted), /fictional-private/);
  assert.equal(decrypt(encrypted, env.CONFIG_ENCRYPTION_KEY).mealURL, 'fictional-private-subscription'); assert.throws(() => decrypt(encrypted, 'e'.repeat(64)));
  assert.equal(verifyPassword('long-fictional-password', env.ADMIN_PASSWORD_HASH), true); assert.equal(verifyPassword('wrong', env.ADMIN_PASSWORD_HASH), false);
});
test('private endpoints deny anonymous users; display sessions are read-only and revocable', async () => {
  const store = new MemoryStore(), api = createAPI(store, env);
  for (const path of ['snapshot', 'photo/' + 'a'.repeat(64), 'config', 'devices']) assert.equal((await api(req(path))).status, 401);
  const display = await issueSession(store, 'display'); assert.match(display.cookie, /Secure; HttpOnly; SameSite=Strict/);
  assert.equal((await api(req('config', display.token))).status, 403); assert.equal((await api(req('snapshot', display.token))).status, 200);
  const admin = await issueSession(store, 'admin'); const devices = await (await api(req('devices', admin.token))).json();
  await api(req('revoke', admin.token, { id: devices.devices[0].id })); assert.equal((await api(req('snapshot', display.token))).status, 401);
  assert.equal((await api(req('pair', admin.token, { label: 'Kitchen' }, 'https://evil.example'))).status, 403);
});
test('login returns only secure cookie and never returns private source URLs', async () => {
  const store = new MemoryStore(), api = createAPI(store, { ...env, PLAN_TO_EAT_FEED_URL: 'https://app.plantoeat.com/fictional-secret' });
  const response = await api(req('login', null, { password: 'long-fictional-password' })); assert.equal(response.status, 200); assert.match(response.headers.get('set-cookie'), /Max-Age=43200/);
  const admin = await issueSession(store, 'admin'), config = await (await api(req('config', admin.token))).text(); assert.doesNotMatch(config, /fictional-secret|https:/);
  const source = await readFile(new URL('../netlify/functions/login.mjs', import.meta.url), 'utf8'); assert.match(source, /windowLimit: 5/);
});
test('feed sync replaces changed/deleted meals, keeps last good data on failure and excludes mirrored calendars', async () => {
  const store = new MemoryStore(); await store.setJSON('configuration', encrypt({ mealURL: 'https://app.plantoeat.com/fictional', calendars: [{ name: 'Home', url: 'unused', mealMirror: true }] }, env.CONFIG_ENCRYPTION_KEY));
  const now = new Date('2026-11-26T17:00:00Z');
  let snap = await synchronize(store, env, { now, fetcher: async () => Buffer.from(fixture) }); assert.equal(snap.meals.length, 1); assert.equal(snap.events.length, 0);
  snap = await synchronize(store, env, { now, fetcher: async () => { throw new Error('no network'); } }); assert.equal(snap.meals.length, 1); assert.equal(snap.stale, true);
  snap = await synchronize(store, env, { now, fetcher: async () => Buffer.from('BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR\r\n') }); assert.equal(snap.meals.length, 0); assert.equal(snap.stale, false);
});
test('photo sync optimizes, strips metadata, detects removals and refuses incomplete manifests', async () => {
  const store = new MemoryStore(), now = new Date('2026-11-26T17:00:00Z');
  await store.setJSON('configuration', encrypt({ photoSource: 'https://bridge.example/manifest', calendars: [] }, env.CONFIG_ENCRYPTION_KEY));
  const raw = await sharp({ create: { width: 2400, height: 1800, channels: 3, background: '#408060' } }).jpeg().toBuffer();
  const manifest = { complete: true, photos: [{ id: 'fictional-1', version: '1', url: 'https://bridge.example/photo', addedAt: now.toISOString() }] };
  const fetcher = async url => url.endsWith('manifest') ? Buffer.from(JSON.stringify(manifest)) : raw;
  let snap = await synchronize(store, env, { now, fetcher }); assert.equal(snap.photos.length, 1);
  const photo = await store.get('photos/' + snap.photos[0].id), info = await sharp(photo).metadata(); assert.equal(info.width, 1600); assert.equal(info.exif, undefined);
  manifest.complete = false; manifest.photos = []; snap = await synchronize(store, env, { now, fetcher }); assert.equal(snap.photos.length, 1);
  manifest.complete = true; snap = await synchronize(store, env, { now, fetcher }); assert.equal(snap.photos.length, 0);
});
test('iCloud requires a legacy public album link and checks complete manifests', async () => {
  assert.throws(() => albumToken('https://share.icloud.com/photos/fictional'));
  assert.throws(() => albumToken('https://evil.example/sharedalbum/#A1234567890'));
  const result = await icloudManifest('https://www.icloud.com/sharedalbum/#A1234567890', async () => Buffer.from('{"itemsReturned":0,"photos":[]}')); assert.deepEqual(result.photos, []);
  await assert.rejects(icloudManifest('https://www.icloud.com/sharedalbum/#A1234567890', async () => Buffer.from('{"itemsReturned":2,"photos":[]}')));
});
