import { BuehneApp } from './app.js';
import { bindUI } from './ui.js';
import { getVocabulary } from './parser.js';
import { searchLibrary } from './library.js';

document.addEventListener('gesturestart', (event) => event.preventDefault());
document.addEventListener('dblclick', (event) => {
  if (!event.target.closest('input, textarea, select')) event.preventDefault();
}, { passive: false });

const canvas = document.getElementById('viewport');
const overlay = {
  frame: document.getElementById('frame'),
  hud: document.getElementById('shot-hud')
};

let app;

try {
  app = new BuehneApp(canvas, overlay);
  await app.init();
  bindUI(app);
} catch (error) {
  console.error(error);
  document.getElementById('webgl-error').hidden = false;
  throw error;
}

window.Buehne = {
  get isReady() {
    return Boolean(app?.ready);
  },
  ready: app.readyPromise,
  insert(type, options) {
    return app.insert(type, options || {}).id;
  },
  insertLibrary(assetId) {
    return app.insertLibrary(assetId).id;
  },
  parse(text) {
    return app.parse(text);
  },
  async exportPNG(options = {}) {
    const result = await app.exportPNG({ ...options, asArray: true });
    return {
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      mime: result.mime || 'image/png'
    };
  },
  setThroughShot(value) {
    app.setThroughShot(value);
  },
  getState() {
    return app.getState();
  },
  serialize() {
    return app.serialize();
  },
  newScene() {
    app.newScene();
  },
  select(id) {
    app.select(id);
  },
  applyPose(id, pose) {
    app.applyPose(id, pose);
  },
  setWorkView(position, target) {
    app.setWorkView(position, target);
  },
  setShotView(position, target) {
    app.setShotView(position, target);
  },
  loadJSON(input) {
    const result = app.loadJSONData(input);
    if (!result.ok) {
      const toast = document.getElementById('toast');
      if (toast) {
        toast.hidden = false;
        toast.textContent = result.error;
      }
    }
    return result;
  },
  setAspect(key) {
    app.setAspect(key);
  },
  setFocalLength(mm) {
    app.setFocalLength(mm);
  },
  saveShot(name) {
    return app.saveShot(name);
  },
  overwriteShot(id) {
    app.overwriteShot(id);
  },
  getLayoutInfo() {
    return app.getLayoutInfo();
  },
  clearSelection() {
    app.clearSelection();
  },
  undo() {
    app.undo();
  },
  redo() {
    app.redo();
  },
  getVocabulary() {
    return getVocabulary();
  },
  setEnvironment(id) {
    app.setEnvironment(id);
  },
  setSky(partial) {
    app.setSky(partial);
  },
  searchLibrary(query, category) {
    return searchLibrary(query, category);
  },
  getPerformanceInfo() {
    return app.getPerformanceInfo();
  },
  applyLightPreset(name) {
    app.applyLightPreset(name);
  }
};

if ('serviceWorker' in navigator) {
  const host = location.hostname;
  if (host !== 'localhost' && host !== '127.0.0.1') {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}
