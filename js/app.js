import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import {
  ASPECTS,
  DEFAULT_LIGHTS,
  FIGURE_COLORS,
  JOINT_KEYS,
  LIGHT_PRESETS,
  STORAGE_KEY,
  TYPE_LABELS,
  clamp,
  colorToHex,
  focalToVerticalFov,
  uid
} from './config.js';
import { HistoryStack } from './history.js';
import {
  applyPoseToParts,
  findJointName,
  readJointDegrees,
  writeJointDegrees
} from './figures.js';
import {
  DEFAULT_OBJECT_COLORS,
  createStageObject,
  disposeObject3D,
  setRecolor
} from './objects.js';
import { parseSceneText } from './parser.js';
import { captureCanvas, resolutionFromLongEdge, shareOrDownload } from './export.js';
import { validateAndNormalizeScene } from './schema.js';

export class BuehneApp {
  constructor(canvas, overlay) {
    this.canvas = canvas;
    this.overlay = overlay;
    this.items = new Map();
    this.selectedId = null;
    this.currentJoint = 'rUpperArm';
    this.transformMode = 'translate';
    this.uniformScale = true;
    this.throughShot = false;
    this.showGuides = true;
    this.showGizmo = true;
    this.aspectKey = '16:9';
    this.focalLength = 35;
    this.shots = [];
    this.lights = structuredClone(DEFAULT_LIGHTS);
    this.currentLightPreset = 'mittag';
    this.lastParse = null;
    this.lastError = null;
    this.storageError = null;
    this.history = new HistoryStack(40);
    this.listeners = new Set();
    this.ready = false;
    this.readyPromise = new Promise((resolve) => {
      this._resolveReady = resolve;
    });
    this._exporting = false;
    this._pointer = { x: 0, y: 0, moved: false };
    this._saveTimer = null;
    this._lastFrameRect = { x: 0, y: 0, w: 100, h: 100 };
    this._lastRenderRect = { x: 0, y: 0, w: 100, h: 100 };
    this._nameCounts = {};
  }

  init() {
    this._setupRenderer();
    this._setupScene();
    this._setupCameras();
    this._setupControls();
    this._setupEvents();
    this.resize();

    const saved = this._readAutosave();
    if (saved) {
      try {
        this.deserialize(saved);
      } catch (error) {
        console.warn('Autosave konnte nicht geladen werden', error);
        this.newScene({ skipCommit: true, skipConfirm: true });
      }
    } else {
      this.newScene({ skipCommit: true, skipConfirm: true });
    }

    this.history.clear();
    this.commit();
    this.ready = true;
    this._resolveReady?.(true);
    this.emitChange();
    this._loop();
    return this.readyPromise;
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emitChange() {
    this._scheduleSave();
    this._notify();
  }

  _notify() {
    const model = this.getViewModel();
    this.listeners.forEach((fn) => fn(model));
  }

  _finishSetting(options = {}) {
    if (options.skipCommit) this.emitChange();
    else {
      this.commit();
      this.emitChange();
    }
  }

  _syncLayoutMode() {
    const side = window.matchMedia('(orientation: landscape)').matches;
    document.body.classList.toggle('layout-side', side);
    document.body.classList.toggle('layout-bottom', !side);
  }

  isSidePanelLayout() {
    return document.body.classList.contains('layout-side') || window.matchMedia('(orientation: landscape)').matches;
  }

  _setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x101014, 1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
  }

  _setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x101014);
    this.scene.fog = new THREE.Fog(0x101014, 18, 42);

    this.world = new THREE.Group();
    this.scene.add(this.world);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(22, 22),
      new THREE.MeshStandardMaterial({ color: 0x8a8680, roughness: 0.95, metalness: 0.02 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.userData.pickable = false;
    this.scene.add(floor);
    this.floor = floor;

    this.grid = new THREE.GridHelper(16, 16, 0x7a7264, 0x3a3834);
    this.grid.position.y = 0.004;
    this.grid.userData.helper = true;
    this.scene.add(this.grid);

    this.roomGroup = new THREE.Group();
    this.roomGroup.visible = false;
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xc9c3b6, roughness: 0.88, metalness: 0.02 });
    const size = 8;
    const height = 2.8;
    const thick = 0.08;
    const walls = [
      [size + thick, thick, 0, -size / 2],
      [size + thick, thick, 0, size / 2],
      [thick, size, -size / 2, 0],
      [thick, size, size / 2, 0]
    ];
    walls.forEach(([w, d, x, z]) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, height, d), wallMat);
      wall.position.set(x, height / 2, z);
      wall.castShadow = true;
      wall.receiveShadow = true;
      wall.userData.pickable = false;
      this.roomGroup.add(wall);
    });
    this.scene.add(this.roomGroup);

    this.ambient = new THREE.AmbientLight(this.lights.ambient.color, this.lights.ambient.intensity);
    this.scene.add(this.ambient);

    this.sun = new THREE.DirectionalLight(this.lights.sun.color, this.lights.sun.intensity);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.camera.left = -9;
    this.sun.shadow.camera.right = 9;
    this.sun.shadow.camera.top = 9;
    this.sun.shadow.camera.bottom = -9;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 40;
    this.sun.shadow.bias = -0.0008;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);
    this._syncSun();

    this.shotHelper = this._createShotHelper();
    this.scene.add(this.shotHelper);
  }

  _createShotHelper() {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.13, 0.24),
      new THREE.MeshStandardMaterial({ color: 0x1a1a20, roughness: 0.42 })
    );
    const lens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.065, 0.1, 14),
      new THREE.MeshStandardMaterial({ color: 0x4a4a55, roughness: 0.35 })
    );
    lens.rotation.x = Math.PI / 2;
    lens.position.z = -0.15;
    group.add(body, lens);
    group.traverse((child) => {
      if (child.isMesh) {
        child.userData.helper = true;
        child.castShadow = false;
        child.receiveShadow = false;
      }
    });
    return group;
  }

  _setupCameras() {
    this.workCamera = new THREE.PerspectiveCamera(50, 1, 0.12, 80);
    this.workCamera.position.set(5.4, 3.3, 6.4);
    this.workTarget = new THREE.Vector3(0, 0.7, 0);

    this.shotCamera = new THREE.PerspectiveCamera(35, ASPECTS[this.aspectKey], 0.15, 60);
    this.shotCamera.position.set(0.35, 1.52, 4.9);
    this.shotTarget = new THREE.Vector3(0, 1.18, 0);
    this.shotCamera.lookAt(this.shotTarget);
    this._applyShotProjection();
  }

  _setupControls() {
    this.orbit = new OrbitControls(this.workCamera, this.canvas);
    this.orbit.target.copy(this.workTarget);
    this.orbit.enableDamping = true;
    this.orbit.dampingFactor = 0.08;
    this.orbit.minDistance = 0.6;
    this.orbit.maxDistance = 24;
    this.orbit.maxPolarAngle = Math.PI * 0.49;
    this.orbit.update();

    this.transform = new TransformControls(this.workCamera, this.canvas);
    this.transform.setSize(1.2);
    this.transform.setMode(this.transformMode);
    this.transform.detach();
    this.scene.add(this.transform.getHelper());

    this.transform.addEventListener('dragging-changed', (event) => {
      this.orbit.enabled = !event.value;
    });
    this.transform.addEventListener('objectChange', () => {
      this.emitChange();
    });
    this.transform.addEventListener('mouseUp', () => {
      this.commit();
    });

    this.orbit.addEventListener('end', () => {
      if (this.throughShot) {
        this.shotTarget.copy(this.orbit.target);
        this.commit();
      } else {
        this.workTarget.copy(this.orbit.target);
        this._scheduleSave();
      }
    });
  }

  _setupEvents() {
    window.addEventListener('resize', () => this.resize());
    window.matchMedia('(orientation: landscape)').addEventListener('change', () => this.resize());
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => this.resize());
      window.visualViewport.addEventListener('scroll', () => this.resize());
    }

    this.canvas.addEventListener('pointerdown', (event) => {
      this._pointer = { x: event.clientX, y: event.clientY, moved: false };
    });
    this.canvas.addEventListener('pointermove', (event) => {
      if (!this._pointer) return;
      const dx = event.clientX - this._pointer.x;
      const dy = event.clientY - this._pointer.y;
      if (dx * dx + dy * dy > 64) this._pointer.moved = true;
    });
    this.canvas.addEventListener('pointerup', (event) => {
      if (!this._pointer?.moved && !this.transform.dragging) {
        this._pick(event);
      }
    });
  }

  _loop() {
    const tick = () => {
      this.orbit.update();
      if (this.throughShot) {
        this.shotTarget.copy(this.orbit.target);
      } else {
        this.workTarget.copy(this.orbit.target);
      }
      this._updateShotHelper();
      this._updateTransformViewport();
      this.render();
      this._updateOverlay();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  resize() {
    this._syncLayoutMode();
    const width = Math.max(1, this.canvas.clientWidth);
    const height = Math.max(1, this.canvas.clientHeight);
    this.renderer.setSize(width, height, false);
    this.workCamera.aspect = width / height;
    this.workCamera.updateProjectionMatrix();
    this._applyShotProjection();
  }

  render() {
    const size = new THREE.Vector2();
    this.renderer.getSize(size);

    this.renderer.setScissorTest(false);
    this.renderer.setViewport(0, 0, size.x, size.y);
    this.renderer.setClearColor(0x08080c, 1);
    this.renderer.clear();

    if (this.throughShot && !this._exporting) {
      const frame = this._letterboxRect();
      this._lastFrameRect = frame;
      this._lastRenderRect = frame;
      this._renderIntoRect(frame, this.shotCamera, 0x14141a);
    } else {
      const area = this._visibleStageRect();
      this._lastRenderRect = area;
      this._lastFrameRect = area;
      if (area.w > 1 && area.h > 1) {
        this.workCamera.aspect = area.w / area.h;
        this.workCamera.updateProjectionMatrix();
        this._renderIntoRect(area, this.workCamera, 0x101014);
      }
    }
  }

  _renderIntoRect(rect, camera, clearColor) {
    const cssH = this.canvas.clientHeight;
    const x = rect.x;
    const y = cssH - rect.y - rect.h;
    const w = rect.w;
    const h = rect.h;
    this.renderer.setScissorTest(true);
    this.renderer.setViewport(x, y, w, h);
    this.renderer.setScissor(x, y, w, h);
    this.renderer.setClearColor(clearColor, 1);
    this.renderer.clear();
    this.renderer.render(this.scene, camera);
    this.renderer.setScissorTest(false);
  }

  _visibleStageRect() {
    const canvasRect = this.canvas.getBoundingClientRect();
    const topbar = document.getElementById('topbar');
    const sheet = document.getElementById('sheet');
    const topbarRect = topbar ? topbar.getBoundingClientRect() : null;
    const sheetRect = sheet ? sheet.getBoundingClientRect() : null;
    const top = topbarRect ? topbarRect.bottom - canvasRect.top + 8 : 64;
    if (this.isSidePanelLayout() && sheetRect) {
      const left = 10;
      const right = sheetRect.left - canvasRect.left - 8;
      const bottom = canvasRect.height - 10;
      return {
        x: left,
        y: Math.max(8, top),
        w: Math.max(40, right - left),
        h: Math.max(40, bottom - Math.max(8, top))
      };
    }
    const bottom = sheetRect ? sheetRect.top - canvasRect.top - 8 : canvasRect.height - 16;
    return {
      x: 10,
      y: Math.max(8, top),
      w: Math.max(40, canvasRect.width - 20),
      h: Math.max(40, bottom - Math.max(8, top))
    };
  }

  _letterboxRect() {
    const area = this._visibleStageRect();
    const aspect = ASPECTS[this.aspectKey] || 16 / 9;
    let width = area.w;
    let height = width / aspect;
    if (height > area.h) {
      height = area.h;
      width = height * aspect;
    }
    return {
      x: area.x + (area.w - width) / 2,
      y: area.y + (area.h - height) / 2,
      w: width,
      h: height
    };
  }

  _updateOverlay() {
    if (!this.overlay?.frame) return;
    const show = this.throughShot && !this._exporting;
    this.overlay.frame.hidden = !show;
    if (!show) return;
    const frame = this._lastFrameRect;
    const el = this.overlay.frame;
    el.style.left = `${frame.x}px`;
    el.style.top = `${frame.y}px`;
    el.style.width = `${frame.w}px`;
    el.style.height = `${frame.h}px`;
    const thirds = el.querySelectorAll('.thirds');
    thirds.forEach((line) => {
      line.style.display = this.showGuides ? '' : 'none';
    });
    if (this.overlay.hud) {
      this.overlay.hud.textContent = `${Math.round(this.focalLength)} mm · ${this.aspectKey}`;
    }
  }

  _updateShotHelper() {
    this.shotHelper.position.copy(this.shotCamera.position);
    this.shotHelper.quaternion.copy(this.shotCamera.quaternion);
    this.shotHelper.visible = !this.throughShot && !this._exporting;
    this.transform.getHelper().visible = Boolean(this.showGizmo && this.selectedId && !this._exporting);
    this.grid.visible = !this._exporting;
  }

  _updateTransformViewport() {
    this.transform.camera = this.throughShot ? this.shotCamera : this.workCamera;
    const region = this._lastRenderRect;
    const cssH = this.canvas.clientHeight;
    this.transform.viewport = new THREE.Vector4(
      region.x,
      cssH - region.y - region.h,
      region.w,
      region.h
    );
  }

  _applyShotProjection() {
    const aspect = ASPECTS[this.aspectKey];
    this.shotCamera.fov = focalToVerticalFov(this.focalLength, aspect);
    this.shotCamera.aspect = aspect;
    this.shotCamera.updateProjectionMatrix();
  }

  _syncSun() {
    const { azimuth, elevation, intensity, color } = this.lights.sun;
    const az = THREE.MathUtils.degToRad(azimuth);
    const el = THREE.MathUtils.degToRad(elevation);
    this.sun.position.set(
      Math.sin(az) * Math.cos(el) * 14,
      Math.sin(el) * 14,
      Math.cos(az) * Math.cos(el) * 14
    );
    this.sun.intensity = intensity;
    this.sun.color.set(color);
    this.sun.castShadow = this.lights.shadows;
    this.sun.target.position.set(0, 0, 0);
    this.sun.target.updateMatrixWorld();
    this.ambient.intensity = this.lights.ambient.intensity;
    this.ambient.color.set(this.lights.ambient.color);
    this.renderer.shadowMap.enabled = this.lights.shadows;
  }

  _nextName(type) {
    this._nameCounts[type] = (this._nameCounts[type] || 0) + 1;
    return `${TYPE_LABELS[type] || type} ${this._nameCounts[type]}`;
  }

  _rebuildNameCounts() {
    this._nameCounts = {};
    this.items.forEach((item) => {
      const match = / (\d+)$/.exec(item.name || '');
      const n = match ? parseInt(match[1], 10) : 1;
      this._nameCounts[item.type] = Math.max(this._nameCounts[item.type] || 0, n);
    });
  }

  insert(type, options = {}) {
    const palette = type === 'figure'
      ? FIGURE_COLORS[this.items.size % FIGURE_COLORS.length]
      : (options.color || DEFAULT_OBJECT_COLORS[type] || '#888888');
    const created = createStageObject(type, palette);
    const item = {
      id: options.id || uid(type),
      type,
      kind: type === 'figure' ? 'figure' : (type === 'pointlight' || type === 'spotlight' ? 'light' : 'object'),
      name: options.name || this._nextName(type),
      color: palette,
      group: created.root,
      joints: created.joints || null,
      inner: created.inner || null,
      poseOffset: created.poseOffset || null,
      clothMat: created.clothMat || null,
      pose: type === 'figure' ? 'stehen' : null,
      light: created.root.userData.light || null
    };
    item.group.userData.itemId = item.id;
    this.items.set(item.id, item);
    this.world.add(item.group);
    if (!options.skipPlace) this._placeNewItem(item);
    if (!options.skipSelect) this.select(item.id);
    if (!options.skipCommit) {
      this.commit();
      this.emitChange();
    }
    return item;
  }

  _placeNewItem(item) {
    const target = this.throughShot ? this.shotTarget : this.orbit.target;
    const pos = new THREE.Vector3(target.x, item.group.position.y, target.z);
    pos.x = clamp(pos.x, -7, 7);
    pos.z = clamp(pos.z, -7, 7);
    for (let i = 0; i < 10; i += 1) {
      const blocked = [...this.items.values()].some((other) => {
        if (other.id === item.id) return false;
        const dx = other.group.position.x - pos.x;
        const dz = other.group.position.z - pos.z;
        return dx * dx + dz * dz < 0.32;
      });
      if (!blocked) break;
      pos.x += 0.55;
      pos.z += 0.18;
    }
    item.group.position.x = pos.x;
    item.group.position.z = pos.z;
  }

  removeSelected(options = {}) {
    if (!this.selectedId) return;
    this._removeItem(this.selectedId);
    this.selectedId = null;
    this.transform.detach();
    if (!options.skipCommit) {
      this.commit();
      this.emitChange();
    }
  }

  _removeItem(id) {
    const item = this.items.get(id);
    if (!item) return;
    this.world.remove(item.group);
    disposeObject3D(item.group);
    this.items.delete(id);
  }

  duplicateSelected() {
    const source = this.items.get(this.selectedId);
    if (!source) return null;
    const data = this._serializeItem(source);
    data.id = uid(source.type);
    data.name = this._nextName(source.type);
    data.position[0] += 0.6;
    data.position[2] += 0.35;
    const item = this._spawnFromData(data);
    this.select(item.id);
    this.commit();
    this.emitChange();
    return item;
  }

  select(id, jointName = null) {
    this.selectedId = id;
    const item = this.items.get(id);
    if (item?.kind === 'figure' && jointName && JOINT_KEYS.includes(jointName)) {
      this.currentJoint = jointName;
    }
    this._attachGizmo();
    this.emitChange();
  }

  clearSelection() {
    this.selectedId = null;
    this.transform.detach();
    this.emitChange();
  }

  _attachGizmo() {
    const item = this.items.get(this.selectedId);
    if (item && this.showGizmo) {
      this.transform.attach(item.group);
      this.transform.setMode(this.transformMode);
    } else {
      this.transform.detach();
    }
  }

  setTransformMode(mode, options = {}) {
    this.transformMode = mode;
    this.transform.setMode(mode);
    this._finishSetting(options);
  }

  setUniformScale(value, options = {}) {
    this.uniformScale = Boolean(value);
    this._finishSetting(options);
  }

  setSelectedPosition(axis, value) {
    const item = this.items.get(this.selectedId);
    if (!item) return;
    item.group.position[axis] = Number(value);
    this.emitChange();
  }

  setSelectedRotation(axis, degrees) {
    const item = this.items.get(this.selectedId);
    if (!item) return;
    item.group.rotation[axis] = THREE.MathUtils.degToRad(Number(degrees));
    this.emitChange();
  }

  setSelectedScale(axis, value) {
    const item = this.items.get(this.selectedId);
    if (!item) return;
    const amount = Number(value);
    if (this.uniformScale) {
      item.group.scale.setScalar(amount);
    } else {
      item.group.scale[axis] = amount;
    }
    this.emitChange();
  }

  setColor(hex) {
    const item = this.items.get(this.selectedId);
    if (!item) return;
    item.color = hex;
    if (item.clothMat) item.clothMat.color.set(hex);
    else setRecolor(item.group, hex);
    this.emitChange();
  }

  setLightIntensity(value) {
    const item = this.items.get(this.selectedId);
    if (!item?.light) return;
    item.light.intensity = Number(value);
    this.emitChange();
  }

  setCurrentJoint(name) {
    if (JOINT_KEYS.includes(name)) {
      this.currentJoint = name;
      this.emitChange();
    }
  }

  setJointAxis(axis, degrees) {
    const item = this.items.get(this.selectedId);
    if (!item?.joints?.[this.currentJoint]) return;
    item.joints[this.currentJoint].rotation[axis] = THREE.MathUtils.degToRad(Number(degrees));
    item.pose = 'custom';
    this.emitChange();
  }

  applyPose(id, poseName, options = {}) {
    const item = this.items.get(id || this.selectedId);
    if (!item?.joints) return;
    item.pose = applyPoseToParts(item.joints, item.inner, item.poseOffset, poseName);
    if (!options.skipCommit) {
      this.commit();
      this.emitChange();
    }
  }

  setRoom(enabled, options = {}) {
    this.roomGroup.visible = Boolean(enabled);
    if (!options.skipCommit) {
      this.commit();
      this.emitChange();
    }
  }

  setFocalLength(mm, options = {}) {
    this.focalLength = clamp(Number(mm), 14, 200);
    this._applyShotProjection();
    this._finishSetting(options);
  }

  setAspect(key, options = {}) {
    if (!ASPECTS[key]) return;
    this.aspectKey = key;
    this._applyShotProjection();
    this._finishSetting(options);
  }

  setThroughShot(enabled, options = {}) {
    const next = Boolean(enabled);
    if (next === this.throughShot) {
      this.emitChange();
      return;
    }
    if (next) {
      this.workView = {
        position: this.workCamera.position.clone(),
        target: this.orbit.target.clone()
      };
      this.orbit.object = this.shotCamera;
      this.orbit.target.copy(this.shotTarget);
    } else {
      this.shotTarget.copy(this.orbit.target);
      this.orbit.object = this.workCamera;
      if (this.workView) {
        this.workCamera.position.copy(this.workView.position);
        this.orbit.target.copy(this.workView.target);
      }
    }
    this.orbit.update();
    this.throughShot = next;
    this._attachGizmo();
    this._finishSetting(options);
  }

  setShotHeight(value, options = {}) {
    this.shotCamera.position.y = Number(value);
    this.shotCamera.lookAt(this.shotTarget);
    if (this.throughShot) this.orbit.update();
    this._finishSetting(options);
  }

  setTargetHeight(value, options = {}) {
    this.shotTarget.y = Number(value);
    this.shotCamera.lookAt(this.shotTarget);
    if (this.throughShot) {
      this.orbit.target.copy(this.shotTarget);
      this.orbit.update();
    }
    this._finishSetting(options);
  }

  setGuides(enabled, options = {}) {
    this.showGuides = Boolean(enabled);
    this._finishSetting(options);
  }

  setGizmoVisible(enabled, options = {}) {
    this.showGizmo = Boolean(enabled);
    this._attachGizmo();
    this._finishSetting(options);
  }

  setShadows(enabled, options = {}) {
    this.lights.shadows = Boolean(enabled);
    this._syncSun();
    if (!options.skipCommit) {
      this.commit();
      this.emitChange();
    }
  }

  setSun(partial, options = {}) {
    Object.assign(this.lights.sun, partial);
    this._syncSun();
    this._finishSetting(options);
  }

  setAmbient(partial, options = {}) {
    Object.assign(this.lights.ambient, partial);
    this._syncSun();
    this._finishSetting(options);
  }

  applyLightPreset(name, options = {}) {
    const preset = LIGHT_PRESETS[name];
    if (!preset) return;
    this.currentLightPreset = name;
    this.lights.ambient = { ...preset.ambient };
    this.lights.sun = { ...preset.sun };
    this._syncSun();
    if (!options.skipCommit) {
      this.commit();
      this.emitChange();
    }
  }

  saveShot(name) {
    if (this.throughShot) this.shotTarget.copy(this.orbit.target);
    const shot = {
      id: uid('shot'),
      name: name || `Einstellung ${this.shots.length + 1}`,
      position: this.shotCamera.position.toArray(),
      target: this.shotTarget.toArray(),
      focalLength: this.focalLength,
      aspect: this.aspectKey
    };
    this.shots.push(shot);
    this.commit();
    this.emitChange();
    return shot;
  }

  recallShot(id) {
    const shot = this.shots.find((entry) => entry.id === id);
    if (!shot) return;
    this.shotCamera.position.fromArray(shot.position);
    this.shotTarget.fromArray(shot.target);
    this.focalLength = shot.focalLength;
    this.aspectKey = shot.aspect;
    this.shotCamera.lookAt(this.shotTarget);
    this._applyShotProjection();
    if (this.throughShot) {
      this.orbit.target.copy(this.shotTarget);
      this.orbit.update();
    }
    this.commit();
    this.emitChange();
  }

  overwriteShot(id) {
    const shot = this.shots.find((entry) => entry.id === id);
    if (!shot) return;
    if (this.throughShot) this.shotTarget.copy(this.orbit.target);
    shot.position = this.shotCamera.position.toArray();
    shot.target = this.shotTarget.toArray();
    shot.focalLength = this.focalLength;
    shot.aspect = this.aspectKey;
    this.commit();
    this.emitChange();
  }

  deleteShot(id) {
    this.shots = this.shots.filter((entry) => entry.id !== id);
    this.commit();
    this.emitChange();
  }

  setWorkView(position, target) {
    this.workCamera.position.fromArray(position);
    this.workTarget.fromArray(target);
    if (!this.throughShot) {
      this.orbit.target.copy(this.workTarget);
      this.orbit.update();
    } else if (this.workView) {
      this.workView.position.fromArray(position);
      this.workView.target.fromArray(target);
    }
  }

  frameShotCamera(plan = this.lastParse || {}) {
    const distances = { weit: 6.3, amerikanisch: 4.5, halbnah: 3.35, nah: 2.45, detail: 1.65 };
    const dist = distances[plan.camera?.shotSize] || 4.6;
    const height = plan.camera?.shotSize === 'detail' ? 1.52 : 1.48;
    const targetY = plan.camera?.shotSize === 'nah' ? 1.36 : plan.camera?.shotSize === 'detail' ? 1.5 : 1.16;
    if (plan.figures?.formation === 'gegenueber') {
      this.shotCamera.position.set(dist, height, 0);
    } else {
      this.shotCamera.position.set(0.35, height, dist);
    }
    this.shotTarget.set(0, targetY, 0);
    this.shotCamera.lookAt(this.shotTarget);
    if (this.throughShot) {
      this.orbit.target.copy(this.shotTarget);
      this.orbit.update();
    }
  }

  layoutFigures(ids, formation) {
    const count = ids.length;
    if (!count) return;
    if (formation === 'gegenueber' && count === 2) {
      this._setItemXZRot(ids[0], 0, 1.15, 0);
      this._setItemXZRot(ids[1], 0, -1.15, 180);
      return;
    }
    if (formation === 'gegenueber' || formation === 'kreis') {
      const radius = 1.25 + count * 0.08;
      ids.forEach((id, index) => {
        const angle = ((index / count) * Math.PI * 2) + Math.PI / 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const rotY = THREE.MathUtils.radToDeg(Math.atan2(-x, -z));
        this._setItemXZRot(id, x, z, rotY);
      });
      return;
    }
    ids.forEach((id, index) => {
      const x = (index - (count - 1) / 2) * 0.95;
      this._setItemXZRot(id, x, 0, 0);
    });
  }

  _setItemXZRot(id, x, z, rotY) {
    const item = this.items.get(id);
    if (!item) return;
    item.group.position.x = x;
    item.group.position.z = z;
    item.group.rotation.y = THREE.MathUtils.degToRad(rotY);
  }

  parse(text) {
    const plan = parseSceneText(text);
    const mentions = plan.figures.count > 0 || plan.objects.length > 0;
    if (mentions) this.clearItems({ skipCommit: true });
    if (plan.light) this.applyLightPreset(plan.light, { skipCommit: true });
    if (plan.room === true || plan.room === false) this.setRoom(plan.room, { skipCommit: true });

    const figureIds = [];
    const specs = plan.figures.specs && plan.figures.specs.length
      ? plan.figures.specs
      : Array.from({ length: plan.figures.count }, () => ({ pose: plan.figures.pose, position: { key: 'mitte', x: 0, z: 0 } }));
    specs.forEach((spec) => {
      const item = this.insert('figure', { skipCommit: true, skipPlace: true, skipSelect: true });
      figureIds.push(item.id);
      if (spec.pose) this.applyPose(item.id, spec.pose, { skipCommit: true });
    });
    const hasIndividual = specs.some((spec) => spec.position && spec.position.key !== 'mitte');
    if (hasIndividual) {
      specs.forEach((spec, index) => {
        this._setItemXZRot(figureIds[index], spec.position.x, spec.position.z, 0);
      });
    } else {
      this.layoutFigures(figureIds, plan.figures.formation);
    }

    plan.objects.forEach((spec) => {
      for (let i = 0; i < spec.count; i += 1) {
        const item = this.insert(spec.type, { skipCommit: true, skipPlace: true, skipSelect: true });
        const spread = (i - (spec.count - 1) / 2) * 0.85;
        let { x, z } = spec.position;
        if (Math.abs(x) > 0.1 && Math.abs(z) < 0.1) z = spread;
        else if (Math.abs(z) > 0.1 && Math.abs(x) < 0.1) x = spread;
        else x += spread;
        item.group.position.x = x;
        item.group.position.z = z;
      }
    });

    if (plan.camera.focalLength) this.setFocalLength(plan.camera.focalLength, { skipCommit: true });
    if (plan.camera.aspect) this.setAspect(plan.camera.aspect, { skipCommit: true });
    if (mentions || plan.camera.shotSize) this.frameShotCamera(plan);

    this.lastParse = plan;
    this.commit();
    this.emitChange();
    return plan;
  }

  clearItems(options = {}) {
    [...this.items.keys()].forEach((id) => this._removeItem(id));
    this.selectedId = null;
    this.transform.detach();
    this._nameCounts = {};
    if (!options.skipCommit) {
      this.commit();
      this.emitChange();
    }
  }

  newScene(options = {}) {
    this.clearItems({ skipCommit: true });
    this.shots = [];
    this.throughShot = false;
    this.orbit.object = this.workCamera;
    this.workCamera.position.set(5.4, 3.3, 6.4);
    this.workTarget.set(0, 0.7, 0);
    this.orbit.target.copy(this.workTarget);
    this.shotCamera.position.set(0.35, 1.52, 4.9);
    this.shotTarget.set(0, 1.18, 0);
    this.focalLength = 35;
    this.aspectKey = '16:9';
    this.shotCamera.lookAt(this.shotTarget);
    this._applyShotProjection();
    this.orbit.update();
    this.lights = structuredClone(DEFAULT_LIGHTS);
    this.currentLightPreset = 'mittag';
    this._syncSun();
    this.roomGroup.visible = false;
    this.lastParse = null;
    if (!options.skipCommit) {
      this.history.clear();
      this.commit();
      this.emitChange();
    }
  }

  serialize() {
    if (this.throughShot) this.shotTarget.copy(this.orbit.target);
    else this.workTarget.copy(this.orbit.target);
    return {
      version: 1,
      room: this.roomGroup.visible,
      items: [...this.items.values()].map((item) => this._serializeItem(item)),
      workCamera: {
        position: this.workCamera.position.toArray(),
        target: this.workTarget.toArray()
      },
      shotCamera: {
        position: this.shotCamera.position.toArray(),
        target: this.shotTarget.toArray(),
        focalLength: this.focalLength,
        aspect: this.aspectKey
      },
      shots: this.shots,
      lights: this.lights,
      currentLightPreset: this.currentLightPreset,
      showGuides: this.showGuides,
      showGizmo: this.showGizmo,
      transformMode: this.transformMode,
      uniformScale: this.uniformScale
    };
  }

  serializeString() {
    return JSON.stringify(this.serialize());
  }

  _serializeItem(item) {
    const data = {
      id: item.id,
      type: item.type,
      kind: item.kind,
      name: item.name,
      color: item.color,
      position: item.group.position.toArray(),
      rotation: [
        THREE.MathUtils.radToDeg(item.group.rotation.x),
        THREE.MathUtils.radToDeg(item.group.rotation.y),
        THREE.MathUtils.radToDeg(item.group.rotation.z)
      ],
      scale: item.group.scale.toArray(),
      pose: item.pose
    };
    if (item.joints) data.joints = readJointDegrees(item.joints);
    if (item.poseOffset) data.poseOffset = item.poseOffset.position.toArray();
    if (item.inner) {
      data.innerRotation = [
        THREE.MathUtils.radToDeg(item.inner.rotation.x),
        THREE.MathUtils.radToDeg(item.inner.rotation.y),
        THREE.MathUtils.radToDeg(item.inner.rotation.z)
      ];
    }
    if (item.light) {
      data.light = {
        intensity: item.light.intensity,
        distance: item.light.distance,
        angle: item.light.angle,
        decay: item.light.decay
      };
    }
    return data;
  }

  _spawnFromData(data) {
    const item = this.insert(data.type, {
      id: data.id,
      name: data.name,
      color: data.color,
      skipPlace: true,
      skipSelect: true,
      skipCommit: true
    });
    item.name = data.name;
    item.color = data.color;
    if (item.clothMat) item.clothMat.color.set(data.color);
    else setRecolor(item.group, data.color);
    item.group.position.fromArray(data.position || [0, 0, 0]);
    const rot = data.rotation || [0, 0, 0];
    item.group.rotation.set(
      THREE.MathUtils.degToRad(rot[0] || 0),
      THREE.MathUtils.degToRad(rot[1] || 0),
      THREE.MathUtils.degToRad(rot[2] || 0)
    );
    item.group.scale.fromArray(data.scale || [1, 1, 1]);
    if (item.joints && data.joints) writeJointDegrees(item.joints, data.joints);
    if (item.poseOffset && data.poseOffset) item.poseOffset.position.fromArray(data.poseOffset);
    if (item.inner && data.innerRotation) {
      item.inner.rotation.set(
        THREE.MathUtils.degToRad(data.innerRotation[0] || 0),
        THREE.MathUtils.degToRad(data.innerRotation[1] || 0),
        THREE.MathUtils.degToRad(data.innerRotation[2] || 0)
      );
    }
    item.pose = data.pose || item.pose;
    if (item.light && data.light) {
      item.light.intensity = data.light.intensity ?? item.light.intensity;
      if (data.light.distance != null) item.light.distance = data.light.distance;
      if (data.light.angle != null) item.light.angle = data.light.angle;
    }
    return item;
  }

  deserialize(data) {
    this.clearItems({ skipCommit: true });
    this.shots = Array.isArray(data.shots) ? data.shots : [];
    this.roomGroup.visible = Boolean(data.room);
    this.showGuides = data.showGuides !== false;
    this.showGizmo = data.showGizmo !== false;
    this.transformMode = data.transformMode || 'translate';
    this.uniformScale = data.uniformScale !== false;
    this.lights = {
      ambient: { ...DEFAULT_LIGHTS.ambient, ...(data.lights?.ambient || {}) },
      sun: { ...DEFAULT_LIGHTS.sun, ...(data.lights?.sun || {}) },
      shadows: data.lights?.shadows !== false
    };
    this.currentLightPreset = data.currentLightPreset || this.currentLightPreset;
    this._syncSun();

    (data.items || []).forEach((itemData) => this._spawnFromData(itemData));
    this._rebuildNameCounts();

    if (data.workCamera?.position) this.workCamera.position.fromArray(data.workCamera.position);
    if (data.workCamera?.target) this.workTarget.fromArray(data.workCamera.target);
    if (data.shotCamera?.position) this.shotCamera.position.fromArray(data.shotCamera.position);
    if (data.shotCamera?.target) this.shotTarget.fromArray(data.shotCamera.target);
    this.focalLength = data.shotCamera?.focalLength || this.focalLength;
    this.aspectKey = data.shotCamera?.aspect && ASPECTS[data.shotCamera.aspect] ? data.shotCamera.aspect : this.aspectKey;
    this.shotCamera.lookAt(this.shotTarget);
    this._applyShotProjection();
    this.throughShot = false;
    this.orbit.object = this.workCamera;
    this.orbit.target.copy(this.workTarget);
    this.orbit.update();
    this.transform.setMode(this.transformMode);
    this.selectedId = null;
    this.transform.detach();
  }

  commit() {
    this.history.push(this.serializeString());
    this._scheduleSave();
  }

  undo() {
    const snapshot = this.history.undo();
    if (!snapshot) return;
    this.history.restoring = true;
    this.deserialize(JSON.parse(snapshot));
    this.history.restoring = false;
    this.emitChange();
  }

  redo() {
    const snapshot = this.history.redo();
    if (!snapshot) return;
    this.history.restoring = true;
    this.deserialize(JSON.parse(snapshot));
    this.history.restoring = false;
    this.emitChange();
  }

  _scheduleSave() {
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this._writeAutosave(), 400);
  }

  _writeAutosave() {
    try {
      localStorage.setItem(STORAGE_KEY, this.serializeString());
      if (this.storageError) {
        this.storageError = null;
        this._notify();
      }
    } catch (error) {
      const message = 'Speichern im Browser fehlgeschlagen. Der Speicher ist möglicherweise voll.';
      if (this.storageError !== message) {
        this.storageError = message;
        this._notify();
      }
    }
  }

  _readAutosave() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  async exportPNG(options = {}) {
    const mode = options.mode || 'color';
    const longEdge = Number(options.longEdge || 1920);
    const aspect = ASPECTS[this.aspectKey];
    const { width, height } = resolutionFromLongEdge(longEdge, aspect);
    this._exporting = true;
    this._updateShotHelper();

    const hiddenHelpers = [];
    this.scene.traverse((child) => {
      if (child.userData?.helper && child.visible) {
        hiddenHelpers.push(child);
        child.visible = false;
      }
    });
    this.grid.visible = false;
    this.shotHelper.visible = false;
    const helper = this.transform.getHelper();
    const prevHelper = helper.visible;
    helper.visible = false;

    try {
      this._applyShotProjection();
      const result = await captureCanvas({
        renderer: this.renderer,
        scene: this.scene,
        camera: this.shotCamera,
        width,
        height,
        mode,
        prepare: () => {
          this.shotCamera.fov = focalToVerticalFov(this.focalLength, width / height);
        }
      });
      this.resize();
      if (options.share && result.blob) {
        const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `buehne-${this.aspectKey.replace(':', 'x')}-${mode}-${stamp}.png`;
        result.action = await shareOrDownload(result.blob, filename);
      }
      if (options.asArray && result.blob) {
        const buffer = new Uint8Array(await result.blob.arrayBuffer());
        result.bytes = Array.from(buffer);
        result.mime = 'image/png';
      }
      return result;
    } finally {
      hiddenHelpers.forEach((child) => { child.visible = true; });
      helper.visible = prevHelper;
      this._exporting = false;
      this.resize();
      this._updateShotHelper();
    }
  }

  async exportJSON(share = true) {
    const blob = new Blob([this.serializeString()], { type: 'application/json' });
    const filename = `buehne-szene-${new Date().toISOString().slice(0, 10)}.json`;
    if (share) await shareOrDownload(blob, filename);
    return blob;
  }

  loadJSONData(input) {
    this.lastError = null;
    let data;
    try {
      data = typeof input === 'string' ? JSON.parse(input) : input;
    } catch {
      this.lastError = 'Die Datei ist kein gültiges JSON.';
      this._notify();
      return { ok: false, error: this.lastError };
    }
    let normalized;
    try {
      normalized = validateAndNormalizeScene(data);
    } catch (error) {
      this.lastError = error.message || 'Die Datei entspricht nicht dem Szenenformat.';
      this._notify();
      return { ok: false, error: this.lastError };
    }

    const backup = this.serialize();
    try {
      this.deserialize(normalized);
    } catch (error) {
      console.warn(error);
      try {
        this.deserialize(backup);
      } catch (restoreError) {
        console.warn(restoreError);
      }
      this.lastError = 'Die Szene konnte nicht geladen werden. Die aktuelle Szene bleibt unverändert.';
      this._notify();
      return { ok: false, error: this.lastError };
    }

    this.history.clear();
    this.commit();
    this.lastError = null;
    this.emitChange();
    return { ok: true };
  }

  async loadJSONFile(file) {
    const text = await file.text();
    return this.loadJSONData(text);
  }

  getLayoutInfo() {
    this._syncLayoutMode();
    const canvasRect = this.canvas.getBoundingClientRect();
    const sheet = document.getElementById('sheet');
    const sheetRect = sheet ? sheet.getBoundingClientRect() : null;
    return {
      layout: this.isSidePanelLayout() ? 'landscape' : 'portrait',
      visibleRect: this._visibleStageRect(),
      renderRect: this._lastRenderRect,
      frameRect: this._lastFrameRect,
      canvas: { left: canvasRect.left, top: canvasRect.top, width: canvasRect.width, height: canvasRect.height },
      sheet: sheetRect ? { left: sheetRect.left, top: sheetRect.top, width: sheetRect.width, height: sheetRect.height } : null
    };
  }

  _pick(event) {
    const ndc = this._pointerToNDC(event);
    if (Math.abs(ndc.x) > 1.05 || Math.abs(ndc.y) > 1.05) {
      this.clearSelection();
      return;
    }
    const raycaster = new THREE.Raycaster();
    const camera = this.throughShot ? this.shotCamera : this.workCamera;
    raycaster.setFromCamera(new THREE.Vector2(ndc.x, ndc.y), camera);
    const meshes = [];
    this.items.forEach((item) => {
      item.group.traverse((child) => {
        if (child.isMesh && !child.userData.helper) meshes.push(child);
      });
    });
    const hits = raycaster.intersectObjects(meshes, false);
    if (!hits.length) {
      this.clearSelection();
      return;
    }
    let object = hits[0].object;
    while (object && !object.userData.itemId) object = object.parent;
    if (!object) return;
    const item = this.items.get(object.userData.itemId);
    const jointName = item?.joints ? findJointName(hits[0].object, item.joints) : null;
    this.select(item.id, jointName);
  }

  _pointerToNDC(event) {
    const rect = this.canvas.getBoundingClientRect();
    const region = this._lastRenderRect;
    return {
      x: ((event.clientX - rect.left - region.x) / Math.max(1, region.w)) * 2 - 1,
      y: -((event.clientY - rect.top - region.y) / Math.max(1, region.h)) * 2 + 1
    };
  }

  getSelectedItem() {
    return this.items.get(this.selectedId) || null;
  }

  getState() {
    return {
      itemCount: this.items.size,
      items: [...this.items.values()].map((item) => ({
        id: item.id,
        type: item.type,
        kind: item.kind,
        name: item.name,
        position: item.group.position.toArray(),
        pose: item.pose
      })),
      selectedId: this.selectedId,
      throughShot: this.throughShot,
      focalLength: this.focalLength,
      aspect: this.aspectKey,
      room: this.roomGroup.visible,
      lightPreset: this.currentLightPreset,
      canUndo: this.history.canUndo(),
      canRedo: this.history.canRedo(),
      lastParse: this.lastParse,
      lastError: this.lastError,
      storageError: this.storageError,
      shots: this.shots.map((shot) => ({
        id: shot.id,
        name: shot.name,
        focalLength: shot.focalLength,
        aspect: shot.aspect
      }))
    };
  }

  getViewModel() {
    const item = this.getSelectedItem();
    const joints = item?.joints ? readJointDegrees(item.joints) : null;
    return {
      selectedId: this.selectedId,
      selected: item ? {
        id: item.id,
        type: item.type,
        kind: item.kind,
        name: item.name,
        color: item.color,
        pose: item.pose,
        position: {
          x: item.group.position.x,
          y: item.group.position.y,
          z: item.group.position.z
        },
        rotation: {
          x: THREE.MathUtils.radToDeg(item.group.rotation.x),
          y: THREE.MathUtils.radToDeg(item.group.rotation.y),
          z: THREE.MathUtils.radToDeg(item.group.rotation.z)
        },
        scale: {
          x: item.group.scale.x,
          y: item.group.scale.y,
          z: item.group.scale.z
        },
        joints,
        currentJoint: this.currentJoint,
        joint: joints?.[this.currentJoint] || [0, 0, 0],
        lightIntensity: item.light ? item.light.intensity : null
      } : null,
      itemCount: this.items.size,
      room: this.roomGroup.visible,
      throughShot: this.throughShot,
      focalLength: this.focalLength,
      aspect: this.aspectKey,
      showGuides: this.showGuides,
      showGizmo: this.showGizmo,
      transformMode: this.transformMode,
      uniformScale: this.uniformScale,
      shotHeight: this.shotCamera.position.y,
      targetHeight: this.shotTarget.y,
      shots: this.shots,
      lights: this.lights,
      currentLightPreset: this.currentLightPreset,
      canUndo: this.history.canUndo(),
      canRedo: this.history.canRedo(),
      lastParse: this.lastParse,
      lastError: this.lastError,
      storageError: this.storageError
    };
  }
}
