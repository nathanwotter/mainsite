import { randomBytes, createHash } from 'node:crypto';
import { mkdir, writeFile, access } from 'node:fs/promises';
const directory = new URL('../.local-state/', import.meta.url);
await mkdir(directory, { recursive: true });
const file = new URL('netlify-household.env', directory);
try { await access(file); throw new Error('Setup bundle already exists. Preserve its encryption key; do not regenerate blindly.'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const token = randomBytes(32).toString('hex'), key = process.env.CONFIG_ENCRYPTION_KEY || randomBytes(32).toString('hex');
if (!/^[a-f0-9]{64}$/i.test(key)) throw new Error('Invalid encryption key');
const values = { ADVENTURESDISPLAY_MODE: 'household', CONFIG_ENCRYPTION_KEY: key, SETUP_TOKEN_HASH: createHash('sha256').update(token).digest('hex'), SETUP_TOKEN_EXPIRES: String(Date.now() + 86400000), ALLOW_PUBLIC_ICLOUD: 'true', PRIVATE_OFFLINE_CACHE: 'false' };
if (process.env.PLAN_TO_EAT_FEED_URL) values.PLAN_TO_EAT_FEED_URL = process.env.PLAN_TO_EAT_FEED_URL;
if (process.env.ICLOUD_ALBUM_URL && process.env.ICLOUD_ALBUM_ACKNOWLEDGED === 'true') { values.ICLOUD_ALBUM_URL = process.env.ICLOUD_ALBUM_URL; values.ICLOUD_ALBUM_ACKNOWLEDGED = 'true'; }
if (Object.values(values).some(value => /[\r\n]/.test(value))) throw new Error('Invalid environment value');
await writeFile(file, Object.entries(values).map(([name, value]) => name + '=' + value).join('\n') + '\n', { mode: 0o600, flag: 'wx' });
await writeFile(new URL('setup-link.txt', directory), 'https://otter-adventuresdisplay.netlify.app/setup.html#' + token + '\n', { mode: 0o600, flag: 'wx' });
console.log('Created ignored private setup bundle and one-time link under .local-state. No secrets printed.');
