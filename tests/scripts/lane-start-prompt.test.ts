import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  createLaneRepo,
  ghStub,
  herdrWorktreeCreateCase,
  laneEntrypoint,
  laneSh,
  shellQuote,
} from './helpers/lane';
import { spawnTestTimeoutMs } from './helpers/timeout';

type PromptOutcome = 'working' | 'stalled' | 'failed';

// The stub answers the nth `agent prompt` call with the nth outcome.
const startLane = (
  shell: 'bash' | 'zsh',
  outcomes: PromptOutcome[],
  agent: 'copilot' | 'devin' = 'devin',
) => {
  const fixture = realpathSync(mkdtempSync(join(tmpdir(), 'lane-start-prompt-')));
  try {
    const bin = join(fixture, 'bin');
    const log = join(fixture, 'herdr.log');
    const { root } = createLaneRepo(fixture);
    mkdirSync(bin);

    writeFileSync(join(bin, 'gh'), ghStub, { mode: 0o755 });
    writeFileSync(
      join(bin, 'herdr'),
      `#!/bin/sh
printf '%s\\n' "$*" >> "$HERDR_LOG"
case "$1 $2" in
${herdrWorktreeCreateCase}  "agent prompt")
    n=$(grep -c '^agent prompt ' "$HERDR_LOG")
    outcome=$(printf '%s\\n' "$PROMPT_OUTCOMES" | cut -d, -f"$n")
    if [ "$outcome" = failed ]; then
      printf '%s\\n' '{"error":{"code":"agent_not_found","message":"agent_prompt_stalled is not this"}}' >&2
      exit 1
    fi
    if [ "$outcome" = stalled ]; then
      printf '%s\\n' '{"error":{"code":"agent_prompt_stalled","message":"no working state"}}' >&2
      exit 1
    fi
    printf '%s\\n' '{"result":{"agent_status":"working"}}'
    ;;
esac
`,
      { mode: 0o755 },
    );

    const env = {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      HERDR_LOG: log,
      REPO_ROOT: root,
      PROMPT_OUTCOMES: outcomes.join(','),
    };
    const args = ['676', 'prompt-race', agent];
    const result =
      shell === 'bash'
        ? spawnSync('bash', [laneEntrypoint, 'start', ...args], {
            cwd: root,
            encoding: 'utf8',
            env,
          })
        : spawnSync('zsh', ['-f', '-c', `source ${shellQuote(laneSh)}\nlane ${args.join(' ')}`], {
            cwd: root,
            encoding: 'utf8',
            env,
          });
    const calls = readFileSync(log, 'utf8').split('\n').filter(Boolean);
    return { result, calls, output: `${result.stdout}${result.stderr}` };
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
};

const afterStart = (calls: string[]) =>
  calls.slice(calls.findIndex((c) => c.startsWith('agent start')) + 1);
const prompts = (calls: string[]) => calls.filter((c) => c.startsWith('agent prompt'));

describe('lane start prompt race (#676)', { timeout: spawnTestTimeoutMs }, () => {
  for (const shell of ['bash', 'zsh'] as const) {
    describe(shell, () => {
      it('no prompt before ready: a stalled first prompt waits for the agent and re-sends once', () => {
        const { result, calls } = startLane(shell, ['stalled', 'working']);
        expect(result.status, result.stderr).toBe(0);
        const after = afterStart(calls);
        expect(prompts(after)).toHaveLength(2);
        expect(prompts(after).every((c) => c.startsWith('agent prompt lane-676 '))).toBe(true);
        const firstPrompt = after.findIndex((c) => c.startsWith('agent prompt'));
        const secondPrompt =
          after.length - 1 - [...after].reverse().findIndex((c) => c.startsWith('agent prompt'));
        const between = after.slice(firstPrompt + 1, secondPrompt);
        const waits = between.filter((c) => c.startsWith('agent wait lane-676'));
        expect(waits).toHaveLength(1);
        expect(waits[0]).toContain('--until idle');
        expect(after[firstPrompt]).toBe(after[secondPrompt]);
        expect(between.some((c) => /^agent (prompt|send-keys)/.test(c))).toBe(false);
      });

      it('no duplicate on success: a working first prompt is sent exactly once', () => {
        const { result, calls } = startLane(shell, ['working']);
        expect(result.status, result.stderr).toBe(0);
        expect(prompts(calls)).toHaveLength(1);
        expect(prompts(calls)[0]).toContain('--wait');
      });

      it('clear failure: a second stall exits non-zero naming lane-676 and the pane, with no third prompt', () => {
        const { result, calls, output } = startLane(shell, ['stalled', 'stalled', 'working']);
        expect(result.status).not.toBe(0);
        expect(output).toContain('lane-676');
        expect(output).toContain('pane-lane');
        expect(prompts(calls)).toHaveLength(2);
      });
    });
  }

  it('a non-stall prompt failure exits non-zero without waiting or retrying', () => {
    const { result, calls, output } = startLane('bash', ['failed', 'working']);
    expect(result.status).not.toBe(0);
    expect(prompts(calls)).toHaveLength(1);
    expect(calls.some((c) => c.startsWith('agent wait'))).toBe(false);
    expect(output).toContain('lane-676');
    expect(output).toContain('pane-lane');
  });

  it('Copilot path unchanged: one prompt, one agent start', () => {
    const { result, calls } = startLane('bash', ['working'], 'copilot');
    expect(result.status, result.stderr).toBe(0);
    expect(calls.filter((c) => c.startsWith('agent start'))).toHaveLength(1);
    expect(prompts(calls)).toHaveLength(1);
    expect(prompts(calls)[0]).toMatch(
      /^agent prompt lane-676 .+ --wait --until working --until blocked --until done$/,
    );
  });
});
