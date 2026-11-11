import * as THREE from 'three';
import { disposeObject3D } from './objects.js';

export const ENVIRONMENT_PRESETS = [
  { id: 'none', label: 'Leere Bühne' },
  { id: 'wald', label: 'Wald' },
  { id: 'wiese', label: 'Wiese / Feld' },
  { id: 'wueste', label: 'Wüste' },
  { id: 'berge', label: 'Berge' },
  { id: 'kueste', label: 'Küste' },
  { id: 'see', label: 'See' },
  { id: 'stadt', label: 'Stadt' },
  { id: 'innenraum', label: 'Innenraum' },
  { id: 'hoehle', label: 'Höhle' },
  { id: 'ruine', label: 'Ruine' }
];

export const ENVIRONMENT_IDS = new Set(ENVIRONMENT_PRESETS.map((entry) => entry.id));

function hash(x, z) {
  const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

function fade(t) {
  return t * t * (3 - 2 * t);
}

function valueNoise(x, z) {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const fx = fade(x - x0);
  const fz = fade(z - z0);
  const a = hash(x0, z0);
  const b = hash(x0 + 1, z0);
  const c = hash(x0, z0 + 1);
  const d = hash(x0 + 1, z0 + 1);
  return a * (1 - fx) * (1 - fz) + b * fx * (1 - fz) + c * (1 - fx) * fz + d * fx * fz;
}

function fbm(x, z, octaves = 4) {
  let value = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i += 1) {
    value += valueNoise(x * freq, z * freq) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return value / norm;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a += 0x6D2B79F5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function lambert(color, extras = {}) {
  return new THREE.MeshLambertMaterial({
    color,
    flatShading: extras.flatShading ?? true,
    vertexColors: extras.vertexColors ?? false,
    transparent: extras.transparent ?? false,
    opacity: extras.opacity ?? 1,
    side: extras.side ?? THREE.FrontSide
  });
}

function makeTerrain(size, segments, heightFn, colorFn) {
  const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
  geometry.rotateX(-Math.PI / 2);
  const pos = geometry.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const color = new THREE.Color();
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = heightFn(x, z);
    pos.setY(i, y);
    colorFn(color, x, z, y);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, lambert(0xffffff, { vertexColors: true }));
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  mesh.userData.pickable = false;
  return mesh;
}

function scatter(geometry, material, transforms, extras = {}) {
  const mesh = new THREE.InstancedMesh(geometry, material, transforms.length);
  mesh.castShadow = extras.castShadow ?? true;
  mesh.receiveShadow = extras.receiveShadow ?? true;
  mesh.userData.pickable = false;
  const dummy = new THREE.Object3D();
  transforms.forEach((entry, index) => {
    dummy.position.set(entry.x, entry.y, entry.z);
    dummy.rotation.set(entry.rx || 0, entry.ry || 0, entry.rz || 0);
    dummy.scale.set(entry.sx ?? 1, entry.sy ?? 1, entry.sz ?? 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

function collectPoints(count, rng, size, accept) {
  const points = [];
  let guard = 0;
  while (points.length < count && guard < count * 12) {
    guard += 1;
    const x = (rng() - 0.5) * size;
    const z = (rng() - 0.5) * size;
    if (accept && !accept(x, z)) continue;
    points.push({ x, z, rng: rng() });
  }
  return points;
}

export class EnvironmentWorld {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'environment';
    scene.add(this.group);
    this.id = 'none';
    this._heightFn = () => 0;
  }

  getHeight(x, z) {
    return this._heightFn(x, z);
  }

  clear() {
    while (this.group.children.length) {
      const child = this.group.children.pop();
      this.group.remove(child);
      disposeObject3D(child);
    }
    this._heightFn = () => 0;
    this.id = 'none';
  }

  setPreset(id) {
    const next = ENVIRONMENT_IDS.has(id) ? id : 'none';
    this.clear();
    this.id = next;
    if (next === 'none' || next === 'innenraum') return;
    const builders = {
      wald: () => this._buildWald(),
      wiese: () => this._buildWiese(),
      wueste: () => this._buildWueste(),
      berge: () => this._buildBerge(),
      kueste: () => this._buildKueste(),
      see: () => this._buildSee(),
      stadt: () => this._buildStadt(),
      hoehle: () => this._buildHoehle(),
      ruine: () => this._buildRuine()
    };
    builders[next]?.();
  }

  _buildWald() {
    const heightFn = (x, z) => fbm(x * 0.045, z * 0.045) * 1.35 + 0.08;
    this._heightFn = heightFn;
    this.group.add(makeTerrain(48, 40, heightFn, (color, x, z, y) => {
      const mix = fbm(x * 0.08 + 4, z * 0.08) * 0.35;
      color.setRGB(0.18 + mix * 0.08, 0.32 + mix * 0.12 + y * 0.04, 0.14 + mix * 0.05);
    }));
    const rng = mulberry32(0x51a1d);
    const trees = collectPoints(42, rng, 42, (x, z) => Math.hypot(x, z) > 2.4);
    const trunkMats = lambert(0x5a3a24);
    const leafMats = lambert(0x2f5a32);
    const trunks = trees.map((p) => {
      const h = 1.15 + p.rng * 0.7;
      return {
        x: p.x, z: p.z, y: heightFn(p.x, p.z) + h / 2,
        sy: h, sx: 0.85 + p.rng * 0.3, sz: 0.85 + p.rng * 0.3, ry: p.rng * Math.PI * 2
      };
    });
    const leaves = trees.map((p, i) => {
      const t = trunks[i];
      return {
        x: p.x, z: p.z, y: heightFn(p.x, p.z) + t.sy + 0.55,
        sx: 1.1 + p.rng * 0.5, sy: 1.05 + p.rng * 0.35, sz: 1.1 + p.rng * 0.45, ry: t.ry
      };
    });
    this.group.add(scatter(new THREE.CylinderGeometry(0.11, 0.16, 1, 7), trunkMats, trunks));
    this.group.add(scatter(new THREE.SphereGeometry(0.72, 8, 6), leafMats, leaves));
    const rocks = collectPoints(14, rng, 40, (x, z) => Math.hypot(x, z) > 1.6);
    this.group.add(scatter(
      new THREE.IcosahedronGeometry(0.38, 0),
      lambert(0x6a655c),
      rocks.map((p) => ({
        x: p.x, z: p.z, y: heightFn(p.x, p.z) + 0.18,
        sx: 0.7 + p.rng * 1.1, sy: 0.5 + p.rng * 0.7, sz: 0.7 + p.rng * 0.9, ry: p.rng * 6
      }))
    ));
  }

  _buildWiese() {
    const heightFn = (x, z) => fbm(x * 0.03, z * 0.03) * 0.45 + 0.02;
    this._heightFn = heightFn;
    this.group.add(makeTerrain(46, 36, heightFn, (color, x, z) => {
      const warm = fbm(x * 0.09, z * 0.09 + 3);
      color.setRGB(0.36 + warm * 0.18, 0.48 + warm * 0.12, 0.18 + warm * 0.06);
    }));
    const rng = mulberry32(0x71e2);
    const grass = collectPoints(48, rng, 40, (x, z) => Math.hypot(x, z) > 1.2);
    this.group.add(scatter(
      new THREE.ConeGeometry(0.12, 0.42, 5),
      lambert(0x5a8a3a),
      grass.map((p) => ({
        x: p.x, z: p.z, y: heightFn(p.x, p.z) + 0.2,
        sx: 0.7 + p.rng * 0.8, sy: 0.8 + p.rng * 0.9, sz: 0.7 + p.rng * 0.8, ry: p.rng * 6
      })),
      { castShadow: false }
    ));
    const trees = collectPoints(7, rng, 38, (x, z) => Math.hypot(x, z) > 6);
    this.group.add(scatter(
      new THREE.CylinderGeometry(0.1, 0.14, 1.05, 7),
      lambert(0x5a3a24),
      trees.map((p) => ({ x: p.x, z: p.z, y: heightFn(p.x, p.z) + 0.52, sy: 1, sx: 1, sz: 1 }))
    ));
    this.group.add(scatter(
      new THREE.SphereGeometry(0.68, 8, 6),
      lambert(0x3f6b3a),
      trees.map((p) => ({ x: p.x, z: p.z, y: heightFn(p.x, p.z) + 1.25, sx: 1.1, sy: 1, sz: 1.1 }))
    ));
  }

  _buildWueste() {
    const heightFn = (x, z) => {
      const dunes = Math.sin(x * 0.16) * Math.cos(z * 0.11) * 0.85;
      return dunes + fbm(x * 0.04, z * 0.04) * 1.1;
    };
    this._heightFn = heightFn;
    this.group.add(makeTerrain(48, 40, heightFn, (color, x, z, y) => {
      const t = Math.max(0, Math.min(1, (y + 0.4) / 2.2));
      color.setRGB(0.72 + t * 0.16, 0.55 + t * 0.12, 0.28 + t * 0.08);
    }));
    const rng = mulberry32(0xd451);
    const rocks = collectPoints(16, rng, 40, (x, z) => Math.hypot(x, z) > 2);
    this.group.add(scatter(
      new THREE.IcosahedronGeometry(0.42, 0),
      lambert(0x8a6a48),
      rocks.map((p) => ({
        x: p.x, z: p.z, y: heightFn(p.x, p.z) + 0.22,
        sx: 0.8 + p.rng, sy: 0.45 + p.rng * 0.7, sz: 0.8 + p.rng, ry: p.rng * 5
      }))
    ));
    const cacti = collectPoints(9, rng, 36, (x, z) => Math.hypot(x, z) > 4);
    this.group.add(scatter(
      new THREE.CylinderGeometry(0.12, 0.16, 1.3, 7),
      lambert(0x3d6a38),
      cacti.map((p) => ({
        x: p.x, z: p.z, y: heightFn(p.x, p.z) + 0.65,
        sy: 0.9 + p.rng * 0.8, sx: 0.85, sz: 0.85
      }))
    ));
    this.group.add(scatter(
      new THREE.SphereGeometry(0.16, 6, 5),
      lambert(0x3d6a38),
      cacti.map((p) => ({ x: p.x + 0.18, z: p.z, y: heightFn(p.x, p.z) + 0.85 + p.rng * 0.3 }))
    ));
  }

  _buildBerge() {
    const heightFn = (x, z) => {
      const ridge = Math.pow(fbm(x * 0.028, z * 0.028, 5), 1.35) * 9.4;
      const detail = fbm(x * 0.09 + 8, z * 0.09) * 1.1;
      return ridge + detail;
    };
    this._heightFn = heightFn;
    this.group.add(makeTerrain(56, 48, heightFn, (color, x, z, y) => {
      if (y > 6.6) color.setRGB(0.93, 0.94, 0.96);
      else if (y > 4.4) color.setRGB(0.48, 0.44, 0.39);
      else color.setRGB(0.20 + y * 0.03, 0.40 + y * 0.025, 0.16);
    }));
    const rng = mulberry32(0xb3a1);
    const pines = collectPoints(28, rng, 46, (x, z) => {
      const y = heightFn(x, z);
      return y > 1.3 && y < 5.6 && Math.hypot(x, z) > 3;
    });
    this.group.add(scatter(
      new THREE.CylinderGeometry(0.09, 0.13, 0.9, 6),
      lambert(0x4a3220),
      pines.map((p) => ({ x: p.x, z: p.z, y: heightFn(p.x, p.z) + 0.4 }))
    ));
    this.group.add(scatter(
      new THREE.ConeGeometry(0.55, 1.7, 7),
      lambert(0x245034),
      pines.map((p) => ({
        x: p.x, z: p.z, y: heightFn(p.x, p.z) + 1.35,
        sx: 0.85 + p.rng * 0.4, sy: 0.9 + p.rng * 0.4, sz: 0.85 + p.rng * 0.4
      }))
    ));
  }

  _buildKueste() {
    const heightFn = (x, z) => {
      const shore = (z + 4) * 0.085;
      return shore + fbm(x * 0.05, z * 0.05) * 0.7 - 0.35;
    };
    this._heightFn = (x, z) => Math.max(heightFn(x, z), 0);
    this.group.add(makeTerrain(50, 40, heightFn, (color, x, z, y) => {
      if (y < 0.18) color.setRGB(0.78, 0.7, 0.48);
      else if (y < 0.7) color.setRGB(0.62, 0.54, 0.34);
      else color.setRGB(0.28, 0.44, 0.24);
    }));
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(50, 28),
      new THREE.MeshStandardMaterial({
        color: 0x1b5b78, roughness: 0.22, metalness: 0.28, transparent: true, opacity: 0.72
      })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, 0.04, -12);
    water.receiveShadow = true;
    this.group.add(water);
    const rng = mulberry32(0xc0a5);
    const rocks = collectPoints(12, rng, 36, (x, z) => z < 4 && z > -8);
    this.group.add(scatter(
      new THREE.IcosahedronGeometry(0.5, 0),
      lambert(0x6a6860),
      rocks.map((p) => ({
        x: p.x, z: p.z, y: Math.max(heightFn(p.x, p.z), 0.05) + 0.22,
        sx: 0.8 + p.rng, sy: 0.5 + p.rng * 0.6, sz: 0.8 + p.rng
      }))
    ));
    const palms = collectPoints(5, rng, 30, (x, z) => z > 2 && Math.hypot(x, z) > 5);
    this.group.add(scatter(
      new THREE.CylinderGeometry(0.08, 0.12, 2.1, 6),
      lambert(0x6a4a28),
      palms.map((p) => ({ x: p.x, z: p.z, y: heightFn(p.x, p.z) + 1.05 }))
    ));
    this.group.add(scatter(
      new THREE.SphereGeometry(0.55, 7, 5),
      lambert(0x2f6a32),
      palms.map((p) => ({ x: p.x, z: p.z, y: heightFn(p.x, p.z) + 2.15, sy: 0.45, sx: 1.3, sz: 1.3 }))
    ));
  }

  _buildSee() {
    const heightFn = (x, z) => {
      const d = Math.hypot(x, z);
      const bowl = d < 9 ? -0.55 + (d / 9) * 0.7 : 0.28 + fbm(x * 0.05, z * 0.05) * 0.55;
      return bowl;
    };
    this._heightFn = (x, z) => Math.max(heightFn(x, z), 0);
    this.group.add(makeTerrain(48, 40, heightFn, (color, x, z, y) => {
      if (y < 0.12) color.setRGB(0.42, 0.4, 0.28);
      else color.setRGB(0.26, 0.42, 0.22);
    }));
    const water = new THREE.Mesh(
      new THREE.CircleGeometry(8.6, 32),
      new THREE.MeshStandardMaterial({
        color: 0x1a4e6a, roughness: 0.2, metalness: 0.3, transparent: true, opacity: 0.74
      })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.05;
    this.group.add(water);
    const rng = mulberry32(0x5ee1);
    const trees = collectPoints(10, rng, 36, (x, z) => Math.hypot(x, z) > 10 && Math.hypot(x, z) < 20);
    this.group.add(scatter(
      new THREE.CylinderGeometry(0.1, 0.14, 1.1, 6),
      lambert(0x5a3a24),
      trees.map((p) => ({ x: p.x, z: p.z, y: heightFn(p.x, p.z) + 0.55 }))
    ));
    this.group.add(scatter(
      new THREE.SphereGeometry(0.7, 8, 6),
      lambert(0x355e34),
      trees.map((p) => ({ x: p.x, z: p.z, y: heightFn(p.x, p.z) + 1.3 }))
    ));
  }

  _buildStadt() {
    const heightFn = (x, z) => fbm(x * 0.08, z * 0.08) * 0.08;
    this._heightFn = heightFn;
    this.group.add(makeTerrain(46, 28, heightFn, (color, x) => {
      if (Math.abs(x) < 2.1) color.setRGB(0.22, 0.22, 0.24);
      else if (Math.abs(x) < 3.1) color.setRGB(0.42, 0.41, 0.4);
      else color.setRGB(0.38, 0.38, 0.37);
    }));
    const rng = mulberry32(0x51c7);
    const spots = [];
    for (let i = 0; i < 12; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      const z = -16 + Math.floor(i / 2) * 5.6 + (rng() - 0.5) * 0.8;
      const x = side * (5.4 + rng() * 3.4);
      spots.push({ x, z, rng: rng() });
    }
    this.group.add(scatter(
      new THREE.BoxGeometry(1, 1, 1),
      lambert(0x8a8680),
      spots.map((p) => {
        const h = 3.2 + p.rng * 5.2;
        return {
          x: p.x, z: p.z, y: heightFn(p.x, p.z) + h / 2,
          sx: 2.4 + p.rng * 1.4, sy: h, sz: 2.2 + p.rng * 1.1
        };
      })
    ));
    this.group.add(scatter(
      new THREE.BoxGeometry(0.08, 0.16, 0.7),
      lambert(0x9ec6d4),
      spots.flatMap((p) => {
        const h = 3.2 + p.rng * 5.2;
        return [0.35, 0.55, 0.75].map((t) => ({
          x: p.x + (p.x < 0 ? 1.25 : -1.25),
          z: p.z,
          y: heightFn(p.x, p.z) + h * t,
          sx: 1, sy: 1, sz: 1
        }));
      }),
      { castShadow: false }
    ));
  }

  _buildHoehle() {
    const heightFn = (x, z) => {
      const d = Math.hypot(x * 0.85, z);
      return 0.15 + Math.pow(Math.max(0, d - 4) / 14, 1.6) * 6.8 + fbm(x * 0.07, z * 0.07) * 0.6;
    };
    this._heightFn = heightFn;
    this.group.add(makeTerrain(42, 36, heightFn, (color, x, z, y) => {
      const t = Math.min(1, y / 7);
      color.setRGB(0.12 + t * 0.1, 0.1 + t * 0.07, 0.09 + t * 0.05);
    }));
    const ceiling = new THREE.Mesh(
      new THREE.SphereGeometry(16, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      lambert(0x1a1614, { side: THREE.BackSide })
    );
    ceiling.position.y = 5.4;
    ceiling.scale.set(1.15, 0.55, 1.15);
    this.group.add(ceiling);
    const rng = mulberry32(0xca4e);
    const spikes = collectPoints(14, rng, 22, (x, z) => Math.hypot(x, z) < 12 && Math.hypot(x, z) > 1.4);
    this.group.add(scatter(
      new THREE.ConeGeometry(0.28, 1.4, 6),
      lambert(0x2a2420),
      spikes.map((p) => ({
        x: p.x, z: p.z, y: heightFn(p.x, p.z) + 0.7,
        sy: 0.7 + p.rng * 0.9, sx: 0.7 + p.rng * 0.5, sz: 0.7 + p.rng * 0.5
      }))
    ));
    this.group.add(scatter(
      new THREE.ConeGeometry(0.22, 1.1, 6),
      lambert(0x211c1a),
      spikes.slice(0, 8).map((p) => ({
        x: p.x * 0.7, z: p.z * 0.7, y: 4.6,
        rx: Math.PI, sy: 0.8 + p.rng, sx: 0.8, sz: 0.8
      }))
    ));
  }

  _buildRuine() {
    const heightFn = (x, z) => fbm(x * 0.05, z * 0.05) * 0.7 + 0.04;
    this._heightFn = heightFn;
    this.group.add(makeTerrain(44, 34, heightFn, (color, x, z, y) => {
      const moss = fbm(x * 0.1, z * 0.1);
      color.setRGB(0.32 + moss * 0.05, 0.3 + moss * 0.08, 0.24 + y * 0.05);
    }));
    const rng = mulberry32(0x8412);
    const walls = collectPoints(8, rng, 18, (x, z) => Math.hypot(x, z) > 3);
    this.group.add(scatter(
      new THREE.BoxGeometry(1, 1, 1),
      lambert(0x6a655c),
      walls.map((p) => ({
        x: p.x, z: p.z, y: heightFn(p.x, p.z) + 0.7 + p.rng * 0.5,
        sx: 2.2 + p.rng * 1.8, sy: 1.3 + p.rng * 1.4, sz: 0.38,
        ry: p.rng * Math.PI
      }))
    ));
    const cols = collectPoints(6, rng, 14, (x, z) => Math.hypot(x, z) > 2);
    this.group.add(scatter(
      new THREE.CylinderGeometry(0.18, 0.22, 2.2, 8),
      lambert(0x7a7468),
      cols.map((p) => ({ x: p.x, z: p.z, y: heightFn(p.x, p.z) + 1.1, sy: 0.85 + p.rng * 0.4 }))
    ));
    const rubble = collectPoints(10, rng, 20, () => true);
    this.group.add(scatter(
      new THREE.IcosahedronGeometry(0.32, 0),
      lambert(0x5c564c),
      rubble.map((p) => ({
        x: p.x, z: p.z, y: heightFn(p.x, p.z) + 0.16,
        sx: 0.8 + p.rng, sy: 0.4 + p.rng * 0.5, sz: 0.8 + p.rng, ry: p.rng * 5
      }))
    ));
  }
}
