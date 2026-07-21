const CACHE_NAME = 'fso-cache-v12';
// Local shell assets — install fails if these can't be cached (correct: the app
// can't work without them).
const CORE_ASSETS = [
  './',
  './FSO_App.html',
  './manifest.json',
];
// CDN assets — cached opportunistically. One flaky CDN must never block install.
const CDN_ASSETS = [
  'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Mono:wght@400;500&display=swap',
  'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js',
  'https://cdn.jsdelivr.net/npm/fflate@0.8.2/umd/index.js',
  'https://cdn.jsdelivr.net/npm/@azure/msal-browser@3.18.0/lib/msal-browser.min.js',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(CORE_ASSETS).then(() =>
        Promise.all(CDN_ASSETS.map(u => cache.add(u).catch(e => console.warn('SW cdn cache skip:', u))))
      )
    )
    // NOTE: no skipWaiting() here — the page shows an "Update" banner and the
    // user chooses when to switch (prevents surprise reloads mid data-entry).
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Is this a request for the app shell (navigation or the main HTML)?
function isAppShell(request) {
  if (request.mode === 'navigate') return true;
  const url = new URL(request.url);
  return url.origin === self.location.origin &&
    (url.pathname.endsWith('/') || url.pathname.endsWith('/FSO_App.html') || url.pathname.endsWith('FSO_App.html'));
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Never intercept Microsoft Graph / auth traffic.
  const url = new URL(req.url);
  if (/graph\.microsoft\.com|login\.microsoftonline\.com/.test(url.hostname)) return;

  // NETWORK-FIRST for the app shell so the latest build always loads when online.
  if (isAppShell(req)) {
    event.respondWith(
      fetch(req).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        }
        return response;
      }).catch(() => caches.match(req).then(c => c || caches.match('./FSO_App.html')))
    );
    return;
  }

  // CACHE-FIRST for everything else (static assets, CDN libs, template PDF).
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        return response;
      }).catch(() => {
        if (req.mode === 'navigate') return caches.match('./FSO_App.html');
      });
    })
  );
});
