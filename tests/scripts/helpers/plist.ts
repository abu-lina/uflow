import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';
import type { Element } from 'domhandler';

/**
 * Minimal parser for the launchd plist XML our own scripts generate.
 *
 * The field assertions in agent-dispatch.test.ts used to shell out to
 * `plutil -convert json`, which only exists on macOS and failed on the
 * Ubuntu CI runner. The plist under test is ours: a fixed `<dict>` of
 * `<key>`/value pairs emitted by emit_plist() in agent-dispatch.sh, so a
 * real parser is overkill. Cheerio (already a dependency) parses the XML;
 * each `<key>` element's value is its next sibling element, mapped by tag.
 *
 * This is deliberately NOT a general plist parser. It exists so the
 * cross-platform assertions never depend on a macOS-only binary. The real
 * `plutil -lint` check still runs, gated on `process.platform === 'darwin'`.
 */

export type PlistValue = string | number | boolean | PlistValue[] | PlistDict;
export interface PlistDict {
  [key: string]: PlistValue;
}

function valueOf($: CheerioAPI, el: Element): PlistValue {
  switch (el.name) {
    case 'string':
      return $(el).text();
    case 'integer':
      return Number($(el).text());
    case 'true':
      return true;
    case 'false':
      return false;
    case 'array':
      return $(el)
        .children()
        .toArray()
        .map((child) => valueOf($, child));
    case 'dict':
      return dictOf($, el);
    default:
      throw new Error(`unsupported plist value element <${el.name}>`);
  }
}

function dictOf($: CheerioAPI, dictEl: Element): PlistDict {
  const out: PlistDict = {};
  for (const keyEl of $(dictEl).children('key').toArray()) {
    // in a plist dict the value node is always the element right after <key>
    const valEl = $(keyEl).next().get(0);
    if (!valEl || valEl.type !== 'tag') {
      throw new Error(`<key>${$(keyEl).text()}</key> is not followed by a value element`);
    }
    out[$(keyEl).text()] = valueOf($, valEl);
  }
  return out;
}

/** Parse the top-level `<dict>` of a plist document into a plain object. */
export function parsePlistDict(xml: string): PlistDict {
  const $ = cheerio.load(xml, { xmlMode: true });
  const dict = $('plist > dict').first().get(0);
  if (!dict) throw new Error('no <plist><dict> found in the given document');
  return dictOf($, dict);
}
