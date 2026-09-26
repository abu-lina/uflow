#!/usr/bin/env node
/**
 * Measure the fixed context baseline injected into every agent session.
 *
 * Skills are advertised to the agent by name + description in the system
 * prompt, whether or not they are ever invoked. Always-on rules are injected
 * verbatim. Together they set the floor for every session: work has to fit in
 * whatever is left under the context ceiling.
 *
 * Token counts are estimates (chars / 4). They are consistent enough to gate a
 * budget and to compare before/after a prune, but they are not exact.
 *
 * Usage:
 *   node scripts/context/context-baseline.mjs
 *   node scripts/context/context-baseline.mjs --max-tokens 30000   # exit 1 if over
 *   node scripts/context/context-baseline.mjs --json
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, basename, dirname, resolve } from 'node:path';

const CHARS_PER_TOKEN = 4;
const HOME = homedir();
const REPO = resolve(dirname(new URL(import.meta.url).pathname), '..', '..');

/** Roots scanned for SKILL.md. Missing roots are skipped silently. */
const SKILL_ROOTS = [
  { label: 'global ~/.cursor/skills', path: join(HOME, '.cursor', 'skills'), depth: 1 },
  { label: 'global ~/.agents/skills', path: join(HOME, '.agents', 'skills'), depth: 1 },
  { label: 'global ~/.claude/skills', path: join(HOME, '.claude', 'skills'), depth: 1 },
  { label: 'plugin cache', path: join(HOME, '.local/share/devin/cli/plugins/cache'), depth: 6 },
  { label: 'project .github/skills', path: join(REPO, '.github', 'skills'), depth: 1 },
  { label: 'project .devin/skills', path: join(REPO, '.devin', 'skills'), depth: 1 },
];

/** Files injected verbatim into every session. */
const ALWAYS_ON = [
  join(HOME, '.codeium', 'windsurf', 'memories', 'global_rules.md'),
  join(HOME, '.local/share/devin/cli/plugins/cache'), // AGENTS.md files, globbed below
  join(REPO, '.cursor', 'rules'), // only alwaysApply: true, filtered below
  join(REPO, 'AGENTS.md'),
  join(REPO, 'CLAUDE.md'),
];

const tokens = (chars) => Math.round(chars / CHARS_PER_TOKEN);

function walk(dir, maxDepth, depth = 0, out = []) {
  if (depth > maxDepth) return out;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, maxDepth, depth + 1, out);
    else if (e.name === 'SKILL.md') out.push(p);
  }
  return out;
}

/**
 * Read a top-level YAML scalar out of a frontmatter block, line by line.
 *
 * Descriptions routinely span many lines (plain multi-line, or a `|` / `>`
 * block scalar), so a regex that stops at the first newline silently
 * under-reports the injected size. Consume every line after the key until the
 * next top-level key or the end of the block.
 */
function yamlField(block, key) {
  const lines = block.split(/\r?\n/);
  const start = lines.findIndex((l) => new RegExp(`^${key}:(\\s|$)`).test(l));
  if (start === -1) return '';
  const first = lines[start].slice(key.length + 1).trim();
  const parts = first && !/^[|>][-+\d]*$/.test(first) ? [first] : [];
  for (let i = start + 1; i < lines.length; i++) {
    // A new top-level key ends the value. Indented lines continue it.
    if (/^[A-Za-z_][\w-]*:(\s|$)/.test(lines[i])) break;
    parts.push(lines[i].trim());
  }
  return parts.join('\n').trim();
}

/** Build the catalog entry the agent actually sees in its system prompt. */
function skillEntry(file) {
  let txt;
  try {
    txt = readFileSync(file, 'utf8');
  } catch {
    return null;
  }
  const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(txt);
  const block = fm ? fm[1] : txt.slice(0, 2000);
  const rawName = yamlField(block, 'name') || basename(dirname(file));
  const name = rawName.replace(/^['"]|['"]$/g, '');
  const description = yamlField(block, 'description').replace(/^['"]|['"]$/g, '');
  const rendered = `- **${name}**: ${description} (source: ${file})\n`;
  return { name, file, chars: rendered.length };
}

function collectSkills() {
  const groups = [];
  const seen = new Set();
  for (const root of SKILL_ROOTS) {
    if (!existsSync(root.path)) continue;
    const skills = [];
    for (const file of walk(root.path, root.depth)) {
      if (seen.has(file)) continue;
      seen.add(file);
      const entry = skillEntry(file);
      if (entry) skills.push(entry);
    }
    if (skills.length) {
      skills.sort((a, b) => b.chars - a.chars);
      groups.push({
        label: root.label,
        count: skills.length,
        chars: skills.reduce((s, x) => s + x.chars, 0),
        skills,
      });
    }
  }
  return groups;
}

function collectAlwaysOn() {
  const files = [];
  const add = (p, label) => {
    try {
      if (statSync(p).isFile()) files.push({ label, path: p, chars: readFileSync(p, 'utf8').length });
    } catch {
      /* missing is fine */
    }
  };

  for (const target of ALWAYS_ON) {
    if (!existsSync(target)) continue;
    const st = statSync(target);
    if (st.isFile()) {
      add(target, basename(target));
      continue;
    }
    if (target.endsWith('rules')) {
      // Only rules with alwaysApply: true are injected unconditionally.
      for (const f of readdirSync(target)) {
        if (!f.endsWith('.mdc')) continue;
        const p = join(target, f);
        const head = readFileSync(p, 'utf8').slice(0, 400);
        if (/alwaysApply:\s*true/.test(head)) add(p, `rule ${f}`);
      }
      continue;
    }
    // Plugin cache: AGENTS.md files are always-on rules.
    for (const p of walkNamed(target, 'AGENTS.md', 4)) add(p, `plugin ${basename(dirname(p))}/AGENTS.md`);
  }
  return files;
}

function walkNamed(dir, name, maxDepth, depth = 0, out = []) {
  if (depth > maxDepth) return out;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walkNamed(p, name, maxDepth, depth + 1, out);
    else if (e.name === name) out.push(p);
  }
  return out;
}

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const maxIdx = args.indexOf('--max-tokens');
const maxTokens = maxIdx !== -1 ? Number(args[maxIdx + 1]) : null;

const skillGroups = collectSkills();
const alwaysOn = collectAlwaysOn();

const skillChars = skillGroups.reduce((s, g) => s + g.chars, 0);
const skillCount = skillGroups.reduce((s, g) => s + g.count, 0);
const rulesChars = alwaysOn.reduce((s, f) => s + f.chars, 0);
const measured = skillChars + rulesChars;

const result = {
  skills: { count: skillCount, chars: skillChars, tokens: tokens(skillChars) },
  alwaysOnRules: { count: alwaysOn.length, chars: rulesChars, tokens: tokens(rulesChars) },
  measuredTotal: { chars: measured, tokens: tokens(measured) },
  groups: skillGroups.map((g) => ({ label: g.label, count: g.count, tokens: tokens(g.chars) })),
  note: 'Excludes the CLI base prompt and tool schemas (not measurable locally, roughly 8-12k tokens).',
};

if (asJson) {
  console.log(JSON.stringify(result, null, 2));
} else {
  const pad = (s, n) => String(s).padEnd(n);
  const num = (s, n) => String(s).padStart(n);
  console.log('\nContext baseline (injected into every session)\n');
  console.log(`  ${pad('SOURCE', 34)} ${num('COUNT', 6)} ${num('~TOKENS', 9)}`);
  console.log(`  ${'-'.repeat(34)} ${'-'.repeat(6)} ${'-'.repeat(9)}`);
  for (const g of skillGroups) {
    console.log(`  ${pad(g.label, 34)} ${num(g.count, 6)} ${num(tokens(g.chars).toLocaleString(), 9)}`);
  }
  console.log(`  ${pad('always-on rules', 34)} ${num(alwaysOn.length, 6)} ${num(tokens(rulesChars).toLocaleString(), 9)}`);
  console.log(`  ${'-'.repeat(34)} ${'-'.repeat(6)} ${'-'.repeat(9)}`);
  console.log(`  ${pad('MEASURED BASELINE', 34)} ${num(skillCount, 6)} ${num(tokens(measured).toLocaleString(), 9)}`);
  console.log(`\n  Plus CLI base prompt and tool schemas, not measurable locally: ~8-12k tokens.`);

  const top = skillGroups.flatMap((g) => g.skills).sort((a, b) => b.chars - a.chars).slice(0, 5);
  if (top.length) {
    console.log('\n  Heaviest individual skill entries:');
    for (const s of top) console.log(`    ${num(tokens(s.chars), 5)} tok  ${s.name}`);
  }

  if (maxTokens !== null) {
    const over = tokens(measured) > maxTokens;
    console.log(
      `\n  Budget: ${maxTokens.toLocaleString()} tokens -> ${over ? 'FAIL' : 'PASS'} ` +
        `(${tokens(measured).toLocaleString()} measured)\n`
    );
  } else {
    console.log('');
  }
}

if (maxTokens !== null && tokens(measured) > maxTokens) process.exit(1);
