#!/usr/bin/env bash
# cleanup-orphans.sh
#
# Moves agent-output docs with terminal statuses into their closed/ subfolder.
# Detects terminal status from YAML frontmatter (first `Status:` line).
#
# Terminal statuses:
#   Committed | Released | Abandoned | Deferred | Superseded | Resolved
#   Processed | QA Complete | QA Failed | UAT Complete | UAT Failed
#
# Usage:
#   ./scripts/dev/cleanup-orphans.sh            # dry-run (default)
#   ./scripts/dev/cleanup-orphans.sh --apply    # apply moves
#   ./scripts/dev/cleanup-orphans.sh --help
#
# Integration note (DevOps step 3d):
#   Run with --apply before a docs-only orphan-cleanup commit.
#   Never mix orphan moves with a plan's Stage 1 code commit.

set -euo pipefail

AGENT_OUTPUT="$(cd "$(dirname "$0")/../.." && pwd)/agent-output"
DRY_RUN=true
MOVED=0
SKIPPED=0
ERRORS=0

TERMINAL_STATUSES=(
  "Committed"
  "Released"
  "Abandoned"
  "Deferred"
  "Superseded"
  "Resolved"
  "Processed"
  "QA Complete"
  "QA Failed"
  "UAT Complete"
  "UAT Failed"
)

# ── helpers ────────────────────────────────────────────────────────────────────

usage() {
  sed -n '/^# Usage:/,/^#$/p' "$0" | sed 's/^# \?//'
  exit 0
}

log()  { echo "[cleanup-orphans] $*"; }
warn() { echo "[cleanup-orphans] WARN: $*" >&2; }
err()  { echo "[cleanup-orphans] ERROR: $*" >&2; ERRORS=$((ERRORS + 1)); }

# Extract Status value from YAML frontmatter (--- block at top of file).
# Returns the raw value (e.g. "Released"), or empty string if not found.
get_frontmatter_status() {
  local file="$1"
  # Read lines until the closing --- of frontmatter
  local in_fm=false
  while IFS= read -r line; do
    if [[ "$line" == "---" ]]; then
      if [[ "$in_fm" == false ]]; then
        in_fm=true
        continue
      else
        break  # closing ---
      fi
    fi
    if [[ "$in_fm" == true && "$line" =~ ^Status:[[:space:]]*(.+)$ ]]; then
      echo "${BASH_REMATCH[1]}"
      return
    fi
  done < "$file"
}

is_terminal() {
  local status="$1"
  for ts in "${TERMINAL_STATUSES[@]}"; do
    if [[ "$status" == "$ts" ]]; then
      return 0
    fi
  done
  return 1
}

# ── argument parsing ───────────────────────────────────────────────────────────

for arg in "$@"; do
  case "$arg" in
    --apply) DRY_RUN=false ;;
    --help|-h) usage ;;
    *) warn "Unknown argument: $arg"; usage ;;
  esac
done

if [[ "$DRY_RUN" == true ]]; then
  log "DRY RUN — pass --apply to move files"
  log ""
fi

# ── main scan ─────────────────────────────────────────────────────────────────

# Iterate over every direct subdirectory of agent-output, skip if no closed/
while IFS= read -r -d '' subdir; do
  dir_name="$(basename "$subdir")"

  # Collect .md files in the subdir root (not in closed/)
  while IFS= read -r -d '' file; do
    filename="$(basename "$file")"
    status="$(get_frontmatter_status "$file")"

    if [[ -z "$status" ]]; then
      # No frontmatter status — skip silently (non-standard doc like README)
      SKIPPED=$((SKIPPED + 1))
      continue
    fi

    if ! is_terminal "$status"; then
      # Active / in-progress — leave it
      SKIPPED=$((SKIPPED + 1))
      continue
    fi

    # Terminal status found — move to closed/
    closed_dir="$subdir/closed"
    dest="$closed_dir/$filename"

    if [[ -e "$dest" ]]; then
      warn "Destination already exists, skipping: $dest"
      SKIPPED=$((SKIPPED + 1))
      continue
    fi

    log "MOVE  [$status]  $dir_name/$filename  →  $dir_name/closed/$filename"

    if [[ "$DRY_RUN" == false ]]; then
      mkdir -p "$closed_dir"
      if mv "$file" "$dest"; then
        MOVED=$((MOVED + 1))
      else
        err "Failed to move: $file"
      fi
    else
      MOVED=$((MOVED + 1))  # count as would-be move in dry-run
    fi

  done < <(find "$subdir" -maxdepth 1 -name "*.md" -not -name ".gitkeep" -print0 | sort -z)

done < <(find "$AGENT_OUTPUT" -mindepth 1 -maxdepth 1 -type d -not -name "closed" -print0 | sort -z)

# ── summary ───────────────────────────────────────────────────────────────────

log ""
if [[ "$DRY_RUN" == true ]]; then
  log "Summary (dry run): would move $MOVED file(s), skipped $SKIPPED, errors $ERRORS"
  if [[ $MOVED -gt 0 ]]; then
    log ""
    log "Re-run with --apply to execute."
  fi
else
  log "Summary: moved $MOVED file(s), skipped $SKIPPED, errors $ERRORS"
fi

if [[ $ERRORS -gt 0 ]]; then
  exit 1
fi
