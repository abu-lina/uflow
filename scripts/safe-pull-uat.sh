#!/bin/bash

# Safely pull UAT changes when there are local file conflicts
# This script backs up conflicting files and pulls latest changes

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🔄 Safely pulling UAT changes...${NC}"
echo ""

# Create backup directory
BACKUP_DIR="backup-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo -e "${YELLOW}Backing up conflicting files to $BACKUP_DIR/${NC}"

# Files that might conflict
FILES=(
    "env.uat.template"
    "nginx-uat-template.conf"
    "scripts/deploy-uat.sh"
    "scripts/setup-uat-ssl.sh"
)

# Backup files if they exist
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  - Backing up $file"
        mkdir -p "$BACKUP_DIR/$(dirname $file)"
        cp "$file" "$BACKUP_DIR/$file"
        # Remove the file so git can pull
        rm "$file"
    fi
done

echo -e "${GREEN}✅ Backup complete${NC}"
echo ""

# Now pull
echo -e "${BLUE}Pulling latest changes...${NC}"
git pull origin main

echo ""
echo -e "${GREEN}✅ Pull complete${NC}"
echo ""
echo "Backed up files are in: $BACKUP_DIR"
echo "Compare if needed, then run: ./scripts/fix-uat-static-files.sh"

