// Private diagnostic: source comes from environment; only structural counts leave memory.
import { fetchPrivate } from '../server/fetch-private.mjs';
import { parseFeed } from '../server/ical.mjs';
try {
  if (!process.env.PLAN_TO_EAT_FEED_URL) throw new Error();
  const data = await fetchPrivate(process.env.PLAN_TO_EAT_FEED_URL, ['app.plantoeat.com']);
  const meals = parseFeed(data.toString(), { from: '2020-01-01', until: '2035-01-01', recipesOnly: true });
  console.log(JSON.stringify({ source: 'Plan to Eat dinners', normalizedRecipeCount: meals.length, transport: 'HTTPS with pinned public DNS', secretPrinted: false }));
} catch { console.error('Private feed check failed; source details suppressed.'); process.exitCode = 1; }
