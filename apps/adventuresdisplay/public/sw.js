importScripts('/core.js');
var CACHE = 'adventuresdisplay-demo-v11', CONTROL = 'adventuresdisplay-offline-control-v1';
var ASSETS = ['/', '/index.html', '/styles.css', '/core.js', '/app.js', '/manifest.webmanifest', '/apple-touch-icon.png', '/photos/lake.jpg', '/photos/coast.jpg', '/photos/mountains.jpg', '/videos/coast-demo.mp4'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(CACHE).then(function (cache) { return cache.addAll(ASSETS); })); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (keys) { return Promise.all(keys.filter(function (k) { return k.indexOf('adventuresdisplay-demo-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });
function clearPrivate() { return caches.keys().then(function (keys) { return Promise.all(keys.filter(function (k) { return k === CONTROL || k.indexOf('adventuresdisplay-household-') === 0; }).map(function (k) { return caches.delete(k); })); }); }
function metadata() { return caches.open(CONTROL).then(function (c) { return c.match('/offline-lease'); }).then(function (r) { return r ? r.json() : null; }); }
function validLease() { return metadata().then(function (m) { if (m && m.until > Date.now()) return m; return clearPrivate().then(function () { return null; }); }); }
function authorizedOffline() { return new Response(JSON.stringify({ error: 'Authorization required' }), { status: 401, headers: { 'Content-Type': 'application/json' } }); }
function saveSnapshot(response) {
  return response.clone().json().then(function (data) {
    if (data.demo) return clearPrivate().then(function () { return caches.open(CACHE).then(function (c) { return c.put('/demo-mode', new Response('true')); }); });
    caches.open(CACHE).then(function (c) { return c.delete('/demo-mode'); });
    if (!data.offlineLeaseUntil || data.offlineLeaseUntil <= Date.now() || !/^[a-f0-9]{64}$/.test(data.offlineKey || '')) return clearPrivate();
    var name = 'adventuresdisplay-household-' + data.offlineKey;
    return metadata().then(function (old) { return old && old.name !== name ? clearPrivate() : null; }).then(function () {
      return caches.open(name).then(function (cache) {
        return cache.put('/api/snapshot', response.clone()).then(function () {
          var budget = 0;
          var urls = (data.photos || []).slice(0, 20).map(function (p) { return p.src; }).filter(function (p) { return /^\/api\/(photo|video)\/[a-f0-9]{64}$/.test(p); });
          return cache.keys().then(function (keys) { return Promise.all(keys.filter(function (k) { var p = new URL(k.url).pathname; return p !== '/api/snapshot' && urls.indexOf(p) < 0; }).map(function (k) { return cache.delete(k); })); }).then(function () {
            // Up to 20 items and 40 MB total; videos capped at 14 MB, photographs at 2 MB.
            return urls.reduce(function (chain, url) { return chain.then(function () { return cache.match(url).then(function (existing) { return existing || fetch(url, { credentials: 'same-origin', cache: 'no-store' }); }).then(function (r) { if (r.status === 401) return clearPrivate(); if (!r.ok || r.status === 206) return; return r.blob().then(function (blob) { var isVideo = url.indexOf('/video/') >= 0, cap = isVideo ? 14000000 : 2000000; if (blob.size <= cap && budget + blob.size <= 40000000) { budget += blob.size; return cache.put(url, new Response(blob, { headers: { 'Content-Type': isVideo ? 'video/mp4' : 'image/jpeg' } })); } return cache.delete(url); }); }); }); }, Promise.resolve());
          }).then(function () { return caches.open(CONTROL).then(function (control) { return control.put('/offline-lease', new Response(JSON.stringify({ name: name, until: data.offlineLeaseUntil }))); }); });
        });
      });
    });
  });
}
self.addEventListener('fetch', function (event) {
  var url = new URL(event.request.url); if (url.origin !== self.location.origin) return;
  if (url.pathname === '/api/logout' || url.pathname === '/api/login') { event.waitUntil(clearPrivate()); return; }
  if (event.request.method !== 'GET') return;
  if (url.pathname === '/api/snapshot') {
    event.respondWith(fetch(event.request).then(function (r) {
      if (r.status === 401) event.waitUntil(clearPrivate()); else if (r.ok) event.waitUntil(saveSnapshot(r).catch(function () { /* Storage eviction: online remains usable. */ })); return r;
    }).catch(function () { return validLease().then(function (lease) { if (!lease) return caches.open(CACHE).then(function (c) { return c.match('/demo-mode'); }).then(function (r) { return r ? new Response('{"demo":true}') : authorizedOffline(); }); return caches.open(lease.name).then(function (c) { return c.match('/api/snapshot'); }).then(function (r) { if (!r) return authorizedOffline(); return r.json().then(function (data) { data.stale = true; data.offline = true; return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } }); }); }); }); })); return;
  }
  if (/^\/api\/(photo|video)\/[a-f0-9]{64}$/.test(url.pathname)) {
    event.respondWith(fetch(event.request).then(function (r) { if (r.status === 401) event.waitUntil(clearPrivate()); return r; }).catch(function () { return validLease().then(function (lease) { if (!lease) return authorizedOffline(); return caches.open(lease.name).then(function (c) { return c.match(url.pathname); }).then(function (r) { return r && url.pathname.indexOf('/video/') >= 0 ? offlineVideo(r, event.request.headers.get('range')) : r || Response.error(); }); }); })); return;
  }
  if (ASSETS.indexOf(url.pathname) < 0) return;
  event.respondWith(fetch(event.request).then(function (r) { if (r.ok && r.status !== 206) { var copy = r.clone(); event.waitUntil(caches.open(CACHE).then(function (c) { return c.put(event.request, copy); })); } return r; }).catch(function () { return caches.match(url.pathname).then(function (r) { return r && /\.mp4$/.test(url.pathname) ? offlineVideo(r, event.request.headers.get('range')) : r || Response.error(); }); }));
});
function offlineVideo(response, header) {
  if (!header) return response;
  return response.blob().then(function (blob) {
    var range = AdventuresDisplayCore.byteRange(header, blob.size);
    if (range === false) return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + blob.size } });
    return new Response(blob.slice(range.start, range.end + 1, 'video/mp4'), { status: 206, headers: { 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes', 'Content-Length': String(range.end - range.start + 1), 'Content-Range': 'bytes ' + range.start + '-' + range.end + '/' + blob.size } });
  });
}
