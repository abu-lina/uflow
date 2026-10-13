import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const laneScript = readFileSync(new URL('../../scripts/lane.sh', import.meta.url), 'utf8');
const laneGuide = readFileSync(new URL('../../docs/agents/lane.md', import.meta.url), 'utf8');
const foremanGuide = readFileSync(new URL('../../docs/agents/foreman.md', import.meta.url), 'utf8');
const setupDecisions = readFileSync(new URL('../../docs/agents/setup-decisions.md', import.meta.url), 'utf8');

describe('lane shell helpers', () => {
  it('enables silence monitoring and visual-silence on the lane window', () => {
    expect(laneScript).toContain('monitor-silence 60');
    expect(laneScript).toContain('visual-silence on');
  });

  it('labels idle lane windows in lane_status and mentions issue comments before stopping', () => {
    expect(laneScript).toContain('window_silence_flag');
    expect(laneScript).toMatch(/idle/i);
    expect(laneScript).toContain('comment on the issue');
    expect(laneGuide).toContain('comment on the issue');
    expect(foremanGuide).toContain('issue comments');
  });

  it('starts a default Devin foreman in the main checkout tmux window', () => {
    expect(laneScript).toContain('_foreman_prompt()');
    expect(laneScript).toMatch(/foreman\(\)[\s\S]*?agent="\$\{1:-devin\}"/);
    expect(laneScript).toContain('run foreman from the main checkout, not a worktree');
    expect(laneScript).toMatch(/tmux new-window -t "\$session" -n foreman -c "\$root"/);
    expect(laneScript).toContain('tmux select-window -t "$session:foreman"');
    expect(foremanGuide).toContain('foreman [copilot|devin]');
    expect(foremanGuide).toContain('inside the tmux session it supervises');
  });

  it('gives the foreman a read-only role and approval-first prompt', () => {
    expect(laneScript).toMatch(/_foreman_prompt\(\)[\s\S]*?docs\/agents\/foreman\.md/);
    expect(laneScript).toMatch(/_foreman_prompt\(\)[\s\S]*?never write code/);
    expect(laneScript).toMatch(/_foreman_prompt\(\)[\s\S]*?wait for approval/);
  });

  it('passes per-invocation model or reasoning effort to both agent roles', () => {
    expect(laneScript).toMatch(/copilot[\s\S]*?--reasoning-effort/);
    expect(laneScript).toMatch(/copilot[\s\S]*?--model/);
    expect(laneScript).toMatch(/devin[\s\S]*?--model/);
  });

  it('limits Copilot lane approvals to required tools and denies dangerous git and PR actions', () => {
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
      'shell(git push --force)',
      'shell(gh pr merge)',
    ]) {
      expect(laneScript).toContain(tool);
    }
  });

  it('uses scoped Devin permissions and avoids blanket Copilot permissions', () => {
    expect(laneScript).toContain('--permission-mode accept-edits --sandbox');
    expect(laneScript).toContain('--permission-mode auto');
    expect(laneScript).not.toMatch(/--allow-all-paths|--allow-all(?:\s|$)|--yolo/);
  });

  it('documents model defaults, permission policy, and folder trust findings', () => {
    expect(foremanGuide).toContain('devin');
    expect(foremanGuide).toContain('model');
    expect(setupDecisions).toContain('Ghostty');
    expect(setupDecisions).toContain('trustedFolders');
    expect(setupDecisions).toContain('allow-all-paths');
  });
});
