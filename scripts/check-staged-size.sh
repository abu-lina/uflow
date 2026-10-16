#!/usr/bin/env bash
# Rejects newly added staged files larger than 5 MB. Modified files pass.
set -euo pipefail

limit=$((5 * 1024 * 1024))
fail=0

while IFS= read -r -d '' f; do
  size=$(git cat-file -s ":$f")
  if [ "$size" -gt "$limit" ]; then
    echo "Refusing to commit new file over 5 MB: $f ($((size / 1024 / 1024)) MB, $size bytes)" >&2
    fail=1
  fi
done < <(git diff --cached --diff-filter=A --name-only -z)

exit $fail
