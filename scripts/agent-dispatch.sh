#!/usr/bin/env bash
# agent-dispatch.sh — pick the next eligible ready-for-agent issues and open
# one gated devin session per selection in a new Terminal.app window.
#
# Dry run is the default; --launch opens windows. One mkdir-based lock covers
# select-and-launch so the chained trigger and the launchd poller cannot
# double-launch. The DISABLED sentinel or UFLOW_DISPATCH_DISABLED=1 stops all
# unattended launching.
#
# This script never merges, approves, closes, pushes or commits anything.
set -euo pipefail

GIT_BIN="${GIT_BIN:-git}"
GH_BIN="${GH_BIN:-gh}"
OSASCRIPT_BIN="${OSASCRIPT_BIN:-osascript}"
DEVIN_BIN="${DEVIN_BIN:-devin}"
JQ_BIN="${JQ_BIN:-jq}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONITOR_BIN="${UFLOW_MONITOR_BIN:-$SCRIPT_DIR/agent-monitor.sh}"

STATE="${UFLOW_DISPATCH_STATE_DIR:-$HOME/.local/state/uflow/agent-dispatch}"
LAUNCHAGENTS_DIR="${UFLOW_LAUNCHAGENTS_DIR:-$HOME/Library/LaunchAgents}"
DISPATCH_LOG="${UFLOW_DISPATCH_LOG:-$HOME/Library/Logs/uflow-agent-dispatch.log}"
PLIST_PATH="$LAUNCHAGENTS_DIR/com.uflow.agent-dispatch.plist"
LOCK="$STATE/dispatch.lock"
LEDGER="$STATE/launches.log"
NOW="${UFLOW_NOW:-$(date +%s)}"

usage() {
  cat <<'EOF'
Usage: agent-dispatch.sh [--launch] [--max N] [--max-per-hour N]
       [--max-prep N] [--max-build N] [--only N] [--terminal APP]
       agent-dispatch.sh --disable | --enable
       agent-dispatch.sh --install | --uninstall | --print-plist [--interval N]

With no flags this is a dry run: it prints the plan and every skip reason and
launches nothing.

  --launch            actually open one Terminal.app window per selection
  --max N             concurrency cap counted by the slot rule (default 4)
  --max-per-hour N    rolling-hour launch ceiling (default 3)
  --max-prep N        stage:prep launches per run (default 1); prep is the opus
                      stage, so this is deliberately tight
  --max-build N       stage:build launches per run (default 3)
  --only N            consider only issue N; every check, refusal, cap and the
                      dry-run default still apply. The sanctioned way to force
                      a no-parallel issue past a busy queue.
  --terminal APP      terminal app to launch into; only "terminal" is accepted
  --disable           create the DISABLED sentinel; stop all unattended launching
  --enable            remove the DISABLED sentinel
  --install           write ~/Library/LaunchAgents/com.uflow.agent-dispatch.plist
                      (generated and left unloaded; never runs launchctl)
  --uninstall         remove that plist (never runs launchctl)
  --print-plist       print the plist to stdout and touch nothing
  --interval N        StartInterval for --install/--print-plist (default 600)
  -h, --help          this help

Exit codes: 0 completed run (including every refusal), 1 monitor/tool failure,
2 bad usage.
EOF
}

LAUNCH=0
MAX=4
MAX_PER_HOUR=3
MAX_PREP=1
MAX_BUILD=3
ONLY=""
TERMINAL="terminal"
INTERVAL=600
MODE=""

set_mode() {
  if [ -n "$MODE" ]; then
    echo "conflicting flags: --$MODE and --$1" >&2
    exit 2
  fi
  MODE="$1"
}

while [ $# -gt 0 ]; do
  case "$1" in
    --launch) LAUNCH=1; shift ;;
    --max)
      [ $# -ge 2 ] && [[ "$2" =~ ^[0-9]+$ ]] \
        || { echo "--max needs a number" >&2; exit 2; }
      MAX="$2"; shift 2 ;;
    --max-per-hour)
      [ $# -ge 2 ] && [[ "$2" =~ ^[0-9]+$ ]] \
        || { echo "--max-per-hour needs a number" >&2; exit 2; }
      MAX_PER_HOUR="$2"; shift 2 ;;
    --max-prep)
      [ $# -ge 2 ] && [[ "$2" =~ ^[0-9]+$ ]] \
        || { echo "--max-prep needs a number" >&2; exit 2; }
      MAX_PREP="$2"; shift 2 ;;
    --max-build)
      [ $# -ge 2 ] && [[ "$2" =~ ^[0-9]+$ ]] \
        || { echo "--max-build needs a number" >&2; exit 2; }
      MAX_BUILD="$2"; shift 2 ;;
    --only)
      [ $# -ge 2 ] && [[ "$2" =~ ^[0-9]+$ ]] \
        || { echo "--only needs an issue number" >&2; exit 2; }
      ONLY="$2"; shift 2 ;;
    --terminal)
      [ $# -ge 2 ] || { echo "--terminal needs an app" >&2; exit 2; }
      TERMINAL="$2"; shift 2 ;;
    --interval)
      [ $# -ge 2 ] && [[ "$2" =~ ^[0-9]+$ ]] \
        || { echo "--interval needs seconds" >&2; exit 2; }
      INTERVAL="$2"; shift 2 ;;
    --disable) set_mode disable; shift ;;
    --enable) set_mode enable; shift ;;
    --install) set_mode install; shift ;;
    --uninstall) set_mode uninstall; shift ;;
    --print-plist) set_mode print-plist; shift ;;
    -h|--help) set_mode help; shift ;;
    *) echo "unknown flag: $1" >&2; exit 2 ;;
  esac
done

if [ "$TERMINAL" != "terminal" ]; then
  echo "only Terminal.app is supported; Ghostty has no 'do script' equivalent" >&2
  exit 2
fi

# Terminal modes never take the lock, never call the monitor, never launch.
if [ -n "$MODE" ] && [ "$LAUNCH" = 1 ]; then
  echo "--$MODE cannot be combined with --launch" >&2
  exit 2
fi
if [ -n "$MODE" ] && [ -n "$ONLY" ]; then
  echo "--only cannot be combined with --$MODE" >&2
  exit 2
fi

# REPO_DIR is derived, never hardcoded: the main worktree is the first record
# of `worktree list --porcelain`. Only resolved when a mode needs it.
_repo_dir=""
repo_dir() {
  if [ -z "$_repo_dir" ]; then
    if [ -n "${UFLOW_REPO_DIR:-}" ]; then
      _repo_dir="$UFLOW_REPO_DIR"
    else
      # awk drains the whole stream (no early exit), so a large worktree list
      # cannot SIGPIPE the writer the way `... | head -n 1` could under pipefail.
      _repo_dir="$("$GIT_BIN" worktree list --porcelain | awk '
        !seen && /^worktree / { sub(/^worktree /, ""); print; seen = 1 }
      ')"
    fi
  fi
  printf '%s' "$_repo_dir"
}

emit_plist() {
  local repo
  repo="$(repo_dir)"
  cat <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.uflow.agent-dispatch</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/env</string>
    <string>bash</string>
    <string>${repo}/scripts/agent-dispatch.sh</string>
    <string>--launch</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${repo}</string>
  <key>StartInterval</key>
  <integer>${INTERVAL}</integer>
  <key>RunAtLoad</key>
  <false/>
  <key>StandardOutPath</key>
  <string>${DISPATCH_LOG}</string>
  <key>StandardErrorPath</key>
  <string>${DISPATCH_LOG}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
</dict>
</plist>
EOF
}

case "$MODE" in
  help)
    usage
    exit 0
    ;;
  print-plist)
    emit_plist
    exit 0
    ;;
  install)
    mkdir -p "$LAUNCHAGENTS_DIR"
    emit_plist > "$PLIST_PATH"
    cat <<EOF
wrote $PLIST_PATH

The agent is NOT loaded. To enable unattended dispatch:
  launchctl bootstrap gui/\$(id -u) $PLIST_PATH
To disable it again:
  launchctl bootout gui/\$(id -u)/com.uflow.agent-dispatch
EOF
    exit 0
    ;;
  uninstall)
    if [ -f "$PLIST_PATH" ]; then
      rm -f "$PLIST_PATH"
      echo "removed $PLIST_PATH"
    else
      echo "nothing to remove at $PLIST_PATH"
    fi
    exit 0
    ;;
  disable)
    mkdir -p "$STATE"
    : > "$STATE/DISABLED"
    printf '%s\n' "$STATE/DISABLED"
    exit 0
    ;;
  enable)
    if [ -f "$STATE/DISABLED" ]; then
      rm -f "$STATE/DISABLED"
      echo "removed $STATE/DISABLED"
    else
      echo "nothing to remove at $STATE/DISABLED"
    fi
    exit 0
    ;;
esac

# --- dispatch run ----------------------------------------------------------

# 1. Kill switch, before anything else including the lock.
if [ "${UFLOW_DISPATCH_DISABLED:-}" = "1" ]; then
  echo "refusing to dispatch: disabled by UFLOW_DISPATCH_DISABLED=1"
  exit 0
fi
if [ -e "$STATE/DISABLED" ]; then
  echo "refusing to dispatch: disabled by $STATE/DISABLED"
  exit 0
fi

# Preflight: jq does all JSON work in the run below. Fail with a readable
# message rather than a bare "jq: command not found" exit 127 inside a
# launchd log nobody reads.
if ! command -v "$JQ_BIN" >/dev/null 2>&1; then
  echo "agent-dispatch.sh: jq is required but '$JQ_BIN' is not in PATH; install it with: brew install jq" >&2
  exit 1
fi

# 2. The lock: mkdir is atomic on APFS; flock(1) does not exist on this
# machine. A stale lock breaks only when its pid is dead AND it is older
# than 300s. No retry loop: the poller returns in 600s.
release_lock() {
  if [ -f "$LOCK/pid" ] && [ "$(cat "$LOCK/pid" 2>/dev/null || true)" = "$$" ]; then
    rm -rf "$LOCK"
  fi
}

write_lock_files() {
  printf '%s\n' "$$" > "$LOCK/pid"
  printf '%s\n' "$NOW" > "$LOCK/started"
}

# The spec pins release on EXIT INT TERM. EXIT releases the lock; INT and
# TERM exit (which fires the EXIT trap). A bare `trap release_lock EXIT INT
# TERM` would be wrong: on bash 3.2 a trapped signal is handled, not fatal —
# the trap would release the lock and then the run would CONTINUE its launch
# loop, dropping the lock mid-critical-section and still opening windows.
arm_lock_traps() {
  trap release_lock EXIT
  trap 'exit 130' INT
  trap 'exit 143' TERM
}

acquire_lock() {
  if mkdir "$LOCK" 2>/dev/null; then
    write_lock_files
    arm_lock_traps
    return 0
  fi
  local lpid="" started="" dead=1 age
  [ -f "$LOCK/pid" ] && lpid="$(cat "$LOCK/pid" 2>/dev/null || true)"
  [ -f "$LOCK/started" ] && started="$(cat "$LOCK/started" 2>/dev/null || true)"
  if [ -n "$lpid" ] && kill -0 "$lpid" 2>/dev/null; then
    dead=0
  fi
  if [[ "$started" =~ ^[0-9]+$ ]]; then
    age=$((NOW - started))
  else
    # no readable timestamp: fall back to the lockdir's own mtime
    age=$((NOW - $(stat -f %m "$LOCK" 2>/dev/null || printf '%s' "$NOW")))
  fi
  if [ "$dead" = 1 ] && [ "$age" -gt 300 ]; then
    rm -rf "$LOCK"
    if mkdir "$LOCK" 2>/dev/null; then
      write_lock_files
      arm_lock_traps
      return 0
    fi
  fi
  echo "refusing to dispatch: another dispatch is in progress ($LOCK, pid ${lpid:-unknown})"
  return 1
}

mkdir -p "$STATE"
if ! acquire_lock; then
  exit 0
fi

# 3. Prune: launchers older than 7 days, ledger lines older than 24h.
mkdir -p "$STATE/launchers"
chmod 700 "$STATE/launchers" 2>/dev/null || true
find "$STATE/launchers" -name 'issue-*.sh' -type f -mmin +10080 -delete 2>/dev/null || true
if [ -f "$LEDGER" ]; then
  _ledger_tmp="$LEDGER.tmp.$$"
  awk -v cutoff="$((NOW - 86400))" '$1 ~ /^[0-9]+$/ && $1 > cutoff' "$LEDGER" > "$_ledger_tmp"
  mv "$_ledger_tmp" "$LEDGER"
fi

# 4. Read state from the monitor's NDJSON interface.
if ! monitor_out="$("$MONITOR_BIN" --json --max "$MAX")"; then
  echo "monitor failed"
  exit 1
fi
if ! printf '%s' "$monitor_out" | "$JQ_BIN" . > /dev/null 2>&1; then
  echo "monitor failed"
  exit 1
fi

# 5. Occupied slots: records with occupies_slot == true.
occupied="$(printf '%s' "$monitor_out" | "$JQ_BIN" -s '[.[] | select(.occupies_slot == true)] | length')"
echo "occupied $occupied/$MAX slots"

# 6. Candidates: every record in issue order gets a verdict. `stalled` is
# always reported; `ready` records run the filter chain in order.
sorted_records="$(printf '%s' "$monitor_out" | "$JQ_BIN" -c -s 'sort_by(.issue)[]')"

# --only narrows the run to one issue. The filter chain, caps, serial rule and
# every refusal below still apply to it; it is a selector, not an override.
if [ -n "$ONLY" ]; then
  sorted_records="$(printf '%s' "$sorted_records" | "$JQ_BIN" -c \
    --argjson n "$ONLY" 'select(.issue == $n)')"
  if ! printf '%s' "$sorted_records" | grep -q .; then
    echo "skip: #$ONLY is not among the monitor's candidates"
  fi
fi

survivors=""
serials=""
skipped=0

jqr() { printf '%s' "$1" | "$JQ_BIN" -r "$2"; }

while IFS= read -r rec; do
  [ -z "$rec" ] && continue
  n="$(jqr "$rec" '.issue')"
  state="$(jqr "$rec" '.state')"
  if [ "$state" = "stalled" ]; then
    echo "skip #$n: stalled, never auto-dispatched"
    skipped=$((skipped + 1))
    continue
  fi
  [ "$state" = "ready" ] || continue
  if ! jqr "$rec" '.labels | index("ready-for-agent") != null' | grep -q true; then
    echo "skip #$n: not labeled ready-for-agent"
    skipped=$((skipped + 1))
    continue
  fi
  wt="$(jqr "$rec" '.worktree // empty')"
  if [ -n "$wt" ]; then
    echo "skip #$n: worktree exists at $wt"
    skipped=$((skipped + 1))
    continue
  fi
  br="$(jqr "$rec" '.branch // empty')"
  if [ -n "$br" ]; then
    echo "skip #$n: branch $br exists"
    skipped=$((skipped + 1))
    continue
  fi
  # GitHub blocking links: the monitor already filtered to open blockers, so
  # a non-empty list is a live brake.
  blockers="$(jqr "$rec" '.blocked_by // [] | map("#" + tostring) | join(", ")')"
  if [ -n "$blockers" ]; then
    echo "skip #$n: blocked by $blockers"
    skipped=$((skipped + 1))
    continue
  fi
  if jqr "$rec" '.labels | index("no-parallel") != null' | grep -q true; then
    # Not an unconditional refusal any more: no-parallel survivors go into the
    # serial list and are resolved after the parallel survivors are known.
    serials="${serials}${rec}"$'\n'
    continue
  fi
  # belt-and-braces: a stalled record can never reach this point, but if a
  # monitor ever labels one "ready" it is still refused here.
  survivors="${survivors}${rec}"$'\n'
done <<< "$sorted_records"

# The serial slot: a no-parallel survivor launches only when no session
# occupies a slot AND no parallel work survived the filter chain, and at most
# one launches per run. Anything else is deferred or refused, in issue order.
serial_run=0
serial_done=0
if printf '%s' "$serials" | grep -q .; then
  if [ "$occupied" -gt 0 ]; then
    while IFS= read -r rec; do
      [ -z "$rec" ] && continue
      echo "skip #$(jqr "$rec" '.issue'): labeled no-parallel"
      skipped=$((skipped + 1))
    done <<< "$serials"
  elif printf '%s' "$survivors" | grep -q .; then
    while IFS= read -r rec; do
      [ -z "$rec" ] && continue
      echo "skip #$(jqr "$rec" '.issue'): serial, deferred while parallel work is queued"
      skipped=$((skipped + 1))
    done <<< "$serials"
  else
    survivors="$serials"
    serial_run=1
  fi
fi

# 7. Launch loop: re-check the cap and the hourly limit before each launch.
ledger_count() {
  [ -f "$LEDGER" ] || { echo 0; return; }
  awk -v cutoff="$((NOW - 3600))" '$1 ~ /^[0-9]+$/ && $1 > cutoff' "$LEDGER" | wc -l | tr -d ' '
}

wt_parent() {
  if [ -n "${UFLOW_WT_PARENT:-}" ]; then
    printf '%s' "$UFLOW_WT_PARENT"
  else
    printf '%s/uflow-wt' "$(dirname "$(repo_dir)")"
  fi
}

launched=0
launched_prep=0
launched_build=0

while IFS= read -r rec; do
  [ -z "$rec" ] && continue
  n="$(jqr "$rec" '.issue')"
  title="$(jqr "$rec" '.title')"
  # Records lacking the field (older monitor output) count as build work.
  stage="$(jqr "$rec" '.stage // "none"')"
  bucket="build"
  [ "$stage" = "prep" ] && bucket="prep"

  # One serial launch per run, even in dry-run mode: a "would launch" is the
  # same plan slot as a real launch.
  if [ "$serial_run" = 1 ] && [ "$serial_done" = 1 ]; then
    echo "skip #$n: serial, one launch per run"
    skipped=$((skipped + 1))
    continue
  fi

  if [ "$occupied" -ge "$MAX" ]; then
    echo "skip #$n: concurrency cap reached ($occupied/$MAX slots occupied)"
    skipped=$((skipped + 1))
    continue
  fi
  count="$(ledger_count)"
  if [ "$count" -ge "$MAX_PER_HOUR" ]; then
    echo "skip #$n: hourly launch limit reached ($count in the last hour)"
    skipped=$((skipped + 1))
    continue
  fi
  # Per-stage launch budgets, checked after the global caps. They count this
  # run's launches, not occupied slots: a finished prep session leaves its
  # worktree behind and would look occupied forever, deadlocking the stage.
  if [ "$bucket" = "prep" ] && [ "$launched_prep" -ge "$MAX_PREP" ]; then
    echo "skip #$n: prep cap reached ($launched_prep/$MAX_PREP)"
    skipped=$((skipped + 1))
    continue
  fi
  if [ "$bucket" = "build" ] && [ "$launched_build" -ge "$MAX_BUILD" ]; then
    echo "skip #$n: build cap reached ($launched_build/$MAX_BUILD)"
    skipped=$((skipped + 1))
    continue
  fi

  if [ "$LAUNCH" = 0 ]; then
    echo "would launch #$n: $title"
    launched=$((launched + 1))
    occupied=$((occupied + 1))
    serial_done=1
    if [ "$bucket" = "prep" ]; then
      launched_prep=$((launched_prep + 1))
    else
      launched_build=$((launched_build + 1))
    fi
    continue
  fi

  # other in-flight issues the new session must not touch
  others="$(printf '%s' "$monitor_out" | "$JQ_BIN" -r -s \
    --argjson n "$n" \
    '[.[] | select(.occupies_slot == true and .issue != $n) | .issue] | join(", ")')"
  if [ -n "$others" ]; then
    others_para="Issues $others are running in other sessions with live worktrees. Do not touch
their worktrees, branches or issues."
  else
    others_para="No other issues are currently in flight."
  fi

  # Stage-specific prompt: prep sessions run the prep flow and write no code;
  # build (and stage-less legacy issues) keep the original text verbatim.
  stage_para=""
  if [ "$stage" = "prep" ]; then
    stage_para="This issue is labelled stage:prep, so its flow is the prep flow
(.devin/skills/orchestrator/flows/prep.md), not the type-table flows: grill,
investigate and post a ### Phase: Prep — Done comment carrying the open
questions with a recommended answer each, then swap labels as the flow says.
Do not write implementation code.

"
  fi

  PROMPT_TEXT="/orchestrator resume $n

Issue #$n (\"$title\") is labeled ready-for-agent, but no branch, worktree or
phase comment exists yet, so Step 1 setup has not run. Plain resume is not
enough.

Do Step 1 setup first: fetch origin main, create the worktree and branch under
$(wt_parent), rename the tab, and request write scope on
the uflow-wt parent rather than a per-run path, per orchestrator rule 5.

Then read the full issue body with gh issue view $n --json
title,body,labels,comments and classify the request before dispatching
anything.

$stage_para$others_para

This session was opened by scripts/agent-dispatch.sh. You were dispatched, not
resumed from a previous context: there is no prior state beyond the issue."

  launcher="$STATE/launchers/issue-${n}-${NOW}.sh"
  # Outer heredoc is UNQUOTED so $REPO_DIR/$PROMPT_TEXT/$DEVIN_BIN interpolate;
  # \$( and \$PROMPT stay literal; the inner delimiter is QUOTED so a literal
  # $ in the prompt text is not expanded when the launcher runs.
  cat > "$launcher" <<EOF
#!/usr/bin/env bash
cd "$(repo_dir)" || exit 1
PROMPT=\$(cat <<'UFLOW_PROMPT_EOF'
$PROMPT_TEXT
UFLOW_PROMPT_EOF
)
exec "$DEVIN_BIN" -- "\$PROMPT"
EOF
  chmod 700 "$launcher"

  if "$OSASCRIPT_BIN" -e "tell application \"Terminal\" to do script \"/usr/bin/env bash $launcher\""; then
    # Third field is the stage, so prep->build answer latency is derivable
    # from the ledger alone. The awk windows key on $1 only and ignore it.
    printf '%s %s %s\n' "$NOW" "$n" "$stage" >> "$LEDGER"
    echo "launched #$n in a new Terminal window ($launcher)"
    launched=$((launched + 1))
    occupied=$((occupied + 1))
    serial_done=1
    if [ "$bucket" = "prep" ]; then
      launched_prep=$((launched_prep + 1))
    else
      launched_build=$((launched_build + 1))
    fi
  else
    echo "launch failed for #$n"
    skipped=$((skipped + 1))
  fi
done <<< "$survivors"

# 8. Summary. The lock is released by the EXIT trap.
if [ -z "$(printf '%s' "$survivors" | tr -d '[:space:]')" ] && [ "$occupied" -lt "$MAX" ]; then
  free=$((MAX - occupied))
  if [ "$free" -eq 1 ]; then
    echo "1 slot free; no eligible candidates"
  else
    echo "$free slots free; no eligible candidates"
  fi
fi

if [ "$LAUNCH" = 1 ]; then
  echo "done: $launched launched, $skipped skipped"
else
  echo "done: $launched would launch, $skipped skipped"
fi
