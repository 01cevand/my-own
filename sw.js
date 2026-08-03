// Service worker — permet à "Notre famille" de fonctionner hors-ligne
// une fois ouverte au moins une fois avec internet.
const CACHE = "famille-cache-v29";
const FICHIERS = ["./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png", "./icon-192-maskable.png", "./icon-512-maskable.png"];

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

// Réception d'une notification poussée par le serveur — fonctionne même app fermée
self.addEventListener("push", function (evt) {
  let d = {};
  try { d = evt.data ? evt.data.json() : {}; } catch (e) { d = { titre: "Notre Famille", corps: "" }; }
  const titre = d.titre || "Notre Famille";
  const options = {
    body: d.corps || "",
    icon: "./icon-192.png",
    badge: "./icon-192.png",
    data: { url: d.url || "./index.html" }
  };
  evt.waitUntil(self.registration.showNotification(titre, options));
});

// Toucher la notification rouvre (ou ramène au premier plan) l'application
self.addEventListener("notificationclick", function (evt) {
  evt.notification.close();
  const cible = (evt.notification.data && evt.notification.data.url) || "./index.html";
  evt.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
      for (let i = 0; i < list.length; i++) {
        if ("focus" in list[i]) return list[i].focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(cible);
    })
  );
});
