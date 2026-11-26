import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { optimizeVideo, videoResponse, MAX_VIDEO_BYTES } from '../server/video.mjs';
import { createAPI } from '../server/api.mjs';
import { MemoryStore } from '../server/store.mjs';
import { issueSession, cookieName, encrypt } from '../server/security.mjs';
import { synchronize } from '../server/sync.mjs';
import { icloudManifest } from '../server/icloud.mjs';
const sample = () => readFile(new URL('../public/videos/coast-demo.mp4', import.meta.url));
test('real sample video transcodes into bounded H.264/AAC MP4 without touching originals', async () => {
  const input = await sample(), output = await optimizeVideo(input);
  assert.ok(output.length < MAX_VIDEO_BYTES); assert.match(output.subarray(0, 32).toString(), /ftyp/);
  assert.ok(output.includes(Buffer.from('avc1'))); assert.ok(output.includes(Buffer.from('mp4a')));
  assert.deepEqual(input, await sample());
  await assert.rejects(optimizeVideo(Buffer.from('not a video')), /could not be optimized/);
});
test('video byte ranges support Safari probes, suffixes, partial and invalid ranges', async () => {
  const bytes = Buffer.from('0123456789');
  let response = videoResponse(bytes, 'bytes=0-1'); assert.equal(response.status, 206); assert.equal(response.headers.get('content-range'), 'bytes 0-1/10'); assert.equal(await response.text(), '01');
  response = videoResponse(bytes, 'bytes=-3'); assert.equal(await response.text(), '789');
  response = videoResponse(bytes, 'bytes=8-'); assert.equal(await response.text(), '89');
  for (const range of ['bytes=20-', 'bytes=4-2', 'bytes=0-1,3-4', 'bytes=-0']) assert.equal(videoResponse(bytes, range).status, 416);
});
test('video URLs require an authorized session and current manifest membership, including range and HEAD', async () => {
  const storage = new MemoryStore(), api = createAPI(storage, { ADVENTURESDISPLAY_MODE: 'household' }), id = 'a'.repeat(64);
  await storage.setJSON('photo-manifest', [{ id, type: 'video' }]); await storage.set('videos/' + id, Buffer.from('0123456789'));
  const url = 'https://frame.example/api/video/' + id;
  assert.equal((await api(new Request(url, { headers: { range: 'bytes=0-1' } }))).status, 401);
  const identity = await issueSession(storage, 'display'); const headers = { cookie: cookieName + '=' + identity.token, range: 'bytes=0-1' };
  const response = await api(new Request(url, { headers })); assert.equal(response.status, 206); assert.equal(await response.text(), '01'); assert.equal(response.headers.get('content-type'), 'video/mp4');
  assert.equal((await api(new Request(url, { headers, method: 'HEAD' }))).status, 206);
  await storage.setJSON('photo-manifest', []); assert.equal((await api(new Request(url, { headers }))).status, 404);
});
test('private bridge videos are optimized, stored and removed with the authoritative album', async () => {
  const storage = new MemoryStore(), env = { CONFIG_ENCRYPTION_KEY: 'f'.repeat(64) };
  await storage.setJSON('configuration', encrypt({ photoSource: 'https://bridge.example/manifest', calendars: [] }, env.CONFIG_ENCRYPTION_KEY));
  const manifest = { complete: true, photos: [{ id: 'clip', type: 'video', version: '1', url: 'https://bridge.example/clip', addedAt: '2026-11-26' }] };
  const raw = await sample(), fetcher = async url => url.endsWith('manifest') ? Buffer.from(JSON.stringify(manifest)) : raw;
  const snapshot = await synchronize(storage, env, { fetcher }); assert.equal(snapshot.photos[0].type, 'video'); assert.match(snapshot.photos[0].src, /^\/api\/video\//);
  const id = snapshot.photos[0].id; assert.ok(await storage.get('videos/' + id)); manifest.photos = [];
  await synchronize(storage, env, { fetcher }); assert.equal(await storage.get('videos/' + id), null);
});
test('experimental iCloud adapter selects video derivatives instead of JPEG posters', async () => {
  const manifest = await icloudManifest('https://www.icloud.com/sharedalbum/#A1234567890', async (url) => Buffer.from(JSON.stringify(url.endsWith('webstream') ? { itemsReturned: 1, photos: [{ photoGuid: 'clip', mediaAssetType: 'video', derivatives: { poster: { checksum: 'p', fileType: 'public.jpeg', width: 1920, height: 1080 }, clip: { checksum: 'v', fileType: 'public.mpeg-4', width: 1280, height: 720 } } }] } : { items: { p: { url_location: 'assets.icloud-content.com', url_path: '/poster.jpg' }, v: { url_location: 'assets.icloud-content.com', url_path: '/clip.mp4' } } })));
  assert.equal(manifest.photos[0].type, 'video'); assert.equal(manifest.photos[0].version, 'v'); assert.match(manifest.photos[0].url, /clip\.mp4$/);
});
test('a corrupt video is skipped without blocking valid album photographs', async () => {
  const storage = new MemoryStore(), env = { CONFIG_ENCRYPTION_KEY: 'f'.repeat(64) };
  await storage.setJSON('configuration', encrypt({ photoSource: 'https://bridge.example/manifest', calendars: [] }, env.CONFIG_ENCRYPTION_KEY));
  const manifest = { complete: true, photos: [{ id: 'bad-clip', type: 'video', version: '1', url: 'https://bridge.example/clip' }, { id: 'good-photo', version: '1', url: 'https://bridge.example/photo' }] };
  const photograph = await readFile(new URL('../public/photos/lake.jpg', import.meta.url));
  const snapshot = await synchronize(storage, env, { fetcher: async url => url.endsWith('manifest') ? Buffer.from(JSON.stringify(manifest)) : url.endsWith('clip') ? Buffer.from('not a video') : photograph });
  assert.equal(snapshot.photos.length, 1); assert.equal(snapshot.photos[0].type, 'photo'); assert.equal(snapshot.stale, true);
});
