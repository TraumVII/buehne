import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { normalize } from './lexicon.js';

export const LIBRARY_CATEGORIES = [
  { id: 'alle', label: 'Alle' },
  { id: 'natur', label: 'Natur' },
  { id: 'moebel', label: 'Möbel' },
  { id: 'fahrzeuge', label: 'Fahrzeuge' },
  { id: 'gebaeude', label: 'Gebäude' },
  { id: 'requisiten', label: 'Requisiten' }
];

function item(partial) {
  return partial;
}

export const LIBRARY_ITEMS = [
  item({
    id: 'kenney-tree-oak', name: 'Eiche', category: 'natur',
    file: './assets/library/kenney-tree-oak.glb',
    source: 'Kenney Nature Kit', sourceUrl: 'https://kenney.nl/assets/nature-kit',
    license: 'CC0 1.0', nativeHeight: 4.2,
    synonyms: ['Baum', 'Laubbaum', 'Eichenbaum']
  }),
  item({
    id: 'kenney-tree-pine', name: 'Kiefer', category: 'natur',
    file: './assets/library/kenney-tree-pine.glb',
    source: 'Kenney Nature Kit', sourceUrl: 'https://kenney.nl/assets/nature-kit',
    license: 'CC0 1.0', nativeHeight: 5.4,
    synonyms: ['Baum', 'Tanne', 'Nadelbaum', 'Fichte', 'Pinie']
  }),
  item({
    id: 'kenney-tree-palm', name: 'Palme', category: 'natur',
    file: './assets/library/kenney-tree-palm.glb',
    source: 'Kenney Nature Kit', sourceUrl: 'https://kenney.nl/assets/nature-kit',
    license: 'CC0 1.0', nativeHeight: 5.1,
    synonyms: ['Baum', 'Palmen', 'Kokospalme']
  }),
  item({
    id: 'kenney-cactus', name: 'Kaktus', category: 'natur',
    file: './assets/library/kenney-cactus.glb',
    source: 'Kenney Nature Kit', sourceUrl: 'https://kenney.nl/assets/nature-kit',
    license: 'CC0 1.0', nativeHeight: 1.8,
    synonyms: ['Kakteen', 'Wüstenpflanze']
  }),
  item({
    id: 'kenney-rock', name: 'Stein', category: 'natur',
    file: './assets/library/kenney-rock.glb',
    source: 'Kenney Nature Kit', sourceUrl: 'https://kenney.nl/assets/nature-kit',
    license: 'CC0 1.0', nativeHeight: 1.05,
    synonyms: ['Fels', 'Felsen', 'Steinbrocken']
  }),
  item({
    id: 'kenney-felsen', name: 'Felsen', category: 'natur',
    file: './assets/library/kenney-felsen.glb',
    source: 'Kenney Nature Kit', sourceUrl: 'https://kenney.nl/assets/nature-kit',
    license: 'CC0 1.0', nativeHeight: 2.3,
    synonyms: ['Fels', 'Klippe', 'Felsblock']
  }),
  item({
    id: 'kenney-bush', name: 'Busch', category: 'natur',
    file: './assets/library/kenney-bush.glb',
    source: 'Kenney Nature Kit', sourceUrl: 'https://kenney.nl/assets/nature-kit',
    license: 'CC0 1.0', nativeHeight: 0.85,
    synonyms: ['Strauch', 'Gebüsch', 'Hecke']
  }),
  item({
    id: 'kenney-flower', name: 'Blume', category: 'natur',
    file: './assets/library/kenney-flower.glb',
    source: 'Kenney Nature Kit', sourceUrl: 'https://kenney.nl/assets/nature-kit',
    license: 'CC0 1.0', nativeHeight: 0.45,
    synonyms: ['Blüte', 'Blumen', 'Pflanze']
  }),
  item({
    id: 'kenney-log', name: 'Holzstamm', category: 'natur',
    file: './assets/library/kenney-log.glb',
    source: 'Kenney Nature Kit', sourceUrl: 'https://kenney.nl/assets/nature-kit',
    license: 'CC0 1.0', nativeHeight: 0.55,
    synonyms: ['Stamm', 'Baumstamm', 'Holz']
  }),
  item({
    id: 'kenney-stump', name: 'Baumstumpf', category: 'natur',
    file: './assets/library/kenney-stump.glb',
    source: 'Kenney Nature Kit', sourceUrl: 'https://kenney.nl/assets/nature-kit',
    license: 'CC0 1.0', nativeHeight: 0.7,
    synonyms: ['Stumpf', 'Wurzelstock']
  }),
  item({
    id: 'quaternius-tree', name: 'Laubbaum', category: 'natur',
    file: './assets/library/quaternius-tree.glb',
    source: 'Quaternius Simple Nature Pack', sourceUrl: 'https://quaternius.com/packs/simplenature.html',
    license: 'CC0 1.0', nativeHeight: 4.0,
    synonyms: ['Baum', 'Baum stilisiert']
  }),
  item({
    id: 'quaternius-rock', name: 'Findling', category: 'natur',
    file: './assets/library/quaternius-rock.glb',
    source: 'Quaternius Simple Nature Pack', sourceUrl: 'https://quaternius.com/packs/simplenature.html',
    license: 'CC0 1.0', nativeHeight: 0.9,
    synonyms: ['Stein', 'Fels', 'Felsen']
  }),
  item({
    id: 'kenney-table', name: 'Tisch', category: 'moebel',
    file: './assets/library/kenney-table.glb',
    source: 'Kenney Furniture Kit', sourceUrl: 'https://kenney.nl/assets/furniture-kit',
    license: 'CC0 1.0', nativeHeight: 0.76,
    synonyms: ['Esstisch', 'Holztisch', 'Tafel']
  }),
  item({
    id: 'kenney-chair', name: 'Stuhl', category: 'moebel',
    file: './assets/library/kenney-chair.glb',
    source: 'Kenney Furniture Kit', sourceUrl: 'https://kenney.nl/assets/furniture-kit',
    license: 'CC0 1.0', nativeHeight: 0.92,
    synonyms: ['Sitz', 'Sessel', 'Stühle']
  }),
  item({
    id: 'kenney-sofa', name: 'Sofa', category: 'moebel',
    file: './assets/library/kenney-sofa.glb',
    source: 'Kenney Furniture Kit', sourceUrl: 'https://kenney.nl/assets/furniture-kit',
    license: 'CC0 1.0', nativeHeight: 0.85,
    synonyms: ['Couch', 'Wohnlandschaft', 'Polster']
  }),
  item({
    id: 'kenney-bed', name: 'Bett', category: 'moebel',
    file: './assets/library/kenney-bed.glb',
    source: 'Kenney Furniture Kit', sourceUrl: 'https://kenney.nl/assets/furniture-kit',
    license: 'CC0 1.0', nativeHeight: 0.7,
    synonyms: ['Einzelbett', 'Liege']
  }),
  item({
    id: 'kenney-bookshelf', name: 'Regal', category: 'moebel',
    file: './assets/library/kenney-bookshelf.glb',
    source: 'Kenney Furniture Kit', sourceUrl: 'https://kenney.nl/assets/furniture-kit',
    license: 'CC0 1.0', nativeHeight: 1.8,
    synonyms: ['Bücherregal', 'Schrank', 'Bord']
  }),
  item({
    id: 'kenney-desk', name: 'Schreibtisch', category: 'moebel',
    file: './assets/library/kenney-desk.glb',
    source: 'Kenney Furniture Kit', sourceUrl: 'https://kenney.nl/assets/furniture-kit',
    license: 'CC0 1.0', nativeHeight: 0.76,
    synonyms: ['Pult', 'Arbeitstisch']
  }),
  item({
    id: 'kenney-lamp', name: 'Stehlampe', category: 'moebel',
    file: './assets/library/kenney-lamp.glb',
    source: 'Kenney Furniture Kit', sourceUrl: 'https://kenney.nl/assets/furniture-kit',
    license: 'CC0 1.0', nativeHeight: 1.55,
    synonyms: ['Lampe', 'Leuchte']
  }),
  item({
    id: 'kenney-sedan', name: 'Limousine', category: 'fahrzeuge',
    file: './assets/library/kenney-sedan.glb',
    source: 'Kenney Car Kit', sourceUrl: 'https://kenney.nl/assets/car-kit',
    license: 'CC0 1.0', nativeHeight: 1.48,
    synonyms: ['Auto', 'Wagen', 'PKW', 'Fahrzeug', 'Sedan']
  }),
  item({
    id: 'kenney-house', name: 'Haus', category: 'gebaeude',
    file: './assets/library/kenney-house.glb',
    source: 'Kenney City Kit Suburban', sourceUrl: 'https://kenney.nl/assets/city-kit-suburban',
    license: 'CC0 1.0', nativeHeight: 5.8,
    synonyms: ['Gebäude', 'Wohnhaus', 'Hütte', 'Dach']
  }),
  item({
    id: 'kenney-fence', name: 'Zaun', category: 'gebaeude',
    file: './assets/library/kenney-fence.glb',
    source: 'Kenney City Kit Suburban', sourceUrl: 'https://kenney.nl/assets/city-kit-suburban',
    license: 'CC0 1.0', nativeHeight: 1.2,
    synonyms: ['Gartenzaun', 'Umzäunung']
  }),
  item({
    id: 'kenney-box', name: 'Karton', category: 'requisiten',
    file: './assets/library/kenney-box.glb',
    source: 'Kenney Furniture Kit', sourceUrl: 'https://kenney.nl/assets/furniture-kit',
    license: 'CC0 1.0', nativeHeight: 0.42,
    synonyms: ['Kiste', 'Box', 'Paket']
  }),
  item({
    id: 'kenney-books', name: 'Bücher', category: 'requisiten',
    file: './assets/library/kenney-books.glb',
    source: 'Kenney Furniture Kit', sourceUrl: 'https://kenney.nl/assets/furniture-kit',
    license: 'CC0 1.0', nativeHeight: 0.28,
    synonyms: ['Buch', 'Bücherstapel']
  }),
  item({
    id: 'kenney-potted-plant', name: 'Topfpflanze', category: 'requisiten',
    file: './assets/library/kenney-potted-plant.glb',
    source: 'Kenney Furniture Kit', sourceUrl: 'https://kenney.nl/assets/furniture-kit',
    license: 'CC0 1.0', nativeHeight: 0.7,
    synonyms: ['Pflanze', 'Blumentopf']
  }),
  item({
    id: 'kenney-campfire', name: 'Lagerfeuer', category: 'requisiten',
    file: './assets/library/kenney-campfire.glb',
    source: 'Kenney Nature Kit', sourceUrl: 'https://kenney.nl/assets/nature-kit',
    license: 'CC0 1.0', nativeHeight: 0.4,
    synonyms: ['Feuer', 'Campfire', 'Feuerstelle']
  }),
  item({
    id: 'kenney-cone', name: 'Leitkegel', category: 'requisiten',
    file: './assets/library/kenney-cone.glb',
    source: 'Kenney Car Kit', sourceUrl: 'https://kenney.nl/assets/car-kit',
    license: 'CC0 1.0', nativeHeight: 0.72,
    synonyms: ['Pylon', 'Hütchen', 'Kegel']
  }),
  item({
    id: 'polyhaven-lantern', name: 'Laterne', category: 'requisiten',
    file: './assets/library/polyhaven-lantern/Lantern_01_1k.gltf',
    source: 'Poly Haven – Lantern 01', sourceUrl: 'https://polyhaven.com/a/Lantern_01',
    license: 'CC0 1.0', nativeHeight: 0.42,
    synonyms: ['Lampe', 'Öllampe', 'Gartenlaterne', 'Licht']
  })
];

const BY_ID = Object.fromEntries(LIBRARY_ITEMS.map((entry) => [entry.id, entry]));

export function getLibraryItem(id) {
  return BY_ID[id] || null;
}

export function searchLibrary(query, category = 'alle') {
  const q = normalize(query || '');
  return LIBRARY_ITEMS.filter((entry) => {
    if (category && category !== 'alle' && entry.category !== category) return false;
    if (!q) return true;
    const blob = normalize([entry.name, entry.id, entry.category, ...(entry.synonyms || [])].join(' '));
    return blob.includes(q);
  });
}

export function libraryAssetPaths() {
  const paths = new Set();
  LIBRARY_ITEMS.forEach((entry) => {
    paths.add(entry.file);
    if (entry.id === 'polyhaven-lantern') {
      paths.add('./assets/library/polyhaven-lantern/Lantern_01.bin');
      paths.add('./assets/library/polyhaven-lantern/textures/Lantern_01_brass_arm_1k.jpg');
      paths.add('./assets/library/polyhaven-lantern/textures/Lantern_01_brass_nor_gl_1k.jpg');
      paths.add('./assets/library/polyhaven-lantern/textures/Lantern_01_brass_diff_1k.jpg');
    }
  });
  return [...paths];
}

let loader = null;
const cache = new Map();

function getLoader() {
  if (!loader) loader = new GLTFLoader();
  return loader;
}

export function loadLibraryGLTF(file) {
  if (!cache.has(file)) {
    cache.set(file, getLoader().loadAsync(file));
  }
  return cache.get(file);
}

export async function loadLibraryModel(assetId) {
  const asset = getLibraryItem(assetId);
  if (!asset) throw new Error(`Unbekanntes Bibliotheksobjekt: ${assetId}`);
  const gltf = await loadLibraryGLTF(asset.file);
  const model = gltf.scene.clone(true);
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const target = asset.nativeHeight || 1;
  if (size.y > 1e-4) model.scale.multiplyScalar(target / size.y);
  const fitted = new THREE.Box3().setFromObject(model);
  model.position.x -= (fitted.min.x + fitted.max.x) / 2;
  model.position.y -= fitted.min.y;
  model.position.z -= (fitted.min.z + fitted.max.z) / 2;
  model.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return { model, asset };
}
