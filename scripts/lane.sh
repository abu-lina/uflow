# shellcheck shell=bash
# Lane helpers for the foreman + crew workflow (docs/agents/foreman.md).
# Source from ~/.zshrc:  source ~/Projects/uflow/scripts/lane.sh
#
#   lane <issue> [slug] [copilot|devin]   create or reopen a lane
#   lane_done <issue> [--force]           remove a merged lane
#   lane_status                           one pane tail per lane + leftover worktrees
#
# Layout: one tmux session per repo (named after the repo folder), one window
# per lane named "#<issue>", worktree at .worktrees/<issue>-<slug>/.

_lane_root() {
  git rev-parse --show-toplevel 2>/dev/null
}

_lane_session() {
  basename "$(_lane_root)"
}

_lane_dir() {
  # First worktree whose folder starts with "<issue>-".
  local root="$1" issue="$2"
  ls -d "$root/.worktrees/$issue-"*/ 2>/dev/null | head -1 | sed 's:/$::'
}

_lane_port() {
  echo $((3000 + $1 % 1000))
}

_lane_type() {
  # Branch prefix from the issue's type:* label.
  case "$(gh issue view "$1" --json labels --jq '[.labels[].name|select(startswith("type:"))][0]')" in
    type:feature) echo feat ;;
    type:bugfix | type:hotfix | type:security) echo fix ;;
    type:refactor) echo refactor ;;
    *) echo chore ;;
  esac
}

_lane_prompt() {
  local issue="$1"
  printf 'You are a lane. Read AGENTS.md, then docs/agents/lane.md, then work on GitHub issue #%s. Start with step 0 of lane.md and stop at any "stop and ask" condition.' "$issue"
}

lane() {
  local issue="$1" slug="$2" agent="${3:-copilot}"
  [[ -z "$issue" ]] && { echo "usage: lane <issue> [slug] [copilot|devin]" >&2; return 1; }

  local root session dir branch port
  root="$(_lane_root)" || { echo "not inside a git repo" >&2; return 1; }
  [[ "$root" == */.worktrees/* ]] && { echo "run lane from the main checkout, not a worktree" >&2; return 1; }
  session="$(_lane_session)"
  dir="$(_lane_dir "$root" "$issue")"

  if [[ -z "$dir" ]]; then
    [[ -z "$slug" ]] && { echo "new lane needs a slug: lane $issue <slug>" >&2; return 1; }
    local type
    type="$(_lane_type "$issue")"
    branch="$type/$issue-$slug"
    dir="$root/.worktrees/$issue-$slug"

    # Linked branch on GitHub (idempotent: reuse if it already exists).
    if ! git ls-remote --exit-code --heads origin "$branch" >/dev/null 2>&1; then
      gh issue develop "$issue" --name "$branch" --base main >/dev/null || return 1
    fi
    git fetch -q origin "$branch" || return 1
    git worktree add -q "$dir" "$branch" || return 1

    # Env: copy every .env* except lane files, then write .env.lane.
    local f
    for f in "$root"/.env*; do
      [[ -f "$f" && "$f" != *.env.lane ]] && cp "$f" "$dir/"
    done
    port="$(_lane_port "$issue")"
    cat >"$dir/.env.lane" <<EOF
# Lane #$issue. Load with: set -a; source .env.lane; set +a
PORT=$port
PLAYWRIGHT_BASE_URL=http://127.0.0.1:$port
# Per-lane Supabase (see docs/agents/setup-decisions.md). Uncomment and point
# NEXT_PUBLIC_SUPABASE_URL in .env.local at it when a lane needs its own DB.
# SUPABASE_PROJECT_ID=uflow-$issue
EOF

    # node_modules: APFS clone, seconds instead of minutes.
    if [[ -d "$root/node_modules" ]]; then
      cp -c -R "$root/node_modules" "$dir/node_modules" 2>/dev/null || cp -R "$root/node_modules" "$dir/node_modules"
    fi
    echo "lane #$issue: $dir on $branch, port $port"
  else
    branch="$(git -C "$dir" branch --show-current)"
    port="$(_lane_port "$issue")"
    echo "lane #$issue: reopening $dir on $branch"
  fi

  # tmux window named "#<issue>" inside the worktree.
  local win="#$issue" cmd
  case "$agent" in
    copilot)
      if [[ -n "$(ls -A "$dir/.copilot" 2>/dev/null)" ]]; then
        cmd="copilot --no-remote --resume"
      else
        cmd="copilot --no-remote -i $(printf %q "$(_lane_prompt "$issue")")"
      fi
      ;;
    devin)
      if devin list 2>/dev/null | grep -q .; then
        cmd="devin --continue"
      else
        cmd="devin -- $(printf %q "$(_lane_prompt "$issue")")"
      fi
      ;;
    *) echo "agent must be copilot or devin" >&2; return 1 ;;
  esac

  if ! tmux has-session -t "$session" 2>/dev/null; then
    tmux new-session -d -s "$session" -c "$root" -n foreman
  fi
  if tmux list-windows -t "$session" -F '#W' | grep -qx "$win"; then
    tmux select-window -t "$session:$win"
  else
    tmux new-window -t "$session" -n "$win" -c "$dir" \
      "export PORT=$port PLAYWRIGHT_BASE_URL=http://127.0.0.1:$port; $cmd; exec \$SHELL"
  fi
  [[ -z "$TMUX" ]] && tmux attach -t "$session"
}

lane_done() {
  local issue="$1" force="$2"
  [[ -z "$issue" ]] && { echo "usage: lane_done <issue> [--force]" >&2; return 1; }

  local root session dir branch port
  root="$(_lane_root)" || return 1
  [[ "$root" == */.worktrees/* ]] && { echo "run lane_done from the main checkout" >&2; return 1; }
  session="$(_lane_session)"
  dir="$(_lane_dir "$root" "$issue")"
  [[ -z "$dir" ]] && { echo "no worktree for #$issue"; tmux kill-window -t "$session:#$issue" 2>/dev/null; return 0; }
  branch="$(git -C "$dir" branch --show-current)"
  port="$(_lane_port "$issue")"

  if [[ "$force" != "--force" ]]; then
    local state
    state="$(gh pr view "$branch" --json state --jq .state 2>/dev/null)"
    [[ "$state" != "MERGED" ]] && { echo "PR for $branch is '${state:-missing}', not MERGED. Use --force only after the owner agrees." >&2; return 1; }
    [[ -n "$(git -C "$dir" status --porcelain)" ]] && { echo "$dir has uncommitted changes" >&2; return 1; }
    if git -C "$dir" rev-parse --verify -q "origin/$branch" >/dev/null; then
      [[ -n "$(git -C "$dir" log "origin/$branch..HEAD" --oneline)" ]] && { echo "$dir has unpushed commits" >&2; return 1; }
    fi
    lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1 && { echo "a process still listens on :$port" >&2; return 1; }
  fi

  git worktree remove ${force:+--force} "$dir" || return 1
  git worktree prune
  git branch -D "$branch" 2>/dev/null
  tmux kill-window -t "$session:#$issue" 2>/dev/null
  echo "lane #$issue removed"
}

lane_status() {
  local root session w
  root="$(_lane_root)" || return 1
  session="$(_lane_session)"
  for w in $(tmux list-windows -t "$session" -F '#W' 2>/dev/null | grep '^#'); do
    printf '\n=== %s ===\n' "$w"
    tmux capture-pane -p -t "$session:$w" | grep -v '^\s*$' | tail -40
  done
  printf '\n=== worktrees ===\n'
  git worktree list
}
