import { LIGHT_PRESETS, TYPE_LABELS } from './config.js';

export function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[.:;!?/\\|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function phraseRegex(words) {
  const parts = words.map((word) => escapeRegex(normalize(word)).replace(/\s+/g, '\\s+'));
  return new RegExp(`(?:${parts.join('|')})`);
}

export const NUMBER_ENTRIES = [
  { value: 1, words: ['ein', 'eine', 'einer', 'eines', 'einem', 'einen', 'eins'] },
  { value: 2, words: ['zwei', 'paar'] },
  { value: 3, words: ['drei'] },
  { value: 4, words: ['vier'] },
  { value: 5, words: ['fünf'] },
  { value: 6, words: ['sechs'] },
  { value: 7, words: ['sieben'] },
  { value: 8, words: ['acht'] },
  { value: 9, words: ['neun'] },
  { value: 10, words: ['zehn'] }
];

export const PERSON_ENTRIES = [
  { word: 'Person', plural: false },
  { word: 'Personen', plural: true },
  { word: 'Figur', plural: false },
  { word: 'Figuren', plural: true },
  { word: 'Mensch', plural: false },
  { word: 'Menschen', plural: true },
  { word: 'Leute', plural: true },
  { word: 'Leuten', plural: true },
  { word: 'Mann', plural: false },
  { word: 'Männer', plural: true },
  { word: 'Frau', plural: false },
  { word: 'Frauen', plural: true },
  { word: 'Darsteller', plural: false },
  { word: 'Schauspieler', plural: false },
  { word: 'jemand', plural: false }
];

export const OBJECT_ENTRIES = [
  { type: 'table', words: ['Tisch', 'Tische'] },
  { type: 'chair', words: ['Stuhl', 'Stühle'], match: ['stuehl'] },
  { type: 'door', words: ['Tür', 'Türen'] },
  { type: 'window', words: ['Fenster'] },
  { type: 'tree', words: ['Baum', 'Bäume'] },
  { type: 'car', words: ['Auto', 'Autos', 'Wagen'] },
  { type: 'cube', words: ['Würfel', 'Box', 'Kiste'] },
  { type: 'sphere', words: ['Kugel', 'Kugeln', 'Ball'] },
  { type: 'cylinder', words: ['Zylinder'] },
  { type: 'cone', words: ['Kegel'] },
  { type: 'plane', words: ['Ebene', 'Platte', 'Bodenplatte'] }
];

export const POSE_ENTRIES = [
  { pose: 'stehen', words: ['stehen', 'steht', 'stehend', 'stand'] },
  { pose: 'gehen', words: ['gehen', 'geht', 'gehend', 'laufen', 'läuft'] },
  { pose: 'sitzen', words: ['sitzen', 'sitzt', 'sitzend'] },
  { pose: 'zeigen', words: ['zeigen', 'zeigt', 'zeigend', 'deuten', 'deutet'] },
  { pose: 'kniend', words: ['knien', 'kniet', 'kniend', 'knieend'] },
  { pose: 'liegend', words: ['liegen', 'liegt', 'liegend'] }
];

export const POSITION_ENTRIES = [
  { key: 'links', x: -1.85, z: 0, words: ['links', 'linke', 'linker', 'linkes'] },
  { key: 'rechts', x: 1.85, z: 0, words: ['rechts', 'rechte', 'rechter', 'rechtes'] },
  { key: 'vorne', x: 0, z: 1.75, words: ['vorne', 'vorn', 'vor', 'Vordergrund'] },
  { key: 'hinten', x: 0, z: -1.75, words: ['hinten', 'hinter', 'Hintergrund'] },
  { key: 'mitte', x: 0, z: 0, words: ['Mitte', 'zentral', 'Zentrum'] }
];

export const SHOT_ENTRIES = [
  { size: 'weit', mm: 24, words: ['Weitwinkel', 'weit', 'total', 'totals', 'overview'] },
  { size: 'amerikanisch', mm: 35, words: ['amerikanisch', 'amerikanische'] },
  { size: 'halbnah', mm: 50, words: ['halbnah', 'halbnahe', 'medium', 'halbnaheinstellung'] },
  { size: 'nah', mm: 85, words: ['nah', 'nahe', 'Nahaufnahme', 'Portrait', 'Porträt', 'Closeup'] },
  { size: 'detail', mm: 135, words: ['Detail', 'Detailaufnahme', 'close'] }
];

export const FOCAL_LENGTH_INFO = {
  syntax: 'Zahl von 14 bis 200, direkt oder mit Leerzeichen vor „mm“',
  examples: ['85 mm', '85mm', '35 mm', '50mm'],
  pattern: String.raw`\b(\d{2,3})\s*mm\b`,
  min: 14,
  max: 200
};

export const LIGHT_ENTRIES = [
  { key: 'abend', words: ['Abendlicht', 'Abend', 'Sonnenuntergang', 'golden hour', 'goldene Stunde', 'Dämmerung'] },
  { key: 'morgen', words: ['Sonnenaufgang', 'Morgenlicht', 'morgens', 'früh', 'Morgen'] },
  { key: 'nacht', words: ['Nacht', 'nächt', 'Mond', 'dunkel', 'nachts'] },
  { key: 'studio', words: ['Studio', 'Studiolicht'] },
  { key: 'mittag', words: ['Mittag', 'Mittagssonne', 'Tageslicht', 'sonnig', 'heller Tag'] }
];

export const ROOM_ENTRIES = [
  { room: false, words: ['ohne Raum', 'kein Raum', 'draußen', 'außen', 'open air'] },
  { room: true, words: ['im Raum', 'Innenraum', 'Zimmer', 'innen', 'Wände'] }
];

export const ASPECT_ENTRIES = [
  { aspect: '9:16', words: ['9 zu 16', '9 16', 'Hochformat', 'hochkant', 'Portraitformat'] },
  { aspect: '2.39:1', words: ['2 39', 'Cinemascope', 'Scope', 'Kinoformat', 'Breitwand'] },
  { aspect: '1:1', words: ['1 zu 1', 'Quadrat', 'quadratisch'] },
  { aspect: '4:3', words: ['4 zu 3', '4 3'] },
  { aspect: '16:9', words: ['16 zu 9', '16 9', 'Querformat', 'landscape'] }
];

export const FORMATION_ENTRIES = [
  { key: 'gegenueber', words: ['gegenüber', 'vis-a-vis', 'einander', 'sich gegen', 'face to face'] },
  { key: 'reihe', words: ['nebeneinander', 'neben einander', 'in einer Reihe', 'nebeneinan'] },
  { key: 'kreis', words: ['Kreis', 'im Rund'], minCount: 3 }
];

export const NEGATION_WORDS = ['kein', 'keine', 'keinen', 'keinem', 'keiner', 'keines', 'ohne', 'nicht'];

export const CLAUSE_SEPARATORS = {
  punctuation: [','],
  words: ['und', 'sowie'],
  otherPerson: ['eine andere', 'ein anderer', 'ein anderes']
};

export const EXAMPLE_SENTENCES = [
  'zwei Personen und ein Tisch',
  'ein Tisch links, ein Stuhl rechts',
  'eine Person sitzt links, eine andere steht rechts',
  'eine Person und kein Auto',
  'eine Person ohne Auto',
  'Kamera 85 mm',
  '85mm',
  'zwei Personen stehen sich gegenüber, links ein Tisch, Kamera halbnah, Abendlicht'
];

export function getVocabulary() {
  return {
    sections: [
      {
        id: 'numbers',
        title: 'Zahlwörter',
        words: [...NUMBER_ENTRIES.flatMap((entry) => entry.words), 'Ziffern 1 bis 12']
      },
      {
        id: 'persons',
        title: 'Personen',
        words: PERSON_ENTRIES.map((entry) => entry.word)
      },
      {
        id: 'objects',
        title: 'Objekte',
        groups: OBJECT_ENTRIES.map((entry) => ({
          label: TYPE_LABELS[entry.type] || entry.type,
          words: entry.words
        }))
      },
      {
        id: 'poses',
        title: 'Posen',
        groups: POSE_ENTRIES.map((entry) => ({
          label: entry.pose,
          words: entry.words
        }))
      },
      {
        id: 'positions',
        title: 'Richtungen und Positionen',
        groups: POSITION_ENTRIES.map((entry) => ({
          label: entry.key,
          words: entry.words
        }))
      },
      {
        id: 'formations',
        title: 'Anordnung',
        groups: FORMATION_ENTRIES.map((entry) => ({
          label: entry.key === 'gegenueber' ? 'gegenüber' : entry.key,
          words: entry.words
        }))
      },
      {
        id: 'shots',
        title: 'Einstellungsgrößen',
        groups: SHOT_ENTRIES.map((entry) => ({
          label: `${entry.size} (${entry.mm} mm)`,
          words: entry.words
        }))
      },
      {
        id: 'focal',
        title: 'Brennweiten',
        note: FOCAL_LENGTH_INFO.syntax,
        words: FOCAL_LENGTH_INFO.examples
      },
      {
        id: 'aspects',
        title: 'Seitenverhältnis',
        groups: ASPECT_ENTRIES.map((entry) => ({
          label: entry.aspect,
          words: entry.words
        }))
      },
      {
        id: 'lights',
        title: 'Licht und Tageszeit',
        groups: LIGHT_ENTRIES.map((entry) => ({
          label: LIGHT_PRESETS[entry.key]?.label || entry.key,
          words: entry.words
        }))
      },
      {
        id: 'room',
        title: 'Raum',
        groups: ROOM_ENTRIES.map((entry) => ({
          label: entry.room ? 'Raum an' : 'Raum aus',
          words: entry.words
        }))
      },
      {
        id: 'negation',
        title: 'Verneinung',
        words: [...NEGATION_WORDS]
      },
      {
        id: 'separators',
        title: 'Satzteil-Trenner',
        words: ['Komma (,)', ...CLAUSE_SEPARATORS.words, ...CLAUSE_SEPARATORS.otherPerson]
      },
      {
        id: 'examples',
        title: 'Beispielsätze',
        sentences: [...EXAMPLE_SENTENCES]
      }
    ]
  };
}

export function formatVocabularyMarkdown() {
  const catalog = getVocabulary();
  const lines = [
    '# Wortschatz von Bühne',
    '',
    'Diese Liste wird aus denselben Parser-Daten erzeugt, die die App zum Verstehen von Szenenbeschreibungen nutzt.',
    ''
  ];
  catalog.sections.forEach((section) => {
    lines.push(`## ${section.title}`, '');
    if (section.note) {
      lines.push(section.note, '');
    }
    if (section.groups) {
      section.groups.forEach((group) => {
        lines.push(`- **${group.label}:** ${group.words.join(', ')}`);
      });
      lines.push('');
    }
    if (section.words) {
      lines.push(section.words.join(', '), '');
    }
    if (section.sentences) {
      section.sentences.forEach((sentence) => {
        lines.push(`- ${sentence}`);
      });
      lines.push('');
    }
  });
  return lines.join('\n');
}
