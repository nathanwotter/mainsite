import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyAlbumLink, inspectModernAlbum } from '../server/icloud-link.mjs';
import { createAPI } from '../server/api.mjs';
import { MemoryStore } from '../server/store.mjs';
import { issueSession, cookieName } from '../server/security.mjs';
test('modern and legacy album formats are distinguished without treating an invite as a public album token', () => {
  assert.equal(classifyAlbumLink('https://photos.icloud.com/shared/album/fictionalLink123456'), 'modern');
  assert.equal(classifyAlbumLink('https://www.icloud.com/sharedalbum/#A1234567890'), 'legacy');
  for (const value of ['https://evil.example/shared/album/fictionalLink123456', 'http://photos.icloud.com/shared/album/fictionalLink123456', 'https://photos.icloud.com/shared/album/fictionalLink123456?token=x']) assert.throws(() => classifyAlbumLink(value));
});
test('metadata alone does not count as anonymous access or a successful album connection', async () => {
  const fetcher = async url => Buffer.from(url.includes('records/resolve') ? JSON.stringify({ results: [{ serverErrorCode: 'NOT_FOUND', requireAppleLogin: false }] }) : '<html data-cw-private-build-number="2642Build18"><script type="application/json" id="resolvedShare">{"title":"Fictional album","thumbnailImage":"secret-preview","ownerFirstName":"Private"}</script></html>');
  const result = await inspectModernAlbum('https://photos.icloud.com/shared/album/fictionalLink123456', fetcher);
  assert.equal(result.metadataAvailable, true); assert.equal(result.anonymousAccess, false); assert.equal(result.status, 'not-found'); assert.equal(result.synchronized, false);
  assert.doesNotMatch(JSON.stringify(result), /fictionalLink|secret-preview|Fictional album|Private/);
});
test('even a returned anonymous token stays server-side and does not falsely report synchronization', async () => {
  const fetcher = async url => Buffer.from(url.includes('records/resolve') ? JSON.stringify({ results: [{ anonymousPublicAccess: { token: 'fictional-secret-token' } }] }) : '<html></html>');
  const result = await inspectModernAlbum('https://photos.icloud.com/shared/album/fictionalLink123456', fetcher);
  assert.equal(result.anonymousAccess, true); assert.equal(result.synchronized, false); assert.doesNotMatch(JSON.stringify(result), /fictional-secret-token/);
});
test('administration requires explicit public-link consent and server opt-in for modern links', async () => {
  const storage = new MemoryStore(), identity = await issueSession(storage, 'admin');
  const api = createAPI(storage, { ADVENTURESDISPLAY_MODE: 'household', CONFIG_ENCRYPTION_KEY: 'f'.repeat(64) });
  const response = await api(new Request('https://frame.example/api/config', { method: 'POST', headers: { origin: 'https://frame.example', cookie: cookieName + '=' + identity.token, 'Content-Type': 'application/json' }, body: JSON.stringify({ icloudURL: 'https://photos.icloud.com/shared/album/fictionalLink123456' }) }));
  assert.equal(response.status, 400); assert.match((await response.json()).error, /privacy acknowledgment/); assert.equal(await storage.get('configuration'), null);
});
