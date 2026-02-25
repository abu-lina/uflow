#!/usr/bin/env bash
#
# Supply Chain IOC Scanner
# Scans package files and workflows for known malicious packages and actions.
#
# Usage: ./scripts/security/ioc-scan.sh [--quiet]
#
# Exit codes:
#   0 - No IOCs found
#   1 - IOCs detected (CI should fail)
#   2 - Script error
#
# IOC List Maintenance:
#   Review and update this list when new supply-chain advisories are published,
#   or at minimum quarterly. Last updated: 2026-02-25 (Shai-Hulud campaign)
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

QUIET=false
if [[ "${1:-}" == "--quiet" ]]; then
  QUIET=true
fi

log() {
  if [[ "$QUIET" == false ]]; then
    echo "$@"
  fi
}

log_error() {
  echo "❌ $*" >&2
}

log_success() {
  if [[ "$QUIET" == false ]]; then
    echo "✅ $*"
  fi
}

# =============================================================================
# IOC DEFINITIONS
# =============================================================================
# Malicious NPM packages (Shai-Hulud campaign, 2026-02-25)
# Source: https://socket.dev/blog/sandworm-mode-npm-worm-ai-toolchain-poisoning
#
# Format: exact package names, one per line
# These are checked as word boundaries to avoid false positives
# =============================================================================

MALICIOUS_PACKAGES=(
  "claud-code"
  "cloude-code"
  "cloude"
  "crypto-locale"
  "crypto-reader-info"
  "detect-cache"
  "format-defaults"
  "hardhta"
  "locale-loader-pro"
  "naniod"
  "node-native-bridge"
  "opencraw"
  "parse-compat"
  "rimarf"
  "scan-store"
  "secp256"
  "suport-color"
  "veim"
  "yarsg"
)

# Sleeper packages (not yet malicious but controlled by threat actors)
SLEEPER_PACKAGES=(
  "ethres"
  "iru-caches"
  "iruchache"
  "uudi"
)

# Malicious GitHub Actions and threat actor identifiers
MALICIOUS_ACTIONS=(
  "ci-quality/code-quality-check"
  "official334"
)

# C2 domains and endpoints (for workflow/script scanning)
MALICIOUS_DOMAINS=(
  "pkg-metrics.official334.workers.dev"
  "freefan.net"
  "fanfree.net"
)

# =============================================================================
# SCANNING FUNCTIONS
# =============================================================================

build_package_pattern() {
  local pattern=""
  for pkg in "${MALICIOUS_PACKAGES[@]}" "${SLEEPER_PACKAGES[@]}"; do
    if [[ -n "$pattern" ]]; then
      pattern="$pattern|"
    fi
    # Match as JSON key ("package-name":) or in dependencies
    pattern="$pattern\"$pkg\""
  done
  echo "$pattern"
}

build_action_pattern() {
  local pattern=""
  for action in "${MALICIOUS_ACTIONS[@]}"; do
    if [[ -n "$pattern" ]]; then
      pattern="$pattern|"
    fi
    pattern="$pattern$action"
  done
  echo "$pattern"
}

build_domain_pattern() {
  local pattern=""
  for domain in "${MALICIOUS_DOMAINS[@]}"; do
    if [[ -n "$pattern" ]]; then
      pattern="$pattern|"
    fi
    # Escape dots for regex
    pattern="$pattern${domain//./\\.}"
  done
  echo "$pattern"
}

scan_package_files() {
  local pattern
  pattern=$(build_package_pattern)
  local found=0
  local files_to_scan=(
    "$REPO_ROOT/package.json"
    "$REPO_ROOT/package-lock.json"
  )
  
  # Add npm-shrinkwrap.json if it exists
  if [[ -f "$REPO_ROOT/npm-shrinkwrap.json" ]]; then
    files_to_scan+=("$REPO_ROOT/npm-shrinkwrap.json")
  fi

  log "🔍 Scanning package files for malicious packages..."
  
  for file in "${files_to_scan[@]}"; do
    if [[ -f "$file" ]]; then
      local matches
      matches=$(grep -Eon "$pattern" "$file" 2>/dev/null || true)
      if [[ -n "$matches" ]]; then
        log_error "IOC DETECTED in $(basename "$file"):"
        echo "$matches" | while IFS= read -r line; do
          log_error "  Line $line"
        done
        found=1
      fi
    fi
  done

  return $found
}

scan_workflow_files() {
  local action_pattern
  local domain_pattern
  action_pattern=$(build_action_pattern)
  domain_pattern=$(build_domain_pattern)
  local found=0
  local workflow_dir="$REPO_ROOT/.github/workflows"

  log "🔍 Scanning GitHub Actions workflows for malicious actions..."

  if [[ -d "$workflow_dir" ]]; then
    for file in "$workflow_dir"/*.yml "$workflow_dir"/*.yaml; do
      if [[ -f "$file" ]]; then
        # Check for malicious actions
        local action_matches
        action_matches=$(grep -Eon "$action_pattern" "$file" 2>/dev/null || true)
        if [[ -n "$action_matches" ]]; then
          log_error "IOC DETECTED in $(basename "$file") (malicious action):"
          echo "$action_matches" | while IFS= read -r line; do
            log_error "  Line $line"
          done
          found=1
        fi

        # Check for C2 domains
        local domain_matches
        domain_matches=$(grep -Eon "$domain_pattern" "$file" 2>/dev/null || true)
        if [[ -n "$domain_matches" ]]; then
          log_error "IOC DETECTED in $(basename "$file") (malicious domain):"
          echo "$domain_matches" | while IFS= read -r line; do
            log_error "  Line $line"
          done
          found=1
        fi
      fi
    done
  fi

  return $found
}

# =============================================================================
# MAIN
# =============================================================================

main() {
  log "=============================================="
  log "  Supply Chain IOC Scanner"
  log "  Last IOC update: 2026-02-25"
  log "=============================================="
  log ""

  local exit_code=0

  # Scan package files
  if ! scan_package_files; then
    exit_code=1
  fi

  log ""

  # Scan workflow files
  if ! scan_workflow_files; then
    exit_code=1
  fi

  log ""

  if [[ $exit_code -eq 0 ]]; then
    log_success "No supply chain IOCs detected."
  else
    log_error ""
    log_error "SUPPLY CHAIN IOCs DETECTED!"
    log_error "Review the findings above and remove malicious packages/actions."
    log_error ""
    log_error "Reference: https://socket.dev/blog/sandworm-mode-npm-worm-ai-toolchain-poisoning"
  fi

  return $exit_code
}

main "$@"
