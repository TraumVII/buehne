import { ASPECTS, TYPE_LABELS } from './config.js';

const KNOWN_TYPES = new Set(Object.keys(TYPE_LABELS));
const SCENE_KEYS = ['version', 'items', 'shotCamera', 'workCamera', 'lights', 'shots', 'room', 'environment', 'sky'];
const TRANSFORM_MODES = new Set(['translate', 'rotate', 'scale']);

function isObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function isVec3(value) {
  return Array.isArray(value) && value.length === 3 && value.every((entry) => typeof entry === 'number' && Number.isFinite(entry));
}

function fail(message) {
  throw new Error(message);
}

function validateItem(item, index) {
  if (!isObject(item)) fail(`Objekt ${index + 1} ist ungültig.`);
  if (typeof item.type !== 'string' || !KNOWN_TYPES.has(item.type)) {
    fail(`Objekt ${index + 1} hat einen unbekannten Typ.`);
  }
  if (item.id != null && typeof item.id !== 'string') fail(`Objekt ${index + 1}: „id“ muss Text sein.`);
  if (item.name != null && typeof item.name !== 'string') fail(`Objekt ${index + 1}: „name“ muss Text sein.`);
  if (item.color != null && typeof item.color !== 'string') fail(`Objekt ${index + 1}: „color“ muss Text sein.`);
  if (item.position != null && !isVec3(item.position)) fail(`Objekt ${index + 1}: „position“ muss drei Zahlen enthalten.`);
  if (item.rotation != null && !isVec3(item.rotation)) fail(`Objekt ${index + 1}: „rotation“ muss drei Zahlen enthalten.`);
  if (item.scale != null && !isVec3(item.scale)) fail(`Objekt ${index + 1}: „scale“ muss drei Zahlen enthalten.`);
  if (item.pose != null && typeof item.pose !== 'string') fail(`Objekt ${index + 1}: „pose“ muss Text sein.`);
  if (item.poseOffset != null && !isVec3(item.poseOffset)) fail(`Objekt ${index + 1}: „poseOffset“ muss drei Zahlen enthalten.`);
  if (item.innerRotation != null && !isVec3(item.innerRotation)) fail(`Objekt ${index + 1}: „innerRotation“ muss drei Zahlen enthalten.`);
  if (item.joints != null) {
    if (!isObject(item.joints)) fail(`Objekt ${index + 1}: „joints“ muss ein Objekt sein.`);
    Object.entries(item.joints).forEach(([name, xyz]) => {
      if (!isVec3(xyz)) fail(`Objekt ${index + 1}: Gelenk „${name}“ muss drei Zahlen enthalten.`);
    });
  }
  if (item.light != null) {
    if (!isObject(item.light)) fail(`Objekt ${index + 1}: „light“ muss ein Objekt sein.`);
    ['intensity', 'distance', 'angle', 'decay'].forEach((key) => {
      if (item.light[key] != null && typeof item.light[key] !== 'number') {
        fail(`Objekt ${index + 1}: Lichtwert „${key}“ muss eine Zahl sein.`);
      }
    });
  }
  if (item.assetId != null && typeof item.assetId !== 'string') {
    fail(`Objekt ${index + 1}: „assetId“ muss Text sein.`);
  }
  if (item.heightMeters != null && typeof item.heightMeters !== 'number') {
    fail(`Objekt ${index + 1}: „heightMeters“ muss eine Zahl sein.`);
  }
  if (item.onTopOf != null && typeof item.onTopOf !== 'string') {
    fail(`Objekt ${index + 1}: „onTopOf“ muss Text sein.`);
  }
}

function validateCamera(camera, label) {
  if (camera == null) return;
  if (!isObject(camera)) fail(`„${label}“ muss ein Objekt sein.`);
  if (camera.position != null && !isVec3(camera.position)) fail(`„${label}.position“ muss drei Zahlen enthalten.`);
  if (camera.target != null && !isVec3(camera.target)) fail(`„${label}.target“ muss drei Zahlen enthalten.`);
  if (camera.focalLength != null && (typeof camera.focalLength !== 'number' || !Number.isFinite(camera.focalLength))) {
    fail(`„${label}.focalLength“ muss eine Zahl sein.`);
  }
  if (camera.aspect != null && (typeof camera.aspect !== 'string' || !ASPECTS[camera.aspect])) {
    fail(`„${label}.aspect“ ist kein unterstütztes Seitenverhältnis.`);
  }
}

function validateLights(lights) {
  if (lights == null) return;
  if (!isObject(lights)) fail('„lights“ muss ein Objekt sein.');
  if (lights.ambient != null) {
    if (!isObject(lights.ambient)) fail('„lights.ambient“ muss ein Objekt sein.');
    if (lights.ambient.intensity != null && typeof lights.ambient.intensity !== 'number') {
      fail('„lights.ambient.intensity“ muss eine Zahl sein.');
    }
    if (lights.ambient.color != null && typeof lights.ambient.color !== 'string') {
      fail('„lights.ambient.color“ muss Text sein.');
    }
  }
  if (lights.sun != null) {
    if (!isObject(lights.sun)) fail('„lights.sun“ muss ein Objekt sein.');
    ['azimuth', 'elevation', 'intensity'].forEach((key) => {
      if (lights.sun[key] != null && typeof lights.sun[key] !== 'number') {
        fail(`„lights.sun.${key}“ muss eine Zahl sein.`);
      }
    });
    if (lights.sun.color != null && typeof lights.sun.color !== 'string') {
      fail('„lights.sun.color“ muss Text sein.');
    }
  }
  if (lights.shadows != null && typeof lights.shadows !== 'boolean') {
    fail('„lights.shadows“ muss wahr oder falsch sein.');
  }
}

export function validateAndNormalizeScene(data) {
  if (!isObject(data)) fail('Kein gültiges Bühne-Szenenformat.');
  const hasSceneKey = SCENE_KEYS.some((key) => Object.prototype.hasOwnProperty.call(data, key));
  if (!hasSceneKey) fail('Kein gültiges Bühne-Szenenformat.');
  if (data.version != null && (typeof data.version !== 'number' || data.version !== 1)) {
    fail('Diese Szenenversion wird nicht unterstützt.');
  }
  if (data.items != null) {
    if (!Array.isArray(data.items)) fail('Das Feld „items“ muss eine Liste sein.');
    data.items.forEach((item, index) => validateItem(item, index));
  }
  if (data.shots != null) {
    if (!Array.isArray(data.shots)) fail('Das Feld „shots“ muss eine Liste sein.');
    data.shots.forEach((shot, index) => {
      if (!isObject(shot)) fail(`Shot ${index + 1} ist ungültig.`);
      if (shot.position != null && !isVec3(shot.position)) fail(`Shot ${index + 1}: „position“ muss drei Zahlen enthalten.`);
      if (shot.target != null && !isVec3(shot.target)) fail(`Shot ${index + 1}: „target“ muss drei Zahlen enthalten.`);
      if (shot.focalLength != null && typeof shot.focalLength !== 'number') fail(`Shot ${index + 1}: „focalLength“ muss eine Zahl sein.`);
      if (shot.aspect != null && (typeof shot.aspect !== 'string' || !ASPECTS[shot.aspect])) {
        fail(`Shot ${index + 1}: „aspect“ ist ungültig.`);
      }
      if (shot.name != null && typeof shot.name !== 'string') fail(`Shot ${index + 1}: „name“ muss Text sein.`);
    });
  }
  validateCamera(data.workCamera, 'workCamera');
  validateCamera(data.shotCamera, 'shotCamera');
  validateLights(data.lights);
  if (data.room != null && typeof data.room !== 'boolean') fail('„room“ muss wahr oder falsch sein.');
  if (data.transformMode != null && !TRANSFORM_MODES.has(data.transformMode)) {
    fail('„transformMode“ ist ungültig.');
  }
  if (data.showGuides != null && typeof data.showGuides !== 'boolean') fail('„showGuides“ muss wahr oder falsch sein.');
  if (data.showGizmo != null && typeof data.showGizmo !== 'boolean') fail('„showGizmo“ muss wahr oder falsch sein.');
  if (data.uniformScale != null && typeof data.uniformScale !== 'boolean') fail('„uniformScale“ muss wahr oder falsch sein.');
  if (data.currentLightPreset != null && typeof data.currentLightPreset !== 'string') {
    fail('„currentLightPreset“ muss Text sein.');
  }
  if (data.environment != null) {
    if (typeof data.environment === 'string') {
      /* known ids checked loosely so older experimental keys fail clearly */
      const known = new Set(['none', 'wald', 'wiese', 'wueste', 'berge', 'kueste', 'see', 'stadt', 'innenraum', 'hoehle', 'ruine']);
      if (!known.has(data.environment)) fail('„environment“ ist unbekannt.');
    } else if (isObject(data.environment)) {
      if (data.environment.id != null && typeof data.environment.id !== 'string') {
        fail('„environment.id“ muss Text sein.');
      }
    } else {
      fail('„environment“ muss Text oder ein Objekt sein.');
    }
  }
  if (data.sky != null) {
    if (!isObject(data.sky)) fail('„sky“ muss ein Objekt sein.');
    ['hour'].forEach((key) => {
      if (data.sky[key] != null && typeof data.sky[key] !== 'number') fail(`„sky.${key}“ muss eine Zahl sein.`);
    });
    ['moonPhase', 'clouds', 'weather'].forEach((key) => {
      if (data.sky[key] != null && typeof data.sky[key] !== 'string') fail(`„sky.${key}“ muss Text sein.`);
    });
  }
  return data;
}
