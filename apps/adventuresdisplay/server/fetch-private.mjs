import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import { isIP } from 'node:net';
export function validateURL(input, hosts) {
  const url = new URL(String(input).replace(/^webcal:/, 'https:'));
  if (url.protocol !== 'https:' || url.username || url.password || url.port || isIP(url.hostname) || !hosts.includes(url.hostname)) throw new Error('Source host is not allowed');
  url.hash = ''; return url;
}
export function publicAddress(address) {
  if (isIP(address) !== 4) return false; // Conservative IPv4-only pinned transport.
  const [a, b] = address.split('.').map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19)) || (a === 192 && b === 0));
}
export async function fetchPrivate(input, hosts, maxBytes = 2_000_000, options = {}) {
  const url = validateURL(input, hosts), addresses = await lookup(url.hostname, { all: true, family: 4 });
  if (!addresses.length || addresses.some(a => !publicAddress(a.address))) throw new Error('Source unavailable');
  // Pin the validated DNS address for this connection; keep hostname for TLS/SNI.
  return new Promise((resolve, reject) => {
    const req = request(url, { method: options.body ? 'POST' : 'GET', lookup: (_host, flags, cb) => cb(null, flags?.all ? [addresses[0]] : addresses[0].address, 4), headers: { 'User-Agent': 'AdventuresDisplay/0.2 household feed reader', Accept: '*/*', ...(options.body ? { 'Content-Type': 'text/plain', Origin: options.origin === 'https://photos.icloud.com' ? options.origin : 'https://www.icloud.com' } : {}) } }, res => {
      if (res.statusCode !== 200 && !(options.allow330 && res.statusCode === 330)) { res.resume(); reject(new Error('Source unavailable')); return; }
      let size = 0; const chunks = [];
      res.on('data', chunk => { size += chunk.length; if (size > maxBytes) { req.destroy(); reject(new Error('Source too large')); } else chunks.push(chunk); });
      res.on('end', () => resolve(Buffer.concat(chunks))); res.on('error', () => reject(new Error('Source unavailable')));
    });
    const deadline = setTimeout(() => req.destroy(), 15000); req.on('close', () => clearTimeout(deadline));
    req.setTimeout(15000, () => req.destroy()); req.on('error', () => reject(new Error('Source unavailable'))); req.end(options.body);
  });
}
