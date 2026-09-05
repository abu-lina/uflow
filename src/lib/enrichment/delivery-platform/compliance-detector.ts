import { type AlcoholSignal, detectAlcohol } from './alcohol-detector';

export type PorkSignal = 'definite_pork' | 'no_signal';

export const PORK_KEYWORDS: ReadonlyArray<string> = [
  'Schwein',
  'Schweinefleisch',
  'Speck',
  'Schinken',
  'Bacon',
  'Pork',
  'Eisbein',
  'Kassler',
  'Kasseler',
  'Mettwurst',
  'Leberwurst',
  'Sauerfleisch',
  'Schweinshaxe',
  'Schweinebraten',
  'Schweinesteak',
  'Schweineschnitzel',
] as const;

export interface ComplianceResult {
  alcoholSignal: AlcoholSignal;
  porkSignal: PorkSignal;
  matchedAlcoholKeywords: string[];
  matchedAlcoholItems: string[];
  ambiguousAlcoholItems: string[];
  matchedPorkKeywords: string[];
  matchedPorkItems: string[];
}

function itemHasKeyword(itemName: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(?:^|\\W)(${escaped})(?:$|\\W)`, 'i');
  return pattern.test(itemName);
}

export function detectCompliance(menuItemNames: string[]): ComplianceResult {
  const alcoholResult = detectAlcohol(menuItemNames);

  const matchedPorkKeywords: string[] = [];
  const matchedPorkItems: string[] = [];
  const seenKeywords = new Set<string>();

  let hasPork = false;

  for (const item of menuItemNames) {
    let itemMatched = false;
    for (const kw of PORK_KEYWORDS) {
      if (itemHasKeyword(item, kw)) {
        itemMatched = true;
        hasPork = true;
        if (!seenKeywords.has(kw)) {
          seenKeywords.add(kw);
          matchedPorkKeywords.push(kw);
        }
      }
    }
    if (itemMatched) {
      matchedPorkItems.push(item);
    }
  }

  return {
    alcoholSignal: alcoholResult.signal,
    porkSignal: hasPork ? 'definite_pork' : 'no_signal',
    matchedAlcoholKeywords: alcoholResult.matchedKeywords,
    matchedAlcoholItems: alcoholResult.matchedItems,
    ambiguousAlcoholItems: alcoholResult.ambiguousItems,
    matchedPorkKeywords,
    matchedPorkItems,
  };
}
