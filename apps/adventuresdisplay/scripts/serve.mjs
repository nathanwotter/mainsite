import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { createAPI } from '../server/api.mjs';
import { MemoryStore } from '../server/store.mjs';
import { videoResponse } from '../server/video.mjs';
const localStore = new MemoryStore();
const api = createAPI(localStore, process.env);
const attempts = new Map();
const root = resolve(import.meta.dirname, '../public');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.png': 'image/png', '.mp4': 'video/mp4' };
createServer(async (req, res) => {
  try {
    const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (name.startsWith('/api/')) {
      if (name === '/api/login') {
        const key = req.socket.remoteAddress, now = Date.now(), previous = (attempts.get(key) || []).filter(t => now - t < 60000);
        if (previous.length >= 5) { res.writeHead(429); res.end('Try again later'); return; } previous.push(now); attempts.set(key, previous);
      }
      const parts = []; let size = 0;
      for await (const chunk of req) { size += chunk.length; if (size > 64000) throw new Error(); parts.push(chunk); }
      const request = new Request('http://127.0.0.1:4173' + req.url, { method: req.method, headers: req.headers, ...(parts.length ? { body: Buffer.concat(parts) } : {}) });
      const response = await api(request); res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(Buffer.from(await response.arrayBuffer())); return;
    }
    const path = resolve(root, '.' + (name === '/' ? '/index.html' : name));
    if (!path.startsWith(root + sep)) throw new Error('Outside public directory');
    const body = await readFile(path);
    if (extname(path) === '.mp4') { const response = videoResponse(body, req.headers.range); res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(req.method === 'HEAD' ? undefined : Buffer.from(await response.arrayBuffer())); return; }
    res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-cache' });
    res.end(body);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(4173, '127.0.0.1', () => console.log('AdventuresDisplay: http://127.0.0.1:4173'));
