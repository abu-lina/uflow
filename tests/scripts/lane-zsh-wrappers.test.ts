import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { laneSh, shellQuote } from './helpers/lane';
import { spawnTestTimeoutMs } from './helpers/timeout';

const readme = readFileSync(new URL('../../scripts/README.md', import.meta.url), 'utf8');

const zsh = (script: string, env: NodeJS.ProcessEnv = process.env) =>
  spawnSync('zsh', ['-f', '-c', script], { encoding: 'utf8', env });

describe('zsh wrappers for scripts/lane.sh', { timeout: spawnTestTimeoutMs }, () => {
  it('defines lane, lane_done, lane_status and foreman but no helper functions in zsh', () => {
    const result = zsh(`source ${shellQuote(laneSh)}
for f in lane lane_done lane_status foreman; do
  (( \${+functions[$f]} )) || echo "missing $f"
done
print -l \${(k)functions} | grep -E '^_(lane|foreman|agent|herdr)_' || true`);
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('');
  });

  it('leaves PATH and path unchanged when sourced in zsh', () => {
    const result = zsh(`before="$PATH|\${(j.:.)path}"
source ${shellQuote(laneSh)}
[[ "$before" == "$PATH|\${(j.:.)path}" ]] && echo same || echo changed`);
    expect(result.stdout.trim()).toBe('same');
  });

  const subcommands = [
    ['lane', 'start'],
    ['lane_done', 'done'],
    ['lane_status', 'status'],
    ['foreman', 'foreman'],
  ] as const;

  const withStubbedLane = (exitCode: number, run: (dir: string) => void) => {
    const dir = mkdtempSync(join(tmpdir(), 'lane-wrap-'));
    try {
      const scripts = join(dir, 'scripts');
      mkdirSync(scripts);
      const bin = join(dir, 'bin');
      mkdirSync(bin);
      writeFileSync(join(scripts, 'lane.sh'), readFileSync(laneSh));
      writeFileSync(
        join(scripts, 'lane'),
        `#!/usr/bin/env bash\nprintf '%s\\n' "$@" > "${dir}/args"\nexit ${exitCode}\n`,
      );
      chmodSync(join(scripts, 'lane'), 0o755);
      for (const tool of ['herdr', 'gh', 'git']) {
        writeFileSync(join(bin, tool), '#!/bin/sh\nexit 0\n');
        chmodSync(join(bin, tool), 0o755);
      }
      run(dir);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };

  it.each(subcommands)('%s forwards all arguments unchanged to scripts/lane %s', (fn, sub) => {
    withStubbedLane(0, (dir) => {
      const result = zsh(
        `source ${shellQuote(join(dir, 'scripts/lane.sh'))}; ${fn} 'a b' '' "c'd" '*'`,
        { ...process.env, PATH: `${join(dir, 'bin')}:${process.env.PATH}` },
      );
      expect(result.status).toBe(0);
      expect(readFileSync(join(dir, 'args'), 'utf8')).toBe(`${sub}\na b\n\nc'd\n*\n`);
    });
  });

  it.each(subcommands)('%s returns the exit status of scripts/lane', (fn) => {
    withStubbedLane(7, (dir) => {
      const result = zsh(`source ${shellQuote(join(dir, 'scripts/lane.sh'))}; ${fn} x; echo $?`, {
        ...process.env,
        PATH: `${join(dir, 'bin')}:${process.env.PATH}`,
      });
      expect(result.stdout.trim()).toBe('7');
    });
  });

  it('documents the zsh wrappers and that all logic runs under bash', () => {
    expect(readme).toMatch(/zsh/i);
    expect(readme).toMatch(/wrapper/i);
    expect(readme).toMatch(/under bash/i);
  });
});
