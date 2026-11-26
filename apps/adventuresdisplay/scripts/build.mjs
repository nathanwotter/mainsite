import { cp, mkdir, rm } from 'node:fs/promises';
if (process.env.ADVENTURESDISPLAY_MODE && !['demo', 'household'].includes(process.env.ADVENTURESDISPLAY_MODE)) {
  throw new Error('Unknown display mode.');
}
const hasAdmin = /^[0-9a-f]{32}:[0-9a-f]{128}$/i.test(process.env.ADMIN_PASSWORD_HASH || '');
const hasSetup = /^[0-9a-f]{64}$/i.test(process.env.SETUP_TOKEN_HASH || '');
if (process.env.ADVENTURESDISPLAY_MODE === 'household' && ((!hasAdmin && !hasSetup) || !/^[0-9a-f]{64}$/i.test(process.env.CONFIG_ENCRYPTION_KEY || ''))) throw new Error('Household mode requires valid authentication and encryption secrets.');
await rm(new URL('../dist/', import.meta.url), { recursive: true, force: true });
await mkdir(new URL('../dist/', import.meta.url));
await cp(new URL('../public/', import.meta.url), new URL('../dist/', import.meta.url), { recursive: true });
console.log('Built AdventuresDisplay shell and public demo assets. No environment values are included in the output.');
