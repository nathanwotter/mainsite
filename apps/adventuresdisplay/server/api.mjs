import { cookieName, verifyPassword, sameOrigin, session, issueSession, encrypt } from './security.mjs';
import { readConfig, synchronize } from './sync.mjs';
import { validateURL } from './fetch-private.mjs';
import { videoResponse } from './video.mjs';
import { classifyAlbumLink } from './icloud-link.mjs';
import '../public/core.js';
import { hashPassword, digest, decrypt } from './security.mjs';
import { timingSafeEqual } from 'node:crypto';
const sanitizePreferences = globalThis.AdventuresDisplayCore.settings;
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store', ...headers } });
export function createAPI(storage, env) {
  return async request => {
    try {
      const path = new URL(request.url).pathname, demo = (env.ADVENTURESDISPLAY_MODE || 'demo') === 'demo';
      if (path === '/api/status') { const administrator = await storage.get('administrator', { type: 'json' }); return json({ demo, authConfigured: !!env.CONFIG_ENCRYPTION_KEY && !!(env.ADMIN_PASSWORD_HASH || administrator) }); }
      if (path === '/api/snapshot' && demo) return json({ demo: true });
      if (request.method !== 'GET' && request.method !== 'HEAD' && !sameOrigin(request)) return json({ error: 'Origin not allowed' }, 403);
      if (path === '/api/setup' && request.method === 'POST') {
        if (demo || !/^[a-f0-9]{64}$/i.test(env.CONFIG_ENCRYPTION_KEY || '') || env.ADMIN_PASSWORD_HASH || await storage.get('administrator', { type: 'json' })) return json({ error: 'Setup unavailable or already completed' }, 409);
        const body = await request.json();
        if (typeof body.token !== 'string' || !/^[a-f0-9]{64}$/i.test(body.token) || !/^[a-f0-9]{64}$/i.test(env.SETUP_TOKEN_HASH || '') || (!Number.isFinite(Number(env.SETUP_TOKEN_EXPIRES)) || Date.now() >= Number(env.SETUP_TOKEN_EXPIRES || 0)) || !timingSafeEqual(Buffer.from(digest(body.token), 'hex'), Buffer.from(env.SETUP_TOKEN_HASH, 'hex'))) return json({ error: 'Setup link invalid or expired' }, 401);
        if (typeof body.password !== 'string' || body.password.length < 14 || body.password.length > 256) return json({ error: 'Use a password with 14 to 256 characters' }, 400);
        const saved = await storage.setJSON('administrator', encrypt({ passwordHash: hashPassword(body.password) }, env.CONFIG_ENCRYPTION_KEY), { onlyIfNew: true });
        if (!saved.modified) return json({ error: 'Setup already completed' }, 409);
        const issued = await issueSession(storage, 'admin'); return json({ ok: true }, 200, { 'Set-Cookie': issued.cookie });
      }
      if (path === '/api/login' && request.method === 'POST') {
        const body = await request.json();
        const administrator = await storage.get('administrator', { type: 'json' });
        const passwordHash = administrator && env.CONFIG_ENCRYPTION_KEY ? decrypt(administrator, env.CONFIG_ENCRYPTION_KEY).passwordHash : env.ADMIN_PASSWORD_HASH;
        if (!env.CONFIG_ENCRYPTION_KEY || !verifyPassword(body.password, passwordHash)) return json({ error: 'Sign-in unavailable or credentials invalid' }, 401);
        const issued = await issueSession(storage, 'admin'); return json({ ok: true }, 200, { 'Set-Cookie': issued.cookie });
      }
      const identity = await session(request, storage); if (!identity) return json({ error: 'Authorization required' }, 401);
      if (path === '/api/logout' && request.method === 'POST') { await storage.delete('sessions/' + identity.key); return json({ ok: true }, 200, { 'Set-Cookie': cookieName + '=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0' }); }
      if (path === '/api/snapshot' && request.method === 'GET') {
        const snapshot = await storage.get('snapshot', { type: 'json' }) || { demo: false, events: [], meals: [], photos: [], stale: true };
        return json({ ...snapshot, offlineKey: identity.key, offlineLeaseUntil: identity.role === 'display' && env.PRIVATE_OFFLINE_CACHE === 'true' ? Math.min(identity.expires, Date.now() + 3600000) : 0 });
      }
      if (path.startsWith('/api/photo/') && request.method === 'GET') {
        const id = path.slice('/api/photo/'.length); if (!/^[a-f0-9]{64}$/.test(id)) return json({ error: 'Not found' }, 404);
        const manifest = await storage.get('photo-manifest', { type: 'json' }) || [];
        if (!manifest.some(p => p.id === id)) return json({ error: 'Not found' }, 404);
        const value = await storage.get('photos/' + id, { type: 'arrayBuffer' }); if (!value) return json({ error: 'Not found' }, 404);
        return new Response(value, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, no-store' } });
      }
      if (path.startsWith('/api/video/') && (request.method === 'GET' || request.method === 'HEAD')) {
        const id = path.slice('/api/video/'.length); if (!/^[a-f0-9]{64}$/.test(id)) return json({ error: 'Not found' }, 404);
        const manifest = await storage.get('photo-manifest', { type: 'json' }) || [];
        if (!manifest.some(p => p.id === id && p.type === 'video')) return json({ error: 'Not found' }, 404);
        const value = await storage.get('videos/' + id, { type: 'arrayBuffer' }); if (!value) return json({ error: 'Not found' }, 404);
        const response = videoResponse(value, request.headers.get('range'));
        return request.method === 'HEAD' ? new Response(null, { status: response.status, headers: response.headers }) : response;
      }
      if (identity.role !== 'admin') return json({ error: 'Administrator required' }, 403);
      if (path === '/api/pair' && request.method === 'POST') {
        const body = await request.json(), issued = await issueSession(storage, 'display', body.label);
        await storage.delete('sessions/' + identity.key); return json({ ok: true }, 200, { 'Set-Cookie': issued.cookie });
      }
      if (path === '/api/devices' && request.method === 'GET') {
        const { blobs } = await storage.list({ prefix: 'sessions/' }); const devices = [];
        for (const blob of blobs) { const record = await storage.get(blob.key, { type: 'json' }); if (record?.role === 'display' && record.expires > Date.now()) devices.push({ id: blob.key.slice(9), label: record.label, expires: record.expires }); }
        return json({ devices });
      }
      if (path === '/api/revoke' && request.method === 'POST') { const body = await request.json(); if (!/^[a-f0-9]{64}$/.test(body.id)) return json({ error: 'Invalid device' }, 400); await storage.delete('sessions/' + body.id); return json({ ok: true }); }
      if (path === '/api/config' && request.method === 'GET') {
        const config = await readConfig(storage, env);
        return json({ mealConnected: !!config.mealURL, photoConnected: !!config.photoSource || !!config.icloudURL, preferences: config.preferences, calendars: (config.calendars || []).map(c => ({ name: c.name, visible: c.visible, mealMirror: c.mealMirror })) });
      }
      if (path === '/api/config' && request.method === 'POST') {
        if (demo) return json({ error: 'Private sources require household mode' }, 409);
        const body = await request.json(), old = await readConfig(storage, env);
        const hosts = ['app.plantoeat.com', 'calendar.google.com', 'calendar.googleusercontent.com', ...(env.FEED_ALLOWED_HOSTS || '').split(',').map(h => h.trim()).filter(Boolean)];
        const config = { ...old };
        if (body.mealURL !== undefined && body.mealURL !== '') { config.mealURL = validateURL(body.mealURL, ['app.plantoeat.com']).href; if (!/\/recipes\/plantoeat-ical\.ics$/.test(new URL(config.mealURL).pathname)) return json({ error: 'Use the recipes-only Plan to Eat subscription' }, 400); }
        if (body.photoSource !== undefined && body.photoSource !== '') { config.photoSource = validateURL(body.photoSource, hosts).href; config.icloudURL = ''; }
        if (body.icloudURL) {
          classifyAlbumLink(body.icloudURL);
          if (env.ALLOW_PUBLIC_ICLOUD !== 'true' || body.publicAlbumAcknowledged !== true) return json({ error: 'Public album use requires explicit privacy acknowledgment and server opt-in' }, 400);
          config.icloudURL = body.icloudURL; config.publicAlbumAcknowledged = true; config.photoSource = '';
        }
        if (body.disconnectMeals) config.mealURL = '';
        if (body.disconnectPhotos) { config.photoSource = ''; config.icloudURL = ''; }
        if (body.calendars !== undefined) {
          if (!Array.isArray(body.calendars) || body.calendars.length > 8) return json({ error: 'Up to eight calendar subscriptions' }, 400);
          config.calendars = body.calendars.map(c => ({ name: ['Family', 'Home', 'Activities'].includes(c.name) ? c.name : 'Family', url: validateURL(c.url, hosts).href, visible: c.visible !== false, mealMirror: !!c.mealMirror }));
        }
        delete config.mealPolicy; // Remove the retired category setting from older saved configurations.
        if (body.preferences) config.preferences = sanitizePreferences(body.preferences);
        await storage.setJSON('configuration', encrypt(config, env.CONFIG_ENCRYPTION_KEY));
        return json({ ok: true });
      }
      if (path === '/api/sync' && request.method === 'POST') { if (demo) return json({ error: 'Demo does not sync private sources' }, 409); const data = await synchronize(storage, env); return json({ ok: true, stale: data.stale, photoCount: data.photos.length, mealCount: data.meals.length }); }
      return json({ error: 'Not found' }, 404);
    } catch { return json({ error: 'Request could not be completed. Check server configuration.' }, 503); }
  };
}
