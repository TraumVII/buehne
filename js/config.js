export const APP_NAME = 'Bühne';
export const STORAGE_KEY = 'buehne-scene-v1';
export const HISTORY_LIMIT = 40;

export const FOCAL_MIN = 14;
export const FOCAL_MAX = 200;
export const DEFAULT_FOCAL = 35;
export const FILM_WIDTH_MM = 36;

export const ASPECTS = {
  '16:9': 16 / 9,
  '9:16': 9 / 16,
  '2.39:1': 2.39,
  '4:3': 4 / 3,
  '1:1': 1
};

export const ASPECT_KEYS = Object.keys(ASPECTS);

export const TYPE_LABELS = {
  figure: 'Figur',
  cube: 'Würfel',
  sphere: 'Kugel',
  cylinder: 'Zylinder',
  cone: 'Kegel',
  plane: 'Ebene',
  table: 'Tisch',
  chair: 'Stuhl',
  door: 'Tür',
  window: 'Fenster',
  tree: 'Baum',
  car: 'Auto',
  pointlight: 'Punktlicht',
  spotlight: 'Spotlicht'
};

export const INSERT_TYPES = [
  'figure', 'cube', 'sphere', 'cylinder',
  'cone', 'plane', 'table', 'chair',
  'door', 'window', 'tree', 'car',
  'pointlight', 'spotlight'
];

export const JOINT_LABELS = {
  spine: 'Torso',
  head: 'Kopf',
  lUpperArm: 'Linker Oberarm',
  lLowerArm: 'Linker Unterarm',
  rUpperArm: 'Rechter Oberarm',
  rLowerArm: 'Rechter Unterarm',
  lUpperLeg: 'Linker Oberschenkel',
  lLowerLeg: 'Linker Unterschenkel',
  rUpperLeg: 'Rechter Oberschenkel',
  rLowerLeg: 'Rechter Unterschenkel'
};

export const JOINT_KEYS = Object.keys(JOINT_LABELS);

export const POSE_LABELS = {
  stehen: 'Stehen',
  gehen: 'Gehen',
  sitzen: 'Sitzen',
  zeigen: 'Zeigen',
  kniend: 'Kniend',
  liegend: 'Liegend'
};

export const POSE_KEYS = Object.keys(POSE_LABELS);

export const LIGHT_PRESETS = {
  morgen: {
    label: 'Morgen',
    ambient: { intensity: 0.38, color: '#b4c6e0' },
    sun: { azimuth: 82, elevation: 16, intensity: 1.45, color: '#ffd2a8' }
  },
  mittag: {
    label: 'Mittag',
    ambient: { intensity: 0.58, color: '#e4eaf2' },
    sun: { azimuth: 158, elevation: 72, intensity: 2.15, color: '#fff7ea' }
  },
  abend: {
    label: 'Abend',
    ambient: { intensity: 0.42, color: '#e8aa7c' },
    sun: { azimuth: 258, elevation: 16, intensity: 1.9, color: '#ff9348' }
  },
  nacht: {
    label: 'Nacht',
    ambient: { intensity: 0.12, color: '#1c2744' },
    sun: { azimuth: 210, elevation: 38, intensity: 0.32, color: '#a8c4ff' }
  },
  studio: {
    label: 'Studio',
    ambient: { intensity: 0.52, color: '#d8d4cc' },
    sun: { azimuth: 128, elevation: 42, intensity: 1.35, color: '#fff3e4' }
  }
};

export const FIGURE_COLORS = ['#3d5a80', '#8b3e3e', '#3f6b4e', '#6b4f8a', '#8a6a32', '#2f5f6b'];

export const DEFAULT_LIGHTS = {
  ambient: { intensity: 0.46, color: '#c8d0dc' },
  sun: { azimuth: 142, elevation: 48, intensity: 1.75, color: '#fff2d8' },
  shadows: true
};

export function focalToVerticalFov(focalMm, aspect) {
  const filmHeight = FILM_WIDTH_MM / aspect;
  return (2 * Math.atan(filmHeight / (2 * focalMm)) * 180) / Math.PI;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function hexToInt(hex) {
  return parseInt(String(hex).replace('#', ''), 16);
}

export function colorToHex(color) {
  if (!color) return '#ffffff';
  if (typeof color === 'string') {
    return color.startsWith('#') ? color : `#${color}`;
  }
  return `#${color.getHexString()}`;
}
