# Notion MCP Backlog Integration

This directory contains the configuration and documentation for integrating Cursor with Notion for backlog management.

## Overview

The Notion MCP integration enables Cursor to:
- Read tasks, epics, user stories, and bugs from Notion
- Automatically refine tasks using expert rules
- Update refinement status and mark tasks as ready
- Create and manage epics, features, and sprints

## Quick Start

1. **Set up Notion Integration** (see [SETUP.md](./SETUP.md))
2. **Configure MCP in Cursor** (see [SETUP.md](./SETUP.md))
3. **Use Commands** (see [USAGE.md](./USAGE.md))

## Files

- `notion.json` - Database schema mapping for Notion
- `SETUP.md` - Complete setup instructions
- `USAGE.md` - How to use the backlog system
- `EXPERT_ROLES.md` - Documentation of expert rules

## Expert Rules

Expert rules in `.cursor/rules/` provide domain-specific knowledge:
- `security-expert.mdc` - Security review criteria
- `compliance-expert.mdc` - Compliance requirements
- `qa-expert.mdc` - QA testing standards
- `backend-expert.mdc` - Backend architecture standards
- `frontend-expert.mdc` - Frontend component standards

## Workflow

1. Create task in Notion
2. Use `@refine-task.md` command in Cursor
3. Cursor reads task via MCP
4. Expert rules guide refinement
5. Cursor updates "Refinement" and "Completed Refinement" fields
6. Cursor evaluates "Ready?" formula
7. Task marked ready for development

## Commands

- `@refine-task.md` - Refine a Notion task
- `@create-epic.md` - Create new epic in Notion
- `@update-refinement.md` - Update refinement status

