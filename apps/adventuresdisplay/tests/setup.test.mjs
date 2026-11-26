import test from 'node:test';
import assert from 'node:assert/strict';
import { createAPI } from '../server/api.mjs';
import { MemoryStore } from '../server/store.mjs';
import { digest, decrypt, cookieName } from '../server/security.mjs';
const token = 'a'.repeat(64), password = 'fictional-long-household-password';
const env = () => ({ ADVENTURESDISPLAY_MODE: 'household', CONFIG_ENCRYPTION_KEY: 'b'.repeat(64), SETUP_TOKEN_HASH: digest(token), SETUP_TOKEN_EXPIRES: String(Date.now() + 60000) });
const request = (path, body, origin = 'https://frame.example') => new Request('https://frame.example/api/' + path, { method: body ? 'POST' : 'GET', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
test('enrollment creates an encrypted administrator once, logs in securely, and never returns credentials', async () => {
  const storage = new MemoryStore(), settings = env(), api = createAPI(storage, settings);
  const result = await api(request('setup', { token, password })); assert.equal(result.status, 200); assert.match(result.headers.get('set-cookie'), /Secure; HttpOnly; SameSite=Strict/); assert.equal((await result.json()).ok, true);
  const stored = await storage.get('administrator', { type: 'json' }); assert.doesNotMatch(JSON.stringify(stored), /passwordHash|fictional/); assert.ok(decrypt(stored, settings.CONFIG_ENCRYPTION_KEY).passwordHash);
  assert.equal((await api(request('setup', { token, password: 'a-different-long-password' }))).status, 409);
  assert.equal((await api(request('login', { password }))).status, 200); assert.equal((await api(request('login', { password: 'wrong' }))).status, 401);
  assert.equal((await (await api(request('status'))).json()).authConfigured, true);
});
test('enrollment rejects wrong or expired tokens, cross-origin requests, demo mode and weak passwords', async () => {
  for (const override of [{ SETUP_TOKEN_EXPIRES: '0' }, { SETUP_TOKEN_EXPIRES: 'invalid' }, { SETUP_TOKEN_HASH: digest('c'.repeat(64)) }]) { const storage = new MemoryStore(), api = createAPI(storage, { ...env(), ...override }); assert.equal((await api(request('setup', { token, password }))).status, 401); assert.equal(await storage.get('administrator'), null); }
  const storage = new MemoryStore(), api = createAPI(storage, env()); assert.equal((await api(request('setup', { token, password }, 'https://evil.example'))).status, 403); assert.equal((await api(request('setup', { token, password: 'short' }))).status, 400);
  assert.equal((await createAPI(storage, { ...env(), ADVENTURESDISPLAY_MODE: 'demo' })(request('setup', { token, password }))).status, 409);
});
test('concurrent enrollment cannot overwrite an administrator', async () => {
  const storage = new MemoryStore(), api = createAPI(storage, env()); const responses = await Promise.all([api(request('setup', { token, password })), api(request('setup', { token, password: 'different-long-fictional-password' }))]); assert.deepEqual(responses.map(r => r.status).sort(), [200, 409]);
});
