import { execFileSync, spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = new URL('../..', import.meta.url).pathname;
const verifyScript = join(repoRoot, 'scripts', 'verify-foreman-permissions.sh');
const foremanConfig = join(repoRoot, '.devin', 'foreman.json');
const probeCount = 13;

const stubDevin = `#!/bin/sh
printf '%s\\n' "$*" >> "$DEVIN_LOG"
for instruction; do :; done
case "$instruction" in
  "Run this exact shell command"*) cmd="\${instruction#*: }" ;;
  *) cmd="" ;;
esac
if [ "$STUB_MODE" = compliant ]; then
  case "$cmd" in
    "git log -1 --oneline"|"gh issue list --limit 1"|"herdr agent list"|"scripts/lane status")
      eval "$cmd"
      exit $?
      ;;
  esac
  echo "The tool call was denied by the permission rules."
  exit 0
fi
case "$instruction" in
  *probe.txt*) touch probe.txt ;;
  *LEARNINGS*) echo probe >> docs/ai/LEARNINGS.md ;;
  *"npm install"*) echo probe >> package.json ;;
  *"scripts/lane start"*) herdr worktree create --path probe ;;
  *MCP*) echo "Tables: providers, listings" ;;
  *"git log"*|*"gh issue list"*|*"herdr agent list"*|*"scripts/lane status"*) exit 1 ;;
  *) eval "$cmd" ;;
esac
`;

const createFixture = () => {
  const fixture = mkdtempSync(join(tmpdir(), 'foreman-permissions-'));
  const root = join(fixture, 'repo');
  const bin = join(fixture, 'bin');
  mkdirSync(bin);
  for (const file of [
    'scripts/verify-foreman-permissions.sh',
    'scripts/lane',
    'scripts/lane.sh',
    '.devin/foreman.json',
  ]) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    copyFileSync(join(repoRoot, file), join(root, file));
  }
  mkdirSync(join(root, 'docs', 'ai'), { recursive: true });
  writeFileSync(join(root, 'docs', 'ai', 'LEARNINGS.md'), '# Learnings\n');
  writeFileSync(join(root, 'package.json'), '{}\n');
  writeFileSync(join(root, 'package-lock.json'), '{}\n');
  execFileSync('git', ['init', '-b', 'main', root], { stdio: 'ignore' });
  execFileSync('git', ['-C', root, 'add', '.'], { stdio: 'ignore' });
  execFileSync(
    'git',
    [
      '-C',
      root,
      '-c',
      'user.name=Probe',
      '-c',
      'user.email=probe@example.com',
      'commit',
      '-m',
      'fixture',
    ],
    { stdio: 'ignore' },
  );
  writeFileSync(join(bin, 'devin'), stubDevin, { mode: 0o755 });
  return { fixture, root, bin };
};

const runVerify = (mode: 'compliant' | 'violating') => {
  const { fixture, root, bin } = createFixture();
  const devinLog = join(fixture, 'devin.log');
  try {
    const result = spawnSync('bash', [join(root, 'scripts', 'verify-foreman-permissions.sh')], {
      cwd: fixture,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${bin}:${process.env.PATH}`,
        DEVIN_LOG: devinLog,
        STUB_MODE: mode,
        GIT_AUTHOR_NAME: 'Probe',
        GIT_AUTHOR_EMAIL: 'probe@example.com',
        GIT_COMMITTER_NAME: 'Probe',
        GIT_COMMITTER_EMAIL: 'probe@example.com',
      },
    });
    const devinCalls = existsSync(devinLog)
      ? readFileSync(devinLog, 'utf8').trimEnd().split('\n')
      : [];
    const results = result.stdout.split('\n').filter((line) => /^(PASS|FAIL) {2}/.test(line));
    return { result, devinCalls, results };
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
};

describe('foreman permission config (#649)', () => {
  it('AC2: scripts/verify-foreman-permissions.sh exists and is executable', () => {
    expect(existsSync(verifyScript)).toBe(true);
    expect(statSync(verifyScript).mode & 0o111).not.toBe(0);
    expect(spawnSync('bash', ['-n', verifyScript]).status).toBe(0);
  });

  it('AC2: .devin/foreman.json denies the edit tool, repo writes, mutating git, package tools, gh pr merge, gh repo and MCP', () => {
    const { permissions } = JSON.parse(readFileSync(foremanConfig, 'utf8')) as {
      permissions: { allow: string[]; ask: string[]; deny: string[] };
    };
    for (const rule of [
      'edit',
      'Write(**)',
      'Exec(git add)',
      'Exec(git commit)',
      'Exec(git push)',
      'Exec(git merge)',
      'Exec(git rebase)',
      'Exec(git reset)',
      'Exec(git checkout)',
      'Exec(npm)',
      'Exec(npx)',
      'Exec(node)',
      'Exec(rm)',
      'Exec(gh pr merge)',
      'Exec(gh repo)',
      'mcp__*',
    ]) {
      expect(permissions.deny).toContain(rule);
    }
    for (const rule of [
      'Exec(scripts/lane start)',
      'Exec(scripts/lane done)',
      'Exec(gh pr close)',
    ]) {
      expect(permissions.ask).toContain(rule);
    }
    for (const rule of [
      'read',
      'grep',
      'glob',
      'Exec(git log)',
      'Exec(gh issue)',
      'Exec(herdr agent list)',
      'Exec(scripts/lane status)',
    ]) {
      expect(permissions.allow).toContain(rule);
    }
  });

  it('AC2: exits non-zero and reports every write probe as failed when Devin performs the action', () => {
    const { result, devinCalls, results } = runVerify('violating');

    expect(result.status, result.stderr).not.toBe(0);
    expect(devinCalls).toHaveLength(probeCount);
    for (const call of devinCalls) {
      expect(call).toContain('--config .devin/foreman.json --respect-workspace-trust false -p');
    }
    expect(results).toHaveLength(probeCount);
    for (const line of results) expect(line).toMatch(/^FAIL/);
  }, 60_000);

  it('AC2 + AC3: passes every probe when Devin blocks writes and runs read-only commands without a prompt', () => {
    const { result, devinCalls, results } = runVerify('compliant');

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(devinCalls).toHaveLength(probeCount);
    expect(results).toHaveLength(probeCount);
    for (const line of results) expect(line).toMatch(/^PASS/);
  }, 60_000);
});
