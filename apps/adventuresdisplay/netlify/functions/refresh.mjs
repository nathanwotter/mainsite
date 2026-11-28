import {enqueueImport} from '../../server/import-job.mjs';
export default async () => { if(process.env.ADVENTURESDISPLAY_MODE!=='household') return; try { await enqueueImport(process.env); } catch { console.error('Household import worker could not be started.'); } };
export const config = {schedule:'*/15 * * * *'};
