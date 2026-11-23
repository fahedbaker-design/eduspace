/* EduSpace offline — keeps the app's files on the device (0.20.0: the version only — Inter comes with the same font rule. 0.19.0: an opening of the app always gets the kept page (navigate → index.html). 0.18.1: the cache eduspace-0.18.1. 0.18: course.js; a new version takes its files fresh from the server (cache:'reload'), so it shows at once. 0.12: the grading station and pdf.js; pdf.js's fonts are kept when first used). Opens from the cache (works without internet);
   when online, each file is refreshed in the background, so a new version shows on the next opening.
   The font (IBM Plex Sans Arabic, from Google Fonts) is kept the same way after the first online opening. */
const CACHE = 'eduspace-0.20.0';
const FONTS = 'eduspace-fonts';
const FILES = ['./', './index.html', './app.css', './app.js', './station.js', './course.js', './vendor/pdfjs/pdf.mjs', './vendor/pdfjs/pdf.worker.mjs', './manifest.webmanifest', './icon.svg', './icon-180.png', './icon-192.png', './icon-512.png', './test.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));   /* 0.18: fresh copies, never the browser's old ones */
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
  /* 0.19: opening the app always finds its page — a link without the last «/», with a query or a different name
     gets the kept index.html (Safari said «can't open the page» offline on another iPad) */
  if (e.request.mode === 'navigate' && u.origin === location.origin) {
    e.respondWith(staleWhileRevalidate(CACHE, e.request).then(r => r || caches.match('./index.html', { ignoreSearch: true }) || caches.match('./'))
      .catch(() => caches.match('./index.html', { ignoreSearch: true })));
    return;
  }
  if (u.origin === location.origin) e.respondWith(staleWhileRevalidate(CACHE, e.request));
  else if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') e.respondWith(staleWhileRevalidate(FONTS, e.request));
});