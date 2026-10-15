import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../..', import.meta.url));
const read = (path: string) => readFileSync(join(root, path), 'utf8');

const agentRuleFiles = [
  'AGENTS.md',
  ...readdirSync(join(root, 'docs/agents'), { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => `docs/agents/${entry.name}`),
];

describe('agent documentation rules', () => {
  it('documents the foreman config, permissions, and intentional remote writes', () => {
    const foreman = read('docs/agents/foreman.md');
    const setup = read('docs/agents/setup-decisions.md');

    expect(foreman).toMatch(/Normal mode/i);
    expect(foreman).toMatch(/--config/);
    expect(foreman).toMatch(/0600/);
    expect(foreman).toMatch(/mktemp -d/);
    expect(foreman).toMatch(/\$TMPDIR/);
    expect(foreman).toMatch(/org_id/);
    expect(foreman).toMatch(/always allow/);
    expect(foreman).toMatch(/doesn't merge/i);
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
    expect(learning).toMatch(/^- \*\*Learning\*\*: .+\n/);
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
    expect(agents).toMatch(/\.env\.local.*placeholders/i);
    expect(lane).toMatch(/\.env\.local.*placeholders/i);
    expect(agents).toMatch(/never receives or requests real credentials/i);
  });
});
