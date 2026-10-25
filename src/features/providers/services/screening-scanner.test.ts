import { describe, expect, it } from 'vitest';
import { scanProvider, scanText } from '@/features/providers/services/screening-scanner';

const ctx = { source: 'menu' as const, url: 'https://example.com/menu' };
const codes = (text: string, c = ctx) => scanText(text, c).map((f) => f.code);

describe('screening scanner', () => {
  it('1. scanText returns flags with ~80 char snippets in German and English', () => {
    const filler = 'x '.repeat(100);
    const flags = scanText(`${filler}Wir servieren Bier und Wein. ${filler}`, ctx);
    expect(flags.map((f) => f.term.toLowerCase()).sort()).toEqual(['bier', 'wein']);
    expect(flags[0]).toMatchObject({ code: 'alcohol', url: ctx.url, source: 'menu' });
    expect(flags[0].snippet.length).toBeGreaterThanOrEqual(80);
    expect(flags[0].snippet.length).toBeLessThanOrEqual(90);
    expect(flags[0].snippet).toContain('Bier');

    expect(codes('whisky vodka cocktail Sekt Spirituosen beer wine')).toEqual(
      Array(7).fill('alcohol'),
    );
    expect(codes('Schwein Speck Schinken pork bacon')).toEqual(Array(5).fill('pork'));
    expect(codes('nicht halal')).toContain('not_halal');
    expect(codes('not halal')).toContain('not_halal');
    for (const t of ['kein halal', 'not 100% halal', 'nicht zertifiziert']) {
      expect(codes(t), t).not.toContain('halal_positive');
    }
    expect(codes('Halal ✓ not halal')).toEqual(['not_halal']);
    expect(codes('halal zertifiziert')).toEqual(['halal_positive', 'halal_positive']);
  });

  it('2. matches case-insensitively on whole words with Unicode letters', () => {
    expect(codes('BIERHAUS')).toEqual(['alcohol']);
    expect(codes('Bierhaus')).toEqual(['alcohol']);
    expect(codes('Fiber')).toEqual([]);
    expect(codes('Schinkenbrot')).toEqual(['pork']);
    expect(codes('Äbier')).toEqual([]);
    for (const t of ['Sektion', 'Sektor', 'Weinen', 'Schweinfurt', 'Speckstein', 'Bierä']) {
      expect(codes(t), t).toEqual([]);
    }
    for (const t of ['Weißwein', 'Weisswein', 'Rotwein', 'Glühwein', 'Gluehwein', 'Weizenbier']) {
      expect(codes(t), t).toEqual(['alcohol']);
    }
    for (const t of [
      'Prosecco',
      'Aperol Spritz',
      'Gin Tonic',
      'Rum',
      'Champagner',
      'Likör',
      'Weinbrand',
      'alcoholic drinks',
      'Alkoholische Getränke',
    ]) {
      expect(codes(t), t).toEqual(['alcohol']);
    }
    for (const t of ['Schweinshaxe', 'Schweineschnitzel', 'Schweinebauch', 'Schweinsbraten']) {
      expect(codes(t), t).toEqual(['pork']);
    }
    for (const t of ['Ginger', 'Rumpsteak', 'Rumänien', 'Schweinsteiger', 'Speckled', 'Sekten']) {
      expect(codes(t), t).toEqual([]);
    }
    for (const t of ['Weinkarten', 'Rotweinen', 'Bieren']) {
      expect(codes(t), t).toEqual(['alcohol']);
    }
    for (const t of ['Weinkarte', 'Biergarten', 'Schweinefleisch', 'Biere', 'Weinberg']) {
      expect(codes(t), t).toHaveLength(1);
    }
  });

  it('3. negations and false friends do not flag', () => {
    for (const t of [
      'alkoholfrei',
      'alcohol-free',
      'non-alcoholic',
      'root beer',
      'ginger beer',
      'ohne Schweinefleisch',
      'non-alcoholic beer',
      'alkoholfreies Bier',
      'alcohol free beer',
      'alcohol free',
      'kein Alkohol',
      'ohne Speck und Schinken',
      'Bier (alkoholfrei)',
    ]) {
      expect(codes(t), t).toEqual([]);
    }
    expect(scanText('Bier alkoholfrei und Wein', ctx).map((f) => f.term)).toEqual(['wein']);
    expect(scanText('alkoholfrei und Wein', ctx).map((f) => f.term)).toEqual(['wein']);
  });

  it('4. scanProvider merges, dedupes and derives status', () => {
    const menu = { text: 'Bier. Bier.', source: 'menu' as const, url: 'u1' };
    const merged = scanProvider([menu, menu]);
    expect(merged.flags.filter((f) => f.code === 'alcohol')).toHaveLength(1);
    expect(merged.status).toBe('flagged');

    expect(scanProvider([{ text: 'Schinken', source: 'menu', url: 'u1' }]).status).toBe('flagged');
    const mixed = scanProvider([
      { text: 'Wein', source: 'review', url: 'u2' },
      { text: 'Wein', source: 'menu', url: 'u1' },
    ]);
    expect(mixed.status).toBe('flagged');
    expect(mixed.flags).toHaveLength(2);
    expect(scanProvider([{ text: 'nicht halal', source: 'review', url: 'u2' }]).status).toBe(
      'review',
    );
    expect(scanProvider([{ text: 'Wein', source: 'website', url: 'u2' }]).status).toBe('review');
    expect(scanProvider([{ text: 'Wein', source: 'review', url: 'u2' }]).status).toBe('review');
    expect(scanProvider([{ text: 'not halal', source: 'menu', url: 'u3' }]).status).toBe('review');
    expect(scanProvider([{ text: 'halal', source: 'website', url: 'u4' }]).status).toBe('clear');
    expect(scanProvider([{ text: 'Schinken', source: 'website', url: 'u4' }]).status).toBe(
      'review',
    );
  });

  it('5. structured attributes produce an alcohol flag with the attribute name', () => {
    const flags = scanText('serves_beer', { source: 'attribute', url: 'u' });
    expect(flags).toHaveLength(1);
    expect(flags[0]).toMatchObject({ code: 'alcohol', term: 'serves_beer', source: 'attribute' });
    expect(scanProvider([{ text: 'serves_wine', source: 'attribute', url: 'u' }]).status).toBe(
      'flagged',
    );
  });

  it('6. empty and very long input do not throw', () => {
    expect(scanText('', ctx)).toEqual([]);
    expect(scanProvider([])).toEqual({ status: 'clear', flags: [] });
    const long = 'Bier '.repeat(100_000);
    expect(() => scanText(long, ctx)).not.toThrow();
    expect(scanText('a '.repeat(150_000) + 'Bier', ctx)).toEqual([]);
    for (const unit of ['Bier ', 'no no ', 'ohne x ', 'a '.repeat(10), 'halal ']) {
      const start = Date.now();
      scanText(unit.repeat(Math.ceil(210_000 / unit.length)), ctx);
      expect(Date.now() - start, unit).toBeLessThan(2000);
    }
  });
});
