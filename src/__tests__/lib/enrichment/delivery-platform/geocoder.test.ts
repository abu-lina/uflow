import { describe, expect, it } from 'vitest';
import { StaticCityGeocoder } from '@/lib/enrichment/delivery-platform/geocoder';

describe('StaticCityGeocoder', () => {
  const geocoder = new StaticCityGeocoder();

  // ── Basic resolution ─────────────────────────────────────────────

  it('returns coords for known city', async () => {
    const result = await geocoder.geocode('Berlin');
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(52.52, 1);
    expect(result!.lon).toBeCloseTo(13.405, 1);
  });

  it('returns coords for München', async () => {
    const result = await geocoder.geocode('München');
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(48.135, 1);
  });

  it('returns coords for a city with special characters', async () => {
    const result = await geocoder.geocode('Köln');
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(50.9375, 1);
  });

  it('handles case-insensitive lookup', async () => {
    const result = await geocoder.geocode('hamburg');
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(53.5511, 1);
  });

  it('handles mixed case', async () => {
    const result = await geocoder.geocode('StUtTgArT');
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(48.7758, 1);
  });

  // ── Alias resolution ─────────────────────────────────────────────

  it('resolves alias "Frankfurt" → "Frankfurt am Main" coords', async () => {
    const result = await geocoder.geocode('Frankfurt');
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(50.1109, 1);
  });

  it('resolves alias case-insensitively', async () => {
    const result = await geocoder.geocode('frankfurt');
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(50.1109, 1);
  });

  it('handles dirty data with appended phone number', async () => {
    const result = await geocoder.geocode('Frankfurt am Main069 21001381');
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(50.1109, 1);
  });

  it('handles ALL CAPS alias', async () => {
    const result = await geocoder.geocode('LANGEN');
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(49.9915, 1);
  });

  // ── Null/edge cases ──────────────────────────────────────────────

  it('returns null for unknown city', async () => {
    const result = await geocoder.geocode('NonExistentCity');
    expect(result).toBeNull();
  });

  it('returns null for empty string', async () => {
    const result = await geocoder.geocode('');
    expect(result).toBeNull();
  });

  it('returns null for whitespace string', async () => {
    const result = await geocoder.geocode('   ');
    expect(result).toBeNull();
  });

  it('includes all provider dataset cities', async () => {
    // These cover all 83 unique cities from the provider dataset
    const allCities = [
      'Berlin', 'München', 'Frankfurt am Main', 'Stuttgart', 'Köln',
      'Mannheim', 'Augsburg', 'Hamburg', 'Dortmund', 'Nürnberg',
      'Düsseldorf', 'Bielefeld', 'Kassel', 'Offenbach am Main',
      'Bochum', 'Wiesbaden', 'Bremen', 'Hanau', 'Darmstadt',
      'Paderborn', 'Germering', 'Essen', 'Duisburg', 'Böblingen',
      'Hannover', 'Ingolstadt', 'Leipzig', 'Ludwigsburg', 'Wuppertal',
      'Hagen', 'Reutlingen', 'Ulm', 'Bonn', 'Leverkusen',
      'Mönchengladbach', 'Rostock', 'Gelsenkirchen', 'Aachen',
      'Münster', 'Oldenburg', 'Osnabrück', 'Heidelberg', 'Solingen',
      'Regensburg', 'Würzburg', 'Heilbronn', 'Karlsruhe', 'Dresden',
      'Krefeld', 'Mainz', 'Freiburg', 'Potsdam', 'Saarbrücken',
      'Braunschweig', 'Kiel', 'Chemnitz', 'Halle', 'Magdeburg',
      'Oberhausen', 'Erfurt', 'Hamm', 'Ludwigshafen', 'Göttingen',
      'Wolfsburg', 'Lübeck', 'Recklinghausen', 'Herford',
      'Bad Oeynhausen', 'Schweinfurt', 'Freising', 'Bergisch Gladbach',
      'Hofheim am Taunus', 'Norderstedt', 'Schorndorf', 'Metzingen',
      'Sulzbach (Taunus)', 'Siegburg', 'Frechen', 'Erkelenz',
      'Baesweiler', 'Erding', 'Witten', 'Arnsberg', 'Dachau',
      'Aschaffenburg', 'Langen', 'Dreieich', 'Uhingen',
      'Ebersbach an der Fils', 'Kirchheim unter Teck', 'Leinfelden',
      'Pforzheim', 'Gröbenzell', 'Herne', 'Datteln', 'Kerpen',
      'Oberhaching', 'Ottobrunn', 'Oberschleißheim', 'Villingen',
    ];
    for (const city of allCities) {
      const result = await geocoder.geocode(city);
      expect(result, `${city} should have coords`).not.toBeNull();
    }
  });

  it('resolves alias "Frankfurt" via major-cities test', async () => {
    // "Frankfurt" is an alias for "Frankfurt am Main"
    const result = await geocoder.geocode('Frankfurt');
    expect(result).not.toBeNull();
  });
});
