#!/usr/bin/env node
// Rotate docs/ai/LEARNINGS.md: keep the N most recent entries, move the
// rest verbatim into docs/ai/learnings-archive/<YYYY>-Q<n>.md.
// Re-runnable as the file grows. Usage:
//   node scripts/context/rotate-learnings.mjs [--keep 10] [--dry-run]
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');
const LEARNINGS = join(repoRoot, 'docs/ai/LEARNINGS.md');
const ARCHIVE_DIR = join(repoRoot, 'docs/ai/learnings-archive');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const keepIdx = args.indexOf('--keep');
const KEEP = keepIdx >= 0 ? Number(args[keepIdx + 1]) : 10;

const ENTRY_RE = /^#{2,3} (\d{4})-(\d{2})-(\d{2}) /;

const text = readFileSync(LEARNINGS, 'utf8');
const lines = text.split('\n');

// Everything through the "## Entries" heading (and its preamble) is the header.
const entriesIdx = lines.findIndex((l) => /^## Entries/.test(l));
if (entriesIdx < 0) {
  console.error("no '## Entries' section found");
  process.exit(1);
}
// Header = up to first entry heading after ## Entries (preserves
// "(Add new entries below.)" and any notes before the first entry).
let firstEntry = -1;
for (let i = entriesIdx + 1; i < lines.length; i++) {
  if (ENTRY_RE.test(lines[i])) {
    firstEntry = i;
    break;
  }
}
const headerEnd = firstEntry === -1 ? lines.length : firstEntry;
const header = lines.slice(0, headerEnd).join('\n').replace(/\n+$/, '') + '\n';

// Split the rest into entries, each starting at its heading line.
const entries = [];
for (let i = headerEnd; i < lines.length; i++) {
  if (ENTRY_RE.test(lines[i])) {
    entries.push({ heading: lines[i].trim(), start: i, end: lines.length });
    if (entries.length > 1) entries[entries.length - 2].end = i;
  }
}

const kept = entries.slice(-KEEP);
const archived = entries.slice(0, -KEEP);

// Bucket archived entries by quarter, newest-first within each bucket.
const quarter = (h) => {
  const m = h.match(ENTRY_RE);
  return `${m[1]}-Q${Math.ceil(Number(m[2]) / 3)}`;
};
const buckets = new Map();
for (const e of [...archived].reverse()) {
  // newest-first by document order (file is appended to over time)
  const q = quarter(e.heading);
  if (!buckets.has(q)) buckets.set(q, []);
  buckets.get(q).push(e);
}

const archiveFiles = [...buckets.keys()].sort().reverse();

const body = (e) => lines.slice(e.start, e.end).join('\n').replace(/\n+$/, '');

const newLearnings =
  header +
  '\n' +
  kept.map((e) => body(e) + '\n').join('\n') +
  '\n## Archive\n\n' +
  'Older entries live in:\n\n' +
  archiveFiles.map((q) => `- [${q}](learnings-archive/${q}.md)`).join('\n') +
  '\n';

// Zero-loss assertion: heading multiset before == kept + archived headings.
const before = entries.map((e) => e.heading).sort();
const after = [...kept, ...archived].map((e) => e.heading).sort();
if (JSON.stringify(before) !== JSON.stringify(after)) {
  console.error('heading-set mismatch, aborting');
  process.exit(1);
}

console.log(`entries: ${entries.length} total, ${kept.length} kept, ${archived.length} archived`);
console.log(`LEARNINGS.md: ${text.length} -> ${newLearnings.length} bytes`);

if (dryRun) {
  console.log('dry run, no writes');
  process.exit(0);
}

mkdirSync(ARCHIVE_DIR, { recursive: true });
for (const [q, es] of buckets) {
  const file = join(ARCHIVE_DIR, `${q}.md`);
  if (existsSync(file)) {
    // Re-runs append a separator + new content is not needed: entries already
    // archived are gone from LEARNINGS.md, so collisions only occur if the
    // same quarter gets new old entries later. Skip duplicates by heading.
    const existing = readFileSync(file, 'utf8');
    const novel = es.filter((e) => !existing.includes(e.heading));
    if (novel.length === 0) continue;
    writeFileSync(
      file,
      existing.replace(/\n+$/, '') + '\n\n' + novel.map((e) => body(e) + '\n').join('\n'),
    );
  } else {
    writeFileSync(file, `# Learnings archive ${q}\n\n` + es.map((e) => body(e) + '\n').join('\n'));
  }
  console.log(`wrote ${file} (${buckets.get(q).length} entries)`);
}
writeFileSync(LEARNINGS, newLearnings);
console.log('heading-set assertion: PASS');
