import { ASPECTS, LIGHT_PRESETS, POSE_KEYS } from './config.js';

const NUMBER_WORDS = {
  ein: 1, eine: 1, einer: 1, eines: 1, einem: 1, einen: 1, eins: 1,
  zwei: 2, drei: 3, vier: 4, fuenf: 5, sechs: 6, sieben: 7,
  acht: 8, neun: 9, zehn: 10, paar: 2
};

const OBJECT_WORDS = {
  tisch: 'table', tische: 'table',
  stuhl: 'chair', stuehle: 'chair', stuehl: 'chair',
  tuer: 'door', tueren: 'door',
  fenster: 'window',
  baum: 'tree', baeume: 'tree',
  auto: 'car', autos: 'car', wagen: 'car',
  wuerfel: 'cube', box: 'cube', kiste: 'cube',
  kugel: 'sphere', kugeln: 'sphere', ball: 'sphere',
  zylinder: 'cylinder',
  kegel: 'cone',
  ebene: 'plane', platte: 'plane', bodenplatte: 'plane'
};

const PERSON_WORDS = new Set([
  'person', 'personen', 'figur', 'figuren', 'mensch', 'menschen',
  'leute', 'mann', 'maenner', 'frau', 'frauen', 'darsteller',
  'schauspieler', 'jemand', 'leuten'
]);

const PERSON_PLURAL = new Set([
  'personen', 'figuren', 'menschen', 'leute', 'leuten', 'maenner', 'frauen'
]);

const POSE_WORDS = {
  stehen: 'stehen', steht: 'stehen', stehend: 'stehen', stand: 'stehen',
  gehen: 'gehen', geht: 'gehen', gehend: 'gehen', laufen: 'gehen', laeuft: 'gehen',
  sitzen: 'sitzen', sitzt: 'sitzen', sitzend: 'sitzen',
  zeigen: 'zeigen', zeigt: 'zeigen', zeigend: 'zeigen', deuten: 'zeigen', deutet: 'zeigen',
  knien: 'kniend', kniet: 'kniend', kniend: 'kniend', knieend: 'kniend',
  liegen: 'liegend', liegt: 'liegend', liegend: 'liegend'
};

const SHOT_WORDS = {
  weitwinkel: 'weit', weit: 'weit', total: 'weit', totals: 'weit', overview: 'weit',
  amerikanisch: 'amerikanisch', amerikanische: 'amerikanisch',
  halbnah: 'halbnah', halbnahe: 'halbnah', medium: 'halbnah', halbnaheinstellung: 'halbnah',
  nah: 'nah', nahe: 'nah', nahaufnahme: 'nah', portrait: 'nah', portraet: 'nah', closeup: 'nah',
  detail: 'detail', detailaufnahme: 'detail', close: 'detail'
};

const SHOT_FOCAL = {
  weit: 24,
  amerikanisch: 35,
  halbnah: 50,
  nah: 85,
  detail: 135
};

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[:.,;!?/\\|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(normalized) {
  return normalized.split(/[^a-z0-9]+/).filter(Boolean);
}

function parseCountToken(token) {
  if (NUMBER_WORDS[token] != null) return NUMBER_WORDS[token];
  if (/^\d+$/.test(token)) {
    const n = parseInt(token, 10);
    if (n >= 1 && n <= 12) return n;
  }
  return null;
}

function windowOf(tokens, index, before = 4, after = 3) {
  return tokens.slice(Math.max(0, index - before), Math.min(tokens.length, index + after + 1));
}

function findCount(words, pluralDefault) {
  for (const word of words) {
    const n = parseCountToken(word);
    if (n != null) return n;
  }
  return pluralDefault ? 2 : 1;
}

function findPosition(words) {
  const left = words.some((w) => w === 'links' || w === 'linke' || w === 'linker' || w === 'linkes');
  const right = words.some((w) => w === 'rechts' || w === 'rechte' || w === 'rechter' || w === 'rechtes');
  const front = words.some((w) => w === 'vorne' || w === 'vorn' || w === 'vor' || w === 'vordergrund');
  const back = words.some((w) => w === 'hinten' || w === 'hinter' || w === 'hintergrund');
  const mid = words.some((w) => w === 'mitte' || w === 'zentral' || w === 'zentrum');
  if (!left && !right && !front && !back && !mid) return null;
  let x = 0;
  let z = 0;
  const labels = [];
  if (left) { x = -1.85; labels.push('links'); }
  if (right) { x = 1.85; labels.push('rechts'); }
  if (front) { z = 1.75; labels.push('vorne'); }
  if (back) { z = -1.75; labels.push('hinten'); }
  if (mid && labels.length === 0) labels.push('mitte');
  return { key: labels.join(' ') || 'mitte', x, z };
}

function detectAspect(normalized) {
  if (/(9\s*zu\s*16|9\s*16|hochformat|hochkant|portraitformat)/.test(normalized)) return '9:16';
  if (/(2\s*39|cinemascope|scope|kinoformat|breitwand)/.test(normalized)) return '2.39:1';
  if (/(1\s*zu\s*1|quadrat|quadratisch)/.test(normalized)) return '1:1';
  if (/(4\s*zu\s*3|4\s*3)/.test(normalized)) return '4:3';
  if (/(16\s*zu\s*9|16\s*9|querformat|landscape)/.test(normalized)) return '16:9';
  return null;
}

function detectLight(normalized) {
  if (/(abendlicht|abend|sonnenuntergang|golden hour|goldene stunde|daemmerung)/.test(normalized)) return 'abend';
  if (/(sonnenaufgang|morgenlicht|morgens|frueh|morgen)/.test(normalized)) return 'morgen';
  if (/(nacht|nächt|naecht|mond|dunkel|nachts)/.test(normalized)) return 'nacht';
  if (/(studio|studiolicht)/.test(normalized)) return 'studio';
  if (/(mittag|mittagssonne|tageslicht|sonnig|heller tag)/.test(normalized)) return 'mittag';
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

function detectRoom(normalized) {
  if (/(ohne raum|kein raum|draussen|draußen|aussen|open air)/.test(normalized)) return false;
  if (/(im raum|innenraum|zimmer|innen|waende|wände)/.test(normalized)) return true;
  return null;
}

function detectFormation(normalized, count) {
  if (/(gegenueber|vis\-a\-vis|einander|sich gegen|face to face)/.test(normalized)) return 'gegenueber';
  if (/(nebeneinander|neben einander|in einer reihe|nebeneinan)/.test(normalized)) return 'reihe';
  if (count >= 3 && /kreis|im rund/.test(normalized)) return 'kreis';
  return count >= 2 ? 'reihe' : 'einzeln';
}

export function parseSceneText(text) {
  const original = String(text || '').trim();
  const normalized = normalize(original);
  const tokens = tokenize(normalized);

  let figureCount = 0;
  let mentionedPeople = false;
  const objects = [];

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    const nearby = windowOf(tokens, i);

    if (PERSON_WORDS.has(token)) {
      mentionedPeople = true;
      const n = findCount(nearby, PERSON_PLURAL.has(token) || token === 'leute');
      figureCount = Math.max(figureCount, n);
      continue;
    }

    const objectType = OBJECT_WORDS[token];
    if (objectType) {
      const plural = token.endsWith('e') || token.endsWith('en') || token.endsWith('s');
      const count = findCount(nearby, plural && !nearby.some((w) => parseCountToken(w) != null));
      const before = tokens.slice(Math.max(0, i - 4), i);
      const after = tokens.slice(i + 1, Math.min(tokens.length, i + 2));
      const position = findPosition(before) || findPosition(after) || { key: 'mitte', x: 0, z: 0 };
      objects.push({ type: objectType, count, position });
    }
  }

  if (!mentionedPeople && /(jemand|leute)/.test(normalized)) {
    mentionedPeople = true;
    figureCount = Math.max(figureCount, 2);
  }

  if (mentionedPeople && figureCount === 0) figureCount = 1;
  figureCount = Math.min(figureCount, 8);

  const pose = detectPose(tokens) || (mentionedPeople ? 'stehen' : null);
  const shotSize = detectShot(tokens, normalized);
  const aspect = detectAspect(normalized);
  const light = detectLight(normalized);
  const room = detectRoom(normalized);
  const formation = mentionedPeople ? detectFormation(normalized, figureCount) : 'einzeln';

  const camera = {
    shotSize,
    focalLength: shotSize ? SHOT_FOCAL[shotSize] : null,
    aspect: aspect && ASPECTS[aspect] ? aspect : null
  };

  const parts = [];
  if (figureCount) {
    const poseLabel = pose || 'stehen';
    parts.push(`${figureCount} Figur${figureCount === 1 ? '' : 'en'} (${poseLabel}${formation === 'gegenueber' ? ', gegenüber' : formation === 'reihe' ? ', nebeneinander' : ''})`);
  }
  for (const obj of objects) {
    parts.push(`${obj.count} ${obj.type}${obj.position.key !== 'mitte' ? ` ${obj.position.key}` : ''}`);
  }
  if (camera.focalLength) parts.push(`${camera.focalLength} mm${camera.shotSize ? ` (${camera.shotSize})` : ''}`);
  if (camera.aspect) parts.push(camera.aspect);
  if (light) parts.push(LIGHT_PRESETS[light]?.label || light);
  if (room === true) parts.push('Raum an');
  if (room === false) parts.push('Raum aus');

  return {
    original,
    figures: { count: figureCount, pose: pose && POSE_KEYS.includes(pose) ? pose : (figureCount ? 'stehen' : null), formation },
    objects,
    camera,
    light,
    room,
    summary: parts.length ? parts.join(' · ') : 'Keine Szene-Elemente erkannt'
  };
}

export { SHOT_FOCAL };
