import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
async function worker() {
  let now = Date.now(), fetcher; const handlers = {}, stores = new Map();
  const key = request => new URL(typeof request === 'string' ? request : request.url, 'https://frame.example').pathname;
  const caches = { async open(name) { if (!stores.has(name)) stores.set(name, new Map()); const values = stores.get(name); return { async put(k, v) { values.set(key(k), v.clone()); }, async match(k) { return values.get(key(k))?.clone(); }, async delete(k) { return values.delete(key(k)); }, async keys() { return Array.from(values.keys()).map(p => new Request('https://frame.example' + p)); } }; }, async keys() { return Array.from(stores.keys()); }, async delete(name) { return stores.delete(name); } };
  const sandbox = { URL, Response, Promise, caches, importScripts() {}, fetch: (...args) => fetcher(...args), Date: class extends Date { static now() { return now; } }, self: { location: { origin: 'https://frame.example' }, clients: { claim() {} }, addEventListener(name, fn) { handlers[name] = fn; } } };
  vm.createContext(sandbox); vm.runInContext(await readFile(new URL('../public/core.js', import.meta.url), 'utf8'), sandbox);
  vm.runInContext(await readFile(new URL('../public/sw.js', import.meta.url), 'utf8'), sandbox);
  return { stores, setFetch(fn) { fetcher = fn; }, expire() { now += 3600001; }, until() { return now + 3600000; }, async get(path, range) { let response; const jobs = []; handlers.fetch({ request: new Request('https://frame.example' + path, { headers: range ? { range } : {} }), respondWith(p) { response = p; }, waitUntil(p) { jobs.push(p); } }); const result = await response; await Promise.all(jobs); return result; } };
}
test('private offline lease allows bounded photos, marks stale data, and expires closed', async () => {
  const w = await worker(), id = 'a'.repeat(64), photo = '/api/photo/' + id;
  w.setFetch(async request => String(typeof request === 'string' ? request : request.url).includes('/api/photo/') ? new Response('jpeg') : Response.json({ demo: false, offlineKey: 'b'.repeat(64), offlineLeaseUntil: w.until(), photos: [{ src: photo }], meals: [{ title: 'Fictional pasta' }] }));
  await w.get('/api/snapshot'); w.setFetch(async () => { throw new Error('offline'); });
  assert.equal(await (await w.get(photo)).text(), 'jpeg'); assert.equal((await (await w.get('/api/snapshot')).json()).stale, true);
  w.expire(); assert.equal((await w.get(photo)).status, 401); assert.ok(!Array.from(w.stores.keys()).some(k => k.startsWith('adventuresdisplay-household-')));
});
test('revocation clears private cache and a successful empty manifest removes cached photographs', async () => {
  const w = await worker(), photo = '/api/photo/' + 'a'.repeat(64); let photos = [{ src: photo }];
  w.setFetch(async request => String(typeof request === 'string' ? request : request.url).includes('/api/photo/') ? new Response('jpeg') : Response.json({ demo: false, offlineKey: 'b'.repeat(64), offlineLeaseUntil: w.until(), photos }));
  await w.get('/api/snapshot'); photos = []; await w.get('/api/snapshot');
  const privateCache = Array.from(w.stores.entries()).find(([k]) => k.startsWith('adventuresdisplay-household-'))[1]; assert.equal(privateCache.has(photo), false);
  w.setFetch(async () => new Response('{}', { status: 401 })); await w.get('/api/snapshot'); assert.ok(!Array.from(w.stores.keys()).some(k => k.startsWith('adventuresdisplay-household-')));
});
test('private cached videos answer offline byte ranges and lose access at lease expiry', async () => {
  const w = await worker(), video = '/api/video/' + 'c'.repeat(64);
  w.setFetch(async request => String(typeof request === 'string' ? request : request.url).includes('/api/video/') ? new Response('0123456789') : Response.json({ demo: false, offlineKey: 'b'.repeat(64), offlineLeaseUntil: w.until(), photos: [{ type: 'video', src: video }] }));
  await w.get('/api/snapshot'); w.setFetch(async () => { throw new Error('offline'); });
  const response = await w.get(video, 'bytes=2-5'); assert.equal(response.status, 206); assert.equal(response.headers.get('content-range'), 'bytes 2-5/10'); assert.equal(await response.text(), '2345');
  w.expire(); assert.equal((await w.get(video, 'bytes=0-1')).status, 401);
});
