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
  let stale = false;
  async function source(key, url, options) {
    if (!url) { await storage.delete(key); return []; }
    try { const values = parseFeed((await fetcher(url, hosts)).toString(), { from, until, ...options }); await storage.setJSON(key, { values, at: now.toISOString() }); return values; }
    catch { stale = true; const saved = await storage.get(key, { type: 'json' }); return saved?.values?.filter(v => v.day >= from && v.day <= until) || []; }
  }
  const meals = await source('meals', config.mealURL, { recipesOnly: true });
  let events = [];
  for (const [index, calendar] of (config.calendars || []).slice(0, 8).entries()) {
    // Explicitly exclude a mirrored Plan to Eat calendar, even if an upstream provider rewrites UIDs.
    if (calendar.visible !== false && !calendar.mealMirror) events.push(...await source('calendar/' + index, calendar.url, { calendar: calendar.name }));
  }
  let photos = (await storage.get('photo-manifest', { type: 'json' })) || [];
  async function removeAsset(asset) { await storage.delete((asset.type === 'video' ? 'videos/' : 'photos/') + asset.id); }
  if (!config.photoSource && !config.icloudURL) { for (const old of photos) await removeAsset(old); photos = []; await storage.setJSON('photo-manifest', []); }
  else try {
    // Private bridge contract: complete, authoritative manifest; never accept a partial list as deletion.
    if (config.icloudURL && (env.ALLOW_PUBLIC_ICLOUD !== 'true' || !config.publicAlbumAcknowledged)) throw new Error('Public album access is not approved');
    const manifest = config.icloudURL ? await icloudManifest(config.icloudURL, fetcher) : JSON.parse((await fetcher(config.photoSource, hosts)).toString());
    if (manifest.complete !== true || !Array.isArray(manifest.photos) || manifest.photos.length > 500) throw new Error();
    const next = []; let ingested = 0;
    for (const image of manifest.photos) {
      if (!image.id || !image.version || !image.url) throw new Error();
      const video = image.type === 'video', kind = video ? 'videos/' : 'photos/';
      const sourceIdHash = createHash('sha256').update(String(image.id)).digest('hex');
      const id = createHash('sha256').update(String(image.id) + ':' + image.version + (video ? ':video-v1' : '')).digest('hex');
      const existing = photos.find(p => p.id === id) || await storage.get(kind + id, { type: 'arrayBuffer' });
      if (!existing) {
        if (++ingested > 8) throw new Error('Photo ingestion continues on the next refresh');
        const imageHost = new URL(image.url).hostname;
        const imageHosts = config.icloudURL ? (/^[a-z0-9.-]+\.(icloud\.com|icloud-content\.com|appleusercontent\.com)$/i.test(imageHost) ? [imageHost] : []) : hosts;
        try {
          const raw = await fetcher(image.url, imageHosts, video ? 40_000_000 : 12_000_000);
          const optimized = video ? await optimizeVideo(raw) : await sharp(raw, { limitInputPixels: 40_000_000 }).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
          await storage.set(kind + id, optimized);
        } catch (error) {
          if (!video) throw error;
          stale = true; const previous = photos.find(p => p.type === 'video' && p.sourceIdHash === sourceIdHash);
          if (previous) next.push(previous);
          continue; // An unsupported clip must not block otherwise valid photographs.
        }
      }
      next.push({ id, sourceIdHash, type: video ? 'video' : 'photo', src: (video ? '/api/video/' : '/api/photo/') + id, alt: video ? 'Shared album video' : 'Shared album photograph', addedAt: String(image.addedAt || now.toISOString()).slice(0, 30) });
    }
    // Publish manifest only after every derivative succeeds. Remove absent IDs on successful sync.
    await storage.setJSON('photo-manifest', next);
    for (const old of photos) if (!next.some(p => p.id === old.id)) await removeAsset(old);
    photos = next;
  } catch { stale = true; }
  const snapshot = { demo: false, events: deduplicate(events, meals), meals, photos, preferences: config.preferences || null, stale, syncedAt: now.toISOString() };
  await storage.setJSON('snapshot', snapshot); return snapshot;
}
