// Service worker — permet à "Notre famille" de fonctionner hors-ligne
// une fois ouverte au moins une fois avec internet.
const CACHE = "famille-cache-v7";
const FICHIERS = ["./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", function (evt) {
  evt.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(FICHIERS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (evt) {
  evt.waitUntil(
    caches.keys().then(function (noms) {
      return Promise.all(
        noms.filter(function (n) { return n !== CACHE; })
            .map(function (n) { return caches.delete(n); })
      );
    })
  );
  self.clients.claim();
});

// Stratégie : réseau d'abord, cache en secours (pour toujours avoir la dernière version si possible)
self.addEventListener("fetch", function (evt) {
  if (evt.request.method !== "GET") return;
  evt.respondWith(
    fetch(evt.request)
      .then(function (reponse) {
        const copie = reponse.clone();
        caches.open(CACHE).then(function (cache) { cache.put(evt.request, copie); });
        return reponse;
      })
      .catch(function () {
        return caches.match(evt.request).then(function (r) {
          return r || caches.match("./index.html");
        });
      })
  );
});
