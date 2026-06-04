import { describe, expect, it } from 'vitest';
import {
  detectAlcohol,
  hasAlcoholKeywords,
  hasNoAlcoholKeywords,
  hasAmbiguousKeywords,
} from '@/lib/enrichment/delivery-platform/alcohol-detector';

describe('detectAlcohol', () => {
  it('returns no_signal for pizza-only menu', () => {
    const result = detectAlcohol(['Pizza Margherita', 'Pasta Carbonara']);
    expect(result.signal).toBe('no_signal');
    expect(result.matchedKeywords).toHaveLength(0);
    expect(result.matchedItems).toHaveLength(0);
    expect(result.ambiguousItems).toHaveLength(0);
  });

  it('returns definite_alcohol when menu contains Bier', () => {
    const result = detectAlcohol(['Bier', 'Pizza']);
    expect(result.signal).toBe('definite_alcohol');
    expect(result.matchedKeywords).toContain('Bier');
    expect(result.matchedItems).toContain('Bier');
  });

  it('returns definite_no_alcohol for alkoholfreies Bier', () => {
    const result = detectAlcohol(['Alkoholfreies Bier', 'Pizza']);
    expect(result.signal).toBe('definite_no_alcohol');
  });

  it('returns ambiguous for Schorle', () => {
    const result = detectAlcohol(['Schorle']);
    expect(result.signal).toBe('ambiguous');
    expect(result.ambiguousItems).toContain('Schorle');
  });

  it('is case insensitive', () => {
    expect(detectAlcohol(['bier']).signal).toBe('definite_alcohol');
    expect(detectAlcohol(['BIER']).signal).toBe('definite_alcohol');
    expect(detectAlcohol(['Bier']).signal).toBe('definite_alcohol');
  });

  it('rejects compound words like Biergarten (word-boundary)', () => {
    const result = detectAlcohol(['Biergarten']); // "Bier" inside compound word
    expect(result.signal).toBe('no_signal');
  });

  it('returns no_signal for empty array', () => {
    const result = detectAlcohol([]);
    expect(result.signal).toBe('no_signal');
    expect(result.matchedKeywords).toHaveLength(0);
    expect(result.matchedItems).toHaveLength(0);
    expect(result.ambiguousItems).toHaveLength(0);
  });

  it('definite alcohol trumps ambiguous', () => {
    const result = detectAlcohol(['Bier', 'Punsch']);
    expect(result.signal).toBe('definite_alcohol');
    expect(result.matchedItems).toContain('Bier');
    expect(result.ambiguousItems).toContain('Punsch');
  });

  it('detects multiple alcohol keywords', () => {
    const result = detectAlcohol(['Wein', 'Bier', 'Pizza']);
    expect(result.signal).toBe('definite_alcohol');
    expect(result.matchedKeywords).toContain('Wein');
    expect(result.matchedKeywords).toContain('Bier');
    expect(result.matchedItems).toHaveLength(2);
  });

  it('detects vodka as alcohol', () => {
    expect(detectAlcohol(['Vodka']).signal).toBe('definite_alcohol');
  });

  it('detects radler as alcohol', () => {
    expect(detectAlcohol(['Radler']).signal).toBe('definite_alcohol');
  });

  it('detects alkoholfrei keyword at word boundary', () => {
    expect(hasNoAlcoholKeywords('Alkoholfrei: Bier')).toBe(true);
  });

  it('detects ohne Alkohol keyword', () => {
    expect(hasNoAlcoholKeywords('Limonade ohne Alkohol')).toBe(true);
  });

  it('hasAlcoholKeywords returns true for known keywords', () => {
    expect(hasAlcoholKeywords('Weizen')).toBe(true);
    expect(hasAlcoholKeywords('Pilsner')).toBe(true);
    expect(hasAlcoholKeywords('Whisky')).toBe(true);
  });

  it('hasAlcoholKeywords returns false for non-alcohol items', () => {
    expect(hasAlcoholKeywords('Pizza Margherita')).toBe(false);
    expect(hasAlcoholKeywords('Wasser')).toBe(false);
    expect(hasAlcoholKeywords('Cola')).toBe(false);
  });

  it('hasAmbiguousKeywords detects ambiguous terms', () => {
    expect(hasAmbiguousKeywords('Saft')).toBe(true);
    expect(hasAmbiguousKeywords('Hausgetränk')).toBe(true);
  });

  it('normal item names do not trigger false positives', () => {
    const menu = ['Pizza Margherita', 'Döner Teller', 'Lahmacun', 'Baklava', 'Ayran'];
    const result = detectAlcohol(menu);
    expect(result.signal).toBe('no_signal');
  });

  it('handles mix with no_signal items correctly', () => {
    const result = detectAlcohol(['Döner Teller', 'Pommes', 'Cola', 'Bier']);
    expect(result.signal).toBe('definite_alcohol');
    expect(result.matchedItems).toEqual(['Bier']);
  });
});
