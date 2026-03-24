/**
 * Unit tests for MuslimBusiness directory parser utilities.
 * Tests are written FIRST (TDD Red → Green → Refactor).
 *
 * These functions are pure (no network, no Supabase) and are exercised
 * via vitest with jsdom environment.
 *
 * Source: public directory at muslimbusiness.de/datenbank
 * Data is extracted from server-rendered card markup with consistent
 * labeled lines: Standorte, Branchen, Email, Telefon, Social Media.
 */

import { describe, it, expect } from 'vitest';
import {
  extractProviderCardsFromHtml,
  parseStandorte,
  parseBranchen,
  normalizeSocialMedia,
  normalizePhone,
  isPlaceholder,
  extractPrimaryCity,
} from '@/utils/muslimbusiness-parser';

// ---------------------------------------------------------------------------
// Fixtures — representative HTML fragments from muslimbusiness.de/datenbank
// ---------------------------------------------------------------------------

const SINGLE_CARD_HTML = `
<div class="card">
  <h3>Design Vision</h3>
  <p>Standorte: Werl, Online</p>
  <p>Branchen: Webdesign</p>
  <p>Email: designvision.kontakt@gmail.com</p>
  <p>Telefon: +4915567148637</p>
  <p>Social Media: </p>
</div>
`;

const MULTI_CARD_HTML = `
<div class="directory">
  <div class="card">
    <h3>HADRIES PACK</h3>
    <p>Standorte: Berlin, Kairo</p>
    <p>Branchen: Verpackungsindustrie, Logistik</p>
    <p>Email: e.zarinwall@hadriespack.com</p>
    <p>Telefon: 017662415764</p>
    <p>Social Media: hadries.pack</p>
  </div>
  <div class="card">
    <h3>Akhiracare</h3>
    <p>Standorte: Duisburg</p>
    <p>Branchen: Sterbebegleitung, Testamentvorsorge</p>
    <p>Email: info@akhiracare.com</p>
    <p>Telefon: 017624267575</p>
    <p>Social Media: @akhiracare</p>
  </div>
  <div class="card">
    <h3>Data Science</h3>
    <p>Standorte: Gelsenkirchen, Online</p>
    <p>Branchen: IT</p>
    <p>Email: mustafa.karakas@gmx.net</p>
    <p>Telefon: 017640490749</p>
    <p>Social Media: /</p>
  </div>
</div>
`;

const CARD_WITH_PLACEHOLDERS_HTML = `
<div class="card">
  <h3>LEVONOVA ENERGY GmbH</h3>
  <p>Standorte: Mönchengladbach, Viersen</p>
  <p>Branchen: Energielösungen, Gebäudetechnik</p>
  <p>Email: ls@levonova.energy</p>
  <p>Telefon: 01743741161</p>
  <p>Social Media: Nicht angegeben</p>
</div>
`;

const CARD_WITH_PROMO_HTML = `
<div class="card">
  <h3>DIIF Institut</h3>
  <p>Standorte: Bochum</p>
  <p>Branchen: Islamisches Finanzwesen, Vertragsprüfung, Zertifizierung</p>
  <p>Email: info@diif-institut.de</p>
  <p>Telefon: 01742004633</p>
  <p>Social Media: </p>
  <p>15%RABATT Für den Kurs</p>
</div>
`;

const CARD_WITH_INSTAGRAM_URL = `
<div class="card">
  <h3>Immo-Funnels</h3>
  <p>Standorte: Online</p>
  <p>Branchen: Immobilien</p>
  <p>Email: info@immo-funnels.de</p>
  <p>Telefon: 0176 70223015</p>
  <p>Social Media: https://www.instagram.com/immo_funnels/</p>
</div>
`;

const CARD_WITH_EMPTY_BRANCHEN = `
<div class="card">
  <h3>Kanzlei UYANIK</h3>
  <p>Standorte: Hamburg</p>
  <p>Branchen: </p>
  <p>Email: kontakt@kanzlei-uyanik.de</p>
  <p>Telefon: 04057308937</p>
  <p>Social Media: /</p>
</div>
`;

const CARD_WITH_PHONE_DASH = `
<div class="card">
  <h3>Deen Akademie</h3>
  <p>Standorte: Online</p>
  <p>Branchen: Bildung</p>
  <p>Email: support@deen-akademie.de</p>
  <p>Telefon: -</p>
  <p>Social Media: deen_akademie</p>
</div>
`;

const CARD_WITH_PHONE_NOT_SPECIFIED = `
<div class="card">
  <h3>Noorthehouseofabaya</h3>
  <p>Standorte: Online</p>
  <p>Branchen: Schmuck, Mode</p>
  <p>Email: info@noorthehouseofabaya.com</p>
  <p>Telefon: Nicht angegeben</p>
  <p>Social Media: noorthehouseofabaya</p>
</div>
`;

const CARD_WITH_INSTAGRAM_PREFIX = `
<div class="card">
  <h3>Click Click Design</h3>
  <p>Standorte: Emmendingen, Online</p>
  <p>Branchen: Werbetechnik, Design</p>
  <p>Email: info@clickclick.design</p>
  <p>Telefon: +49 1577 0 887 877</p>
  <p>Social Media: Instagram: @clickclick.design</p>
</div>
`;

const CARD_WITH_MULTI_LOCATIONS = `
<div class="card">
  <h3>Moon Event</h3>
  <p>Standorte: Hannover, Berlin, Hamburg, Bremen, NRW, Kassel, Braunschweig</p>
  <p>Branchen: Eventmanagement, Marketing, Kommunikation</p>
  <p>Email: mooneventofficial@outlook.de</p>
  <p>Social Media: Mooneventofficial</p>
</div>
`;

const CARD_WITH_EMPTY_STANDORTE = `
<div class="card">
  <h3>LiKa Consulting GmbH</h3>
  <p>Standorte: </p>
  <p>Branchen: Personalmarketing, Recruiting</p>
  <p>Email: e.kara@lika-consulting.de</p>
  <p>Telefon: 015155587531</p>
  <p>Social Media: Nicht angegeben</p>
</div>
`;

const CARD_WITH_LINKEDIN_SOCIAL = `
<div class="card">
  <h3>Dialog und Lösung</h3>
  <p>Standorte: Frankfurt</p>
  <p>Branchen: Coaching, Kommunikation, Konfliktlösung</p>
  <p>Email: info@dialogundloesung.de</p>
  <p>Telefon: +49 160 6927798</p>
  <p>Social Media: www.linkedin.com/in/awalter-dl</p>
</div>
`;

// ---------------------------------------------------------------------------
// extractProviderCardsFromHtml
// ---------------------------------------------------------------------------

describe('extractProviderCardsFromHtml', () => {
  it('extracts a single provider card from HTML', () => {
    const cards = extractProviderCardsFromHtml(SINGLE_CARD_HTML);
    expect(cards).toHaveLength(1);
    expect(cards[0].name).toBe('Design Vision');
  });

  it('extracts multiple provider cards from directory HTML', () => {
    const cards = extractProviderCardsFromHtml(MULTI_CARD_HTML);
    expect(cards).toHaveLength(3);
    expect(cards[0].name).toBe('HADRIES PACK');
    expect(cards[1].name).toBe('Akhiracare');
    expect(cards[2].name).toBe('Data Science');
  });

  it('extracts Standorte field correctly', () => {
    const cards = extractProviderCardsFromHtml(SINGLE_CARD_HTML);
    expect(cards[0].standorte).toBe('Werl, Online');
  });

  it('extracts Branchen field correctly', () => {
    const cards = extractProviderCardsFromHtml(MULTI_CARD_HTML);
    expect(cards[0].branchen).toBe('Verpackungsindustrie, Logistik');
  });

  it('extracts Email field correctly', () => {
    const cards = extractProviderCardsFromHtml(SINGLE_CARD_HTML);
    expect(cards[0].email).toBe('designvision.kontakt@gmail.com');
  });

  it('extracts Telefon field correctly', () => {
    const cards = extractProviderCardsFromHtml(SINGLE_CARD_HTML);
    expect(cards[0].telefon).toBe('+4915567148637');
  });

  it('extracts Social Media field correctly', () => {
    const cards = extractProviderCardsFromHtml(MULTI_CARD_HTML);
    expect(cards[0].socialMedia).toBe('hadries.pack');
    expect(cards[1].socialMedia).toBe('@akhiracare');
  });

  it('handles empty Social Media field', () => {
    const cards = extractProviderCardsFromHtml(SINGLE_CARD_HTML);
    expect(cards[0].socialMedia).toBe('');
  });

  it('returns empty array for HTML with no cards', () => {
    const cards = extractProviderCardsFromHtml('<html><body>No cards here</body></html>');
    expect(cards).toEqual([]);
  });

  it('handles cards with empty Branchen', () => {
    const cards = extractProviderCardsFromHtml(CARD_WITH_EMPTY_BRANCHEN);
    expect(cards[0].branchen).toBe('');
  });

  it('handles cards with empty Standorte', () => {
    const cards = extractProviderCardsFromHtml(CARD_WITH_EMPTY_STANDORTE);
    expect(cards[0].standorte).toBe('');
  });

  it('handles cards missing Telefon line', () => {
    const cards = extractProviderCardsFromHtml(CARD_WITH_MULTI_LOCATIONS);
    expect(cards[0].telefon).toBe('');
  });

  it('extracts card with placeholder social media ("Nicht angegeben")', () => {
    const cards = extractProviderCardsFromHtml(CARD_WITH_PLACEHOLDERS_HTML);
    expect(cards[0].name).toBe('LEVONOVA ENERGY GmbH');
    expect(cards[0].socialMedia).toBe('Nicht angegeben');
  });

  it('does not bleed promo text into Social Media value', () => {
    const cards = extractProviderCardsFromHtml(CARD_WITH_PROMO_HTML);
    expect(cards[0].name).toBe('DIIF Institut');
    expect(cards[0].socialMedia).toBe('');
  });

  it('extracts Instagram URL in social media field', () => {
    const cards = extractProviderCardsFromHtml(CARD_WITH_INSTAGRAM_URL);
    expect(cards[0].socialMedia).toBe('https://www.instagram.com/immo_funnels/');
  });

  it('extracts phone dash placeholder correctly', () => {
    const cards = extractProviderCardsFromHtml(CARD_WITH_PHONE_DASH);
    expect(cards[0].telefon).toBe('-');
  });

  it('extracts phone "Nicht angegeben" correctly', () => {
    const cards = extractProviderCardsFromHtml(CARD_WITH_PHONE_NOT_SPECIFIED);
    expect(cards[0].telefon).toBe('Nicht angegeben');
  });

  it('extracts "Instagram: @handle" format', () => {
    const cards = extractProviderCardsFromHtml(CARD_WITH_INSTAGRAM_PREFIX);
    expect(cards[0].socialMedia).toBe('Instagram: @clickclick.design');
  });

  it('extracts LinkedIn URL in social media field', () => {
    const cards = extractProviderCardsFromHtml(CARD_WITH_LINKEDIN_SOCIAL);
    expect(cards[0].socialMedia).toBe('www.linkedin.com/in/awalter-dl');
  });
});

// ---------------------------------------------------------------------------
// parseStandorte
// ---------------------------------------------------------------------------

describe('parseStandorte', () => {
  it('parses single city', () => {
    expect(parseStandorte('Duisburg')).toEqual(['Duisburg']);
  });

  it('parses comma-separated cities', () => {
    expect(parseStandorte('Berlin, Kairo')).toEqual(['Berlin', 'Kairo']);
  });

  it('preserves "Online" as a location', () => {
    expect(parseStandorte('Werl, Online')).toEqual(['Werl', 'Online']);
  });

  it('preserves "Deutschlandweit" as a location', () => {
    expect(parseStandorte('Deutschlandweit, Hamburg')).toEqual(['Deutschlandweit', 'Hamburg']);
  });

  it('trims whitespace from each location', () => {
    expect(parseStandorte(' Hannover , Berlin ')).toEqual(['Hannover', 'Berlin']);
  });

  it('returns empty array for empty string', () => {
    expect(parseStandorte('')).toEqual([]);
  });

  it('filters out empty entries from trailing commas', () => {
    expect(parseStandorte('Berlin, , ')).toEqual(['Berlin']);
  });

  it('handles multi-word cities', () => {
    expect(parseStandorte('Frankfurt Am Main')).toEqual(['Frankfurt Am Main']);
  });

  it('handles region names like NRW', () => {
    expect(parseStandorte('Dortmund, NRW, Niedersachsen, Unna')).toEqual([
      'Dortmund', 'NRW', 'Niedersachsen', 'Unna',
    ]);
  });
});

// ---------------------------------------------------------------------------
// parseBranchen
// ---------------------------------------------------------------------------

describe('parseBranchen', () => {
  it('parses single Branche', () => {
    expect(parseBranchen('IT')).toEqual(['IT']);
  });

  it('parses comma-separated Branchen', () => {
    expect(parseBranchen('Verpackungsindustrie, Logistik')).toEqual([
      'Verpackungsindustrie', 'Logistik',
    ]);
  });

  it('trims whitespace from each Branche', () => {
    expect(parseBranchen(' Coaching , Beratung ')).toEqual(['Coaching', 'Beratung']);
  });

  it('returns empty array for empty string', () => {
    expect(parseBranchen('')).toEqual([]);
  });

  it('filters out empty entries', () => {
    expect(parseBranchen('IT, , ')).toEqual(['IT']);
  });

  it('handles Branchen with special characters', () => {
    expect(parseBranchen('Gesundheits- und Sozialwesen')).toEqual([
      'Gesundheits- und Sozialwesen',
    ]);
  });

  it('handles space-padded Branchen from source', () => {
    expect(parseBranchen('Dokumentenorganisation , Übersetzung, KI, Büroservice, Buchhaltung')).toEqual([
      'Dokumentenorganisation', 'Übersetzung', 'KI', 'Büroservice', 'Buchhaltung',
    ]);
  });
});

// ---------------------------------------------------------------------------
// isPlaceholder
// ---------------------------------------------------------------------------

describe('isPlaceholder', () => {
  it('detects dash as placeholder', () => {
    expect(isPlaceholder('-')).toBe(true);
  });

  it('detects slash as placeholder', () => {
    expect(isPlaceholder('/')).toBe(true);
  });

  it('detects "Nicht angegeben" as placeholder', () => {
    expect(isPlaceholder('Nicht angegeben')).toBe(true);
  });

  it('detects "N.a" as placeholder', () => {
    expect(isPlaceholder('N.a')).toBe(true);
  });

  it('detects empty string as placeholder', () => {
    expect(isPlaceholder('')).toBe(true);
  });

  it('detects whitespace-only as placeholder', () => {
    expect(isPlaceholder('   ')).toBe(true);
  });

  it('does NOT detect real value as placeholder', () => {
    expect(isPlaceholder('info@example.com')).toBe(false);
  });

  it('does NOT detect handle as placeholder', () => {
    expect(isPlaceholder('@myhandle')).toBe(false);
  });

  it('is case-insensitive for "nicht angegeben"', () => {
    expect(isPlaceholder('nicht angegeben')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// normalizeSocialMedia
// ---------------------------------------------------------------------------

describe('normalizeSocialMedia', () => {
  it('returns null for placeholder dash', () => {
    expect(normalizeSocialMedia('-')).toBeNull();
  });

  it('returns null for placeholder slash', () => {
    expect(normalizeSocialMedia('/')).toBeNull();
  });

  it('returns null for "Nicht angegeben"', () => {
    expect(normalizeSocialMedia('Nicht angegeben')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(normalizeSocialMedia('')).toBeNull();
  });

  it('strips leading @ from handle', () => {
    expect(normalizeSocialMedia('@akhiracare')).toBe('akhiracare');
  });

  it('preserves handle without @', () => {
    expect(normalizeSocialMedia('hadries.pack')).toBe('hadries.pack');
  });

  it('extracts Instagram URL as-is', () => {
    expect(normalizeSocialMedia('https://www.instagram.com/immo_funnels/')).toBe(
      'https://www.instagram.com/immo_funnels/'
    );
  });

  it('strips "Instagram: " prefix and leading @', () => {
    expect(normalizeSocialMedia('Instagram: @clickclick.design')).toBe('clickclick.design');
  });

  it('returns LinkedIn URL as-is', () => {
    expect(normalizeSocialMedia('www.linkedin.com/in/awalter-dl')).toBe(
      'www.linkedin.com/in/awalter-dl'
    );
  });

  it('trims whitespace', () => {
    expect(normalizeSocialMedia('  myhandle  ')).toBe('myhandle');
  });

  it('returns null for "N.a"', () => {
    expect(normalizeSocialMedia('N.a')).toBeNull();
  });

  it('handles trailing slash in handle', () => {
    expect(normalizeSocialMedia('@e.b.nature/')).toBe('e.b.nature');
  });
});

// ---------------------------------------------------------------------------
// normalizePhone
// ---------------------------------------------------------------------------

describe('normalizePhone', () => {
  it('returns null for placeholder dash', () => {
    expect(normalizePhone('-')).toBeNull();
  });

  it('returns null for placeholder slash', () => {
    expect(normalizePhone('/')).toBeNull();
  });

  it('returns null for "Nicht angegeben"', () => {
    expect(normalizePhone('Nicht angegeben')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(normalizePhone('')).toBeNull();
  });

  it('preserves valid phone with international prefix', () => {
    expect(normalizePhone('+4915567148637')).toBe('+4915567148637');
  });

  it('preserves phone without prefix', () => {
    expect(normalizePhone('017662415764')).toBe('017662415764');
  });

  it('preserves phone with spaces', () => {
    expect(normalizePhone('0176 70223015')).toBe('0176 70223015');
  });

  it('preserves phone with +49 prefix and spaces', () => {
    expect(normalizePhone('+49 1577 0 887 877')).toBe('+49 1577 0 887 877');
  });

  it('preserves phone with slash separator', () => {
    expect(normalizePhone('030/98528751')).toBe('030/98528751');
  });

  it('trims whitespace from phone', () => {
    expect(normalizePhone('  01234567  ')).toBe('01234567');
  });
});

// ---------------------------------------------------------------------------
// extractPrimaryCity
// ---------------------------------------------------------------------------

describe('extractPrimaryCity', () => {
  it('returns first city from list', () => {
    expect(extractPrimaryCity(['Berlin', 'Kairo'])).toBe('Berlin');
  });

  it('skips "Online" and returns first real city', () => {
    expect(extractPrimaryCity(['Online', 'Bremen'])).toBe('Bremen');
  });

  it('skips "Deutschlandweit" and returns first real city', () => {
    expect(extractPrimaryCity(['Deutschlandweit', 'Hamburg'])).toBe('Hamburg');
  });

  it('returns null when only non-city values exist', () => {
    expect(extractPrimaryCity(['Online'])).toBeNull();
  });

  it('returns null for empty array', () => {
    expect(extractPrimaryCity([])).toBeNull();
  });

  it('returns first city even with "Deutschlandweit" present', () => {
    expect(extractPrimaryCity(['Dortmund', 'Deutschlandweit'])).toBe('Dortmund');
  });

  it('returns null when only "Deutschlandweit" present', () => {
    expect(extractPrimaryCity(['Deutschlandweit'])).toBeNull();
  });

  it('handles region names as valid locations', () => {
    expect(extractPrimaryCity(['NRW'])).toBe('NRW');
  });
});
