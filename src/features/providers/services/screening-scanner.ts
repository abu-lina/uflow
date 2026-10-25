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

// Left boundary only, so compounds such as "Bierhaus" match and "Fiber" does not.
const LEFT = String.raw`(?<![\p{L}\p{N}])`;
const NEGATED_PREFIX = String.raw`(?<!(?<!\p{L})(?:ohne|kein|keine|without|no|root|ginger)\s+)`;
const NEGATED_PREFIX_HYPHEN = String.raw`(?<!non-)`;

const ALCOHOL_TERMS = [
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
  'alkohol',
  'alcohol',
];
const PORK_TERMS = ['schwein', 'speck', 'schinken', 'pork', 'bacon'];

function rule(
  code: ScreeningCode,
  terms: string[],
  suffix = '',
): { code: ScreeningCode; re: RegExp } {
  return {
    code,
    re: new RegExp(
      `${LEFT}${NEGATED_PREFIX_HYPHEN}${NEGATED_PREFIX}(${terms.join('|')})${suffix}`,
      'giu',
    ),
  };
}

const RULES = [
  // "alkoholfrei" / "alcohol-free" are negations, not alcohol.
  rule('alcohol', ALCOHOL_TERMS, String.raw`(?!-?fre[ie])`),
  rule('pork', PORK_TERMS),
];

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
    for (const m of matchAll(re, input)) push(code, m[1].toLowerCase(), m.index, m[0].length);
  }

  const notHalalSpans: Array<[number, number]> = [];
  for (const m of matchAll(NOT_HALAL_RE, input)) {
    notHalalSpans.push([m.index, m.index + m[0].length]);
    push('not_halal', m[0].toLowerCase().replace(/\s+/g, ' '), m.index, m[0].length);
  }
  for (const m of matchAll(HALAL_POSITIVE_RE, input)) {
    const inNegation = notHalalSpans.some(([s, e]) => m.index >= s && m.index < e);
    if (!inNegation) push('halal_positive', m[1].toLowerCase(), m.index, m[0].length);
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
  } else if (flags.some((f) => f.code === 'not_halal' || (isHaram(f) && f.source === 'review'))) {
    status = 'review';
  }
  return { status, flags };
}
