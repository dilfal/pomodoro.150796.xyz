/* Service worker di Pomodoro: la app si apre anche senza rete.
   Si cambia VERSIONE a ogni modifica dei file, così i telefoni scaricano la copia nuova. */
var VERSIONE = 'pomodoro-v1';
var NUCLEO = ['./', 'index.html', 'styles.css', 'script.js', 'manifest.webmanifest',
  'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSIONE).then(function (c) { return c.addAll(NUCLEO); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (nomi) {
    return Promise.all(nomi.filter(function (n) { return n !== VERSIONE; }).map(function (n) { return caches.delete(n); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var r = e.request;
  if (r.method !== 'GET') return;
  /* I suoni non passano di qui: Safari li chiede a pezzi (header Range) e una risposta in cache li romperebbe. */
  if (r.headers.has('range') || /\.wav(\?|$)/.test(r.url)) return;
  /* Prima la copia in cache, poi si aggiorna in silenzio per la prossima apertura. */
  e.respondWith(caches.open(VERSIONE).then(function (c) {
    return c.match(r, { ignoreSearch: true }).then(function (inCache) {
      var rete = fetch(r).then(function (resp) {
        if (resp && (resp.ok || resp.type === 'opaque')) c.put(r, resp.clone());
        return resp;
      }).catch(function () { return inCache; });
      return inCache || rete;
    });
  }));
});
