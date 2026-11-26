import { store } from '../../server/store.mjs';
import { createAPI } from '../../server/api.mjs';
export default async request => createAPI(store(), process.env)(request);
export const config = { path: '/api/login', method: 'POST', rateLimit: { action: 'rate_limit', aggregateBy: ['ip', 'domain'], windowSize: 60, windowLimit: 5 } };
