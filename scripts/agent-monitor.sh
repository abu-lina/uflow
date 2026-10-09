#!/usr/bin/env bash
# agent-monitor.sh — report the state of every in-flight orchestrator request.
#
# Derives everything from durable state: git worktree list, git for-each-ref,
# git rev-list, gh issue view --json comments, gh issue list and gh pr list.
# Never calls devin, never inspects processes.
#
# Usage: agent-monitor.sh [--json] [--decisions] [--max N] [--repo <owner/name>]
set -euo pipefail

GIT_BIN="${GIT_BIN:-git}"
GH_BIN="${GH_BIN:-gh}"
JQ_BIN="${JQ_BIN:-jq}"

usage() {
  cat <<'EOF'
Usage: agent-monitor.sh [--json] [--decisions] [--max N] [--repo <owner/name>]

Prints one line per in-flight request, worst-waste states first
(cleanup-pending, stalled, awaiting-review, in-flight, ready, blocked-on-human),
then an occupancy footer. Exits 0 with "no in-flight requests" when empty.

  --json               emit one NDJSON object per request instead of the table
  --decisions          print the decision queue instead: every open needs-info
                       issue with its question lines and URL. Writes nothing.
  --max N              slot total for the footer (default 4)
  --repo <owner/name>  passed through to gh as --repo (default: infer from cwd)
  -h, --help           this help

Exit codes: 0 success (including nothing in flight), 1 tool failure, 2 bad usage.
EOF
}

JSON_OUT=0
DECISIONS=0
MAX=4
GH_REPO=""

while [ $# -gt 0 ]; do
  case "$1" in
    --json) JSON_OUT=1; shift ;;
    --decisions) DECISIONS=1; shift ;;
    --max)
      [ $# -ge 2 ] && [[ "$2" =~ ^[0-9]+$ ]] \
        || { echo "--max needs a number" >&2; exit 2; }
      MAX="$2"; shift 2 ;;
    --repo)
      [ $# -ge 2 ] || { echo "--repo needs owner/name" >&2; exit 2; }
      GH_REPO="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "unknown flag: $1" >&2; exit 2 ;;
  esac
done

# jq does all JSON work; fail with a readable message rather than a bare
# "jq: command not found" exit 127 inside a launchd log nobody reads.
if ! command -v "$JQ_BIN" >/dev/null 2>&1; then
  echo "agent-monitor.sh: jq is required but '$JQ_BIN' is not in PATH; install it with: brew install jq" >&2
  exit 1
fi

run_gh() {
  if [ -n "$GH_REPO" ]; then
    "$GH_BIN" --repo "$GH_REPO" "$@"
  else
    "$GH_BIN" "$@"
  fi
}

# --- --decisions: the owner-facing question digest ---------------------------
# A generated view over open needs-info issues, not a second state store: the
# questions stay in each issue's own phase comments (authoritative) and this
# only re-prints them for one sitting. Runs before any git work so it stays a
# pure gh read and writes no file.
if [ "$DECISIONS" = 1 ]; then
  needs_info_json="$(run_gh issue list --state open --limit 100 --label needs-info \
    --json number,title,url)"
  if [ "$(printf '%s' "$needs_info_json" | "$JQ_BIN" 'length')" -eq 0 ]; then
    echo "no open needs-info issues"
    exit 0
  fi
  printf '%s' "$needs_info_json" \
    | "$JQ_BIN" -r '.[] | "\(.number)\t\(.title)\t\(.url)"' \
    | while IFS=$'\t' read -r dn dtitle durl; do
        printf '#%s %s\n%s\n' "$dn" "$dtitle" "$durl"
        issue_json="$(run_gh issue view "$dn" --json comments)"
        # Question lines: the ❓/➡️ markers prep comments use, plus any line
        # that ends in a literal question mark.
        questions="$(printf '%s' "$issue_json" | "$JQ_BIN" -r '
          [.comments[].body | split("\n")[]
           | select(test("^\\s*(❓|➡️)") or test("\\?\\s*$"))]
          | unique | .[]')"
        if [ -n "$questions" ]; then
          printf '%s\n' "$questions" | sed 's/^/  /'
        else
          echo "  (no question lines in its comments; read the issue)"
        fi
        echo
      done
  exit 0
fi

# Repo root: the main worktree (first record of `worktree list --porcelain`).
# UFLOW_REPO_DIR overrides it; tests inject stub GIT_BIN so this stays hermetic.
if [ -n "${UFLOW_REPO_DIR:-}" ]; then
  REPO_DIR="$UFLOW_REPO_DIR"
else
  # awk drains the whole stream (no early exit), so a large worktree list
  # cannot SIGPIPE the writer the way `... | head -n 1` could under pipefail.
  REPO_DIR="$("$GIT_BIN" worktree list --porcelain | awk '
    !seen && /^worktree / { sub(/^worktree /, ""); print; seen = 1 }
  ')"
fi
WT_PARENT="${UFLOW_WT_PARENT:-$(dirname "$REPO_DIR")/uflow-wt}"

# --- gather inputs -------------------------------------------------------

# All worktree paths, one per line.
worktrees="$("$GIT_BIN" -C "$REPO_DIR" worktree list --porcelain | sed -n 's/^worktree //p')"

# All refs; a ref belongs to issue N when its last path segment matches ^<N>-
refs="$("$GIT_BIN" -C "$REPO_DIR" for-each-ref --format='%(refname:short)' refs/heads refs/remotes/origin)"

# Open PRs once; matched to issues by headRefName.
prs_json="$(run_gh pr list --state open --limit 100 --json number,headRefName)"

# Open issues carrying either ready label or a stage label. The stage axis is
# what the dispatcher reads to pick a flow, so a stage label alone must be
# enough to put the issue into the candidate set.
ready_agent_json="$(run_gh issue list --state open --limit 100 --label ready-for-agent --json number)"
ready_human_json="$(run_gh issue list --state open --limit 100 --label ready-for-human --json number)"
stage_prep_json="$(run_gh issue list --state open --limit 100 --label stage:prep --json number)"
stage_build_json="$(run_gh issue list --state open --limit 100 --label stage:build --json number)"

# --- candidate set -------------------------------------------------------

# wt_pairs: "N <path>" lines, worktrees under the parent named <digits>-*
wt_pairs=""
while IFS= read -r wt; do
  [ -z "$wt" ] && continue
  case "$wt" in "$WT_PARENT"/*) ;; *) continue ;; esac
  base="$(basename "$wt")"
  if [[ "$base" =~ ^[0-9]+- ]]; then
    n="${BASH_REMATCH[0]%-}"
    wt_pairs="${wt_pairs}${n} ${wt}"$'\n'
  fi
done <<< "$worktrees"

# branch_pairs: "N <branch>" lines; local refs win over origin/ duplicates.
branch_pairs=""
while IFS= read -r ref; do
  [ -z "$ref" ] && continue
  seg="${ref##*/}"
  if [[ "$seg" =~ ^[0-9]+- ]]; then
    n="${BASH_REMATCH[0]%-}"
    case "$ref" in
      origin/*)
        printf '%s\n' "$branch_pairs" | awk -v n="$n" '$1 == n { found=1 } END { exit !found }' \
          || branch_pairs="${branch_pairs}${n} ${ref#origin/}"$'\n'
        ;;
      *)
        # drop a previously recorded origin/ entry for the same issue
        branch_pairs="$(printf '%s' "$branch_pairs" | awk -v n="$n" '$1 != n')"
        [ -n "$branch_pairs" ] && branch_pairs="${branch_pairs}"$'\n'
        branch_pairs="${branch_pairs}${n} ${ref}"$'\n'
        ;;
    esac
  fi
done <<< "$refs"

# candidates: union of worktree issues, ref issues, both ready lists and both
# stage lists
candidates="$(
  {
    awk '{print $1}' <<< "$wt_pairs"
    awk '{print $1}' <<< "$branch_pairs"
    "$JQ_BIN" -r '.[].number' <<< "$ready_agent_json"
    "$JQ_BIN" -r '.[].number' <<< "$ready_human_json"
    "$JQ_BIN" -r '.[].number' <<< "$stage_prep_json"
    "$JQ_BIN" -r '.[].number' <<< "$stage_build_json"
  } | awk 'NF' | sort -un
)"

if [ -z "$candidates" ]; then
  if [ "$JSON_OUT" = 0 ]; then
    echo "no in-flight requests"
  fi
  exit 0
fi

# --- per-issue records ---------------------------------------------------
# Each entry: "<rank> <issue> <ndjson>", sorted rank-then-issue, prefix
# stripped before output.
records=""

field() { awk -v n="$1" '$1 == n { print $2; exit }'; }

while IFS= read -r n; do
  [ -z "$n" ] && continue

  wt="$(printf '%s\n' "$wt_pairs" | field "$n")"
  branch="$(printf '%s\n' "$branch_pairs" | field "$n")"

  issue_json="$(run_gh issue view "$n" --json number,state,title,labels,comments)"

  issue_state="$(printf '%s' "$issue_json" | "$JQ_BIN" -r '.state')"
  title="$(printf '%s' "$issue_json" | "$JQ_BIN" -r '.title')"
  labels_json="$(printf '%s' "$issue_json" | "$JQ_BIN" -c '[.labels[].name]')"
  # phase comments: first non-blank line starts with "### Phase:"
  phases="$(printf '%s' "$issue_json" | "$JQ_BIN" '
    [.comments[].body
     | split("\n") | map(select(test("\\S"))) | (.[0] // "")
     | select(startswith("### Phase:"))]
    | length')"

  if [ -n "$branch" ]; then
    ahead="$("$GIT_BIN" -C "$REPO_DIR" rev-list --count "origin/main..$branch" 2>/dev/null || true)"
    [[ "$ahead" =~ ^[0-9]+$ ]] || ahead=0
  else
    ahead=0
  fi

  open_pr=""
  if [ -n "$branch" ]; then
    open_pr="$(printf '%s' "$prs_json" | "$JQ_BIN" -r \
      --arg b "$branch" '[.[] | select(.headRefName == $b) | .number][0] // empty')"
  fi

  has_tree_or_branch=0
  { [ -n "$wt" ] || [ -n "$branch" ]; } && has_tree_or_branch=1

  # classification: first match wins
  if [ "$issue_state" = "CLOSED" ] && [ -n "$wt" ]; then
    state="cleanup-pending"; rank=0
  elif [ "$issue_state" = "OPEN" ] && [ "$has_tree_or_branch" = 1 ] \
       && [ "$ahead" -eq 0 ] && [ "$phases" -eq 0 ]; then
    state="stalled"; rank=1
  elif [ "$issue_state" = "OPEN" ] && [ "$has_tree_or_branch" = 1 ] && [ -n "$open_pr" ]; then
    state="awaiting-review"; rank=2
  elif [ "$issue_state" = "OPEN" ] && [ "$has_tree_or_branch" = 1 ]; then
    state="in-flight"; rank=3
  elif [ "$issue_state" = "OPEN" ] && [ "$has_tree_or_branch" = 0 ] \
       && printf '%s' "$labels_json" | "$JQ_BIN" -e \
         'index("ready-for-human") or index("needs-info")' >/dev/null; then
    # needs-info joins ready-for-human here: both mean the queue is parked on
    # the owner. Checked before `ready` so a stage:prep issue that flipped to
    # needs-info does not masquerade as dispatchable.
    state="blocked-on-human"; rank=5
  elif [ "$issue_state" = "OPEN" ] && [ "$has_tree_or_branch" = 0 ] \
       && printf '%s' "$labels_json" | "$JQ_BIN" -e \
         'index("ready-for-agent") or index("stage:prep") or index("stage:build")' >/dev/null; then
    state="ready"; rank=4
  else
    continue # CLOSED with no worktree, or OPEN with neither label nor tree
  fi

  # The dispatch stage, straight from the stage axis. Ready records with no
  # stage label are legal legacy state and dispatch as build work.
  stage="$(printf '%s' "$labels_json" | "$JQ_BIN" -r '
    if index("stage:prep") then "prep"
    elif index("stage:build") then "build"
    else "none" end')"

  # GitHub blocking links, fetched only for the one state that consumes them:
  # one extra gh call per ready record, not per candidate. Elements are issue
  # objects; closed blockers are filtered out here so the record only ever
  # carries live brakes. Any api or parse failure sets blocked_by_unknown —
  # an unknown brake fails closed in the dispatcher, never open.
  blocked_by_json="[]"
  blocked_by_unknown=false
  if [ "$state" = "ready" ]; then
    api_raw=""
    parsed=""
    if api_raw="$(run_gh api \
        "repos/{owner}/{repo}/issues/${n}/dependencies/blocked_by" 2>/dev/null)" \
       && parsed="$(printf '%s' "$api_raw" | "$JQ_BIN" -c \
          '[.[] | select((.state // "open") | ascii_downcase == "open") | .number | numbers]' \
          2>/dev/null)" \
       && [ "${parsed#[}" != "$parsed" ]; then
      blocked_by_json="$parsed"
    else
      blocked_by_unknown=true
      echo "agent-monitor: blocked_by check failed for #$n; treated as blocked" >&2
    fi
  fi

  # slot rule: open issue, worktree present, no open PR on its branch
  slot=false
  if [ "$issue_state" = "OPEN" ] && [ -n "$wt" ] && [ -z "$open_pr" ]; then
    slot=true
  fi

  line="$(printf '%s' "$issue_json" | "$JQ_BIN" -c \
    --arg state "$state" \
    --arg wt "$wt" \
    --arg br "$branch" \
    --argjson ahead "$ahead" \
    --arg pr "$open_pr" \
    --argjson phases "$phases" \
    --argjson slot "$slot" \
    --arg stage "$stage" \
    --argjson blocked "$blocked_by_json" \
    --argjson blocked_unknown "$blocked_by_unknown" \
    '{
      issue: .number,
      title: .title,
      state: $state,
      issue_state: .state,
      labels: [.labels[].name],
      worktree: (if $wt == "" then null else $wt end),
      branch: (if $br == "" then null else $br end),
      commits_ahead: $ahead,
      pr: (if $pr == "" then null else ($pr | tonumber) end),
      phases: $phases,
      occupies_slot: $slot,
      stage: $stage,
      blocked_by: $blocked,
      blocked_by_unknown: $blocked_unknown
    }')"

  records="${records}${rank} ${n} ${line}"$'\n'
done <<< "$candidates"

if [ -z "$records" ]; then
  if [ "$JSON_OUT" = 0 ]; then
    echo "no in-flight requests"
  fi
  exit 0
fi

sorted="$(printf '%s' "$records" | sort -n -k1,1 -k2,2)"

if [ "$JSON_OUT" = 1 ]; then
  printf '%s\n' "$sorted" | cut -d' ' -f3-
  exit 0
fi

while IFS= read -r rec; do
  [ -z "$rec" ] && continue
  json="$(printf '%s' "$rec" | cut -d' ' -f3-)"
  printf '%s' "$json" | "$JQ_BIN" -r '
    def or_dash($v): if $v == null then "-" else ($v | tostring) end;
    [ .state,
      ("#" + (.issue | tostring)),
      (.title[0:50]),
      (if .occupies_slot then "yes" else "no" end),
      (if .worktree == null then "no" else "yes" end),
      (.branch // "-"),
      or_dash(.pr),
      (.phases | tostring)
    ] | @tsv' \
    | while IFS=$'\t' read -r st iss ttl slot_v wt_v br pr_v ph; do
        printf '%-17s%-6s%-52sslot=%-4s wt=%-4s br=%-35spr=%-6sphases=%s\n' \
          "$st" "$iss" "$ttl" "$slot_v" "$wt_v" "$br" "$pr_v" "$ph"
      done
done <<< "$sorted"
occupied="$(printf '%s\n' "$sorted" | cut -d' ' -f3- | "$JQ_BIN" -s '[.[] | select(.occupies_slot)] | length')"

free=$((MAX - occupied))
[ "$free" -lt 0 ] && free=0
printf 'occupied %d/%d slots\n' "$occupied" "$MAX"
if [ "$free" -eq 1 ]; then
  echo "1 slot free"
else
  printf '%d slots free\n' "$free"
fi
