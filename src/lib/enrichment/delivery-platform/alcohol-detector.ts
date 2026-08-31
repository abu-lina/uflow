export type AlcoholSignal = 'definite_alcohol' | 'definite_no_alcohol' | 'ambiguous' | 'no_signal';

export interface AlcoholDetectionResult {
  signal: AlcoholSignal;
  matchedKeywords: string[];
  matchedItems: string[];
  ambiguousItems: string[];
}

export const ALCOHOL_KEYWORDS: ReadonlyArray<string> = [
  // ——— Beer & wheat beer ———
  'Bier', 'Weizen', 'Weißbier', 'Hefeweizen', 'Pils', 'Pilsner',
  'Kölsch', 'Altbier', 'Helles', 'Dunkles', 'Export',
  'Radler', 'Alsterwasser',
  // ——— Wine & sparkling ———
  'Wein', 'Sekt', 'Champagner', 'Prosecco', 'Glühwein', 'Bowle',
  // ——— Spirits ———
  'Schnaps', 'Vodka', 'Wodka', 'Gin', 'Rum', 'Whisky', 'Whiskey',
  'Korn', 'Likör', 'Cognac', 'Grappa', 'Tequila',
  // ——— Cocktails & mixed ———
  'Cocktail', 'Longdrink', 'Mixgetränk',
  // ——— Brand-name spirits/liqueurs ———
  'Jägermeister', 'Amaretto', 'Baileys',
  // ——— Popular beer brands (Plan 193) ———
  'Paulaner', 'Becks', 'Krombacher', 'Warsteiner', 'Erdinger',
  // ——— Popular alcoholic drink brands (Plan 193) ———
  'Desperados', 'Jack Daniels', 'Campari', 'Aperol',
  // ——— Generic ———
  'alkoholisches Getränk', 'alkoholische Getränke',
] as const;

export const NO_ALCOHOL_KEYWORDS: ReadonlyArray<string> = [
  'alkoholfrei', 'ohne Alkohol', '0,0%',
] as const;

export const AMBIGUOUS_KEYWORDS: ReadonlyArray<string> = [
  'Saft', 'Schorle', 'Punsch', 'Hausgetränk',
] as const;

function itemHasKeyword(itemName: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(?:^|\\W)(${escaped})(?:$|\\W)`, 'i');
  return pattern.test(itemName);
}

function classifyItem(itemName: string): AlcoholSignal {
  const lower = itemName.toLowerCase();

  for (const kw of NO_ALCOHOL_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) {
      return 'definite_no_alcohol';
    }
  }

  for (const kw of ALCOHOL_KEYWORDS) {
    if (itemHasKeyword(itemName, kw)) {
      return 'definite_alcohol';
    }
  }

  for (const kw of AMBIGUOUS_KEYWORDS) {
    if (itemHasKeyword(itemName, kw)) {
      return 'ambiguous';
    }
  }

  return 'no_signal';
}

export function detectAlcohol(menuItemNames: string[]): AlcoholDetectionResult {
  const matchedKeywords: string[] = [];
  const matchedItems: string[] = [];
  const ambiguousItems: string[] = [];

  let hasAlcohol = false;
  let hasNoAlcohol = false;
  let hasAmbiguous = false;

  const seenKeywords = new Set<string>();

  for (const item of menuItemNames) {
    const signal = classifyItem(item);

    if (signal === 'definite_alcohol') {
      hasAlcohol = true;
      matchedItems.push(item);
      for (const kw of ALCOHOL_KEYWORDS) {
        if (itemHasKeyword(item, kw) && !seenKeywords.has(kw)) {
          seenKeywords.add(kw);
          matchedKeywords.push(kw);
        }
      }
    } else if (signal === 'definite_no_alcohol') {
      hasNoAlcohol = true;
      matchedItems.push(item);
      for (const kw of NO_ALCOHOL_KEYWORDS) {
        if (itemHasKeyword(item, kw) && !seenKeywords.has(kw)) {
          seenKeywords.add(kw);
          matchedKeywords.push(kw);
        }
      }
    } else if (signal === 'ambiguous') {
      hasAmbiguous = true;
      ambiguousItems.push(item);
    }
  }

  let signal: AlcoholSignal;
  if (hasAlcohol) {
    signal = 'definite_alcohol';
  } else if (hasNoAlcohol) {
    signal = 'definite_no_alcohol';
  } else if (hasAmbiguous) {
    signal = 'ambiguous';
  } else {
    signal = 'no_signal';
  }

  return { signal, matchedKeywords, matchedItems, ambiguousItems };
}

export function hasAlcoholKeywords(itemName: string): boolean {
  for (const kw of ALCOHOL_KEYWORDS) {
    if (itemHasKeyword(itemName, kw)) return true;
  }
  return false;
}

export function hasNoAlcoholKeywords(itemName: string): boolean {
  for (const kw of NO_ALCOHOL_KEYWORDS) {
    if (itemHasKeyword(itemName, kw)) return true;
  }
  return false;
}

export function hasAmbiguousKeywords(itemName: string): boolean {
  for (const kw of AMBIGUOUS_KEYWORDS) {
    if (itemHasKeyword(itemName, kw)) return true;
  }
  return false;
}
