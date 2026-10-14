import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const laneScript = readFileSync(new URL('../../scripts/lane.sh', import.meta.url), 'utf8');
const laneGuide = readFileSync(new URL('../../docs/agents/lane.md', import.meta.url), 'utf8');
const foremanGuide = readFileSync(new URL('../../docs/agents/foreman.md', import.meta.url), 'utf8');
const setupDecisions = readFileSync(new URL('../../docs/agents/setup-decisions.md', import.meta.url), 'utf8');

describe('lane shell helpers', () => {
  it('uses Herdr instead of tmux for agent work', () => {
    for (const file of [laneScript, laneGuide, foremanGuide]) {
      expect(file).not.toContain('tmux');
    }
  });

  it('creates the linked branch and Herdr worktree with its root pane', () => {
    expect(laneScript).toContain('gh issue develop "$issue" --name "$branch" --base main');
    expect(laneScript).toContain('herdr worktree create');
    for (const flag of ['--cwd', '--branch', '--base main', '--path', '--label']) {
      expect(laneScript).toContain(flag);
    }
    expect(laneScript).toContain('--label "#$issue $slug"');
    expect(laneScript).toContain('.result.root_pane.pane_id');
  });

  it('starts the selected agent in the returned pane and submits the lane prompt', () => {
    expect(laneScript).toContain('herdr agent start');
    expect(laneScript).toContain('--kind "$agent"');
    expect(laneScript).toContain('--pane "$pane"');
    expect(laneScript).toContain('herdr agent prompt');
    expect(laneScript).toContain('_lane_prompt "$issue"');
  });

  it('preserves the scoped Copilot and Devin lane permissions', () => {
    for (const tool of [
      'write',
      'shell(npm:*)',
      'shell(npx:*)',
      'shell(git:*)',
      'shell(gh issue:*)',
      'shell(gh pr create)',
      'shell(gh pr checks)',
      'shell(git merge)',
      'shell(git rebase)',
      'write(.env.local)',
      'shell(gh pr merge)',
    ]) {
      expect(laneScript).toContain(tool);
    }
    expect(laneScript).toContain('--permission-mode accept-edits --sandbox');
  });

  it('writes only lane ports and clones dependencies without copying environment files', () => {
    expect(laneScript).toContain('PORT=$port');
    expect(laneScript).toContain('PLAYWRIGHT_BASE_URL=http://127.0.0.1:$port');
    expect(laneScript).not.toContain('SUPABASE_PROJECT_ID');
    expect(laneScript).toContain('cp -c -R "$root/node_modules"');
    expect(laneScript).not.toContain('cp "$f" "$dir/"');
  });

  it('focuses an existing Herdr lane and refuses nested worktrees', () => {
    expect(laneScript).toContain('run lane from the main checkout, not a worktree');
    expect(laneScript).toContain('herdr workspace focus');
    expect(laneScript).toContain('herdr workspace list');
  });

  it('guards lane cleanup and removes or closes its Herdr workspace before deleting the checkout', () => {
    for (const guard of [
      'not MERGED',
      'has uncommitted changes',
      'has unpushed commits',
      'still listens on :$port',
    ]) {
      expect(laneScript).toContain(guard);
    }
    expect(laneScript).toContain('herdr worktree remove');
    expect(laneScript).toContain('herdr workspace close');
    expect(laneScript).toContain('herdr workspace list');
    expect(laneScript.indexOf('herdr worktree remove')).toBeLessThan(
      laneScript.indexOf('git worktree remove'),
    );
  });

  it('reports lane agents and orphaned Herdr workspaces', () => {
    expect(laneScript).toContain('herdr agent list');
    expect(laneScript).toContain('workspace label');
    expect(laneScript).toContain('branch');
    expect(laneScript).toContain('checkout_path');
    expect(laneScript).toContain('does not exist');
    expect(laneScript).toContain('No lanes open.');
  });

  it('starts the default Devin foreman in the main workspace pane with Herdr skill context', () => {
    expect(laneScript).toMatch(/foreman\(\)[\s\S]*?agent="\$\{1:-devin\}"/);
    expect(laneScript).toContain('claude-opus-5-5-high');
    expect(laneScript).toContain('herdr --skill');
    expect(laneScript).toContain('herdr agent start foreman');
    expect(laneScript).toContain('herdr pane current');
  });

  it('uses a non-prompting foreman permission mode and explains the choice', () => {
    expect(laneScript).toContain('--permission-mode dangerous');
    expect(laneScript).toContain('auto mode prompts for generic shell reads');
  });

  it('tells the foreman to wait for blocked or completed lanes', () => {
    expect(laneScript).toContain('herdr agent wait <lane> --until blocked --until done');
  });

  it('documents Herdr commands and removes tmux workflow instructions', () => {
    expect(foremanGuide).toContain('foreman [copilot|devin]');
    for (const mapping of [
      'lane status',
      'reading a lane',
      'sending keys to a lane',
      'starting a lane',
      'cleaning up a lane',
    ]) {
      expect(foremanGuide.toLowerCase()).toContain(mapping);
    }
  });

  it('records the Herdr notification and environment decisions', () => {
    expect(setupDecisions).toContain('Herdr');
    expect(setupDecisions).toContain('delivery = "system"');
    expect(setupDecisions).toContain('.env.local');
  });

  it('keeps the foreman read-only and approval-first', () => {
    expect(laneScript).toMatch(/_foreman_prompt\(\)[\s\S]*?never write code/i);
    expect(laneScript).toMatch(/_foreman_prompt\(\)[\s\S]*?wait for approval/);
  });

  it('passes per-invocation model or reasoning effort to both agent roles', () => {
    expect(laneScript).toMatch(/copilot[\s\S]*?--reasoning-effort/);
    expect(laneScript).toMatch(/copilot[\s\S]*?--model/);
    expect(laneScript).toMatch(/devin[\s\S]*?--model/);
  });

  it('keeps issue-comment reporting in the lane instructions', () => {
    expect(laneScript).toContain('comment on the issue');
    expect(laneGuide).toContain('comment on the issue');
    expect(foremanGuide).toContain('issue comments');
  });

  it('documents model defaults and scoped permission decisions', () => {
    expect(foremanGuide).toContain('claude-opus-5-5-high');
    expect(setupDecisions).toContain('Ghostty');
    expect(setupDecisions).toContain('trustedFolders');
    expect(setupDecisions).toContain('allow-all-paths');
  });
});
