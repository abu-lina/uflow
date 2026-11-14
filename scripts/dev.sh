#!/bin/bash
# Wrapper: validate Supabase credentials, then start the dev server.
# Use via: npm run dev (after wiring "dev": "bash scripts/dev.sh" in package.json)
# or run directly: bash scripts/dev.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

bash "$SCRIPT_DIR/check-env.sh"
exec npx next dev --webpack "$@"
