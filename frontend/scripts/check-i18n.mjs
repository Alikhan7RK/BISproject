// Checks the translation files before a build:
//   1. en.json, ru.json and kk.json are valid JSON
//   2. all three have exactly the same keys (nested keys are compared as "section.key")
//   3. no translation is empty
// Run: npm run check:i18n   (also runs automatically before `npm run build`)
// Exit code 1 = something is wrong, the build stops.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const LANGS = ['en', 'ru', 'kk'];
const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'i18n');

/** { a: { b: 'x' } } -> { 'a.b': 'x' } */
function flatten(obj, prefix = '', out = {}) {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object') flatten(value, path, out);
    else out[path] = value;
  }
  return out;
}

const errors = [];
const keys = {};

for (const lang of LANGS) {
  const file = join(DIR, `${lang}.json`);
  try {
    const flat = flatten(JSON.parse(readFileSync(file, 'utf8')));
    keys[lang] = new Set(Object.keys(flat));
    for (const [key, value] of Object.entries(flat)) {
      if (typeof value !== 'string' || !value.trim()) errors.push(`${lang}.json: "${key}" is empty or not text`);
    }
  } catch (err) {
    errors.push(`${lang}.json: invalid JSON - ${err.message}`);
  }
}

// Compare every file with en.json (the reference language)
if (keys.en) {
  for (const lang of LANGS.filter((l) => l !== 'en' && keys[l])) {
    const missing = [...keys.en].filter((k) => !keys[lang].has(k));
    const extra = [...keys[lang]].filter((k) => !keys.en.has(k));
    if (missing.length) errors.push(`${lang}.json is missing: ${missing.join(', ')}`);
    if (extra.length) errors.push(`${lang}.json has keys that en.json does not: ${extra.join(', ')}`);
  }
}

if (errors.length) {
  console.error('i18n check FAILED:\n  ' + errors.join('\n  '));
  process.exit(1);
}
console.log(`i18n check OK: ${LANGS.join(', ')} have the same ${keys.en.size} keys`);
