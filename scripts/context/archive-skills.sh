#!/usr/bin/env bash
# Prune ~/.cursor/skills down to the allowlist in skills-keep.txt.
# Moves (never deletes) non-listed skill dirs to ~/.cursor/skills-archive.
# Usage:
#   archive-skills.sh [--dry-run]      archive non-listed skills
#   archive-skills.sh --restore <name> move one skill back
#   archive-skills.sh --restore-all    move everything back
set -euo pipefail

SKILLS_DIR="${SKILLS_DIR:-$HOME/.cursor/skills}"
ARCHIVE_DIR="${ARCHIVE_DIR:-$HOME/.cursor/skills-archive}"
KEEP_FILE="$(cd "$(dirname "$0")" && pwd)/skills-keep.txt"

dry_run=0
restore_all=0
restore_name=""

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) dry_run=1 ;;
    --restore) shift; restore_name="${1:-}"; [ -n "$restore_name" ] || { echo "--restore needs a name" >&2; exit 1; } ;;
    --restore-all) restore_all=1 ;;
    -h|--help) sed -n '2,9p' "$0"; exit 0 ;;
    *) echo "unknown flag: $1" >&2; exit 1 ;;
  esac
  shift
done

restore_one() {
  local name="$1"
  local src="$ARCHIVE_DIR/$name" dst="$SKILLS_DIR/$name"
  if [ ! -d "$src" ]; then echo "restore: $name not in archive, skipping" >&2; return 1; fi
  if [ -e "$dst" ]; then echo "restore: $name already exists in skills dir, skipping" >&2; return 1; fi
  mv "$src" "$dst"
  echo "restored $name"
}

if [ -n "$restore_name" ]; then
  restore_one "$restore_name" || true
  exit 0
fi

if [ "$restore_all" -eq 1 ]; then
  n=0
  if [ -d "$ARCHIVE_DIR" ]; then
    for src in "$ARCHIVE_DIR"/*/; do
      [ -d "$src" ] || continue
      restore_one "$(basename "$src")" && n=$((n+1))
    done
  fi
  echo "restore-all: restored $n"
  exit 0
fi

[ -f "$KEEP_FILE" ] || { echo "keep list not found: $KEEP_FILE" >&2; exit 1; }

# Normalize keep list: strip comments, blanks, whitespace. One name per line.
KEEP_TMP="$(mktemp)"
MATCHED_TMP="$(mktemp)"
trap 'rm -f "$KEEP_TMP" "$MATCHED_TMP"' EXIT
sed 's/#.*//; s/[[:space:]]//g' "$KEEP_FILE" | grep -v '^$' | sort -u > "$KEEP_TMP"

kept=0 archived=0 untouched=0 skipped=0

for src in "$SKILLS_DIR"/*/; do
  name="$(basename "$src")"
  if [ ! -f "$src/SKILL.md" ]; then
    untouched=$((untouched+1))
    continue
  fi
  if grep -qxF "$name" "$KEEP_TMP"; then
    kept=$((kept+1))
    echo "$name" >> "$MATCHED_TMP"
    continue
  fi
  dst="$ARCHIVE_DIR/$name"
  if [ -e "$dst" ]; then
    echo "warn: $dst already exists, skipping $name" >&2
    skipped=$((skipped+1))
    continue
  fi
  if [ "$dry_run" -eq 1 ]; then
    echo "would archive: $name"
  else
    mkdir -p "$ARCHIVE_DIR"
    mv "$src" "$dst"
  fi
  archived=$((archived+1))
done

echo "---"
echo "kept:     $kept"
echo "archived: $archived$([ "$dry_run" -eq 1 ] && echo " (dry run)")"
echo "untouched non-skill dirs: $untouched"
[ "$skipped" -gt 0 ] && echo "skipped (dest exists): $skipped"
missing="$(comm -23 "$KEEP_TMP" <(sort -u "$MATCHED_TMP"))"
if [ -n "$missing" ]; then
  echo "WARNING: keep-list entries that matched no directory:" >&2
  echo "$missing" | sed 's/^/  /' >&2
fi
