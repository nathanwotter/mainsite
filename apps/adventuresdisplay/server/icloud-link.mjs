import { fetchPrivate } from './fetch-private.mjs';
export function classifyAlbumLink(input) {
  const url = new URL(input);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search) throw new Error('Invalid iCloud album link');
  if (url.hostname === 'www.icloud.com' && url.pathname === '/sharedalbum/' && /^#[A-Za-z0-9]{10,100}$/.test(url.hash)) return 'legacy';
  if (url.hostname === 'photos.icloud.com' && new RegExp('^/shared/album/[A-Za-z0-9_-]{10,100}/?$').test(url.pathname) && !url.hash) return 'modern';
  throw new Error('Unsupported iCloud album link');
}
export async function resolveModernAlbum(input, fetcher = fetchPrivate) {
  if (classifyAlbumLink(input) !== 'modern') throw new Error('Expected modern album link');
  const url = new URL(input), token = url.pathname.split('/').filter(Boolean).pop();
  const page = (await fetcher(url.href, ['photos.icloud.com'])).toString();
  const build = /data-cw-private-build-number="([A-Za-z0-9]+)"/.exec(page)?.[1];
  const mastering = /data-cw-private-mastering-number="([A-Za-z0-9]+)"/.exec(page)?.[1];
  const embedded = /<script[^>]*type="application\/json"[^>]*id="resolvedShare"[^>]*>([\s\S]*?)<\/script>/.exec(page);
  let metadataAvailable = false;
  if (embedded) { try { const data = JSON.parse(embedded[1]); metadataAvailable = !!(data.title && data.thumbnailImage); } catch { /* Viewer schema changed. */ } }
  const endpoint = new URL('https://ckdatabasews.icloud.com/database/1/com.apple.photos.cloud/production/public/records/resolve');
  endpoint.search = new URLSearchParams({ remapEnums: 'true', getCurrentSyncToken: 'true', sharing_url_key: token, ...(build ? { clientBuildNumber: build } : {}), ...(mastering ? { clientMasteringNumber: mastering } : {}) }).toString();
  const result = JSON.parse((await fetcher(endpoint.href, ['ckdatabasews.icloud.com'], 2_000_000, { body: JSON.stringify({ shortGUIDs: [{ value: token }] }), origin: 'https://photos.icloud.com' })).toString());
  return { item: result.results?.[0], metadataAvailable, token, build, mastering };
}
export async function inspectModernAlbum(input, fetcher = fetchPrivate) {
  const { item, metadataAvailable } = await resolveModernAlbum(input, fetcher), anonymousAccess = !!item?.anonymousPublicAccess?.token;
  return { format: 'modern', metadataAvailable, anonymousAccess, requiresAppleLogin: !!item?.requireAppleLogin, status: anonymousAccess ? 'anonymous-access-available' : item?.serverErrorCode === 'NOT_FOUND' ? 'not-found' : 'anonymous-access-unavailable', synchronized: false };
}
