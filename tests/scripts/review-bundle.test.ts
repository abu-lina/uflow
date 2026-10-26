import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { spawnTestTimeoutMs } from './helpers/timeout';

const repoRoot = new URL('../..', import.meta.url).pathname;
const bundleScript = join(repoRoot, 'scripts', 'review-bundle');

// Canned GitHub answers. Every call is logged so the tests can see what ran.
const stubGh = `#!/bin/sh
printf '%s\\n' "$*" >> "$GH_LOG"
case "$1 $2" in
  "pr diff") printf 'diff --git a/src/a.ts b/src/a.ts\\n+DIFF-MARKER\\n' ;;
  "pr view")
    case "$*" in
      *files*) printf 'src/a.ts\\nsrc/b.ts\\nsrc/deleted.ts\\n' ;;
      *headRefOid*) printf 'abc123\\n' ;;
      *body*) printf 'Adds the thing.\\n\\nCloses #77\\n' ;;
    esac
    ;;
  "issue view") printf 'CRITERIA-MARKER for issue %s\\n' "$3" ;;
  "api "*)
    case "$*" in
      *deleted.ts*) exit 1 ;;
      *) printf 'HEAD-CONTENT of %s\\n' "$*" ;;
    esac
    ;;
esac
`;

const stubGit = `#!/bin/sh
printf '%s\\n' "$*" >> "$GIT_LOG"
exit 1
`;

const run = (args: string[]) => {
  const fixture = mkdtempSync(join(tmpdir(), 'review-bundle-'));
  const bin = join(fixture, 'bin');
  const tmp = join(fixture, 'tmp');
  mkdirSync(bin);
  mkdirSync(tmp);
  writeFileSync(join(bin, 'gh'), stubGh, { mode: 0o755 });
  writeFileSync(join(bin, 'git'), stubGit, { mode: 0o755 });
  const ghLog = join(fixture, 'gh.log');
  const gitLog = join(fixture, 'git.log');
  try {
    const result = spawnSync(bundleScript, args, {
      cwd: fixture,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${bin}:${process.env.PATH}`,
        TMPDIR: tmp,
        GH_LOG: ghLog,
        GIT_LOG: gitLog,
      },
    });
    const ghCalls = existsSync(ghLog) ? readFileSync(ghLog, 'utf8').trimEnd().split('\n') : [];
    const gitCalls = existsSync(gitLog) ? readFileSync(gitLog, 'utf8').trimEnd().split('\n') : [];
    const bundlePath = result.stdout.trim();
    const bundle = existsSync(bundlePath) ? readFileSync(bundlePath, 'utf8') : '';
    const bundleMode = existsSync(bundlePath) ? statSync(join(bundlePath, '..')).mode & 0o777 : 0;
    return {
      result,
      ghCalls,
      gitCalls,
      bundlePath,
      bundle,
      bundleMode,
      tmpEntries: readdirSync(tmp),
      tmp: realpathSync(tmp),
    };
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
};

describe('scripts/review-bundle (#685)', { timeout: spawnTestTimeoutMs }, () => {
  it('is an executable bash script', () => {
    expect(existsSync(bundleScript)).toBe(true);
    expect(statSync(bundleScript).mode & 0o111).not.toBe(0);
    expect(spawnSync('bash', ['-n', bundleScript]).status).toBe(0);
  });

  it('AC1: the bundle holds the PR diff', () => {
    const { result, bundle } = run(['123']);
    expect(result.status, result.stderr).toBe(0);
    expect(bundle).toContain('DIFF-MARKER');
    expect(bundle.split('\n')[0]).toBe('# Review bundle for PR 123');
  });

  it("AC1: the bundle holds the linked issue's acceptance criteria", () => {
    const { bundle, ghCalls } = run(['123']);
    expect(bundle).toContain('CRITERIA-MARKER for issue 77');
    expect(ghCalls).toContain('issue view 77');
  });

  it('AC1: the bundle holds the PR-head content of each touched file, not the local checkout', () => {
    const { bundle, ghCalls } = run(['123']);
    expect(bundle).toContain('HEAD-CONTENT of');
    expect(bundle).toContain('src/a.ts');
    expect(bundle).toContain('src/b.ts');
    const apiCalls = ghCalls.filter((call) => call.startsWith('api '));
    expect(apiCalls.length).toBeGreaterThanOrEqual(2);
    for (const call of apiCalls) expect(call).toContain('abc123');
  });

  it('keeps going when a touched file is gone at the PR head (deleted file)', () => {
    const { result, bundle } = run(['123']);
    expect(result.status, result.stderr).toBe(0);
    expect(bundle).toContain('src/deleted.ts');
    expect(bundle).toContain('DIFF-MARKER');
  });

  it('prints one absolute path to a bundle file in a private directory under $TMPDIR', () => {
    const { result, bundlePath, bundleMode, tmp } = run(['123']);
    expect(result.stdout.trim().split('\n')).toHaveLength(1);
    expect(bundlePath.startsWith(`${tmp}/review-bundle.`)).toBe(true);
    expect(bundleMode).toBe(0o700);
  });

  it('AC2: only reads from GitHub and never calls git', () => {
    const { ghCalls, gitCalls } = run(['123']);
    expect(gitCalls).toEqual([]);
    expect(ghCalls.length).toBeGreaterThan(0);
    for (const call of ghCalls) {
      expect(call).toMatch(/^(pr diff|pr view|issue view|api) /);
      expect(call).not.toMatch(
        /(^| )(-X|--method|-f|-F|--field|--raw-field|--input|--comment|--body|--add-label)( |=|$)/,
      );
    }
  });

  it('AC2: the script text has no mutating gh or git command', () => {
    const script = readFileSync(bundleScript, 'utf8');
    for (const forbidden of [
      'gh pr review',
      'gh pr merge',
      'gh pr comment',
      'gh issue comment',
      'gh issue edit',
      'git push',
      'git commit',
    ]) {
      expect(script).not.toContain(forbidden);
    }
  });

  it.each([
    ['no argument', []],
    ['an empty string', ['']],
    ['a word', ['abc']],
    ['zero', ['0']],
    ['a negative number', ['-1']],
    ['a leading zero', ['012']],
    ['a decimal', ['1.5']],
    ['a flag', ['--help']],
    ['a flag with a PR number', ['--repo', '123']],
    ['two arguments', ['1', '2']],
    ['a PR number and a flag', ['123', '--web']],
    ['a number with a space', ['1 2']],
    ['a semicolon', ['1;touch pwned']],
    ['a command substitution', ['$(touch pwned)']],
    ['a backtick', ['`touch pwned`']],
    ['a pipe', ['1|cat']],
    ['a newline', ['1\n2']],
    ['an absurdly long number', ['99999999999999999999']],
  ])('AC1 (owner): rejects %s with a usage message and does nothing', (_name, args) => {
    const { result, ghCalls, gitCalls, tmpEntries } = run(args);
    expect(result.status).not.toBe(0);
    expect(result.stderr.toLowerCase()).toContain('usage');
    expect(result.stderr).toContain('scripts/review-bundle <pr-number>');
    expect(result.stdout).toBe('');
    expect(ghCalls).toEqual([]);
    expect(gitCalls).toEqual([]);
    expect(tmpEntries).toEqual([]);
  });

  it('accepts a plain positive integer', () => {
    const { result } = run(['1']);
    expect(result.status, result.stderr).toBe(0);
  });
});
