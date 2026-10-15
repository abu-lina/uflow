import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../..', import.meta.url));
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const listFiles = (directory: string): string[] =>
  readdirSync(join(root, directory), { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? listFiles(path) : entry.isFile() ? [path] : [];
  });

const agentRuleFiles = [
  'AGENTS.md',
  ...listFiles('docs/agents'),
];

describe('agent documentation rules', () => {
  it('documents the foreman config, permissions, and intentional remote writes', () => {
    const foreman = read('docs/agents/foreman.md');
    const setup = read('docs/agents/setup-decisions.md');

    expect(foreman).toMatch(/Normal mode/i);
    expect(foreman).toMatch(/--config/);
    expect(foreman).toMatch(/private 0600 copy of `.devin\/foreman\.json`/);
    expect(foreman).toMatch(/mktemp -d/);
    expect(foreman).toMatch(/\$TMPDIR/);
    expect(foreman).toMatch(/org_id/);
    expect(foreman).toMatch(/always allow/);
    expect(foreman).toMatch(/committed config stays unchanged/i);
    expect(foreman).toMatch(/each start begins from its rules/i);
    expect(foreman).toMatch(/replaces `~\/\.config\/devin\/config\.json`/);
    expect(foreman).toMatch(/doesn't merge/i);
    expect(foreman).toMatch(/foreman can't write files/i);
    expect(foreman).toMatch(/issue and PR bodies.*--body/i);
    expect(foreman).toMatch(/shouldn't click "always allow"/i);
    expect(foreman).toMatch(/gh pr review.*step 5/i);
    expect(foreman).toMatch(/gh pr update-branch.*step 6/i);
    expect(foreman).toMatch(/herdr agent prompt.*herdr agent send-keys.*steps 5 and later/i);
    expect(foreman).toMatch(/gh issue comment.*status replies and questions/i);
    expect(foreman).toMatch(/gh issue create.*step 1/i);
    expect(foreman).toMatch(/gh issue edit --add-label.*--remove-label.*step 1/i);
    expect(setup).not.toMatch(/permission-mode\s+dangerous/i);
    expect(foreman).not.toMatch(/permission-mode\s+dangerous/i);
  });

  it('stores one learning per issue and keeps the archive frozen', () => {
    const agents = agentRuleFiles.map((path) => read(path)).join('\n');
    const lane = read('docs/agents/lane.md');
    const foreman = read('docs/agents/foreman.md');
    const prLoop = read('docs/agents/pr-loop.md');
    const setup = read('docs/agents/setup-decisions.md');
    const archive = read('docs/ai/LEARNINGS.md');
    const learning = read('docs/ai/learnings/666.md');

    expect(agents).not.toMatch(/foreman.{0,100}(?:copy|edit|append|write).{0,100}LEARNINGS\.md/i);
    expect(agents).not.toMatch(/LEARNINGS\.md.{0,100}foreman.{0,100}(?:copy|edit|append|write)/i);
    expect(lane).toMatch(/docs\/ai\/learnings\/<issue>\.md/);
    expect(lane).toMatch(/docs\/ai\/LEARNINGS\.md/);
    expect(foreman).toMatch(/missing learnings file.*should-fix/i);
    expect(foreman).toMatch(/edits no files after merge/i);
    expect(prLoop).toMatch(/docs\/ai\/learnings\/<issue>\.md/);
    expect(setup).toMatch(/update-branch/);
    expect(setup).toMatch(/no bypass push/i);
    expect(setup).toMatch(/no foreman writes/i);
    expect(archive.split('\n')[0]).toMatch(/frozen/i);
    expect(archive.split('\n')[0]).toMatch(/docs\/ai\/learnings\//);
    expect(learning).toMatch(/^# .+/);
    expect(learning).toMatch(/^- \*\*Learning\*\*: [^\n]+$/m);
    expect(learning).toMatch(/^- \*\*Task\/PR\*\*: #666$/m);
  });

  it('uses CI placeholder values for builds without creating or replacing lane secrets', () => {
    const workflow = read('.github/workflows/ci.yml');
    const agents = read('AGENTS.md');
    const lane = read('docs/agents/lane.md');
    const url = workflow.match(/NEXT_PUBLIC_SUPABASE_URL:-([^}\n]+)/)?.[1];
    const key = workflow.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY:-([^}\n]+)/)?.[1];

    expect(url).toBeTruthy();
    expect(key).toBeTruthy();
    expect(agents).toContain(`NEXT_PUBLIC_SUPABASE_URL=${url}`);
    expect(agents).toContain(`NEXT_PUBLIC_SUPABASE_ANON_KEY=${key}`);
    expect(lane).toContain(`NEXT_PUBLIC_SUPABASE_URL=${url}`);
    expect(lane).toContain(`NEXT_PUBLIC_SUPABASE_ANON_KEY=${key}`);
    const buildCommand = `NEXT_PUBLIC_SUPABASE_URL=${url} \\\nNEXT_PUBLIC_SUPABASE_ANON_KEY=${key} \\\nnpm run build`;
    expect(agents).toContain(buildCommand);
    expect(lane).toContain(buildCommand);
    expect(agents).toMatch(/\.env\.local.*placeholders/i);
    expect(lane).toMatch(/\.env\.local.*placeholders/i);
    expect(agents).toMatch(/never receives or requests real credentials/i);
  });
});
