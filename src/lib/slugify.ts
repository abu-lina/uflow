/**
 * Slugify a string for use in URLs.
 * Transliterates common non-ASCII chars (German umlauts, accented letters)
 * to ASCII, lowercases, replaces non-alphanumeric runs with hyphens, and trims.
 */

const CHAR_MAP: Record<string, string> = {
  '\u00e4': 'ae', '\u00f6': 'oe', '\u00fc': 'ue',
  '\u00c4': 'Ae', '\u00d6': 'Oe', '\u00dc': 'Ue',
  '\u00df': 'ss',
  '\u00e0': 'a', '\u00e1': 'a', '\u00e2': 'a', '\u00e3': 'a', '\u00e5': 'a',
  '\u00e8': 'e', '\u00e9': 'e', '\u00ea': 'e', '\u00eb': 'e',
  '\u00ec': 'i', '\u00ed': 'i', '\u00ee': 'i', '\u00ef': 'i',
  '\u00f2': 'o', '\u00f3': 'o', '\u00f4': 'o', '\u00f5': 'o',
  '\u00f9': 'u', '\u00fa': 'u', '\u00fb': 'u',
  '\u00f1': 'n', '\u00e7': 'c', '\u00fd': 'y',
  '\u015f': 's', '\u011f': 'g', '\u0131': 'i',
  '\u017e': 'z', '\u0161': 's', '\u010d': 'c',
};

export function slugify(input: string): string {
  let s = input;
  s = s.replace(/[^\u0000-\u007F]/g, (ch) => CHAR_MAP[ch] ?? ch);
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  s = s.toLowerCase();
  s = s.replace(/[^a-z0-9]+/g, '-');
  s = s.replace(/^-+|-+$/g, '');
  return s;
}
