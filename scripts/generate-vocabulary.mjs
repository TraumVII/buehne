import { writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { formatVocabularyMarkdown } from '../js/parser.js';

const target = resolve(dirname(fileURLToPath(import.meta.url)), '../VOCABULARY.md');
writeFileSync(target, formatVocabularyMarkdown());
console.log(`Wrote ${target}`);
