#!/bin/bash
# Move Plan 012 documents to closed/ folders after Stage 1 completion

set -e

echo "Moving Plan 012 documents to closed/ folders..."

# Architecture
mv "agent-output/architecture/012-root-level-files-placement-architecture-findings.md" \
   "agent-output/architecture/closed/"
echo "✓ Moved architecture doc"

# Critique
mv "agent-output/critiques/012-root-level-files-placement-critique.md" \
   "agent-output/critiques/closed/"
echo "✓ Moved critique doc"

# Planning
mv "agent-output/planning/012-root-level-files-placement-v0.6.0.md" \
   "agent-output/planning/closed/"
echo "✓ Moved planning doc"

# Implementation
mv "agent-output/implementation/012-root-level-files-placement-implementation.md" \
   "agent-output/implementation/closed/"
echo "✓ Moved implementation doc"

# Code Review
mv "agent-output/code-review/012-root-level-files-placement-code-review.md" \
   "agent-output/code-review/closed/"
echo "✓ Moved code-review doc"

# QA
mv "agent-output/qa/012-root-level-files-placement-qa.md" \
   "agent-output/qa/closed/"
echo "✓ Moved QA doc"

# UAT
mv "agent-output/uat/012-root-level-files-placement-uat.md" \
   "agent-output/uat/closed/"
echo "✓ Moved UAT doc"

echo ""
echo "✅ All 7 Plan 012 documents moved to closed/"
echo "Documents: architecture, critique, planning, implementation, code-review, qa, uat"
