import { createHash, randomBytes, scryptSync, timingSafeEqual, createCipheriv, createDecipheriv } from 'node:crypto';
export const digest = value => createHash('sha256').update(value).digest('hex');
export const cookieName = '__Host-adventuresdisplay';
export function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 14 || password.length > 256) throw new Error('Use 14 to 256 characters');
  const salt = randomBytes(16).toString('hex'); return salt + ':' + scryptSync(password, salt, 64).toString('hex');
}
export function verifyPassword(password, hash) {
  if (typeof password !== 'string' || password.length > 256 || !/^[0-9a-f]{32}:[0-9a-f]{128}$/i.test(hash || '')) return false;
  const [salt, expected] = hash.split(':');
  return timingSafeEqual(scryptSync(password, salt, 64), Buffer.from(expected, 'hex'));
}
export function sameOrigin(request) { return request.headers.get('origin') === new URL(request.url).origin; }
export async function session(request, storage, now = Date.now()) {
  const token = request.headers.get('cookie')?.split(';').map(s => s.trim()).find(s => s.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const record = await storage.get('sessions/' + digest(token), { type: 'json' });
  return record && record.expires > now ? { ...record, key: digest(token) } : null;
}
export async function issueSession(storage, role, label = 'Household device', now = Date.now()) {
  const token = randomBytes(32).toString('hex'), age = role === 'admin' ? 43200 : 7776000;
  await storage.setJSON('sessions/' + digest(token), { role, label: String(label).slice(0, 60), expires: now + age * 1000 });
  return { token, cookie: cookieName + '=' + token + '; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=' + age };
}
export function encrypt(value, key) {
  if (!/^[a-f0-9]{64}$/i.test(key || '')) throw new Error('Encryption unavailable');
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
  return { iv: iv.toString('hex'), tag: cipher.getAuthTag().toString('hex'), body: body.toString('base64') };
}
export function decrypt(value, key) {
  if (!/^[a-f0-9]{64}$/i.test(key || '')) throw new Error('Encryption unavailable');
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(key, 'hex'), Buffer.from(value.iv, 'hex'));
  decipher.setAuthTag(Buffer.from(value.tag, 'hex'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(value.body, 'base64')), decipher.final()]).toString());
}
