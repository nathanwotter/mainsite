import {createHmac, timingSafeEqual, randomUUID} from 'node:crypto';
import {synchronize} from './sync.mjs';
export function jobSignature(env, timestamp) { return createHmac('sha256', env.CONFIG_ENCRYPTION_KEY).update('adventuresdisplay-import:' + timestamp).digest('hex'); }
export function validJob(request, env, now = Date.now()) {
  if (request.method !== 'POST' || env.ADVENTURESDISPLAY_MODE !== 'household' || !/^[a-f0-9]{64}$/i.test(env.CONFIG_ENCRYPTION_KEY || '')) return false;
  const time = request.headers.get('x-import-time'), signature = request.headers.get('x-import-signature');
  return /^\d{13}$/.test(time || '') && Math.abs(now - Number(time)) < 300000 && /^[a-f0-9]{64}$/.test(signature || '') && timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(jobSignature(env, time), 'hex'));
}
export async function enqueueImport(env, fetcher = fetch) {
  const origin = new URL(env.URL); if (origin.protocol !== 'https:') throw new Error('Invalid worker destination');
  const time = String(Date.now());
  const response = await fetcher(new URL('/.netlify/functions/import-background', origin.origin), {method:'POST',headers:{'x-import-time':time,'x-import-signature':jobSignature(env,time)},signal:AbortSignal.timeout(10000)});
  if (!response.ok) throw new Error('Import worker unavailable');
}
export async function runImport(storage, env, {sync = synchronize, clock = Date.now} = {}) {
  const key = 'import-lock', owner = randomUUID(), old = await storage.get(key, {type:'json'});
  if (old?.until > clock()) return {running:true};
  if (old) await storage.delete(key);
  const acquired = await storage.setJSON(key,{owner,until:clock()+14*60000},{onlyIfNew:true}); if (!acquired.modified) return {running:true};
  try {
    const start=clock(); let result;
    for(let pass=0;pass<64 && clock()-start<9*60000;pass++) { result=await sync(storage,env); if(result.sourceStatus?.photos!=='importing') break; }
    return result;
  } finally { if((await storage.get(key,{type:'json'}))?.owner===owner) await storage.delete(key); }
}
