import { store } from '../../server/store.mjs';
import { synchronize } from '../../server/sync.mjs';
export default async () => {
  if (process.env.ADVENTURESDISPLAY_MODE !== 'household') return;
  try { await synchronize(store(), process.env); } catch { console.error('Household refresh failed; source details suppressed.'); }
};
export const config = { schedule: '*/15 * * * *' };
