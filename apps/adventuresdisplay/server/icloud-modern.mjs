// Experimental read-only adapter for anonymously viewable modern Apple albums.
// Apple-specific record names were observed in its public viewer; no Apple account session is used.
import { fetchPrivate } from './fetch-private.mjs';
import { resolveModernAlbum } from './icloud-link.mjs';
const value = (record, name) => record.fields?.[name]?.value;
function resourceURL(input) {
  const url = new URL(input);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !/^[a-z0-9.-]+\.(icloud-content\.com|icloud\.com|appleusercontent\.com)$/i.test(url.hostname)) throw new Error('Unexpected Apple media host');
  return url.href;
}
export function normalizeModernRecords(records) {
  if (!Array.isArray(records) || records.length > 1100 || records.some(record => !['CPLMaster', 'CPLAsset'].includes(record.recordType) || typeof record.recordName !== 'string' || !record.fields || record.serverErrorCode)) throw new Error('Unrecognized album records');
  const names = new Set(); for (const record of records) { if (names.has(record.recordName)) throw new Error('Repeated album record'); names.add(record.recordName); }
  const masters = new Map(records.filter(record => record.recordType === 'CPLMaster' && !record.deleted).map(record => [record.recordName, record]));
  const photos = [];
  for (const asset of records.filter(record => record.recordType === 'CPLAsset' && !record.deleted)) {
    if (value(asset, 'trashReason') > 0 || value(asset, 'isHidden') === 1) continue;
    const master = masters.get(value(asset, 'masterRef')?.recordName); if (!master) throw new Error('Incomplete album master references');
    const type = String(value(master, 'itemType') || ''), video = /mpeg-?4|quicktime|public\.movie|public\.video|video\//i.test(type);
    const candidates = [];
    for (const record of [asset, master]) for (const stem of video ? ['resVidMed', 'resVidSmall', 'resOriginal'] : ['resJPEGFull', 'resJPEGLarge', 'resJPEGMed', 'resJPEGThumb', 'resOriginal']) {
      const resource = value(record, stem + 'Res'), format = String(value(record, stem + 'FileType') || '');
      if (!resource?.downloadURL || typeof resource.fileChecksum !== 'string' || !(video ? /mpeg-?4|quicktime|movie|video|hevc/i : /jpeg|jpg|png/i).test(format)) continue;
      const width = Number(value(record, stem + 'Width') || 0), height = Number(value(record, stem + 'Height') || 0);
      candidates.push({ resource, width, height, area: width * height });
    }
    if (!candidates.length) throw new Error('No compatible album media');
    candidates.sort((a, b) => b.area - a.area);
    const selected = candidates.find(candidate => Math.max(candidate.width, candidate.height) <= (video ? 1280 : 2048)) || candidates[candidates.length - 1];
    const timestamp = value(asset, 'mostRecentAddedDate') || value(asset, 'addedDate') || asset.created?.timestamp;
    const added = new Date(timestamp); if (!Number.isFinite(added.getTime())) throw new Error('Invalid album date');
    photos.push({ id: asset.recordName, type: video ? 'video' : 'photo', version: selected.resource.fileChecksum + ':' + String(value(asset, 'orientation') || 1), url: resourceURL(selected.resource.downloadURL), addedAt: added.toISOString() });
  }
  if (photos.length > 500) throw new Error('Album exceeds prototype limit');
  return { complete: true, photos };
}
export async function modernIcloudManifest(input, fetcher = fetchPrivate) {
  const { item, token, build, mastering } = await resolveModernAlbum(input, fetcher);
  if (!item?.anonymousPublicAccess?.token || item.requireAppleLogin || item.share?.publicAnonymousAccess !== true || !item.zoneID || String(item.databaseScope).toLowerCase() !== 'shared') throw new Error('Album does not permit anonymous reading');
  const partition = new URL(item.anonymousPublicAccess.databasePartition);
  if (partition.protocol !== 'https:' || partition.username || partition.password || partition.port || !/^p\d{2,4}-ckdatabasews\.icloud\.com$/.test(partition.hostname)) throw new Error('Unexpected Apple partition');
  const endpoint = new URL('/database/1/com.apple.photos.cloud/production/shared/records/query', partition.origin);
  endpoint.search = new URLSearchParams({ sharing_url_key: token, publicAccessAuthToken: item.anonymousPublicAccess.token, remapEnums: 'true', getCurrentSyncToken: 'true', ...(build ? { clientBuildNumber: build } : {}), ...(mastering ? { clientMasteringNumber: mastering } : {}) }).toString();
  const records = [], markers = new Set(); let marker;
  for (let page = 0; page < 20; page++) {
    const body = { query: { recordType: 'CPLAssetAndMasterByAddedDate', filterBy: [{ fieldName: 'direction', comparator: 'EQUALS', fieldValue: { value: 'ASCENDING', type: 'STRING' } }] }, zoneID: item.zoneID, resultsLimit: 100, ...(marker ? { continuationMarker: marker } : {}) };
    const data = JSON.parse((await fetcher(endpoint.href, [partition.hostname], 4_000_000, { body: JSON.stringify(body), origin: 'https://photos.icloud.com' })).toString());
    if (data.serverErrorCode || !Array.isArray(data.records) || (data.moreComing && !data.continuationMarker)) throw new Error('Incomplete album page');
    records.push(...data.records); if (records.length > 1100) throw new Error('Album exceeds prototype limit');
    marker = data.continuationMarker;
    if (!marker) { if (typeof data.syncToken !== 'string') throw new Error('Missing album completeness marker'); return normalizeModernRecords(records); }
    if (typeof marker !== 'string' || markers.has(marker)) throw new Error('Invalid album continuation'); markers.add(marker);
  }
  throw new Error('Album pagination did not finish');
}
