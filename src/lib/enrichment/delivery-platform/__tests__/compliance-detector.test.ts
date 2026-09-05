import { describe, expect, it } from 'vitest';
import { detectCompliance, PORK_KEYWORDS } from '../compliance-detector';

describe('PORK_KEYWORDS', () => {
  it('contains expected German pork terms', () => {
    expect(PORK_KEYWORDS).toContain('Schweinefleisch');
    expect(PORK_KEYWORDS).toContain('Speck');
    expect(PORK_KEYWORDS).toContain('Schinken');
    expect(PORK_KEYWORDS).toContain('Kassler');
  });

  it('does not contain ambiguous items like Schnitzel or Bratwurst', () => {
    expect(PORK_KEYWORDS).not.toContain('Schnitzel');
    expect(PORK_KEYWORDS).not.toContain('Bratwurst');
    expect(PORK_KEYWORDS).not.toContain('Currywurst');
    expect(PORK_KEYWORDS).not.toContain('Salami');
  });
});

describe('detectCompliance', () => {
  it('detects pork in "Schweineschnitzel"', () => {
    const result = detectCompliance(['Schweineschnitzel']);
    expect(result.porkSignal).toBe('definite_pork');
    expect(result.matchedPorkKeywords).toContain('Schweineschnitzel');
    expect(result.matchedPorkItems).toContain('Schweineschnitzel');
  });

  it('returns no_signal for non-pork item "Hahnchenspieß"', () => {
    const result = detectCompliance(['Hahnchenspieß']);
    expect(result.porkSignal).toBe('no_signal');
    expect(result.matchedPorkKeywords).toHaveLength(0);
    expect(result.matchedPorkItems).toHaveLength(0);
  });

  it('detects both alcohol and pork in "Bier" + "Schweinshaxe"', () => {
    const result = detectCompliance(['Bier', 'Schweinshaxe']);
    expect(result.alcoholSignal).toBe('definite_alcohol');
    expect(result.porkSignal).toBe('definite_pork');
  });

  it('returns no_signal for both when menu has "Doner Kebab" and "Falafel"', () => {
    const result = detectCompliance(['Doner Kebab', 'Falafel']);
    expect(result.alcoholSignal).toBe('no_signal');
    expect(result.porkSignal).toBe('no_signal');
  });

  it('detects pork in compound item "Speck-Burger"', () => {
    const result = detectCompliance(['Speck-Burger']);
    expect(result.porkSignal).toBe('definite_pork');
    expect(result.matchedPorkKeywords).toContain('Speck');
    expect(result.matchedPorkItems).toContain('Speck-Burger');
  });

  it('does not flag plain "Schnitzel" as pork (ambiguous)', () => {
    const result = detectCompliance(['Schnitzel']);
    expect(result.porkSignal).toBe('no_signal');
  });

  it('returns no_signal for both on empty menu', () => {
    const result = detectCompliance([]);
    expect(result.alcoholSignal).toBe('no_signal');
    expect(result.porkSignal).toBe('no_signal');
    expect(result.matchedAlcoholKeywords).toHaveLength(0);
    expect(result.matchedPorkKeywords).toHaveLength(0);
  });

  it('detects "alkoholfrei" as definite_no_alcohol and "Kassler" as definite_pork', () => {
    const result = detectCompliance(['alkoholfrei Bier', 'Kassler']);
    expect(result.alcoholSignal).toBe('definite_no_alcohol');
    expect(result.porkSignal).toBe('definite_pork');
    expect(result.matchedPorkKeywords).toContain('Kassler');
  });
});
