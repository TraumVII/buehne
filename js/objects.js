import * as THREE from 'three';
import { createFigure } from './figures.js';

function stdMaterial(color, extras = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: extras.roughness ?? 0.58,
    metalness: extras.metalness ?? 0.06,
    transparent: extras.transparent ?? false,
    opacity: extras.opacity ?? 1,
    side: extras.side ?? THREE.FrontSide
  });
}

function mesh(geometry, material, extras = {}) {
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = extras.castShadow ?? true;
  m.receiveShadow = extras.receiveShadow ?? true;
  if (extras.recolor) m.userData.recolor = true;
  if (extras.helper) m.userData.helper = true;
  return m;
}

function addBox(parent, w, h, d, x, y, z, material, extras = {}) {
  const m = mesh(new THREE.BoxGeometry(w, h, d), material, extras);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

export function createStageObject(type, color = '#8a8680') {
  if (type === 'figure') {
    return createFigure(color);
  }

  const root = new THREE.Group();
  root.userData.kind = type === 'pointlight' || type === 'spotlight' ? 'light' : 'object';
  const main = stdMaterial(color);

  if (type === 'cube') {
    addBox(root, 0.6, 0.6, 0.6, 0, 0.3, 0, main, { recolor: true });
  } else if (type === 'sphere') {
    const m = mesh(new THREE.SphereGeometry(0.34, 24, 18), main, { recolor: true });
    m.position.y = 0.34;
    root.add(m);
  } else if (type === 'cylinder') {
    const m = mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.72, 20), main, { recolor: true });
    m.position.y = 0.36;
    root.add(m);
  } else if (type === 'cone') {
    const m = mesh(new THREE.ConeGeometry(0.3, 0.74, 20), main, { recolor: true });
    m.position.y = 0.37;
    root.add(m);
  } else if (type === 'plane') {
    addBox(root, 1.7, 0.045, 1.7, 0, 0.022, 0, main, { recolor: true });
  } else if (type === 'table') {
    const wood = stdMaterial(color);
    addBox(root, 1.24, 0.055, 0.76, 0, 0.745, 0, wood, { recolor: true });
    const insetX = 0.54;
    const insetZ = 0.3;
    [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sz]) => {
      addBox(root, 0.07, 0.72, 0.07, sx * insetX, 0.36, sz * insetZ, wood, { recolor: true });
    });
  } else if (type === 'chair') {
    const wood = stdMaterial(color);
    addBox(root, 0.46, 0.05, 0.46, 0, 0.45, 0, wood, { recolor: true });
    addBox(root, 0.46, 0.52, 0.055, 0, 0.735, -0.202, wood, { recolor: true });
    const o = 0.18;
    [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sz]) => {
      addBox(root, 0.055, 0.43, 0.055, sx * o, 0.215, sz * o, wood, { recolor: true });
    });
  } else if (type === 'door') {
    const frame = stdMaterial('#6a6258');
    const panel = stdMaterial(color);
    addBox(root, 1.02, 2.14, 0.06, 0, 1.07, 0, frame);
    addBox(root, 0.86, 1.98, 0.045, 0, 1.05, 0.01, panel, { recolor: true });
    const knob = mesh(new THREE.SphereGeometry(0.035, 10, 8), stdMaterial('#c4b07a', { metalness: 0.55, roughness: 0.3 }));
    knob.position.set(0.34, 1.02, 0.06);
    root.add(knob);
  } else if (type === 'window') {
    const frame = stdMaterial(color);
    const glass = stdMaterial('#9ec6d4', { transparent: true, opacity: 0.32, roughness: 0.08, metalness: 0.15 });
    addBox(root, 1.24, 1.14, 0.07, 0, 1.42, 0, frame, { recolor: true });
    addBox(root, 0.5, 0.46, 0.03, -0.27, 1.58, 0.01, glass, { castShadow: false });
    addBox(root, 0.5, 0.46, 0.03, 0.27, 1.58, 0.01, glass, { castShadow: false });
    addBox(root, 0.5, 0.46, 0.03, -0.27, 1.26, 0.01, glass, { castShadow: false });
    addBox(root, 0.5, 0.46, 0.03, 0.27, 1.26, 0.01, glass, { castShadow: false });
  } else if (type === 'tree') {
    const bark = stdMaterial('#6a4a30');
    const leaf = stdMaterial(color || '#3f6b3a');
    const trunk = mesh(new THREE.CylinderGeometry(0.1, 0.15, 1.15, 10), bark);
    trunk.position.y = 0.575;
    root.add(trunk);
    const foliage = mesh(new THREE.SphereGeometry(0.62, 16, 12), leaf, { recolor: true });
    foliage.position.y = 1.48;
    root.add(foliage);
    const foliage2 = mesh(new THREE.SphereGeometry(0.42, 14, 11), leaf, { recolor: true });
    foliage2.position.set(0.28, 1.28, -0.08);
    root.add(foliage2);
  } else if (type === 'car') {
    const body = stdMaterial(color);
    const dark = stdMaterial('#1c1c20', { roughness: 0.7 });
    const cabin = stdMaterial('#7ea0b4', { transparent: true, opacity: 0.55, roughness: 0.2 });
    addBox(root, 1.9, 0.42, 0.92, 0, 0.42, 0, body, { recolor: true });
    addBox(root, 0.95, 0.36, 0.84, -0.12, 0.78, 0, cabin);
    [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sz]) => {
      const wheel = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.16, 14), dark);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(sx * 0.58, 0.22, sz * 0.48);
      root.add(wheel);
    });
  } else if (type === 'pointlight') {
    const light = new THREE.PointLight(color, 1.7, 14, 1.4);
    light.castShadow = true;
    light.shadow.mapSize.set(512, 512);
    light.shadow.camera.near = 0.2;
    light.shadow.camera.far = 16;
    root.add(light);
    const bulb = mesh(
      new THREE.SphereGeometry(0.09, 14, 10),
      new THREE.MeshBasicMaterial({ color }),
      { helper: true, castShadow: false, receiveShadow: false }
    );
    root.add(bulb);
    root.position.set(0, 2.3, 0);
    root.userData.light = light;
  } else if (type === 'spotlight') {
    const light = new THREE.SpotLight(color, 2.1, 18, Math.PI / 5.5, 0.38, 1.1);
    light.castShadow = true;
    light.shadow.mapSize.set(512, 512);
    root.add(light);
    const target = new THREE.Object3D();
    target.position.set(0, -3, 0);
    root.add(target);
    light.target = target;
    const bulb = mesh(
      new THREE.ConeGeometry(0.1, 0.18, 12),
      new THREE.MeshBasicMaterial({ color }),
      { helper: true, castShadow: false, receiveShadow: false }
    );
    bulb.rotation.x = Math.PI;
    root.add(bulb);
    root.position.set(1.6, 3.1, 1.4);
    root.userData.light = light;
  } else {
    addBox(root, 0.5, 0.5, 0.5, 0, 0.25, 0, main, { recolor: true });
  }

  return { root };
}

export function setRecolor(root, hex) {
  root.traverse((child) => {
    if (child.isMesh && child.userData.recolor && child.material && child.material.color) {
      child.material.color.set(hex);
    }
    if (child.isLight && child.color) {
      child.color.set(hex);
    }
    if (child.userData.helper && child.material && child.material.color) {
      child.material.color.set(hex);
    }
  });
}

export function disposeObject3D(root) {
  root.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => material.dispose());
    }
  });
}

export const DEFAULT_OBJECT_COLORS = {
  figure: '#3d5a80',
  cube: '#c4b7a4',
  sphere: '#b7c4c8',
  cylinder: '#9aa7b4',
  cone: '#c48a6a',
  plane: '#8d8a82',
  table: '#8b5a36',
  chair: '#7a4b2e',
  door: '#6e5340',
  window: '#d8d2c6',
  tree: '#3f6b3a',
  car: '#4d6d8b',
  pointlight: '#ffe6b0',
  spotlight: '#fff1c8'
};
