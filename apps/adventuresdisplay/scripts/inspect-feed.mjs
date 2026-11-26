// Accept a private URL through stdin only. Never print it or raw feed contents.
import { createInterface } from 'node:readline';
import { writeFile, readFile } from 'node:fs/promises';
import ICAL from 'ical.js';
let input;
if (process.argv.includes('--recipes')) {
  input = (await readFile(new URL('../.env', import.meta.url), 'utf8')).split('\n').find(l => l.startsWith('PLAN_TO_EAT_FEED_URL=')).slice('PLAN_TO_EAT_FEED_URL='.length).replace('/all/', '/recipes/');
} else {
  if (process.stdin.isTTY) process.stdin.setRawMode(true);
  const reader = createInterface({ input: process.stdin, terminal: false });
  input = await new Promise(resolve => reader.once('line', resolve)); reader.close();
}
try {
  const url = new URL(input.trim().replace(/^webcal:/, 'https:'));
  if (url.protocol !== 'https:' || url.hostname !== 'app.plantoeat.com') throw new Error();
  const response = await fetch(url, { signal: AbortSignal.timeout(15000), redirect: 'error' });
  if (!response.ok) throw new Error();
  const text = await response.text();
  const root = new ICAL.Component(ICAL.parse(text));
  const events = root.getAllSubcomponents('vevent');
  console.log(JSON.stringify({ count: events.length, calendarProperties: root.getAllProperties().map(p => p.name),
    allDay: events.filter(e => e.getFirstPropertyValue('dtstart').isDate).length,
    categorized: events.filter(e => e.getFirstPropertyValue('categories')).length,
    recipeLinks: events.filter(e => String(e.getFirstPropertyValue('url')).includes('/recipes/')).length,
    propertySets: Array.from(new Set(events.map(e => e.getAllProperties().map(p => p.name).sort().join(',')))) }, null, 2));
  const oldEnv = await readFile(new URL('../.env', import.meta.url), 'utf8').catch(() => '');
  const otherLines = oldEnv.split('\n').filter(line => !line.startsWith('PLAN_TO_EAT_FEED_URL=')).join('\n').trim();
  await writeFile(new URL('../.env', import.meta.url), (otherLines ? otherLines + '\n' : '') + 'PLAN_TO_EAT_FEED_URL=' + url.href + '\n', { mode: 0o600 });
  console.log('Saved subscription to ignored local .env; no URL printed.');
} catch { console.error('Feed inspection failed (details suppressed to protect subscription).'); process.exitCode = 1; }
