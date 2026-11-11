import { ASPECTS, LIGHT_PRESETS, POSE_KEYS } from './config.js';
import {
  ASPECT_ENTRIES,
  CAMERA_HEIGHT_ENTRIES,
  CLAUSE_SEPARATORS,
  CLOUD_ENTRIES,
  ENVIRONMENT_ENTRIES,
  FOCAL_LENGTH_INFO,
  FORMATION_ENTRIES,
  LIGHT_ENTRIES,
  MOON_PHASE_ENTRIES,
  NEGATION_WORDS,
  NUMBER_ENTRIES,
  OBJECT_ENTRIES,
  PERSON_ENTRIES,
  POSE_ENTRIES,
  POSITION_ENTRIES,
  ROOM_ENTRIES,
  SHOT_ENTRIES,
  SIZE_ENTRIES,
  SKY_TIME_ENTRIES,
  SUPPORT_ENTRIES,
  TIME_OF_DAY_INFO,
  WEATHER_ENTRIES,
  formatVocabularyMarkdown,
  getVocabulary,
  normalize,
  phraseRegex
} from './lexicon.js';

const NUMBER_WORDS = {};
NUMBER_ENTRIES.forEach((entry) => {
  entry.words.forEach((word) => {
    NUMBER_WORDS[normalize(word)] = entry.value;
  });
});

const OBJECT_WORDS = {};
OBJECT_ENTRIES.forEach((entry) => {
  [...entry.words, ...(entry.match || [])].forEach((word) => {
    OBJECT_WORDS[normalize(word)] = entry.type;
  });
});

const PERSON_WORDS = new Set(PERSON_ENTRIES.map((entry) => normalize(entry.word)));
const PERSON_PLURAL = new Set(
  PERSON_ENTRIES.filter((entry) => entry.plural).map((entry) => normalize(entry.word))
);
const NEGATION = new Set(NEGATION_WORDS.map((word) => normalize(word)));

const POSE_WORDS = {};
POSE_ENTRIES.forEach((entry) => {
  entry.words.forEach((word) => {
    POSE_WORDS[normalize(word)] = entry.pose;
  });
});

const SHOT_WORDS = {};
export const SHOT_FOCAL = {};
SHOT_ENTRIES.forEach((entry) => {
  SHOT_FOCAL[entry.size] = entry.mm;
  entry.words.forEach((word) => {
    SHOT_WORDS[normalize(word)] = entry.size;
  });
});

const FOCAL_PATTERN = new RegExp(FOCAL_LENGTH_INFO.pattern);
const TIME_PATTERN = new RegExp(TIME_OF_DAY_INFO.pattern);
const SIZE_WORDS = {};
SIZE_ENTRIES.forEach((entry) => {
  entry.words.forEach((word) => {
    SIZE_WORDS[normalize(word)] = entry.scale;
  });
});
const METER_WORDS = new Set(['meter', 'metern', 'm']);
const HEIGHT_FOLLOW = new Set(['hoch', 'hoher', 'hohe', 'hohes', 'gross', 'grosse', 'grosser', 'grosses', 'hoehe']);

function tokenize(normalized) {
  return normalized.split(/[^a-z0-9]+/).filter(Boolean);
}

function splitClauses(normalized) {
  let text = normalized;
  CLAUSE_SEPARATORS.otherPerson.forEach((phrase) => {
    const pattern = new RegExp(`\\b${normalize(phrase)}\\b`, 'g');
    text = text.replace(pattern, '||| eine person');
  });
  CLAUSE_SEPARATORS.words.forEach((word) => {
    if (word === 'und') {
      text = text.replace(/\s+und\s+/g, '|||');
    } else {
      text = text.replace(new RegExp(`\\b${normalize(word)}\\b`, 'g'), '|||');
    }
  });
  return text
    .split(/,|\|\|\|/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseCountToken(token) {
  if (NUMBER_WORDS[token] != null) return NUMBER_WORDS[token];
  if (/^\d+$/.test(token)) {
    const n = parseInt(token, 10);
    if (n >= 1 && n <= 12) return n;
  }
  return null;
}

function findCount(words, pluralDefault, skip = new Set()) {
  for (let i = 0; i < words.length; i += 1) {
    if (skip.has(i)) continue;
    const n = parseCountToken(words[i]);
    if (n != null) return n;
  }
  return pluralDefault ? 2 : 1;
}

function parseMeasureNumber(token) {
  if (NUMBER_WORDS[token] != null) return NUMBER_WORDS[token];
  const glued = /^(\d+(?:[.,]\d+)?)m$/.exec(token);
  if (glued) return parseFloat(glued[1].replace(',', '.'));
  if (/^\d+(?:[.,]\d+)?$/.test(token)) {
    const n = parseFloat(token.replace(',', '.'));
    if (n >= 0.2 && n <= 200) return n;
  }
  return null;
}

function extractMeasures(tokens) {
  const skip = new Set();
  let heightMeters = null;
  for (let i = 0; i < tokens.length; i += 1) {
    const glued = /^(\d+(?:[.,]\d+)?)m$/.exec(tokens[i]);
    if (glued) {
      heightMeters = parseFloat(glued[1].replace(',', '.'));
      skip.add(i);
      if (HEIGHT_FOLLOW.has(tokens[i + 1])) skip.add(i + 1);
      continue;
    }
    const n = parseMeasureNumber(tokens[i]);
    if (n == null) continue;
    if (!METER_WORDS.has(tokens[i + 1])) continue;
    heightMeters = n;
    skip.add(i);
    skip.add(i + 1);
    if (HEIGHT_FOLLOW.has(tokens[i + 2])) skip.add(i + 2);
  }
  return { heightMeters, skip };
}

function detectSizeScale(tokens) {
  for (const token of tokens) {
    if (SIZE_WORDS[token] != null) return SIZE_WORDS[token];
  }
  return null;
}

function detectFirst(entries, normalized) {
  for (const entry of entries) {
    if (phraseRegex(entry.words).test(normalized)) return entry;
  }
  return null;
}

function detectEnvironment(normalized) {
  return detectFirst(ENVIRONMENT_ENTRIES, normalized)?.id || null;
}

function detectSkyTime(normalized) {
  return detectFirst(SKY_TIME_ENTRIES, normalized) || null;
}

function detectClouds(normalized) {
  return detectFirst(CLOUD_ENTRIES, normalized)?.id || null;
}

function detectWeather(normalized) {
  return detectFirst(WEATHER_ENTRIES, normalized)?.id || null;
}

function detectMoonPhase(normalized) {
  return detectFirst(MOON_PHASE_ENTRIES, normalized)?.id || null;
}

function detectSupport(normalized) {
  if (!/\bauf\b/.test(normalized)) return null;
  return detectFirst(SUPPORT_ENTRIES, normalized);
}

function detectClockHour(normalized) {
  const match = normalized.match(TIME_PATTERN);
  if (!match) return null;
  let hour = parseInt(match[1], 10);
  const minutes = match[2] != null ? parseInt(match[2], 10) : 0;
  if (hour > 24 || minutes > 59) return null;
  if (hour === 24) hour = 0;
  return hour + minutes / 60;
}

function detectCameraHeight(normalized) {
  const style = detectFirst(CAMERA_HEIGHT_ENTRIES, normalized);
  const camMeasure = normalized.match(/\b(?:kamera|drohne)\b[\s\S]{0,28}?(\d{1,3}(?:[.,]\d+)?)\s*(?:m|meter|metern)\b/);
  const hoehe = normalized.match(/\b(?:auf|in)\s+(\d{1,3}(?:[.,]\d+)?)\s*(?:m|meter|metern)\s+(?:hoehe|hoch)\b/);
  let meters = null;
  if (camMeasure) meters = parseFloat(camMeasure[1].replace(',', '.'));
  else if (hoehe) meters = parseFloat(hoehe[1].replace(',', '.'));
  if (style && meters == null) meters = style.heightMeters;
  if (meters == null) return style ? { heightMeters: style.heightMeters, style: style.id } : null;
  return { heightMeters: meters, style: style?.id || 'custom' };
}

function findPosition(words) {
  const set = new Set(words);
  let x = 0;
  let z = 0;
  const labels = [];
  let found = false;
  POSITION_ENTRIES.forEach((entry) => {
    if (!entry.words.some((word) => set.has(normalize(word)))) return;
    found = true;
    if (entry.key === 'mitte') {
      if (labels.length === 0) labels.push(entry.key);
      return;
    }
    if (entry.x) x = entry.x;
    if (entry.z) z = entry.z;
    labels.push(entry.key);
  });
  if (!found) return null;
  return { key: labels.join(' ') || 'mitte', x, z };
}

function hasNegationBefore(tokens, index) {
  return tokens.slice(0, index).some((token) => NEGATION.has(token));
}

function detectAspect(normalized) {
  for (const entry of ASPECT_ENTRIES) {
    if (phraseRegex(entry.words).test(normalized)) return entry.aspect;
  }
  return null;
}

function detectLight(normalized) {
  for (const entry of LIGHT_ENTRIES) {
    if (phraseRegex(entry.words).test(normalized)) return entry.key;
  }
  return null;
}

function detectPose(tokens) {
  for (const token of tokens) {
    if (POSE_WORDS[token]) return POSE_WORDS[token];
  }
  return null;
}

function detectShot(tokens, normalized) {
  for (const token of tokens) {
    if (SHOT_WORDS[token]) return SHOT_WORDS[token];
  }
  if (/einstellung/.test(normalized) && /weit/.test(normalized)) return 'weit';
  return null;
}

function detectFocalLength(normalized) {
  const match = normalized.match(FOCAL_PATTERN);
  if (!match) return null;
  const value = parseInt(match[1], 10);
  return value >= FOCAL_LENGTH_INFO.min && value <= FOCAL_LENGTH_INFO.max ? value : null;
}

function detectRoom(normalized) {
  for (const entry of ROOM_ENTRIES) {
    if (phraseRegex(entry.words).test(normalized)) return entry.room;
  }
  return null;
}

function detectFormation(normalized, count) {
  for (const entry of FORMATION_ENTRIES) {
    if (entry.minCount && count < entry.minCount) continue;
    if (phraseRegex(entry.words).test(normalized)) return entry.key;
  }
  return count >= 2 ? 'reihe' : 'einzeln';
}

function parseClause(clause) {
  const tokens = tokenize(clause);
  const figures = [];
  const objects = [];
  const usedObjectIndexes = new Set();
  const measures = extractMeasures(tokens);
  const sizeScale = detectSizeScale(tokens);
  const support = detectSupport(clause);

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (!PERSON_WORDS.has(token)) continue;
    if (hasNegationBefore(tokens, i)) continue;
    const count = findCount(tokens, PERSON_PLURAL.has(token) || token === 'leute', measures.skip);
    const pose = detectPose(tokens) || 'stehen';
    const position = findPosition(tokens) || { key: 'mitte', x: 0, z: 0 };
    for (let n = 0; n < Math.min(count, 8); n += 1) {
      figures.push({
        pose: POSE_KEYS.includes(pose) ? pose : 'stehen',
        position,
        sizeScale,
        heightMeters: measures.heightMeters,
        onTopOf: support?.type || null
      });
    }
  }

  for (let i = 0; i < tokens.length; i += 1) {
    const objectType = OBJECT_WORDS[tokens[i]];
    if (!objectType || usedObjectIndexes.has(i)) continue;
    if (hasNegationBefore(tokens, i)) continue;
    const plural = tokens[i].endsWith('e') || tokens[i].endsWith('en') || tokens[i].endsWith('s');
    const count = findCount(tokens, plural && tokens.every((word) => parseCountToken(word) == null), measures.skip);
    const position = findPosition(tokens) || { key: 'mitte', x: 0, z: 0 };
    objects.push({
      type: objectType,
      count,
      position,
      sizeScale,
      heightMeters: measures.heightMeters
    });
    usedObjectIndexes.add(i);
  }

  return { figures, objects, support };
}

export function parseSceneText(text) {
  const original = String(text || '').trim();
  const normalized = normalize(original);
  const tokens = tokenize(normalized);
  const clauses = splitClauses(normalized);

  const figureSpecs = [];
  const objects = [];
  clauses.forEach((clause) => {
    const parsed = parseClause(clause);
    figureSpecs.push(...parsed.figures);
    objects.push(...parsed.objects);
  });

  const figureCount = Math.min(figureSpecs.length, 8);
  const limitedSpecs = figureSpecs.slice(0, figureCount);
  const sharedPose = limitedSpecs[0]?.pose || null;
  const formation = figureCount ? detectFormation(normalized, figureCount) : 'einzeln';
  const shotSize = detectShot(tokens, normalized);
  const explicitFocal = detectFocalLength(normalized);
  const aspect = detectAspect(normalized);
  const light = detectLight(normalized);
  const room = detectRoom(normalized);
  const environment = detectEnvironment(normalized);
  const skyTime = detectSkyTime(normalized);
  const clockHour = detectClockHour(normalized);
  const clouds = detectClouds(normalized);
  const weather = detectWeather(normalized);
  const moonPhase = detectMoonPhase(normalized);
  const cameraHeight = detectCameraHeight(normalized);
  const sky = {};
  if (clockHour != null) sky.hour = clockHour;
  else if (skyTime) sky.hour = skyTime.hour;
  if (clouds) sky.clouds = clouds;
  if (weather) sky.weather = weather;
  if (moonPhase) sky.moonPhase = moonPhase;
  const hasSky = Object.keys(sky).length > 0;

  clauses.forEach((clause) => {
    const support = detectSupport(clause);
    if (!support) return;
    if (!objects.some((obj) => obj.type === support.type)) {
      objects.push({ type: support.type, count: 1, position: { key: 'mitte', x: 0, z: 0 }, asSupport: true });
    }
  });

  const camera = {
    shotSize,
    focalLength: explicitFocal || (shotSize ? SHOT_FOCAL[shotSize] : null),
    aspect: aspect && ASPECTS[aspect] ? aspect : null,
    heightMeters: cameraHeight?.heightMeters || null,
    heightStyle: cameraHeight?.style || null
  };

  const parts = [];
  if (figureCount) {
    const poseBits = limitedSpecs.map((spec) => {
      const where = spec.position.key !== 'mitte' ? ` ${spec.position.key}` : '';
      return `${spec.pose}${where}`;
    });
    const uniquePoses = [...new Set(poseBits)];
    parts.push(`${figureCount} Figur${figureCount === 1 ? '' : 'en'} (${uniquePoses.join(', ')}${formation === 'gegenueber' ? ', gegenüber' : ''})`);
  }
  for (const obj of objects) {
    parts.push(`${obj.count} ${obj.type}${obj.position.key !== 'mitte' ? ` ${obj.position.key}` : ''}`);
  }
  if (camera.focalLength) parts.push(`${camera.focalLength} mm${camera.shotSize && !explicitFocal ? ` (${camera.shotSize})` : ''}`);
  if (camera.aspect) parts.push(camera.aspect);
  if (light) parts.push(LIGHT_PRESETS[light]?.label || light);
  if (environment) parts.push(environment);
  if (hasSky && sky.hour != null) parts.push(`${sky.hour % 1 ? sky.hour.toFixed(1) : sky.hour} Uhr`);
  if (sky.clouds) parts.push(sky.clouds);
  if (sky.weather) parts.push(sky.weather);
  if (sky.moonPhase) parts.push(sky.moonPhase);
  if (camera.heightMeters != null) parts.push(`Kamera ${camera.heightMeters} m`);
  if (room === true) parts.push('Raum an');
  if (room === false) parts.push('Raum aus');

  return {
    original,
    figures: {
      count: figureCount,
      pose: sharedPose,
      formation,
      specs: limitedSpecs
    },
    objects,
    camera,
    light,
    room,
    environment,
    sky: hasSky ? sky : null,
    summary: parts.length ? parts.join(' · ') : 'Keine Szene-Elemente erkannt'
  };
}

export { formatVocabularyMarkdown, getVocabulary, normalize };
