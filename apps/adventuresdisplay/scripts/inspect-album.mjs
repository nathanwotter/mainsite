// Keep album links in hidden stdin / ignored .env; print only non-sensitive status.
import { createInterface } from 'node:readline';
import { readFile, writeFile } from 'node:fs/promises';
import { classifyAlbumLink, inspectModernAlbum } from '../server/icloud-link.mjs';
const envURL = new URL('../.env', import.meta.url);
const previous = await readFile(envURL, 'utf8').catch(() => '');
let input;
if (process.argv.includes('--saved')) input = previous.split('\n').find(l => l.startsWith('ICLOUD_ALBUM_URL='))?.slice('ICLOUD_ALBUM_URL='.length);
else {
  if (process.stdin.isTTY) process.stdin.setRawMode(true);
  const reader = createInterface({ input: process.stdin, terminal: false });
  input = await new Promise(resolve => reader.once('line', resolve)); reader.close();
}
try {
  const url = new URL(input.trim()), format = classifyAlbumLink(url.href);
  const other = previous.split('\n').filter(l => !l.startsWith('ICLOUD_ALBUM_URL=')).join('\n').trim();
  await writeFile(envURL, (other ? other + '\n' : '') + 'ICLOUD_ALBUM_URL=' + url.href + '\n', { mode: 0o600 });
  if (format === 'modern') console.log(JSON.stringify(await inspectModernAlbum(url.href), null, 2));
  else console.log(JSON.stringify({ format, status: 'legacy-adapter-available; explicit-sharing-approval-still-required', synchronized: false }));
} catch { console.error('Album inspection could not complete; source details suppressed.'); process.exitCode = 1; }
