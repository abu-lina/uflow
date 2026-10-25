export type ScreeningCode = 'alcohol' | 'pork' | 'not_halal' | 'halal_positive';
export type ScreeningSource = 'review' | 'attribute' | 'menu' | 'website';
export type ScreeningStatus = 'clear' | 'review' | 'flagged';

export interface ScreeningFlag {
  code: ScreeningCode;
  term: string;
  snippet: string;
  url: string;
  source: ScreeningSource;
}

export interface ScanContext {
  source: ScreeningSource;
  url: string;
}

export interface ScanInput extends ScanContext {
  text: string;
}

export interface ScanResult {
  status: ScreeningStatus;
  flags: ScreeningFlag[];
}

const MAX_TEXT_LENGTH = 200_000;
const SNIPPET_RADIUS = 40;
const ATTRIBUTE_RE = /\bserves_(?:beer|wine|cocktails|liquor|spirits|alcohol)\b/gi;

function matchAll(re: RegExp, text: string): RegExpExecArray[] {
  const out: RegExpExecArray[] = [];
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push(m);
  return out;
}

const LEFT = String.raw`(?<![\p{L}\p{N}])`;
const RIGHT = String.raw`(?![\p{L}\p{N}])`;
const PREFIXES = String.raw`(?:weiß|weiss|rot|rosé|rose|glüh|glueh|weizen|pils|schaum|reis|dessert)?`;
// A term matches alone, with a plural/dative ending, or with a known compound ending
// ("Bierhaus", "Weinkarten", "Rotweinen"); "Sektion" or "Weinen" (crying) do not match.
const ENDINGS = String.raw`(?:e?(?:haus|haeuser|häuser|karte|glas|gläser|flasche|garten|brot|fleisch|bar|schorle|braten|berg)(?:n|en)?|s|e|es|n|en)?`;
// Whole words that merely start like a term.
const DENY = String.raw`(?!(?:weinen|sekten|schweinfurt\p{L}*|speckstein\p{L}*|speckled|schweinsteiger)${RIGHT})`;

interface TermSet {
  // Match alone or with PREFIXES/ENDINGS.
  terms: string[];
  // Whole words only ("gin", "rum"; not "Ginger", "Rumpsteak").
  exact?: string[];
  // Stem plus any German compound tail ("Schweinshaxe", "Schweineschnitzel").
  open?: string[];
}

const ALCOHOL: TermSet = {
  terms: [
    'bier',
    'wein',
    'sekt',
    'spirituosen',
    'cocktail',
    'beer',
    'wine',
    'whisky',
    'whiskey',
    'vodka',
    'wodka',
    'prosecco',
    'aperol',
    'champagner',
    'champagne',
    'likör',
    'likoer',
    'liqueur',
    'weinbrand',
    'tequila',
    'cognac',
    'brandy',
    'alkohol',
    'alcohol',
    String.raw`alkoholisch\p{L}*`,
    String.raw`alkoholhaltig\p{L}*`,
    'alcoholic',
  ],
  exact: ['gin', 'rum'],
};
const PORK: TermSet = {
  terms: ['pork', 'bacon'],
  open: ['schwein', 'speck', 'schinken'],
};

function rule(
  code: ScreeningCode,
  { terms, exact, open }: TermSet,
  suffix = '',
): { code: ScreeningCode; re: RegExp } {
  const alternatives = [`${PREFIXES}(${terms.join('|')})${ENDINGS}${RIGHT}`];
  if (exact) alternatives.push(`(${exact.join('|')})${RIGHT}`);
  if (open) alternatives.push(`(${open.join('|')})(?:e|s|en)?\\p{L}*`);
  return {
    code,
    re: new RegExp(`${LEFT}${DENY}(?:${alternatives.join('|')})${suffix}`, 'giu'),
  };
}

const RULES = [
  // "alcohol free" / "alkohol-frei" are negations, not alcohol.
  rule('alcohol', ALCOHOL, String.raw`(?!(?:\s|-)*fre[ie])`),
  rule('pork', PORK),
];

const ci = (src: string) => new RegExp(src, 'iu');
const SOFT_BREAK = /^[\s\S]*[.;:!?,\n]/;
// Negators up to two tokens before a term, and "free" adjectives up to one token before.
const NEGATOR_BEFORE = ci(String.raw`(?<!\p{L})(?:ohne|kein\w*|without|no)\s+(?:\p{L}+\s+){0,2}$`);
const ADJECTIVE_BEFORE = ci(
  String.raw`(?:non-?\s*alcoholic|alcohol[\s-]*free|alkohol[\s-]*frei\w*|alkoholarm\w*)\s+$`,
);
const FALSE_FRIEND_BEFORE = ci(String.raw`(?<!\p{L})(?:root|ginger|non-?)\s*$`);
const FREE_AFTER = ci(
  String.raw`^\s*[(\[]?\s*(?:alkohol[\s-]*frei|alcohol[\s-]*free|non-?\s*alcoholic|ohne\s+alkohol)`,
);
const HALAL_NEGATOR_BEFORE = ci(String.raw`(?<!\p{L})(?:kein\w*|nicht|not|no)\s+(?:100\s*%\s*)?$`);

function isNegated(text: string, start: number, end: number): boolean {
  const before = text.slice(Math.max(0, start - 60), start).replace(SOFT_BREAK, '');
  const after = text.slice(end, end + 40).replace(/[.;:!?,\n][\s\S]*$/, '');
  return (
    NEGATOR_BEFORE.test(before) ||
    ADJECTIVE_BEFORE.test(before) ||
    FALSE_FRIEND_BEFORE.test(before) ||
    FREE_AFTER.test(after)
  );
}

function isHalalNegated(text: string, start: number): boolean {
  const before = text.slice(Math.max(0, start - 20), start).replace(SOFT_BREAK, '');
  return HALAL_NEGATOR_BEFORE.test(before);
}

const NOT_HALAL_RE = new RegExp(`${LEFT}(nicht|not)\\s+halal`, 'giu');
const HALAL_POSITIVE_RE = new RegExp(`${LEFT}(halal|zertifiziert)`, 'giu');

function snippetAround(text: string, index: number, length: number): string {
  const start = Math.max(0, index - SNIPPET_RADIUS);
  const end = Math.min(text.length, index + length + SNIPPET_RADIUS);
  return text.slice(start, end).replace(/\s+/g, ' ').trim();
}

export function scanText(text: string, { source, url }: ScanContext): ScreeningFlag[] {
  if (!text) return [];
  const input = text.length > MAX_TEXT_LENGTH ? text.slice(0, MAX_TEXT_LENGTH) : text;
  const flags: ScreeningFlag[] = [];
  const push = (code: ScreeningCode, term: string, index: number, length: number) =>
    flags.push({ code, term, snippet: snippetAround(input, index, length), url, source });

  if (source === 'attribute') {
    for (const m of matchAll(ATTRIBUTE_RE, input))
      push('alcohol', m[0].toLowerCase(), m.index, m[0].length);
    return flags;
  }

  for (const { code, re } of RULES) {
    for (const m of matchAll(re, input)) {
      if (!isNegated(input, m.index, m.index + m[0].length))
        push(code, (m[1] || m[2] || m[3]).toLowerCase(), m.index, m[0].length);
    }
  }

  const notHalalSpans: Array<[number, number]> = [];
  for (const m of matchAll(NOT_HALAL_RE, input)) {
    notHalalSpans.push([m.index, m.index + m[0].length]);
    push('not_halal', m[0].toLowerCase().replace(/\s+/g, ' '), m.index, m[0].length);
  }
  for (const m of matchAll(HALAL_POSITIVE_RE, input)) {
    const inNegation = notHalalSpans.some(
      ([s, e]) => m.index < e + 24 && m.index + m[0].length > s - 24,
    );
    if (!inNegation && !isHalalNegated(input, m.index))
      push('halal_positive', m[1].toLowerCase(), m.index, m[0].length);
  }

  return flags;
}

export function scanProvider(inputs: ScanInput[]): ScanResult {
  const seen = new Set<string>();
  const flags: ScreeningFlag[] = [];
  for (const { text, ...ctx } of inputs) {
    for (const flag of scanText(text, ctx)) {
      const key = `${flag.code}\u0000${flag.term}\u0000${flag.url}`;
      if (seen.has(key)) continue;
      seen.add(key);
      flags.push(flag);
    }
  }

  const isHaram = (f: ScreeningFlag) => f.code === 'alcohol' || f.code === 'pork';
  let status: ScreeningStatus = 'clear';
  if (flags.some((f) => isHaram(f) && (f.source === 'menu' || f.source === 'attribute'))) {
    status = 'flagged';
  } else if (
    flags.some(
      (f) =>
        f.code === 'not_halal' || (isHaram(f) && (f.source === 'review' || f.source === 'website')),
    )
  ) {
    status = 'review';
  }
  return { status, flags };
}
