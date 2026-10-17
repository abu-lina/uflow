import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = new URL('../..', import.meta.url).pathname;
const read = (file: string) => readFileSync(join(repoRoot, file), 'utf8');
const foreman = JSON.parse(read('.devin/foreman.json')) as {
  permissions: { allow: string[]; ask: string[]; deny: string[] };
};

// The foreman's lists as they were before #685; review only adds one allow rule.
const baselineAllow = [
  'read',
  'grep',
  'glob',
  'Exec(git status)',
  'Exec(git rev-list)',
  'Exec(git rev-parse)',
  'Exec(git ls-files)',
  'Exec(git check-ignore)',
  'Exec(git branch --show-current)',
  'Exec(gh issue view)',
  'Exec(gh issue list)',
  'Exec(gh issue comment)',
  'Exec(gh issue create)',
  'Exec(gh pr view)',
  'Exec(gh pr list)',
  'Exec(gh pr diff)',
  'Exec(gh pr checks)',
  'Exec(gh pr review)',
  'Exec(gh pr update-branch)',
  'Exec(herdr agent list)',
  'Exec(herdr agent get)',
  'Exec(herdr agent read)',
  'Exec(herdr agent wait)',
  'Exec(herdr agent prompt)',
  'Exec(herdr agent send-keys)',
  'Exec(herdr pane read)',
  'Exec(scripts/lane status)',
];
const baselineAsk = [
  'Exec(scripts/lane start)',
  'Exec(scripts/lane done)',
  'Exec(gh pr close)',
  'Exec(herdr tab)',
  'Exec(herdr workspace)',
  'Exec(herdr worktree)',
];
const baselineDeny = [
  'edit',
  'Write(**)',
  'Exec(git add)',
  'Exec(git commit)',
  'Exec(git push)',
  'Exec(git merge)',
  'Exec(git rebase)',
  'Exec(git reset)',
  'Exec(git checkout)',
  'Exec(git switch)',
  'Exec(git restore)',
  'Exec(git stash)',
  'Exec(git clean)',
  'Exec(git rm)',
  'Exec(git diff --output)',
  'Exec(git log --output)',
  'Exec(git show --output)',
  'Exec(git diff --output=)',
  'Exec(git log --output=)',
  'Exec(git show --output=)',
  'Exec(git fetch --upload-pack)',
  'Exec(git fetch --upload-pack=)',
  'Exec(git fetch -u)',
  'Exec(git -C)',
  'Exec(git -c)',
  'Exec(env)',
  'Exec(command)',
  'Exec(bash)',
  'Exec(sh)',
  'Exec(zsh)',
  'Exec(eval)',
  'Exec(exec)',
  'Exec(xargs)',
  'Exec(npm)',
  'Exec(npx)',
  'Exec(node)',
  'Exec(rm)',
  'Exec(gh pr merge)',
  'Exec(gh issue delete)',
  'Exec(gh issue transfer)',
  'Exec(gh issue close)',
  'Exec(gh issue pin)',
  'Exec(gh issue lock)',
  'Exec(gh repo)',
  'mcp__*',
];

const frontmatter = (file: string) => {
  const match = /^---\n([\s\S]*?)\n---/.exec(read(file));
  return match ? match[1] : '';
};

const step5 = () => {
  const text = read('docs/agents/foreman.md');
  const start = text.indexOf('## 5. Trigger review');
  const end = text.indexOf('## 6.');
  return text.slice(start, end);
};

describe('foreman review subagents (#685)', () => {
  it("AC3: the foreman's allow, ask and deny lists change only by Exec(scripts/review-bundle)", () => {
    expect(foreman.permissions.allow).toContain('Exec(scripts/review-bundle)');
    expect(
      foreman.permissions.allow.filter((rule) => rule !== 'Exec(scripts/review-bundle)'),
    ).toEqual(baselineAllow);
    expect(foreman.permissions.ask).toEqual(baselineAsk);
    expect(foreman.permissions.deny).toEqual(baselineDeny);
  });

  it('AC1: a reviewer profile exists with only read, grep and glob', () => {
    expect(existsSync(join(repoRoot, '.devin/agents/reviewer.md'))).toBe(true);
    const fm = frontmatter('.devin/agents/reviewer.md');
    expect(fm).toMatch(/^name: reviewer$/m);
    const tools = Array.from(fm.matchAll(/^ {2}- (\S+)$/gm), (m) => m[1]);
    expect(tools.sort()).toEqual(['glob', 'grep', 'read']);
  });

  it('AC2: the reviewer profile grants no exec, write or edit, so gh pr review/merge, gh issue comment/edit, git push/commit and file writes are not granted', () => {
    const fm = frontmatter('.devin/agents/reviewer.md');
    for (const tool of ['exec', 'write', 'edit', 'run_subagent', 'request_scope']) {
      expect(fm).not.toMatch(new RegExp(`^ {2}- ${tool}$`, 'm'));
    }
    // Devin ignores permissions in a profile; a block would only imply a guard that isn't there.
    expect(fm).not.toMatch(/^permissions:/m);
    expect(fm).toMatch(/^allowed-tools:/m);
  });

  it('AC2: no review command is allowed by a rule the reviewer could reach', () => {
    const profile = read('.devin/agents/reviewer.md');
    for (const command of [
      'gh pr review',
      'gh pr merge',
      'gh issue comment',
      'gh issue edit',
      'git push',
      'git commit',
    ]) {
      expect(frontmatter('.devin/agents/reviewer.md')).not.toContain(command);
    }
    expect(profile).toContain('scripts/review-bundle');
  });

  it('AC4: review.md says the review runs automatically, via the bundle and the reviewer profile', () => {
    const doc = read('docs/agents/review.md');
    expect(doc).toContain('scripts/review-bundle');
    expect(doc).toContain('reviewer');
    expect(doc).toMatch(/automatically/i);
    expect(doc).not.toContain('(`gh pr diff <pr>`)');
  });

  it('AC4: review.md says the foreman asks the owner only for decisions, each with a recommendation', () => {
    const doc = read('docs/agents/review.md');
    expect(doc).toMatch(/only for (a )?decisions?/i);
    expect(doc).toMatch(/recommendation/i);
  });

  it('AC4: step 5 of foreman.md says a review runs automatically when a lane reports done', () => {
    const text = step5();
    expect(text).toMatch(/automatically/i);
    expect(text).toContain('scripts/review-bundle');
    expect(text).toMatch(/reports done/i);
  });

  it('AC4: step 5 of foreman.md says the owner is asked only for decisions, each with a recommendation', () => {
    const text = step5();
    expect(text).toMatch(/only for (a )?decisions?/i);
    expect(text).toMatch(/recommendation/i);
  });

  it('foreman.md lists scripts/review-bundle in the command table', () => {
    expect(read('docs/agents/foreman.md')).toContain('`scripts/review-bundle`');
  });

  it('AC3 (owner): verify-foreman-permissions.sh probes scripts/review-bundle without a prompt', () => {
    const script = read('scripts/verify-foreman-permissions.sh');
    expect(script).toContain('scripts/review-bundle 123');
  });

  it('AC3 (owner): verify-foreman-permissions.sh probes a reviewer subagent: reads the bundle, cannot exec, write or edit', () => {
    const script = read('scripts/verify-foreman-permissions.sh');
    expect(script).toContain('reviewer');
    expect(script).toContain('reviewer-exec-probe.txt');
    expect(script).toContain('reviewer-write-probe.txt');
    expect(script).toContain('reviewer-edit-probe.txt');
  });
});
