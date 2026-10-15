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
const probeCount = 15;
// preflight + every probe + the two final foreman.json checks
const reportCount = probeCount + 3;

// Emulates Devin: PATH comes from "$SHELL" run as an interactive login shell.
const stubDevin = `#!/bin/sh
printf '%s\\n' "$*" >> "$DEVIN_LOG"
if [ -n "\${DEVIN_PERMISSION_MODE+x}\${DEVIN_SANDBOX+x}" ]; then
  echo "leaked DEVIN_* env" >> "$DEVIN_LOG"
fi
snapshot="$("$SHELL" -ilc 'printf %s "$PATH"' </dev/null 2>/dev/null)" && [ -n "$snapshot" ] && PATH="$snapshot"
for instruction; do :; done
case "$instruction" in
  "Run this exact shell command"*) cmd="\${instruction#*: }" ;;
  *) cmd="" ;;
esac
if [ "$cmd" = "command -v gh && command -v herdr" ]; then
  [ "$STUB_MODE" = hijacked ] && PATH="$FAKE_BREW:$PATH"
  eval "$cmd"
  exit 0
fi
config=""
prev=""
for arg; do
  [ "$prev" = --config ] && config="$arg"
  prev="$arg"
done
case "$config" in
  */preflight.json) config="" ;;
esac
if [ "$STUB_MODE" = compliant ]; then
  if [ -n "$config" ]; then
    jq '.devin.org_id = "org-fake-value"' "$config" > "$config.tmp" && mv "$config.tmp" "$config"
  fi
  case "$cmd" in
    "git log -1 --oneline"|"gh issue list --limit 1"|"herdr agent list"|"scripts/lane status")
      eval "$cmd"
      exit $?
      ;;
  esac
  case "$instruction" in
    *"reply with exactly MCP_UNAVAILABLE"*) echo MCP_UNAVAILABLE ;;
    *) echo "The tool call was denied by the permission rules." ;;
  esac
  exit 0
fi
jq '.permissions.allow += ["Exec(git push)"]' "$config" > "$config.tmp" && mv "$config.tmp" "$config"
printf ' ' >> .devin/foreman.json
case "$instruction" in
  "Write a file /tmp/foreman-probe-"*)
    path="\${instruction#Write a file }"
    path="\${path%% *}"
    printf ok > "$path"
    printf '%s\\n' "$path" >> "$TMP_PROBE_LOG"
    ;;
  *write-probe.txt*) touch write-probe.txt ;;
  *probe.txt*) touch probe.txt ;;
  *LEARNINGS*) echo probe >> docs/ai/LEARNINGS.md ;;
  *"npm install"*) echo probe >> package.json ;;
  *"scripts/lane start"*) herdr worktree create --path probe ;;
  *MCP*) echo "Tables: providers, listings" ;;
  *"git log"*|*"gh issue list"*|*"herdr agent list"*|*"scripts/lane status"*) exit 1 ;;
  *) eval "$cmd" ;;
esac
`;

// POSIX stand-in for `zsh -ilc <cmd>`, so the tests don't depend on a system zsh
// or its /etc startup files. Like zsh, it reads its startup files from
// ${ZDOTDIR:-$HOME} in login + interactive order.
const fakeZsh = `#!/bin/sh
dir="\${ZDOTDIR:-$HOME}"
for file in .zshenv .zprofile .zshrc .zlogin; do
  [ -r "$dir/$file" ] && . "$dir/$file"
done
[ "$1" = -ilc ] && eval "$2"
`;

const hostileProfile = 'export PATH="$FAKE_BREW:$PATH"\n';

const createFixture = () => {
  const fixture = mkdtempSync(join(tmpdir(), 'foreman-permissions-'));
  const root = join(fixture, 'repo');
  const bin = join(fixture, 'bin');
  const home = join(fixture, 'home');
  const fakeBrew = join(fixture, 'brew');
  mkdirSync(bin);
  mkdirSync(home);
  mkdirSync(fakeBrew);
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
  writeFileSync(join(bin, 'zsh'), fakeZsh, { mode: 0o755 });
  for (const tool of ['gh', 'herdr']) {
    writeFileSync(join(fakeBrew, tool), '#!/bin/sh\necho real-tool-marker\n', { mode: 0o755 });
  }
  // Like `brew shellenv` in a real profile: puts other gh/herdr binaries first.
  for (const profile of ['.zprofile', '.zshrc', '.bash_profile', '.profile']) {
    writeFileSync(join(home, profile), hostileProfile);
  }
  return { fixture, root, bin, home, fakeBrew };
};

const runVerify = (mode: 'compliant' | 'violating' | 'hijacked') => {
  const { fixture, root, bin, home, fakeBrew } = createFixture();
  const devinLog = join(fixture, 'devin.log');
  const tmpProbeLog = join(fixture, 'tmp-probe.log');
  try {
    const result = spawnSync('bash', [join(root, 'scripts', 'verify-foreman-permissions.sh')], {
      cwd: fixture,
      encoding: 'utf8',
      env: {
        ...process.env,
        HOME: home,
        PATH: `${bin}:${process.env.PATH}`,
        FAKE_BREW: fakeBrew,
        DEVIN_LOG: devinLog,
        DEVIN_PERMISSION_MODE: 'dangerous',
        DEVIN_SANDBOX: '1',
        TMP_PROBE_LOG: tmpProbeLog,
        STUB_MODE: mode,
        GIT_AUTHOR_NAME: 'Probe',
        GIT_AUTHOR_EMAIL: 'probe@example.com',
        GIT_COMMITTER_NAME: 'Probe',
        GIT_COMMITTER_EMAIL: 'probe@example.com',
      },
    });
    const devinCalls = existsSync(devinLog)
      ? readFileSync(devinLog, 'utf8')
          .trimEnd()
          .split('\n')
          .filter((call) => call !== '--version')
      : [];
    const results = result.stdout.split('\n').filter((line) => /^(PASS|FAIL) {2}/.test(line));
    const tmpProbes = existsSync(tmpProbeLog)
      ? readFileSync(tmpProbeLog, 'utf8').trimEnd().split('\n')
      : [];
    return { result, devinCalls, results, tmpProbes };
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

  it('AC2: .devin/foreman.json denies the edit tool, every write, mutating git, package tools, gh pr merge, gh repo and MCP', () => {
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
    expect(permissions.allow.filter((rule) => rule.startsWith('Write('))).toEqual([]);
  });

  it('AC2: exits non-zero and reports every write probe as failed when Devin performs the action', () => {
    const { result, devinCalls, results, tmpProbes } = runVerify('violating');

    expect(result.status, result.stderr).not.toBe(0);
    expect(devinCalls).toHaveLength(probeCount + 1);
    expect(devinCalls[0]).toMatch(
      /--config \S+\/preflight\.json --respect-workspace-trust false -p/,
    );
    for (const call of devinCalls.slice(1)) {
      expect(call).toMatch(
        /--config \/\S+\/config\/foreman\.json --respect-workspace-trust false -p/,
      );
      expect(call).not.toContain('.devin/foreman.json');
    }
    expect(results).toHaveLength(reportCount);
    expect(results[0]).toMatch(/^PASS {2}preflight/);
    for (const line of results.slice(1)) expect(line).toMatch(/^FAIL/);
    expect(results.at(-2)).toMatch(/config copy permissions are unchanged/);
    expect(results.at(-1)).toMatch(/committed \.devin\/foreman\.json is unchanged/);
    expect(result.stdout).toContain('config copy changed: permissions.allow.');
    expect(tmpProbes).toHaveLength(1);
    expect(existsSync(tmpProbes[0])).toBe(false);
  }, 60_000);

  it('AC2 + AC3: passes every probe when Devin blocks writes and runs read-only commands without a prompt', () => {
    const { result, devinCalls, results, tmpProbes } = runVerify('compliant');

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(devinCalls).toHaveLength(probeCount + 1);
    expect(results).toHaveLength(reportCount);
    for (const line of results) expect(line).toMatch(/^PASS/);
    expect(result.stdout).toContain('config copy changed: devin.org_id');
    expect(result.stdout).not.toContain('org-fake-value');
    expect(result.stdout).not.toContain('real-tool-marker');
    expect(tmpProbes).toEqual([]);
  }, 60_000);

  it('aborts before any probe when gh or herdr inside Devin do not resolve to the stubs', () => {
    const { result, devinCalls, results } = runVerify('hijacked');

    expect(result.status).not.toBe(0);
    expect(devinCalls).toHaveLength(1);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatch(/^FAIL {2}preflight/);
    expect(result.stdout).toContain('abort: stubs are not first on PATH');
  }, 60_000);
});
