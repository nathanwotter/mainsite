import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { fetchPrivate } from './fetch-private.mjs';
import { parseFeed, deduplicate } from './ical.mjs';
import { decrypt } from './security.mjs';
import { icloudManifest } from './icloud.mjs';
import '../public/core.js';
import { optimizeVideo } from './video.mjs';
export async function readConfig(storage, env) {
  const saved = await storage.get('configuration', { type: 'json' });
  return saved ? decrypt(saved, env.CONFIG_ENCRYPTION_KEY) : { mealURL: env.PLAN_TO_EAT_FEED_URL || '', calendars: [], photoSource: '', icloudURL: env.ALLOW_PUBLIC_ICLOUD === 'true' && env.ICLOUD_ALBUM_ACKNOWLEDGED === 'true' ? env.ICLOUD_ALBUM_URL || '' : '', publicAlbumAcknowledged: env.ICLOUD_ALBUM_ACKNOWLEDGED === 'true' };
}
export async function synchronize(storage, env, { now = new Date(), fetcher = fetchPrivate } = {}) {
  const config = await readConfig(storage, env);
  const from = globalThis.AdventuresDisplayCore.zonedDay(now), until = globalThis.AdventuresDisplayCore.addDays(from, 7);
  const hosts = ['app.plantoeat.com', 'calendar.google.com', 'calendar.googleusercontent.com', ...(env.FEED_ALLOWED_HOSTS || '').split(',').map(h => h.trim()).filter(Boolean)];
  let stale = false; const sourceStatus = { meals: 'disabled', calendars: 'disabled', photos: 'disabled' }; let photoProgress = null;
  async function source(key, url, options) {
    if (!url) { await storage.delete(key); return []; }
    try { const values = parseFeed((await fetcher(url, hosts)).toString(), { from, until, ...options }); await storage.setJSON(key, { values, at: now.toISOString() }); if (sourceStatus[key === 'meals' ? 'meals' : 'calendars'] !== 'failed') sourceStatus[key === 'meals' ? 'meals' : 'calendars'] = 'ok'; return values; }
    catch { stale = true; sourceStatus[key === 'meals' ? 'meals' : 'calendars'] = 'failed'; const saved = await storage.get(key, { type: 'json' }); return saved?.values?.filter(v => v.day >= from && v.day <= until) || []; }
  }
  const meals = await source('meals', config.mealURL, { recipesOnly: true });
  let events = [];
  for (const [index, calendar] of (config.calendars || []).slice(0, 8).entries()) {
    // Explicitly exclude a mirrored Plan to Eat calendar, even if an upstream provider rewrites UIDs.
    if (calendar.visible !== false && !calendar.mealMirror) events.push(...await source('calendar/' + index, calendar.url, { calendar: calendar.name }));
  }
  let photos = (await storage.get('photo-manifest', { type: 'json' })) || [];
  const staged = (await storage.get('photo-staging', { type: 'json' })) || {};
  let photoStage = 'manifest';
  async function removeAsset(asset) { await storage.delete((asset.type === 'video' ? 'videos/' : 'photos/') + asset.id); }
  if (!config.photoSource && !config.icloudURL) { for (const old of photos) await removeAsset(old); photos = []; await storage.setJSON('photo-manifest', []); await storage.delete('photo-staging'); }
  else try {
    // Private bridge contract: complete, authoritative manifest; never accept a partial list as deletion.
    if (config.icloudURL && (env.ALLOW_PUBLIC_ICLOUD !== 'true' || !config.publicAlbumAcknowledged)) throw new Error('Public album access is not approved');
    const manifest = config.icloudURL ? await icloudManifest(config.icloudURL, fetcher) : JSON.parse((await fetcher(config.photoSource, hosts)).toString());
    if (manifest.complete !== true || !Array.isArray(manifest.photos) || manifest.photos.length > 500) throw new Error();
    const next = [], seenIDs = new Set(); let ingested = 0, videos = 0, pending = false, skipped = 0; photoStage = 'media';
    for (const image of manifest.photos) {
      if (!image.id || !image.version || !image.url) throw new Error();
      const video = image.type === 'video', kind = video ? 'videos/' : 'photos/';
      const sourceIdHash = createHash('sha256').update(String(image.id)).digest('hex');
      const id = createHash('sha256').update(String(image.id) + ':' + image.version + (video ? ':video-v1' : '')).digest('hex');
      seenIDs.add(id);
      if (staged[id]?.retryAfter > Date.now()) { skipped++; stale = true; const previous = photos.find(p => p.sourceIdHash === sourceIdHash); if (previous) next.push(previous); continue; }
      const existing = photos.find(p => p.id === id) || staged[id] === true;
      if (!existing) {
        if (ingested >= 8 || (video && videos >= 1)) { pending = true; const previous = photos.find(p => p.sourceIdHash === sourceIdHash); if (previous) next.push(previous); continue; }
        ingested++; if (video) videos++;
        const imageHost = new URL(image.url).hostname;
        const imageHosts = config.icloudURL ? (/^[a-z0-9.-]+\.(icloud\.com|icloud-content\.com|appleusercontent\.com)$/i.test(imageHost) ? [imageHost] : []) : hosts;
        try {
          const raw = await fetcher(image.url, imageHosts, video ? 40_000_000 : 12_000_000);
          const optimized = video ? await optimizeVideo(raw) : await sharp(raw, { limitInputPixels: 40_000_000 }).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
          await storage.set(kind + id, optimized); staged[id] = true; await storage.setJSON('photo-staging', staged);
        } catch (error) {
          stale = true; skipped++; staged[id] = { retryAfter: Date.now() + 3600000 }; await storage.setJSON('photo-staging', staged); const previous = photos.find(p => p.sourceIdHash === sourceIdHash);
          if (previous) next.push(previous);
          continue; // An unavailable item must not block the rest of the album.
        }
      }
      next.push({ id, sourceIdHash, type: video ? 'video' : 'photo', src: (video ? '/api/video/' : '/api/photo/') + id, alt: video ? 'Shared album video' : 'Shared album photograph', addedAt: String(image.addedAt || now.toISOString()).slice(0, 30) });
    }
    // The source manifest is complete. Publish ready assets progressively; preserve older versions while replacements import.
    await storage.setJSON('photo-manifest', next);
    for (const old of photos) if (!next.some(p => p.id === old.id)) await removeAsset(old);
    photos = next; sourceStatus.photos = pending ? 'importing' : skipped ? 'partial' : 'ok';
    photoProgress = { ready: next.length, total: manifest.photos.length, skipped };
    for (const id of Object.keys(staged)) if (!seenIDs.has(id)) delete staged[id]; await storage.setJSON('photo-staging', staged);
  } catch { stale = true; sourceStatus.photos = photoStage === 'manifest' ? 'unavailable' : 'media-error'; }
  const snapshot = { demo: false, events: deduplicate(events, meals), meals, photos, preferences: config.preferences || null, stale, sourceStatus, photoProgress, syncedAt: now.toISOString() };
  await storage.setJSON('snapshot', snapshot); return snapshot;
}
