/* ======================================================================
   ÉCLATS NÉON — mode hors ligne (service worker)

   Quand le jeu est ouvert depuis une adresse https:// (site en ligne),
   ce script enregistre une copie de tous les fichiers sur l'appareil.
   Ensuite, le jeu se lance même sans internet (mode avion).

   IMPORTANT : après chaque modification du jeu, change le numéro de
   VERSION ci-dessous (le même que GAME_VERSION dans game.js : 1.8, 1.81,
   1.9…). Sinon les appareils garderont l'ancienne copie. La nouvelle
   version est récupérée dès que le jeu est ouvert avec internet, puis
   utilisée au lancement suivant.
   ====================================================================== */

const VERSION = 'eclats-neon-1.8'; // même numéro que GAME_VERSION dans game.js

// Tous les fichiers nécessaires pour jouer
const FILES = [
  './',
  './index.html',
  './style.css',
  './game.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

// Safari refuse d'afficher une page enregistrée après une redirection :
// on recrée une réponse "propre" dans ce cas.
async function cleanResponse(response) {
  if (!response.redirected) return response;
  const body = await response.blob();
  return new Response(body, {
    headers: response.headers,
    status: response.status,
    statusText: response.statusText,
  });
}

// Installation : télécharge et enregistre tous les fichiers
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await Promise.all(FILES.map(async (file) => {
      const response = await fetch(new Request(file, { cache: 'reload' }));
      if (!response.ok) throw new Error('Impossible de télécharger ' + file);
      await cache.put(file, await cleanResponse(response));
    }));
    await self.skipWaiting();
  })());
});

// Activation : supprime les anciennes copies du jeu
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => key.startsWith('eclats-neon-') && key !== VERSION)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

// Chaque demande de fichier : on répond avec la copie enregistrée,
// et on n'utilise internet que pour ce qui n'est pas enregistré.
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    try {
      return await fetch(request);
    } catch (error) {
      // Hors ligne : on affiche quand même le jeu
      if (request.mode === 'navigate') {
        const page = await caches.match('./index.html');
        if (page) return page;
      }
      return Response.error();
    }
  })());
});
