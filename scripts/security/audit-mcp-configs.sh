#!/usr/bin/env bash
#
# MCP Configuration Auditor
# Scans local AI toolchain config files for unauthorized MCP server additions.
#
# Usage: ./scripts/security/audit-mcp-configs.sh [--json]
#
# Exit codes:
#   0 - All MCP servers are on the allowlist (or no configs found)
#   1 - Unauthorized MCP servers detected
#   2 - Script error
#
# This script NEVER uploads data or reads repository secrets.
# It only reads local config files and compares against the allowlist.
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ALLOWLIST_FILE="$SCRIPT_DIR/mcp-allowlist.json"

JSON_OUTPUT=false
if [[ "${1:-}" == "--json" ]]; then
  JSON_OUTPUT=true
fi

# Config file locations to check
CONFIG_PATHS=(
  "$HOME/.cursor/mcp.json"
  "$HOME/.claude/settings.json"
  "$HOME/.continue/config.json"
  "$HOME/.windsurf/mcp.json"
  "$HOME/.codeium/mcp.json"
)

log() {
  if [[ "$JSON_OUTPUT" == false ]]; then
    echo "$@"
  fi
}

log_error() {
  echo "❌ $*" >&2
}

log_warning() {
  if [[ "$JSON_OUTPUT" == false ]]; then
    echo "⚠️  $*"
  fi
}

log_success() {
  if [[ "$JSON_OUTPUT" == false ]]; then
    echo "✅ $*"
  fi
}

# Check if jq is available
check_dependencies() {
  if ! command -v jq &> /dev/null; then
    log_error "jq is required but not installed."
    log_error "Install with: brew install jq (macOS) or apt-get install jq (Linux)"
    exit 2
  fi
}

# Load allowlist patterns
load_allowlist() {
  if [[ ! -f "$ALLOWLIST_FILE" ]]; then
    log_error "Allowlist file not found: $ALLOWLIST_FILE"
    exit 2
  fi
  
  # Extract URL prefixes
  URL_PREFIXES=$(jq -r '.allowlist.urls[] | select(.matchType == "prefix") | .pattern' "$ALLOWLIST_FILE" 2>/dev/null || echo "")
  
  # Extract exact npx packages
  NPX_PACKAGES=$(jq -r '.allowlist.npxPackages[] | select(.matchType == "exact") | .pattern' "$ALLOWLIST_FILE" 2>/dev/null || echo "")
  
  # Extract allowed local commands
  LOCAL_COMMANDS=$(jq -r '.allowlist.localCommands[] | select(.matchType == "exact") | .pattern' "$ALLOWLIST_FILE" 2>/dev/null || echo "")
}

# Check if a URL matches any allowlist prefix
is_url_allowed() {
  local url="$1"
  while IFS= read -r prefix; do
    if [[ -n "$prefix" && "$url" == "$prefix"* ]]; then
      return 0
    fi
  done <<< "$URL_PREFIXES"
  return 1
}

# Check if an npx package is allowed
is_npx_allowed() {
  local package="$1"
  while IFS= read -r allowed; do
    if [[ -n "$allowed" && "$package" == "$allowed" ]]; then
      return 0
    fi
  done <<< "$NPX_PACKAGES"
  return 1
}

# Check if a command is an allowed local command
is_command_allowed() {
  local cmd="$1"
  while IFS= read -r allowed; do
    if [[ -n "$allowed" && "$cmd" == "$allowed" ]]; then
      return 0
    fi
  done <<< "$LOCAL_COMMANDS"
  return 1
}

# Audit a single MCP config file
audit_config_file() {
  local config_file="$1"
  local tool_name="$2"
  local unauthorized=()
  
  if [[ ! -f "$config_file" ]]; then
    return 0
  fi
  
  log "Checking $tool_name config: $config_file"
  
  # Extract MCP server entries
  local servers
  servers=$(jq -r '.mcpServers // {} | to_entries[] | @json' "$config_file" 2>/dev/null || echo "")
  
  if [[ -z "$servers" ]]; then
    log "  No MCP servers configured."
    return 0
  fi
  
  while IFS= read -r server_json; do
    [[ -z "$server_json" ]] && continue
    
    local name url command args
    name=$(echo "$server_json" | jq -r '.key')
    url=$(echo "$server_json" | jq -r '.value.url // empty')
    command=$(echo "$server_json" | jq -r '.value.command // empty')
    args=$(echo "$server_json" | jq -r '.value.args // [] | join(" ")')
    
    local is_allowed=false
    local server_type=""
    
    if [[ -n "$url" ]]; then
      server_type="url"
      if is_url_allowed "$url"; then
        is_allowed=true
      fi
    elif [[ -n "$command" ]]; then
      server_type="command"
      if is_command_allowed "$command"; then
        # For npx commands, also verify the package
        if [[ "$command" == "npx" ]]; then
          # Extract package name from args (typically first arg after flags)
          local package
          package=$(echo "$args" | grep -oE '@[a-zA-Z0-9_/-]+' | head -1 || echo "")
          if [[ -z "$package" ]]; then
            # Try without @ prefix
            package=$(echo "$args" | awk '{for(i=1;i<=NF;i++) if($i !~ /^-/) {print $i; exit}}')
          fi
          if is_npx_allowed "$package"; then
            is_allowed=true
          fi
        else
          is_allowed=true
        fi
      fi
    fi
    
    # Determine the value to record
    local server_value=""
    if [[ -n "$url" ]]; then
      server_value="$url"
    elif [[ -n "$command" ]]; then
      server_value="$command $args"
    fi
    
    # Record for JSON output
    if [[ "$is_allowed" == true ]]; then
      add_audit_result "$config_file" "$tool_name" "$name" "$server_type" "$server_value" "true"
      log "  ✓ $name (allowed)"
    else
      add_audit_result "$config_file" "$tool_name" "$name" "$server_type" "$server_value" "false"
      log_warning "$name is NOT on the allowlist!"
      if [[ -n "$url" ]]; then
        log_warning "  URL: $url"
      elif [[ -n "$command" ]]; then
        log_warning "  Command: $command $args"
      fi
      unauthorized+=("$name")
    fi
  done <<< "$servers"
  
  if [[ ${#unauthorized[@]} -gt 0 ]]; then
    return 1
  fi
  return 0
}

# Collect audit results for JSON output
AUDIT_RESULTS=()
UNAUTHORIZED_SERVERS=()

# Add result to audit collection
add_audit_result() {
  local config_file="$1"
  local tool_name="$2"
  local server_name="$3"
  local server_type="$4"
  local server_value="$5"
  local is_allowed="$6"
  AUDIT_RESULTS+=("$(jq -n \
    --arg config "$config_file" \
    --arg tool "$tool_name" \
    --arg name "$server_name" \
    --arg type "$server_type" \
    --arg value "$server_value" \
    --argjson allowed "$is_allowed" \
    '{config: $config, tool: $tool, server: $name, type: $type, value: $value, allowed: $allowed}')")
  if [[ "$is_allowed" == "false" ]]; then
    UNAUTHORIZED_SERVERS+=("$server_name")
  fi
}

# Print JSON report
print_json_report() {
  local exit_status="$1"
  local allowlist_version
  allowlist_version=$(jq -r '.version // "unknown"' "$ALLOWLIST_FILE" 2>/dev/null || echo "unknown")
  
  local servers_json="[]"
  if [[ ${#AUDIT_RESULTS[@]} -gt 0 ]]; then
    servers_json=$(printf '%s\n' "${AUDIT_RESULTS[@]}" | jq -s '.')
  fi
  
  local unauthorized_json="[]"
  if [[ ${#UNAUTHORIZED_SERVERS[@]} -gt 0 ]]; then
    unauthorized_json=$(printf '%s\n' "${UNAUTHORIZED_SERVERS[@]}" | jq -R . | jq -s '.')
  fi
  
  jq -n \
    --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --arg allowlist_version "$allowlist_version" \
    --argjson servers "$servers_json" \
    --argjson unauthorized "$unauthorized_json" \
    --argjson exit_status "$exit_status" \
    '{
      timestamp: $timestamp,
      allowlistVersion: $allowlist_version,
      servers: $servers,
      unauthorizedServers: $unauthorized,
      exitStatus: $exit_status,
      passed: ($exit_status == 0)
    }'
}

# Main audit function
main() {
  check_dependencies
  load_allowlist
  
  log "=============================================="
  log "  MCP Configuration Auditor"
  log "  Allowlist: $ALLOWLIST_FILE"
  log "=============================================="
  log ""
  
  local found_any=false
  local has_unauthorized=false
  
  for config_path in "${CONFIG_PATHS[@]}"; do
    local tool_name
    tool_name=$(basename "$(dirname "$config_path")")
    
    if [[ -f "$config_path" ]]; then
      found_any=true
      if ! audit_config_file "$config_path" "$tool_name"; then
        has_unauthorized=true
      fi
      log ""
    fi
  done
  
  local exit_status=0
  
  if [[ "$found_any" == false ]]; then
    log "No AI toolchain config files found."
    log "Checked locations:"
    for path in "${CONFIG_PATHS[@]}"; do
      log "  - $path"
    done
    log ""
    log_success "Nothing to audit."
    exit_status=0
  elif [[ "$has_unauthorized" == true ]]; then
    log ""
    log_error "UNAUTHORIZED MCP SERVERS DETECTED!"
    log_error ""
    log_error "Review the flagged servers above. If they are legitimate:"
    log_error "1. Add them to scripts/security/mcp-allowlist.json"
    log_error "2. Re-run this audit"
    log_error ""
    log_error "If you did not add these servers, your AI toolchain may be compromised."
    log_error "Reference: https://socket.dev/blog/sandworm-mode-npm-worm-ai-toolchain-poisoning"
    exit_status=1
  else
    log_success "All MCP servers are on the allowlist."
    exit_status=0
  fi
  
  # Print JSON report if requested
  if [[ "$JSON_OUTPUT" == true ]]; then
    print_json_report "$exit_status"
  fi
  
  return "$exit_status"
}

main "$@"
