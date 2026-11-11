import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';

export const DEFAULT_SKY = {
  hour: 13,
  moonPhase: 'vollmond',
  clouds: 'klar',
  weather: 'klar'
};

export const SKY_TIME_PRESETS = [
  { id: 'sonnenaufgang', label: 'Sonnenaufgang', hour: 6.4 },
  { id: 'blaue_stunde', label: 'Blaue Stunde', hour: 20.6 },
  { id: 'mittag', label: 'Mittag', hour: 13 },
  { id: 'daemmerung', label: 'Dämmerung', hour: 19.15 },
  { id: 'nacht', label: 'Nacht', hour: 22.6 }
];

export const MOON_PHASES = [
  { id: 'vollmond', label: 'Vollmond', factor: 1 },
  { id: 'halbmond', label: 'Halbmond', factor: 0.55 },
  { id: 'sichel', label: 'Sichel', factor: 0.22 }
];

export const CLOUD_PRESETS = [
  { id: 'klar', label: 'Klar', coverage: 0.06, density: 0.12 },
  { id: 'bewoelkt', label: 'Bewölkt', coverage: 0.42, density: 0.45 },
  { id: 'bedeckt', label: 'Bedeckt', coverage: 0.78, density: 0.72 },
  { id: 'gewitter', label: 'Gewitter', coverage: 0.9, density: 0.88 }
];

export const WEATHER_PRESETS = [
  { id: 'klar', label: 'Klar' },
  { id: 'nebel', label: 'Nebel' },
  { id: 'regen', label: 'Regen' },
  { id: 'schnee', label: 'Schnee' }
];

const CLOUD_MAP = Object.fromEntries(CLOUD_PRESETS.map((entry) => [entry.id, entry]));
const PHASE_MAP = Object.fromEntries(MOON_PHASES.map((entry) => [entry.id, entry]));

export function sunFromHour(hour) {
  const h = ((Number(hour) % 24) + 24) % 24;
  const sunrise = 6.05;
  const sunset = 18.45;
  let elevation;
  let azimuth;
  if (h >= sunrise && h <= sunset) {
    const t = (h - sunrise) / (sunset - sunrise);
    elevation = Math.sin(t * Math.PI) * 63;
    azimuth = 82 + t * 196;
  } else {
    const mid = h < sunrise ? h + 24 : h;
    const t = (mid - sunset) / (sunrise + 24 - sunset);
    elevation = -Math.sin(t * Math.PI) * 40;
    azimuth = (278 + t * 164) % 360;
  }
  return { hour: h, azimuth, elevation };
}

export function presetFromHour(hour) {
  const h = ((Number(hour) % 24) + 24) % 24;
  if (h >= 5 && h < 9) return 'morgen';
  if (h >= 9 && h < 16.5) return 'mittag';
  if (h >= 16.5 && h < 20.4) return 'abend';
  return 'nacht';
}

export function lightingFromSky(state, elevation) {
  const clouds = CLOUD_MAP[state.clouds] || CLOUD_MAP.klar;
  const phase = PHASE_MAP[state.moonPhase] || PHASE_MAP.vollmond;
  const dim = state.clouds === 'klar' ? 1 : state.clouds === 'bewoelkt' ? 0.72 : state.clouds === 'bedeckt' ? 0.42 : 0.28;
  let sunIntensity;
  let sunColor;
  let ambIntensity;
  let ambColor;
  let fogColor;
  let exposure = 1.05;

  if (elevation >= 38) {
    sunIntensity = 1.85 * dim;
    sunColor = '#fff6e6';
    ambIntensity = 0.56;
    ambColor = '#d5deea';
    fogColor = '#b9c6d6';
    exposure = 0.94;
  } else if (elevation >= 10) {
    sunIntensity = 1.55 * dim;
    sunColor = '#ffe2b8';
    ambIntensity = 0.42;
    ambColor = '#c9c2b4';
    fogColor = '#c4b39a';
    exposure = 1.04;
  } else if (elevation >= 0) {
    sunIntensity = 1.15 * dim;
    sunColor = '#ff8038';
    ambIntensity = 0.3;
    ambColor = '#e8a078';
    fogColor = '#d88862';
    exposure = 0.98;
  } else if (elevation > -7) {
    sunIntensity = 0.08;
    sunColor = '#6a82c8';
    ambIntensity = 0.16;
    ambColor = '#3a4a78';
    fogColor = '#1a2440';
    exposure = 0.82;
  } else {
    sunIntensity = 0.04;
    sunColor = '#1a2240';
    ambIntensity = 0.1;
    ambColor = '#1c2744';
    fogColor = '#0c1018';
    exposure = 0.76;
  }

  if (state.weather === 'nebel') {
    ambIntensity *= 0.85;
    fogColor = elevation < 0 ? '#1c2230' : '#c8cdd4';
  } else if (state.weather === 'regen' || state.clouds === 'gewitter') {
    ambIntensity *= 0.75;
    sunIntensity *= 0.65;
    fogColor = elevation < 0 ? '#141820' : '#8a94a0';
  } else if (state.weather === 'schnee') {
    ambColor = elevation < 0 ? '#2a3448' : '#e4eaf2';
    fogColor = elevation < 0 ? '#1a2230' : '#d5dde8';
  }

  let fogNear = 80;
  let fogFar = 260;
  if (state.weather === 'nebel') {
    fogNear = 3.5;
    fogFar = 20;
  } else if (state.weather === 'regen') {
    fogNear = 16;
    fogFar = 70;
  } else if (state.weather === 'schnee') {
    fogNear = 14;
    fogFar = 64;
  } else if (state.clouds === 'bedeckt' || state.clouds === 'gewitter') {
    fogNear = 28;
    fogFar = 120;
  }
  if (elevation < 0) {
    fogNear *= 0.55;
    fogFar *= 0.62;
  }

  return {
    sun: { intensity: sunIntensity, color: sunColor },
    ambient: { intensity: ambIntensity, color: ambColor },
    moon: {
      intensity: elevation < 4 ? 0.34 * phase.factor : 0.02,
      color: '#c5d4f0',
      factor: phase.factor
    },
    fogColor,
    fogNear,
    fogFar,
    exposure,
    clouds
  };
}

function directionFromAzEl(azimuth, elevation, distance) {
  const az = THREE.MathUtils.degToRad(azimuth);
  const el = THREE.MathUtils.degToRad(elevation);
  return new THREE.Vector3(
    Math.sin(az) * Math.cos(el) * distance,
    Math.sin(el) * distance,
    Math.cos(az) * Math.cos(el) * distance
  );
}

export class Atmosphere {
  constructor(scene) {
    this.scene = scene;
    this.state = { ...DEFAULT_SKY };
    this.enclosed = false;

    this.sky = new Sky();
    this.sky.scale.setScalar(800);
    this.sky.material.depthWrite = false;
    this.sky.material.fog = false;
    scene.add(this.sky);

    this.moonGroup = new THREE.Group();
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xe8eef8, fog: false });
    this.moonBall = new THREE.Mesh(new THREE.SphereGeometry(11, 24, 18), moonMat);
    this.moonShade = new THREE.Mesh(
      new THREE.SphereGeometry(11.2, 24, 18),
      new THREE.MeshBasicMaterial({ color: 0x07080c, fog: false })
    );
    this.moonGroup.add(this.moonBall, this.moonShade);
    scene.add(this.moonGroup);

    const starGeo = new THREE.BufferGeometry();
    const starCount = 700;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i += 1) {
      const el = 0.08 + Math.random() * 1.15;
      const az = Math.random() * Math.PI * 2;
      const r = 340;
      starPos[i * 3] = Math.cos(az) * Math.cos(el) * r;
      starPos[i * 3 + 1] = Math.sin(el) * r;
      starPos[i * 3 + 2] = Math.sin(az) * Math.cos(el) * r;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    this.stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({
        color: 0xdce6ff,
        size: 1.45,
        sizeAttenuation: false,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        fog: false
      })
    );
    scene.add(this.stars);

    this.flashLight = new THREE.AmbientLight(0xddeeff, 0);
    scene.add(this.flashLight);

    this.precip = this._makePrecip();
    scene.add(this.precip.rain, this.precip.snow);
    this._flash = 0;
  }

  _makePrecip() {
    const make = (count, color, size) => {
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(count * 3);
      for (let i = 0; i < count; i += 1) {
        pos[i * 3] = (Math.random() - 0.5) * 36;
        pos[i * 3 + 1] = Math.random() * 16;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 36;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const points = new THREE.Points(
        geo,
        new THREE.PointsMaterial({
          color,
          size,
          transparent: true,
          opacity: 0.72,
          depthWrite: false
        })
      );
      points.visible = false;
      return points;
    };
    return {
      rain: make(360, 0x9ab4c8, 0.08),
      snow: make(240, 0xf2f6ff, 0.14)
    };
  }

  setEnclosed(flag) {
    this.enclosed = Boolean(flag);
    this.sky.visible = !this.enclosed;
    if (this.enclosed) {
      this.moonGroup.visible = false;
      this.stars.visible = false;
      this.precip.rain.visible = false;
      this.precip.snow.visible = false;
    }
  }

  apply(skyState, azimuth, elevation, options = {}) {
    this.state = { ...this.state, ...skyState };
    const info = lightingFromSky(this.state, elevation);
    const sunPos = directionFromAzEl(azimuth, elevation, 1);
    const uniforms = this.sky.material.uniforms;
    uniforms.sunPosition.value.copy(sunPos);
    uniforms.turbidity.value = elevation < 0 ? 1.4 : elevation > 40 ? 2.6 : this.state.clouds === 'gewitter' ? 12 : 5 + info.clouds.coverage * 7;
    uniforms.rayleigh.value = elevation < 0 ? 0.22 : elevation < 8 ? 1.1 : elevation > 40 ? 1.8 : 2.2;
    uniforms.mieCoefficient.value = this.state.clouds === 'klar' ? 0.004 : 0.007;
    uniforms.mieDirectionalG.value = 0.78;
    uniforms.cloudCoverage.value = info.clouds.coverage;
    uniforms.cloudDensity.value = info.clouds.density;
    uniforms.showSunDisc.value = elevation > -1 ? 1 : 0;

    const moonEl = -elevation;
    const moonAz = (azimuth + 180) % 360;
    this.moonGroup.position.copy(directionFromAzEl(moonAz, moonEl, 220));
    const phase = this.state.moonPhase;
    this.moonShade.visible = phase !== 'vollmond';
    if (phase === 'halbmond') this.moonShade.position.set(8.2, 0, 0);
    else if (phase === 'sichel') this.moonShade.position.set(3.4, 0.5, 0);
    else this.moonShade.position.set(0, 0, 0);
    this.moonGroup.lookAt(this.moonGroup.position.clone().add(sunPos));
    this.moonGroup.visible = !this.enclosed && moonEl > -6;

    this.stars.visible = !this.enclosed && elevation < 8;
    this.stars.material.opacity = THREE.MathUtils.clamp((6 - elevation) / 10, 0, 0.92);

    if (this.scene.fog && this.scene.fog.isFog) {
      let near = info.fogNear;
      let far = info.fogFar;
      let fogHex = info.fogColor;
      if (this.enclosed) {
        near = 2.4;
        far = 14;
        fogHex = '#0d0c0b';
      } else if (options.environmentId === 'wald' && this.state.weather === 'nebel') {
        near = 3;
        far = 16;
      }
      this.scene.fog.color.set(fogHex);
      this.scene.fog.near = near;
      this.scene.fog.far = far;
    }

    this.precip.rain.visible = !this.enclosed && this.state.weather === 'regen';
    this.precip.snow.visible = !this.enclosed && this.state.weather === 'schnee';

    return {
      ...info,
      moonAzimuth: moonAz,
      moonElevation: moonEl
    };
  }

  tick(dt) {
    const uniforms = this.sky.material.uniforms;
    if (uniforms.time) uniforms.time.value += dt;
    this._movePrecip(this.precip.rain, dt * 14, 0);
    this._movePrecip(this.precip.snow, dt * 2.4, dt * 0.7);
    if (this.state.clouds === 'gewitter' && !this.enclosed) {
      if (this._flash <= 0 && Math.random() < dt * 0.35) this._flash = 0.09 + Math.random() * 0.08;
      if (this._flash > 0) {
        this.flashLight.intensity = 1.7;
        this._flash -= dt;
      } else {
        this.flashLight.intensity = 0;
      }
    } else {
      this.flashLight.intensity = 0;
    }
  }

  _movePrecip(points, fall, drift) {
    if (!points.visible) return;
    const pos = points.geometry.attributes.position;
    for (let i = 0; i < pos.count; i += 1) {
      let y = pos.getY(i) - fall;
      let x = pos.getX(i) + drift;
      if (y < 0) {
        y = 12 + Math.random() * 6;
        x = (Math.random() - 0.5) * 36;
        pos.setZ(i, (Math.random() - 0.5) * 36);
      }
      if (x > 18) x = -18;
      pos.setY(i, y);
      pos.setX(i, x);
    }
    pos.needsUpdate = true;
  }
}
