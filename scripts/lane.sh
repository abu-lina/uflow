# shellcheck shell=bash
# Lane helpers for the foreman + crew workflow (docs/agents/foreman.md).
# Source from ~/.zshrc:  source ~/Projects/uflow/scripts/lane.sh
#
#   lane <issue> [slug] [copilot|devin] [model|effort]
#   foreman [copilot|devin] [model] start or focus the foreman
#   lane_done <issue> [--force]           remove a merged lane
#   lane_status                           one line per lane + stale workspaces

_lane_root() {
  git rev-parse --show-toplevel 2>/dev/null
}

_lane_dir() {
  local root="$1" issue="$2"
  ls -d "$root/.worktrees/$issue-"*/ 2>/dev/null | head -1 | sed 's:/$::'
}

_lane_port() {
  echo $((3000 + $1 % 1000))
}

_lane_base() {
  git fetch -q origin main || return 1
  printf '%s\n' origin/main
}

_lane_check_main() {
  local unpushed
  unpushed="$(git log --oneline origin/main..main)" || return 1
  [[ -z "$unpushed" ]] && return 0
  printf 'local main is ahead of origin/main; push these commits before starting a lane:\n%s\n' "$unpushed" >&2
  return 1
}

_lane_type() {
  case "$(gh issue view "$1" --json labels --jq '[.labels[].name|select(startswith("type:"))][0]')" in
    type:feature) echo feat ;;
    type:bugfix | type:hotfix | type:security) echo fix ;;
    type:refactor) echo refactor ;;
    *) echo chore ;;
  esac
}

_lane_prompt() {
  local issue="$1"
  printf 'You are a lane. Read AGENTS.md, then docs/agents/lane.md, then work on GitHub issue #%s. Start with step 0 of lane.md and stop at any "stop and ask" condition. Before stopping, comment on the issue with the outcome, the blocker or the question, and the next step required from the owner.' "$issue"
}

_foreman_prompt() {
  cat <<'PROMPT'
You are the foreman. Read AGENTS.md, then docs/agents/foreman.md. Never write code. Propose lanes and wait for approval from the owner before starting them.

Use the Herdr skill included below instead of discovering commands with --help. Watch running lanes with `herdr agent wait <lane> --until blocked --until done`, then report when a lane needs the owner.
PROMPT
  HERDR_ENV=1 herdr --skill
}

_agent_model_args() {
  local agent="$1" choice="$2"
  [[ -z "$choice" ]] && return 0
  if [[ "$agent" == copilot ]]; then
    case "$choice" in
      none | minimal | low | medium | high | xhigh | max)
        agent_args+=(--reasoning-effort "$choice")
        ;;
      *) agent_args+=(--model "$choice") ;;
    esac
  else
    agent_args+=(--model "$choice")
  fi
}

_herdr_workspace_id() {
  local json="$1" checkout_path="$2"
  printf '%s\n' "$json" |
    jq -r --arg checkout_path "$checkout_path" \
      '[.result.workspaces[]? | select(.worktree.checkout_path == $checkout_path) | .workspace_id] | first // empty'
}

_herdr_workspace_for_issue() {
  local json="$1" issue="$2"
  printf '%s\n' "$json" |
    jq -r --arg issue "$issue" '
      [.result.workspaces[]? | select((.worktree.checkout_path // "") |
        contains("/.worktrees/" + $issue + "-"))] | first // {} |
      [(.workspace_id // ""), (.worktree.checkout_path // ""),
        (.branch // ""), (.label // "")] | @tsv
    '
}

foreman() {
  local agent="${1:-devin}" model="${2:-}" root pane_response pane prompt agents
  local -a agent_args
  agent_args=()
  [[ "$agent" == copilot || "$agent" == devin ]] || { echo "agent must be copilot or devin" >&2; return 1; }
  [[ "$agent" == devin && -z "$model" ]] && model="claude-opus-5-5-high"

  root="$(_lane_root)" || { echo "not inside a git repo" >&2; return 1; }
  [[ "$root" == */.worktrees/* ]] && { echo "run foreman from the main checkout, not a worktree" >&2; return 1; }

  agents="$(herdr agent list)" || return 1
  if printf '%s\n' "$agents" | jq -e '[.. | objects | select(.name? == "foreman")] | length > 0' >/dev/null; then
    herdr agent focus foreman
    return $?
  fi

  pane_response="$(herdr pane current --current)" || return 1
  pane="$(printf '%s\n' "$pane_response" | jq -r '.result.pane.pane_id // empty')"
  [[ -n "$pane" ]] || { echo "Herdr did not return the current main-workspace pane" >&2; return 1; }

  _agent_model_args "$agent" "$model" || return 1
  if [[ "$agent" == devin ]]; then
    # Normal mode plus foreman.json rules: read-only commands run without prompts, writes are denied.
    agent_args+=(--config "$root/.devin/foreman.json")
  else
    agent_args+=(--no-remote)
  fi
  prompt="$(_foreman_prompt)" || { echo "could not load the Herdr skill" >&2; return 1; }

  herdr agent start foreman --kind "$agent" --pane "$pane" -- "${agent_args[@]}" || return 1
  herdr agent prompt foreman "$prompt"
}

lane() {
  local issue="${1:-}" slug="${2:-}" agent="${3:-copilot}" model="${4:-}"
  [[ -z "$issue" ]] && { echo "usage: lane <issue> [slug] [copilot|devin] [model|effort]" >&2; return 1; }
  [[ "$agent" == copilot || "$agent" == devin ]] || { echo "agent must be copilot or devin" >&2; return 1; }

  local root dir branch port workspace_json workspace_id worktree_result pane prompt base
  local -a agent_args
  root="$(_lane_root)" || { echo "not inside a git repo" >&2; return 1; }
  [[ "$root" == */.worktrees/* ]] && { echo "run lane from the main checkout, not a worktree" >&2; return 1; }
  dir="$(_lane_dir "$root" "$issue")"

  if [[ -n "$dir" ]]; then
    workspace_json="$(herdr workspace list)" || return 1
    workspace_id="$(_herdr_workspace_id "$workspace_json" "$dir")"
    [[ -n "$workspace_id" ]] || { echo "no Herdr workspace found for $dir" >&2; return 1; }
    herdr workspace focus "$workspace_id"
    return $?
  fi

  [[ -z "$slug" ]] && { echo "new lane needs a slug: lane $issue <slug>" >&2; return 1; }
  branch="$(_lane_type "$issue")/$issue-$slug"
  dir="$root/.worktrees/$issue-$slug"
  base="$(_lane_base)" || return 1
  _lane_check_main || return 1
  if ! git ls-remote --exit-code --heads origin "$branch" >/dev/null 2>&1; then
    gh issue develop "$issue" --name "$branch" --base main >/dev/null || return 1
  fi
  git fetch -q origin "$branch" || return 1

  worktree_result="$(herdr worktree create \
    --cwd "$root" \
    --branch "$branch" \
    --base "$base" \
    --path "$dir" \
    --label "#$issue $slug" \
    --focus)" || return 1
  pane="$(printf '%s\n' "$worktree_result" | jq -r '.result.root_pane.pane_id // empty')"
  [[ -n "$pane" ]] || { echo "Herdr did not return the new worktree's root pane" >&2; return 1; }

  port="$(_lane_port "$issue")"
  cat >"$dir/.env.lane" <<EOF || { echo "could not write $dir/.env.lane" >&2; return 1; }
PORT=$port
PLAYWRIGHT_BASE_URL=http://127.0.0.1:$port
EOF

  if [[ -d "$root/node_modules" ]]; then
    cp -c -R "$root/node_modules" "$dir/node_modules" 2>/dev/null ||
      cp -R "$root/node_modules" "$dir/node_modules" ||
      { echo "could not clone node_modules into $dir" >&2; return 1; }
  fi
  echo "lane #$issue: $dir on $branch, port $port"

  agent_args=()
  _agent_model_args "$agent" "$model" || return 1
  if [[ "$agent" == copilot ]]; then
    agent_args+=(--no-remote
      --allow-tool=write
      '--allow-tool=shell(npm:*)'
      '--allow-tool=shell(npx:*)'
      '--allow-tool=shell(git:*)'
      '--allow-tool=shell(gh issue:*)'
      '--allow-tool=shell(gh pr create)'
      '--allow-tool=shell(gh pr checks)'
      '--deny-tool=shell(git merge)'
      '--deny-tool=shell(git rebase)'
      '--deny-tool=write(.env.local)'
      '--deny-tool=shell(gh pr merge)')
  else
    agent_args+=(--permission-mode accept-edits --sandbox)
  fi

  herdr agent start "lane-$issue" --kind "$agent" --pane "$pane" -- "${agent_args[@]}" || return 1
  prompt="$(_lane_prompt "$issue")"
  herdr agent prompt "lane-$issue" "$prompt"
}

lane_done() {
  local issue="${1:-}" force="${2:-}"
  [[ -z "$issue" ]] && { echo "usage: lane_done <issue> [--force]" >&2; return 1; }

  local root dir branch port workspace_json workspace_id workspace_record stale_dir stale_branch stale_label cleanup_failed=0
  root="$(_lane_root)" || return 1
  [[ "$root" == */.worktrees/* ]] && { echo "run lane_done from the main checkout" >&2; return 1; }
  dir="$(_lane_dir "$root" "$issue")"
  workspace_json="$(herdr workspace list)" || return 1
  if [[ -z "$dir" ]]; then
    workspace_record="$(_herdr_workspace_for_issue "$workspace_json" "$issue")"
    IFS=$'\t' read -r workspace_id stale_dir stale_branch stale_label <<<"$workspace_record"
    [[ -n "$workspace_id" ]] || { echo "no worktree or Herdr workspace for #$issue"; return 0; }
    dir="$stale_dir"
    branch="$stale_branch"
    if [[ -z "$branch" ]]; then
      local branches
      branches="$(git branch --format='%(refname:short)' | awk -v marker="/$issue-" 'index($0, marker) > 0')"
      [[ -n "$branches" && "$branches" != *$'\n'* ]] || {
        echo "cannot determine a unique branch for stale workspace #$issue" >&2
        return 1
      }
      branch="$branches"
    fi
  else
    branch="$(git -C "$dir" branch --show-current)"
    workspace_id="$(_herdr_workspace_id "$workspace_json" "$dir")"
  fi
  port="$(_lane_port "$issue")"

  if [[ "$force" != "--force" ]]; then
    local state
    state="$(gh pr view "$branch" --json state --jq .state 2>/dev/null)"
    [[ "$state" != "MERGED" ]] && { echo "PR for $branch is '${state:-missing}', not MERGED. Use --force only after the owner agrees." >&2; return 1; }
    if [[ -d "$dir" ]]; then
      [[ -n "$(git -C "$dir" status --porcelain)" ]] && { echo "$dir has uncommitted changes" >&2; return 1; }
    fi
    if git -C "$root" rev-parse --verify -q "origin/$branch" >/dev/null; then
      [[ -n "$(git -C "$root" log "origin/$branch..$branch" --oneline)" ]] && { echo "$dir has unpushed commits" >&2; return 1; }
    fi
    lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1 && { echo "a process still listens on :$port" >&2; return 1; }
  fi

  if [[ -n "$workspace_id" ]]; then
    if ! herdr worktree remove --workspace "$workspace_id" --force; then
      echo "Herdr could not remove $dir; closing its workspace and completing local cleanup" >&2
      if ! herdr workspace close "$workspace_id"; then
        echo "could not close Herdr workspace $workspace_id" >&2
        cleanup_failed=1
      fi
    fi
  fi

  # Git's force option removes ignored build output such as .next and node_modules.
  if [[ -d "$dir" ]] && ! git worktree remove --force "$dir"; then
    echo "could not remove git worktree $dir" >&2
    cleanup_failed=1
  fi
  if ! git worktree prune; then
    echo "could not prune git worktrees" >&2
    cleanup_failed=1
  fi
  if ! git branch -D "$branch"; then
    echo "could not delete branch $branch" >&2
    cleanup_failed=1
  fi
  [[ "$cleanup_failed" == 0 ]] || return 1
  echo "lane #$issue removed"
}

lane_status() {
  local agents workspaces lane_rows workspace_rows name agent_status label branch checkout_path workspace_id
  agents="$(herdr agent list)" || return 1
  workspaces="$(herdr workspace list)" || return 1

  lane_rows="$(printf '%s\n' "$agents" | jq -r --argjson workspace_data "$workspaces" '
    (.result.agents // []) |
    map(select((.name // "") | startswith("lane-")))[] |
    . as $agent |
    ([$workspace_data.result.workspaces[]? |
      select(.workspace_id == $agent.workspace_id)] | first // {}) as $workspace |
    [
      $agent.name,
      ($agent.agent_status // "unknown"),
      ($workspace.label // "-"),
      ($agent.branch // $workspace.branch // "-"),
      ($workspace.worktree.checkout_path // $agent.cwd // "")
    ] | @tsv
  ')" || return 1

  printf 'AGENT\tSTATUS\tWORKSPACE LABEL\tBRANCH\n'
  if [[ -z "$lane_rows" ]]; then
    printf 'No lanes open.\n'
  else
    while IFS=$'\t' read -r name agent_status label branch checkout_path; do
      if [[ "$branch" == "-" && -n "$checkout_path" && -d "$checkout_path" ]]; then
        branch="$(git -C "$checkout_path" branch --show-current)"
      fi
      printf '%s\t%s\t%s\t%s\n' "$name" "$agent_status" "$label" "$branch"
    done <<<"$lane_rows"
  fi

  workspace_rows="$(printf '%s\n' "$workspaces" | jq -r '
    .result.workspaces[]? |
    [(.workspace_id // ""), (.label // ""), (.worktree.checkout_path // "")] |
    @tsv
  ')" || return 1
  while IFS=$'\t' read -r workspace_id label checkout_path; do
    if [[ -n "$checkout_path" && ! -e "$checkout_path" ]]; then
      printf 'STALE WORKSPACE\t%s\t%s\tcheckout path does not exist: %s\n' "$workspace_id" "$label" "$checkout_path"
    fi
  done <<<"$workspace_rows"
  return 0
}
