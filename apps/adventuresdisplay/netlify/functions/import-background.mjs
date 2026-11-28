import {store} from '../../server/store.mjs';
import {validJob,runImport} from '../../server/import-job.mjs';
export default async request => { if(!validJob(request,process.env)) return; try { await runImport(store(),process.env); } catch { console.error('Album import interrupted; saved progress retained.'); } };
