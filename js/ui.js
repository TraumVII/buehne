import {
  ASPECT_KEYS,
  INSERT_TYPES,
  JOINT_KEYS,
  JOINT_LABELS,
  LIGHT_PRESETS,
  POSE_KEYS,
  POSE_LABELS,
  TYPE_LABELS
} from './config.js';

export function bindUI(app) {
  const els = {
    tabs: [...document.querySelectorAll('#tabs [data-tab]')],
    panels: [...document.querySelectorAll('[data-panel]')],
    insertGrid: document.getElementById('insert-grid'),
    poseGrid: document.getElementById('pose-grid'),
    aspectGrid: document.getElementById('aspect-grid'),
    lightPresets: document.getElementById('light-presets'),
    jointSelect: document.getElementById('select-joint'),
    moreMenu: document.getElementById('more-menu'),
    toast: document.getElementById('toast')
  };

  INSERT_TYPES.forEach((type) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = TYPE_LABELS[type];
    button.addEventListener('click', () => {
      app.insert(type);
      showTab('edit');
      toast(`${TYPE_LABELS[type]} eingefügt`);
    });
    els.insertGrid.appendChild(button);
  });

  POSE_KEYS.forEach((pose) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.pose = pose;
    button.textContent = POSE_LABELS[pose];
    button.addEventListener('click', () => app.applyPose(app.selectedId, pose));
    els.poseGrid.appendChild(button);
  });

  ASPECT_KEYS.forEach((key) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.aspect = key;
    button.textContent = key;
    button.addEventListener('click', () => app.setAspect(key));
    els.aspectGrid.appendChild(button);
  });

  Object.entries(LIGHT_PRESETS).forEach(([key, preset]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.preset = key;
    button.textContent = preset.label;
    button.addEventListener('click', () => app.applyLightPreset(key));
    els.lightPresets.appendChild(button);
  });

  JOINT_KEYS.forEach((key) => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = JOINT_LABELS[key];
    els.jointSelect.appendChild(option);
  });

  function showTab(name) {
    els.tabs.forEach((tab) => {
      tab.setAttribute('aria-selected', tab.dataset.tab === name ? 'true' : 'false');
    });
    els.panels.forEach((panel) => {
      panel.hidden = panel.dataset.panel !== name;
    });
    app.resize();
  }

  els.tabs.forEach((tab) => {
    tab.addEventListener('click', () => showTab(tab.dataset.tab));
  });

  document.getElementById('btn-undo').addEventListener('click', () => app.undo());
  document.getElementById('btn-redo').addEventListener('click', () => app.redo());
  document.getElementById('btn-export-quick').addEventListener('click', () => showTab('export'));
  document.getElementById('btn-more').addEventListener('click', () => {
    els.moreMenu.hidden = !els.moreMenu.hidden;
    document.getElementById('btn-more').setAttribute('aria-expanded', String(!els.moreMenu.hidden));
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('#more-menu') && !event.target.closest('#btn-more')) {
      els.moreMenu.hidden = true;
    }
  });

  document.getElementById('btn-new-scene').addEventListener('click', () => {
    els.moreMenu.hidden = true;
    if (confirm('Neue Szene beginnen? Die aktuelle Bühne wird geleert.')) {
      app.newScene();
      toast('Neue Szene');
    }
  });
  document.getElementById('btn-toggle-room').addEventListener('click', () => {
    app.setRoom(!app.roomGroup.visible);
  });
  document.getElementById('btn-toggle-gizmo').addEventListener('click', () => {
    app.setGizmoVisible(!app.showGizmo);
  });
  document.getElementById('btn-save-json').addEventListener('click', () => {
    els.moreMenu.hidden = true;
    app.exportJSON(true);
  });
  document.getElementById('btn-load-json').addEventListener('click', () => {
    els.moreMenu.hidden = true;
    document.getElementById('file-json').click();
  });

  document.getElementById('chk-room').addEventListener('change', (event) => {
    app.setRoom(event.target.checked);
  });

  document.getElementById('transform-modes').addEventListener('click', (event) => {
    const button = event.target.closest('[data-mode]');
    if (button) app.setTransformMode(button.dataset.mode);
  });
  document.getElementById('chk-uniform').addEventListener('change', (event) => {
    app.setUniformScale(event.target.checked);
  });

  bindAxisSlider('x');
  bindAxisSlider('y');
  bindAxisSlider('z');

  function bindAxisSlider(axis) {
    const slider = document.getElementById(`slider-${axis}`);
    slider.addEventListener('input', () => {
      const mode = app.transformMode;
      if (mode === 'translate') app.setSelectedPosition(axis, slider.value);
      else if (mode === 'rotate') app.setSelectedRotation(axis, slider.value);
      else app.setSelectedScale(axis, slider.value);
    });
    slider.addEventListener('change', () => app.commit());
  }

  document.getElementById('input-color').addEventListener('input', (event) => {
    app.setColor(event.target.value);
  });
  document.getElementById('input-color').addEventListener('change', () => app.commit());
  document.getElementById('slider-light-int').addEventListener('input', (event) => {
    app.setLightIntensity(event.target.value);
  });
  document.getElementById('slider-light-int').addEventListener('change', () => app.commit());
  document.getElementById('btn-duplicate').addEventListener('click', () => app.duplicateSelected());
  document.getElementById('btn-delete').addEventListener('click', () => app.removeSelected());

  document.getElementById('select-joint').addEventListener('change', (event) => {
    app.setCurrentJoint(event.target.value);
  });
  ['x', 'y', 'z'].forEach((axis) => {
    const slider = document.getElementById(`joint-${axis}`);
    slider.addEventListener('input', () => app.setJointAxis(axis, slider.value));
    slider.addEventListener('change', () => app.commit());
  });

  document.getElementById('chk-through').addEventListener('change', (event) => {
    app.setThroughShot(event.target.checked);
  });
  document.getElementById('chk-guides').addEventListener('change', (event) => {
    app.setGuides(event.target.checked);
  });
  const focal = document.getElementById('slider-focal');
  focal.addEventListener('input', () => app.setFocalLength(focal.value, { skipCommit: true }));
  focal.addEventListener('change', () => app.commit());
  const camY = document.getElementById('slider-cam-y');
  camY.addEventListener('input', () => app.setShotHeight(camY.value, { skipCommit: true }));
  camY.addEventListener('change', () => app.commit());
  const targetY = document.getElementById('slider-target-y');
  targetY.addEventListener('input', () => app.setTargetHeight(targetY.value, { skipCommit: true }));
  targetY.addEventListener('change', () => app.commit());
  document.getElementById('btn-save-shot').addEventListener('click', () => {
    const shot = app.saveShot();
    toast(`${shot.name} gespeichert`);
  });

  document.getElementById('chk-shadows').addEventListener('change', (event) => {
    app.setShadows(event.target.checked);
  });
  document.getElementById('slider-az').addEventListener('input', (event) => {
    app.setSun({ azimuth: Number(event.target.value) }, { skipCommit: true });
  });
  document.getElementById('slider-el').addEventListener('input', (event) => {
    app.setSun({ elevation: Number(event.target.value) }, { skipCommit: true });
  });
  document.getElementById('slider-sun-int').addEventListener('input', (event) => {
    app.setSun({ intensity: Number(event.target.value) }, { skipCommit: true });
  });
  ['slider-az', 'slider-el', 'slider-sun-int'].forEach((id) => {
    document.getElementById(id).addEventListener('change', () => app.commit());
  });
  document.getElementById('input-sun-color').addEventListener('input', (event) => {
    app.setSun({ color: event.target.value }, { skipCommit: true });
  });
  document.getElementById('input-sun-color').addEventListener('change', () => app.commit());
  document.getElementById('slider-amb-int').addEventListener('input', (event) => {
    app.setAmbient({ intensity: Number(event.target.value) }, { skipCommit: true });
  });
  document.getElementById('slider-amb-int').addEventListener('change', () => app.commit());
  document.getElementById('input-amb-color').addEventListener('input', (event) => {
    app.setAmbient({ color: event.target.value }, { skipCommit: true });
  });
  document.getElementById('input-amb-color').addEventListener('change', () => app.commit());
  document.getElementById('btn-add-point').addEventListener('click', () => {
    app.insert('pointlight');
    showTab('edit');
  });
  document.getElementById('btn-add-spot').addEventListener('click', () => {
    app.insert('spotlight');
    showTab('edit');
  });

  document.getElementById('btn-parse').addEventListener('click', () => {
    const text = document.getElementById('input-prompt').value.trim();
    if (!text) {
      toast('Bitte eine Szenenbeschreibung eingeben');
      return;
    }
    const plan = app.parse(text);
    toast(plan.summary);
  });

  let exportMode = 'color';
  document.getElementById('export-modes').addEventListener('click', (event) => {
    const button = event.target.closest('[data-mode]');
    if (!button) return;
    exportMode = button.dataset.mode;
    document.querySelectorAll('#export-modes [data-mode]').forEach((node) => {
      node.classList.toggle('active', node === button);
    });
  });

  async function runExport(share) {
    try {
      toast('Bild wird erzeugt …');
      const result = await app.exportPNG({
        mode: exportMode,
        longEdge: Number(document.getElementById('export-res').value),
        share
      });
      if (!share && result.blob) {
        const { downloadBlob } = await import('./export.js');
        const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        downloadBlob(result.blob, `buehne-${exportMode}-${stamp}.png`);
      }
      if (result.action !== 'aborted') toast('Bild exportiert');
    } catch (error) {
      console.error(error);
      toast('Export fehlgeschlagen');
    }
  }

  document.getElementById('btn-share-png').addEventListener('click', () => runExport(true));
  document.getElementById('btn-download-png').addEventListener('click', () => runExport(false));
  document.getElementById('btn-export-json').addEventListener('click', () => app.exportJSON(true));
  document.getElementById('btn-import-json').addEventListener('click', () => {
    document.getElementById('file-json').click();
  });
  document.getElementById('file-json').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const result = await app.loadJSONFile(file);
    toast(result.ok ? 'Szene geladen' : result.error);
  });

  function format(value, digits = 2) {
    const number = Number(value);
    return Number.isFinite(number) ? number.toFixed(digits) : '0';
  }

  function toast(message) {
    els.toast.hidden = false;
    els.toast.textContent = message;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { els.toast.hidden = true; }, 2600);
  }

  function sync(vm) {
    document.getElementById('btn-undo').disabled = !vm.canUndo;
    document.getElementById('btn-redo').disabled = !vm.canRedo;
    document.getElementById('chk-room').checked = vm.room;
    document.getElementById('chk-through').checked = vm.throughShot;
    document.getElementById('chk-guides').checked = vm.showGuides;
    document.getElementById('chk-shadows').checked = vm.lights.shadows;
    document.getElementById('chk-uniform').checked = vm.uniformScale;

    const empty = document.getElementById('edit-empty');
    const form = document.getElementById('edit-form');
    empty.hidden = Boolean(vm.selected);
    form.hidden = !vm.selected;

    if (vm.selected) {
      document.getElementById('edit-name').textContent = vm.selected.name;
      document.querySelectorAll('#transform-modes [data-mode]').forEach((button) => {
        button.classList.toggle('active', button.dataset.mode === vm.transformMode);
      });
      const mode = vm.transformMode;
      const ranges = mode === 'translate'
        ? { min: -8, max: 8, step: 0.05, source: vm.selected.position, suffix: '' }
        : mode === 'rotate'
          ? { min: -180, max: 180, step: 1, source: vm.selected.rotation, suffix: '°' }
          : { min: 0.1, max: 4, step: 0.05, source: vm.selected.scale, suffix: '' };
      ['x', 'y', 'z'].forEach((axis) => {
        const slider = document.getElementById(`slider-${axis}`);
        if (document.activeElement !== slider) {
          slider.min = ranges.min;
          slider.max = ranges.max;
          slider.step = ranges.step;
          slider.value = ranges.source[axis];
        }
        const digits = mode === 'rotate' ? 0 : 2;
        document.getElementById(`val-${axis}`).textContent = `${format(slider.value, digits)}${ranges.suffix}`;
      });
      const color = document.getElementById('input-color');
      if (document.activeElement !== color) color.value = vm.selected.color;
      document.getElementById('light-item-section').hidden = vm.selected.lightIntensity == null;
      if (vm.selected.lightIntensity != null) {
        const slider = document.getElementById('slider-light-int');
        if (document.activeElement !== slider) slider.value = vm.selected.lightIntensity;
        document.getElementById('val-light-int').textContent = format(slider.value);
      }
      const poseSection = document.getElementById('pose-section');
      poseSection.hidden = vm.selected.kind !== 'figure';
      if (vm.selected.kind === 'figure') {
        document.querySelectorAll('#pose-grid [data-pose]').forEach((button) => {
          button.classList.toggle('active', button.dataset.pose === vm.selected.pose);
        });
        if (document.activeElement !== els.jointSelect) els.jointSelect.value = vm.selected.currentJoint;
        ['x', 'y', 'z'].forEach((axis, index) => {
          const slider = document.getElementById(`joint-${axis}`);
          if (document.activeElement !== slider) slider.value = vm.selected.joint[index];
          document.getElementById(`val-joint-${axis}`).textContent = format(slider.value, 0);
        });
      }
    }

    const focalSlider = document.getElementById('slider-focal');
    if (document.activeElement !== focalSlider) focalSlider.value = vm.focalLength;
    document.getElementById('val-focal').textContent = `${Math.round(Number(focalSlider.value))} mm`;
    document.querySelectorAll('#aspect-grid [data-aspect]').forEach((button) => {
      button.classList.toggle('active', button.dataset.aspect === vm.aspect);
    });
    const camYSlider = document.getElementById('slider-cam-y');
    if (document.activeElement !== camYSlider) camYSlider.value = vm.shotHeight;
    document.getElementById('val-cam-y').textContent = format(camYSlider.value);
    const targetSlider = document.getElementById('slider-target-y');
    if (document.activeElement !== targetSlider) targetSlider.value = vm.targetHeight;
    document.getElementById('val-target-y').textContent = format(targetSlider.value);

    const shotList = document.getElementById('shot-list');
    const shotSignature = vm.shots.map((shot) => `${shot.id}|${shot.name}|${shot.focalLength}|${shot.aspect}`).join(';');
    if (shotList.dataset.signature !== shotSignature) {
      shotList.dataset.signature = shotSignature;
      shotList.innerHTML = '';
      vm.shots.forEach((shot) => {
        const row = document.createElement('div');
        row.className = 'shot-item';
        const load = document.createElement('button');
        load.className = 'grow';
        load.textContent = `${shot.name} · ${Math.round(shot.focalLength)} mm · ${shot.aspect}`;
        load.addEventListener('click', () => app.recallShot(shot.id));
        const overwrite = document.createElement('button');
        overwrite.textContent = 'Akt.';
        overwrite.addEventListener('click', () => app.overwriteShot(shot.id));
        const remove = document.createElement('button');
        remove.textContent = '×';
        remove.addEventListener('click', () => app.deleteShot(shot.id));
        row.append(load, overwrite, remove);
        shotList.appendChild(row);
      });
    }

    document.querySelectorAll('#light-presets [data-preset]').forEach((button) => {
      button.classList.toggle('active', button.dataset.preset === vm.currentLightPreset);
    });
    const mapping = [
      ['slider-az', 'val-az', vm.lights.sun.azimuth, 0],
      ['slider-el', 'val-el', vm.lights.sun.elevation, 0],
      ['slider-sun-int', 'val-sun-int', vm.lights.sun.intensity, 2],
      ['slider-amb-int', 'val-amb-int', vm.lights.ambient.intensity, 2]
    ];
    mapping.forEach(([id, valId, value, digits]) => {
      const slider = document.getElementById(id);
      if (document.activeElement !== slider) slider.value = value;
      document.getElementById(valId).textContent = format(slider.value, digits);
    });
    const sunColor = document.getElementById('input-sun-color');
    if (document.activeElement !== sunColor) sunColor.value = vm.lights.sun.color;
    const ambColor = document.getElementById('input-amb-color');
    if (document.activeElement !== ambColor) ambColor.value = vm.lights.ambient.color;

    const summary = document.getElementById('parse-summary');
    if (vm.lastParse && summary) {
      summary.hidden = false;
      summary.textContent = `Erkannt: ${vm.lastParse.summary}`;
    }
    const storageHint = document.getElementById('storage-hint');
    if (storageHint) {
      storageHint.hidden = !vm.storageError;
      if (vm.storageError) storageHint.textContent = vm.storageError;
    }
  }

  app.onChange(sync);
  sync(app.getViewModel());
  showTab('insert');
  return { showTab, toast };
}
