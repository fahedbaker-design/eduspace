/* EduSpace offline — keeps the app's files on the device (0.12: the grading station and pdf.js; pdf.js's fonts are kept when first used). Opens from the cache (works without internet);
   when online, each file is refreshed in the background, so a new version shows on the next opening.
   The font (IBM Plex Sans Arabic, from Google Fonts) is kept the same way after the first online opening. */
const CACHE = 'eduspace-0.15.1';
const FONTS = 'eduspace-fonts';
const FILES = ['./', './index.html', './app.css', './app.js', './station.js', './vendor/pdfjs/pdf.mjs', './vendor/pdfjs/pdf.worker.mjs', './manifest.webmanifest', './icon.svg', './icon-180.png', './icon-192.png', './icon-512.png', './test.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== FONTS).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
function staleWhileRevalidate(name, req) {
  return caches.open(name).then(c => c.match(req, { ignoreSearch: name === CACHE }).then(hit => {
    const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
}
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  if (u.origin === location.origin) e.respondWith(staleWhileRevalidate(CACHE, e.request));
  else if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') e.respondWith(staleWhileRevalidate(FONTS, e.request));
});
