# Scripts

Developer and operations tooling scripts. **These are not runtime modules** — they are never imported by the Next.js application.

## Usage

Scripts here are invoked via `npm run`, `npx tsx`, or directly in the terminal. They should never appear in `import` statements inside `src/`.

## What belongs here

- Deployment/setup shell scripts (`deploy.sh`, `setup-*.sh`)
- One-off data generation or transformation utilities (`generate-fake-providers.ts`, `transformSvg.ts`)
- CI/CD helpers (`verify-*.sh`)

## What does NOT belong here

- Application runtime code → put in `src/lib/` or `src/utils/`
- Database migrations → put in `supabase/migrations/`
- Test harnesses → put in `tests/` or `src/__tests__/`

## Agent dispatch

Two tools for dispatching parallel orchestrator sessions without hand-work.

Prerequisites: `git`, `gh`, and `jq` (`brew install jq`); `osascript` and
`plutil` ship with macOS.

`agent-monitor.sh` reports every in-flight request from durable state only
(`git worktree list`, `git for-each-ref`/`rev-list`, `gh issue view --json
comments`, `gh issue list`, `gh pr list` — never `devin list`, never process
inspection). Worst-waste states sort first:

```
./scripts/agent-monitor.sh           # human table, exit 0 even when empty
./scripts/agent-monitor.sh --json    # NDJSON, one object per request
./scripts/agent-monitor.sh --max 4   # slot total for the footer
```

States: `cleanup-pending` (issue closed, worktree left behind), `stalled`
(worktree and branch, zero commits ahead, zero phase comments),
`awaiting-review` (open PR on the branch; does not hold a slot),
`in-flight`, `ready`, `blocked-on-human`. A request occupies a slot while it
is open, has a worktree, and has no open PR.

`agent-dispatch.sh` consumes the monitor's JSON, picks the next eligible
`ready-for-agent` issues and opens one gated `devin` session per selection in
a new Terminal.app **window**. Dry run is the default:

```bash
./scripts/agent-dispatch.sh                  # print the plan, launch nothing
./scripts/agent-dispatch.sh --launch         # open windows
./scripts/agent-dispatch.sh --max 4 --max-per-hour 3
```

It refuses issues that already have a worktree or branch, anything labeled
`no-parallel`, and anything `stalled`. The concurrency cap is re-checked
before each launch, launches are rate-limited by a persisted ledger
(`~/.local/state/uflow/agent-dispatch/launches.log`), and a `mkdir`-based lock
at `dispatch.lock/` keeps the chained handoff and the launchd poller from
double-launching into one slot.

Kill switch — one command stops all unattended launching:

```bash
./scripts/agent-dispatch.sh --disable   # stop all unattended launching
./scripts/agent-dispatch.sh --enable    # resume
```

`UFLOW_DISPATCH_DISABLED=1` does the same for a single invocation or CI.

launchd poller — the safety net that polls every 600s:

```bash
./scripts/agent-dispatch.sh --print-plist   # plist to stdout, touches nothing
./scripts/agent-dispatch.sh --install       # writes ~/Library/LaunchAgents/com.uflow.agent-dispatch.plist
./scripts/agent-dispatch.sh --uninstall     # removes it
./scripts/agent-dispatch.sh --install --interval 900
```

`--install` generates the plist and leaves it **unloaded**; the scripts never
run `launchctl`. Enabling the agent is an owner action after merge:

```bash
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.uflow.agent-dispatch.plist
launchctl bootout gui/$(id -u)/com.uflow.agent-dispatch   # to remove
```

Logs go to `~/Library/Logs/uflow-agent-dispatch.log`. Generated launchers are
kept for forensics under `~/.local/state/uflow/agent-dispatch/launchers/`,
never `/tmp`, and pruned after 7 days.
