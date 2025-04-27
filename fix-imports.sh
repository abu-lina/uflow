#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status messages
print_status() {
  echo -e "${YELLOW}[$1]${NC} $2"
}

# Function to print success messages
print_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Function to print error messages
print_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
  print_status "CHECK" "Checking dependencies..."
  
  if ! command -v npx &> /dev/null; then
    print_error "npx is not installed"
    exit 1
  fi
  
  if ! command -v prettier &> /dev/null; then
    print_error "prettier is not installed"
    exit 1
  fi
  
  print_success "All dependencies are installed"
}

# Fix imports in a single file
fix_file_imports() {
  local file="$1"
  
  print_status "FIX" "Processing $file"
  
  # Run ESLint with --fix to organize imports
  if ! npx eslint "$file" --fix; then
    print_error "Failed to fix imports in $file"
    return 1
  fi
  
  # Run Prettier to format the file
  if ! npx prettier --write "$file"; then
    print_error "Failed to format $file"
    return 1
  fi
  
  print_success "Successfully fixed imports in $file"
  return 0
}

# Main function
main() {
  # Check dependencies first
  check_dependencies
  
  # Get list of files to process
  local files
  if [ $# -eq 0 ]; then
    # If no arguments, find all TypeScript/TSX files
    files=$(find src -type f \( -name "*.ts" -o -name "*.tsx" \) -not -path "*/node_modules/*" -not -path "*/dist/*" -not -path "*/.next/*")
  else
    # Use provided files
    files="$@"
  fi
  
  # Process each file
  local success_count=0
  local fail_count=0
  
  for file in $files; do
    if fix_file_imports "$file"; then
      ((success_count++))
    else
      ((fail_count++))
    fi
  done
  
  # Print summary
  echo -e "\n${YELLOW}=== Summary ===${NC}"
  echo -e "${GREEN}Successfully processed:${NC} $success_count files"
  if [ $fail_count -gt 0 ]; then
    echo -e "${RED}Failed to process:${NC} $fail_count files"
    exit 1
  fi
  
  print_success "All files processed successfully"
}

# Run the script
main "$@" 