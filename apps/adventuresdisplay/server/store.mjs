import { getStore } from '@netlify/blobs';
export function store() { return getStore({ name: 'adventuresdisplay-private', consistency: 'strong' }); }
export class MemoryStore {
  entries = new Map();
  async get(key, options) { const v = this.entries.get(key); if (v === undefined) return null; return options?.type === 'json' ? structuredClone(v) : v; }
  async setJSON(key, value) { this.entries.set(key, structuredClone(value)); }
  async set(key, value) { this.entries.set(key, value); }
  async delete(key) { this.entries.delete(key); }
  async list({ prefix = '' } = {}) { return { blobs: Array.from(this.entries.keys()).filter(k => k.startsWith(prefix)).map(key => ({ key })) }; }
}
