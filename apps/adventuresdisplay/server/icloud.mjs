// Experimental undocumented SharedStreams protocol; no Apple account credentials.
// Protocol research: ghostops/ICloud-Shared-Album (MIT). No package dependency.
import { fetchPrivate } from './fetch-private.mjs';
export function albumToken(input) {
  const url = new URL(input);
  if (url.protocol !== 'https:' || url.hostname !== 'www.icloud.com' || url.pathname !== '/sharedalbum/' || !/^#[A-Za-z0-9]{10,100}$/.test(url.hash)) throw new Error('Use a legacy iCloud Shared Album Public Website link');
  return url.hash.slice(1);
}
export async function icloudManifest(input, fetcher = fetchPrivate) {
  const token = albumToken(input), chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const partition = (token[0] === 'A' ? token.slice(1, 2) : token.slice(1, 3)).split('').reduce((n, c) => n * 62 + chars.indexOf(c), 0);
  let host = 'p' + String(partition).padStart(2, '0') + '-sharedstreams.icloud.com';
  const post = async (action, body) => JSON.parse((await fetcher('https://' + host + '/' + token + '/sharedstreams/' + action, [host], 2_000_000, { body: JSON.stringify(body), allow330: true })).toString());
  let stream = await post('webstream', { streamCtag: null });
  if (stream['X-Apple-MMe-Host']) {
    if (!/^p\d{2,4}-sharedstreams\.icloud\.com$/.test(stream['X-Apple-MMe-Host'])) throw new Error('Unexpected iCloud host');
    host = stream['X-Apple-MMe-Host']; stream = await post('webstream', { streamCtag: null });
  }
  if (!Array.isArray(stream.photos) || stream.photos.length > 500 || Number(stream.itemsReturned) !== stream.photos.length) throw new Error('Incomplete album response');
  const result = [];
  for (let offset = 0; offset < stream.photos.length; offset += 20) {
    const group = stream.photos.slice(offset, offset + 20), data = await post('webasseturls', { photoGuids: group.map(p => p.photoGuid) });
    if (!data.items) throw new Error('Incomplete album assets');
    for (const photo of group) {
      const video = photo.mediaAssetType === 'video';
      if (photo.mediaAssetType && photo.mediaAssetType !== 'image' && !video) continue;
      const variants = Object.values(photo.derivatives || {}).filter(d => {
        if (!d.checksum || !data.items[d.checksum]) return false;
        const asset = data.items[d.checksum], hint = String(d.fileType || d.type || asset.url_path || '');
        return video ? /mp4|m4v|mov|quicktime|mpeg-?4|public\.movie/i.test(hint) : !/mp4|m4v|mov|quicktime/i.test(hint);
      }).sort((a, b) => Number(b.width) * Number(b.height) - Number(a.width) * Number(a.height));
      if (!variants.length) throw new Error('Missing photograph');
      const derivative = variants.find(d => Math.max(Number(d.width), Number(d.height)) <= 2048) || variants[variants.length - 1], asset = data.items[derivative.checksum];
      if (!/^[a-z0-9.-]+\.(icloud\.com|icloud-content\.com|appleusercontent\.com)$/i.test(asset.url_location)) throw new Error('Unexpected image host');
      result.push({ id: photo.photoGuid, type: video ? 'video' : 'photo', version: derivative.checksum, url: 'https://' + asset.url_location + asset.url_path, addedAt: photo.batchDateCreated || photo.dateCreated });
    }
  }
  return { complete: true, photos: result };
}
