/* global console */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const LOCALES = ['en', 'de', 'ar', 'tr', 'ur', 'ps'];

function flattenKeys(obj, prefix = '', out = []) {
  for (const [key, value] of Object.entries(obj)) {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flattenKeys(value, nextKey, out);
    } else {
      out.push(nextKey);
    }
  }
  return out;
}

function loadLocaleObject(translationsDir, locale) {
  const filePath = path.join(translationsDir, `${locale}.ts`);
  let source = fs.readFileSync(filePath, 'utf8');

  source = source.replace(new RegExp(`^\\s*export\\s+const\\s+${locale}\\s*=`), 'return');
  source = source.replace(/\}\s*as\s+const\s*;?\s*$/m, '}');

  return new Function(source)();
}

export function collectMissingKeys(localeData, canonicalLocale = 'en') {
  const canonical = localeData[canonicalLocale];
  if (!canonical) {
    throw new Error(`Canonical locale '${canonicalLocale}' not found in locale data.`);
  }

  const canonicalKeys = new Set(flattenKeys(canonical));
  const result = {};

  for (const [locale, data] of Object.entries(localeData)) {
    if (locale === canonicalLocale) {
      result[locale] = [];
      continue;
    }

    const localeKeys = new Set(flattenKeys(data));
    result[locale] = [...canonicalKeys].filter((key) => !localeKeys.has(key)).sort();
  }

  return result;
}

function readAllLocales(translationsDir) {
  return Object.fromEntries(LOCALES.map((locale) => [locale, loadLocaleObject(translationsDir, locale)]));
}

function printReport(missingByLocale) {
  let totalMissing = 0;

  for (const locale of LOCALES.filter((l) => l !== 'en')) {
    const missing = missingByLocale[locale] ?? [];
    totalMissing += missing.length;

    console.log(`\n[${locale}] missing keys: ${missing.length}`);
    if (missing.length === 0) {
      console.log('  - none');
      continue;
    }

    for (const key of missing) {
      console.log(`  - ${key}`);
    }
  }

  return totalMissing;
}

function main() {
  const repoRoot = process.cwd();
  const translationsDir = path.join(repoRoot, 'src', 'translations');

  if (!fs.existsSync(translationsDir)) {
    console.error(`Translations directory not found: ${translationsDir}`);
    process.exit(2);
  }

  const localeData = readAllLocales(translationsDir);
  const missingByLocale = collectMissingKeys(localeData, 'en');
  const totalMissing = printReport(missingByLocale);

  if (totalMissing > 0) {
    process.exit(1);
  }

  console.log('\nAll locale files are key-complete vs en.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { flattenKeys, loadLocaleObject };
