const CACHE = 'buehne-v5';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/main.js',
  './js/app.js',
  './js/ui.js',
  './js/config.js',
  './js/history.js',
  './js/figures.js',
  './js/objects.js',
  './js/parser.js',
  './js/lexicon.js',
  './js/export.js',
  './js/schema.js',
  './js/environments.js',
  './js/atmosphere.js',
  './js/library.js',
  './vendor/three/three.module.js',
  './vendor/three/three.core.js',
  './vendor/three/addons/controls/OrbitControls.js',
  './vendor/three/addons/controls/TransformControls.js',
  './vendor/three/addons/objects/Sky.js',
  './vendor/three/addons/loaders/GLTFLoader.js',
  './vendor/three/addons/utils/BufferGeometryUtils.js',
  './vendor/three/addons/utils/SkeletonUtils.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon.png',
  './assets/library/kenney-bed.glb',
  './assets/library/kenney-books.glb',
  './assets/library/kenney-bookshelf.glb',
  './assets/library/kenney-box.glb',
  './assets/library/kenney-bush.glb',
  './assets/library/kenney-cactus.glb',
  './assets/library/kenney-campfire.glb',
  './assets/library/kenney-chair.glb',
  './assets/library/kenney-cone.glb',
  './assets/library/kenney-desk.glb',
  './assets/library/kenney-felsen.glb',
  './assets/library/kenney-fence.glb',
  './assets/library/kenney-flower.glb',
  './assets/library/kenney-house.glb',
  './assets/library/kenney-lamp.glb',
  './assets/library/kenney-log.glb',
  './assets/library/kenney-potted-plant.glb',
  './assets/library/kenney-rock.glb',
  './assets/library/kenney-sedan.glb',
  './assets/library/kenney-sofa.glb',
  './assets/library/kenney-stump.glb',
  './assets/library/kenney-table.glb',
  './assets/library/kenney-tree-oak.glb',
  './assets/library/kenney-tree-palm.glb',
  './assets/library/kenney-tree-pine.glb',
  './assets/library/polyhaven-lantern/Lantern_01.bin',
  './assets/library/polyhaven-lantern/Lantern_01_1k.gltf',
  './assets/library/polyhaven-lantern/textures/Lantern_01_brass_arm_1k.jpg',
  './assets/library/polyhaven-lantern/textures/Lantern_01_brass_diff_1k.jpg',
  './assets/library/polyhaven-lantern/textures/Lantern_01_brass_nor_gl_1k.jpg',
  './assets/library/quaternius-rock.glb',
  './assets/library/quaternius-tree.glb'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function isNetworkFirst(url) {
  const path = url.pathname;
  return path.endsWith('/') || path.endsWith('.html') || path.endsWith('.js') || path.endsWith('.css');
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (isNetworkFirst(url)) {
    event.respondWith(
      fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(event.request, copy)).catch(() => {});
      return response;
    }).catch(() => cached))
  );
});
