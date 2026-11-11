import { ASPECTS, LIGHT_PRESETS, POSE_KEYS } from './config.js';
import {
  ASPECT_ENTRIES,
  CLAUSE_SEPARATORS,
  FOCAL_LENGTH_INFO,
  FORMATION_ENTRIES,
  LIGHT_ENTRIES,
  NEGATION_WORDS,
  NUMBER_ENTRIES,
  OBJECT_ENTRIES,
  PERSON_ENTRIES,
  POSE_ENTRIES,
  POSITION_ENTRIES,
  ROOM_ENTRIES,
  SHOT_ENTRIES,
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

function findCount(words, pluralDefault) {
  for (const word of words) {
    const n = parseCountToken(word);
    if (n != null) return n;
  }
  return pluralDefault ? 2 : 1;
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

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (!PERSON_WORDS.has(token)) continue;
    if (hasNegationBefore(tokens, i)) continue;
    const count = findCount(tokens, PERSON_PLURAL.has(token) || token === 'leute');
    const pose = detectPose(tokens) || 'stehen';
    const position = findPosition(tokens) || { key: 'mitte', x: 0, z: 0 };
    for (let n = 0; n < Math.min(count, 8); n += 1) {
      figures.push({ pose: POSE_KEYS.includes(pose) ? pose : 'stehen', position });
    }
  }

  for (let i = 0; i < tokens.length; i += 1) {
    const objectType = OBJECT_WORDS[tokens[i]];
    if (!objectType || usedObjectIndexes.has(i)) continue;
    if (hasNegationBefore(tokens, i)) continue;
    const plural = tokens[i].endsWith('e') || tokens[i].endsWith('en') || tokens[i].endsWith('s');
    const count = findCount(tokens, plural && tokens.every((word) => parseCountToken(word) == null));
    const position = findPosition(tokens) || { key: 'mitte', x: 0, z: 0 };
    objects.push({ type: objectType, count, position });
    usedObjectIndexes.add(i);
  }

  return { figures, objects };
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

  const camera = {
    shotSize,
    focalLength: explicitFocal || (shotSize ? SHOT_FOCAL[shotSize] : null),
    aspect: aspect && ASPECTS[aspect] ? aspect : null
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
    summary: parts.length ? parts.join(' · ') : 'Keine Szene-Elemente erkannt'
  };
}

export { formatVocabularyMarkdown, getVocabulary, normalize };
