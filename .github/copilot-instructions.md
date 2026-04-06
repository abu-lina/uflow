# UFlow - GitHub Copilot Instructions

## Project Overview

UFlow (ummahflow.com) is a Next.js 15 community services platform connecting service providers with users. Built with a **Postgres-first philosophy**: "Start with Postgres. It can probably do more than you think." We use native Postgres features (tsvector full-text search, GIN indexes, materialized views) before adding external services.

## Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, PWA
- **Backend**: Supabase (Auth, PostgreSQL, Storage, Functions)
- **Hosting**: Hetzner Cloud (EU-based, cost-effective) + Cloudflare CDN
- **Deployment**: GitHub Actions + Docker standalone builds
- **Email**: Resend
- **Testing**: Vitest + React Testing Library
- **DB**: PostgreSQL with German full-text search (tsvector)

## Critical Architecture Patterns

### Server/Client Component Separation

Always use correct Next.js 15 patterns:

```typescript
// Server component - DEFAULT (no directive needed)
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Client component - MUST use 'use client'
('use client');
import { useState } from 'react';

// Server-only code - protect with 'server-only'
import 'server-only';
```

**Key files**:

- [`src/lib/supabase/server.ts`](src/lib/supabase/server.ts) - Server-side Supabase client
- Server components = database access, no hooks/useState
- Client components = interactivity, hooks, browser APIs

### Folder Structure (check before creating)

```
src/
├── app/               # Next.js App Router
│   ├── (public)/      # Public routes (auth, landing)
│   ├── (dashboard)/   # Protected routes
│   ├── api/           # API route handlers
├── components/        # SHARED UI only (see README in folder)
│   ├── ui/            # Atomic components (Button, Input)
│   ├── shared/        # Shared blocks (cards, headers)
│   ├── common/        # Small reusable components
│   └── layout/        # Layout containers
├── features/          # Feature modules — domain-specific UI + hooks + services
├── services/          # Supabase API clients (shared across features)
├── hooks/             # Custom React hooks (shared)
├── lib/               # Utilities (Supabase client, PWA)
├── types/             # TypeScript types
└── utils/             # Pure utility functions
```

**Placement guidance**: See [`docs/guides/PLACEMENT_RUBRIC.md`](docs/guides/PLACEMENT_RUBRIC.md) for the full decision table.

**Domain-specific UI** (e.g., provider cards, endorsement buttons) belongs in `src/features/<domain>/components/`, not `src/components/`. Existing domain folders under `src/components/` (providers, mosque, admin, etc.) are legacy placements — migrate them when you touch that code.

**Database migrations** go in `supabase/migrations/` only. `sql/` is for reference/debug queries.

**Dev scripts** go in root `scripts/` (never imported by runtime code).

**ALWAYS** check if files/folders exist before creating. Move misplaced files to correct location.

### Database & Search Patterns

#### Full-Text Search (REQUIRED)

**NEVER** use `ILIKE` for search - ALWAYS use Postgres tsvector:

```typescript
// ✅ CORRECT: Use tsvector RPC function
const { data } = await supabase.rpc('search_offers', {
  search_query: 'search term',
  limit_count: 100,
});

// ❌ WRONG: ILIKE is slow and doesn't use indexes
const { data } = await supabase.from('offers').ilike('name_de', `%${query}%`);
```

**Key files**:

- [`src/services/offers.ts`](src/services/offers.ts) - Full-text search implementation
- [`src/services/needs.ts`](src/services/needs.ts) - Full-text search implementation

#### Database Migrations

- All schema changes go in `supabase/migrations/`
- Create indexes for frequently queried columns
- Use GIN indexes for tsvector columns:

```sql
CREATE INDEX idx_providers_name_search
ON providers USING gin(to_tsvector('german', provider_name));
```

### DO NOT Add Services Prematurely

**Before adding Redis/Elasticsearch/queues**, ask: "Is our DAU > 5,000?"

- Use Postgres native features first (tsvector, materialized views, indexes)
- Scale Postgres vertically before adding complexity
- Document performance issues with `EXPLAIN ANALYZE` first

## Development Workflows

### Environment Setup

```bash
# Install dependencies
npm install

# Development (uses .env.local)
npm run dev

# UAT environment
npm run dev:uat

# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix

# Testing
npm test              # Run tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

### Build & Deployment

```bash
# Local build
npm run build

# Docker standalone build (for production)
npm run build:standalone

# Performance testing
npm run perf:test           # All tests
npm run perf:uat:baseline   # UAT baseline
```

**Key files**:

- [`next.config.js`](next.config.js) - PWA, CSP, bundle analyzer config
- [`package.json`](package.json) - All npm scripts
- [`.github/workflows/`](.github/workflows/) - CI/CD pipelines

### Testing Patterns

```typescript
// Use Vitest + Testing Library
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

describe('Component', () => {
  it('renders correctly', () => {
    render(<Component />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
```

### Bugfix Handoff Completeness

For bugfix work, do not hand off to QA until all of the following exist when applicable:

- `agent-output/implementation/<ID>-*.md` created and populated
- TDD Compliance table completed
- Regression tests added for the actual bug path, not only adjacent behavior
- Regression tests for interactive or visible UI elements MUST assert real DOM behavior (`screen.getByRole`, `screen.getByPlaceholderText`, `screen.getByLabelText`, etc.) — not a `data-testid` that is only present because the component under test was replaced by a `vi.mock()` factory. Asserting a mocked component's marker proves tree composition only, not that the real component renders or is interactive.
- Test evidence recorded (`vitest`, `tsc`, and any other relevant gate)

Keep this scoped to handoff completeness and regression adequacy. Manual browser validation remains a QA/UAT responsibility unless the plan explicitly requires local verification.

#### Client-State Precedence Regression Pattern

When a bug is caused by client-side state precedence, stale context, URL-param resolution, or other React-side value selection bugs:

- Do not rely on SSR/page tests alone
- Write focused logic tests that mirror the exact pre-fix and post-fix expressions
- Make the bug visible in the test naming, for example `[pre-fix FAILS]` and `[post-fix PASSES]`

Use SSR or integration tests only as supplementary coverage when they actually exercise the bug path.

## Code Conventions

### TypeScript

- **Strict mode enabled** - all types required
- Use `interface` for props, `type` for unions
- Import types: `import type { User } from '@/types';`

### UI/UX Requirements

- **All components need**: Loading states, error states, empty states
- **Accessibility**: ARIA labels, keyboard navigation, semantic HTML
- **Responsive**: Mobile-first, test on 320px to 1920px
- **i18n**: Use `next-intl` for translations

### Import Patterns

```typescript
// ✅ Use alias imports
import { Button } from '@/components/ui/Button';
import { getProviders } from '@/services/providers';

// ❌ Avoid relative imports for src/
import { Button } from '../../../components/ui/Button';
```

## Documentation

### Where to Look

- **Architecture**: [`docs/architecture/ARCHITECTURE_OVERVIEW.md`](docs/architecture/ARCHITECTURE_OVERVIEW.md)
- **Deployment**: [`docs/deployment/`](docs/deployment/)
- **Features**: [`docs/features/`](docs/features/)
- **Troubleshooting**: [`docs/troubleshooting/`](docs/troubleshooting/)
- **Complete Index**: [`docs/README.md`](docs/README.md)

### Expert Rules (Cursor-specific)

Detailed expert rules exist in `.cursor/rules/`:

- `architecture-expert.mdc` - System design, deployment, infrastructure
- `frontend-expert.mdc` - React, Next.js, UI/UX, accessibility
- `backend-expert.mdc` - API, database, performance, security
- `security-expert.mdc` - Security best practices
- `qa-expert.mdc` - Testing standards

## Common Pitfalls

1. **Search**: Never use ILIKE - always use tsvector RPC functions
2. **Server/Client**: Importing server code in client components breaks builds
3. **Folder Structure**: Check if files exist before creating duplicates
4. **PWA**: Don't disable PWA in production (use `DISABLE_PWA=true` for local dev only)
5. **Environment Variables**: All Supabase vars are in `.env.local` (never commit)
6. **Premature Optimization**: Don't add Redis/queues before proving Postgres can't handle it
7. **Parallel Sessions**: See the dedicated section below.

## Parallel Session Awareness (All Agents)

When working inside a **git worktree** (a parallel worker session), all agents must obey these constraints:

### Detecting a Worker Session

- A **Session Context Header** is present in the conversation (starts with `Session: S<id>-<topic>`).
- The workspace root path contains `/uflow-wt/` instead of the canonical `/uflow/` checkout.

### Constraints (MANDATORY when in a worker session)

1. **No ID allocation**: Do not create new Plan IDs or edit `agent-output/.next-id` — the control window owns ID assignment.
2. **Stay in scope**: Do not read or write files outside the declared worktree root and the shared `.agent` root.
3. **Relay the header**: Include the Session Context Header verbatim in every handoff prompt to downstream agents.

### Agent-Specific Cautions

| Agent | Risk | Rule |
|-------|------|------|
| **DevOps** | Pushing to wrong branch or deploying from worktree | Always verify `git branch` before push; never deploy from a worktree — merge to main first |
| **Implementer** | Writing files outside worktree scope | Check `$PWD` matches the declared worktree root before creating/editing files |
| **Planner** | Allocating Plan IDs in worker session | Only the control window allocates IDs; in a worker session, use the pre-assigned ID from the Session Context Header |

### Control Window vs Worker Window

- **No Session Context Header** + canonical `/uflow/` path = **control window** → normal operations, ID allocation allowed.
- **Session Context Header present** or `/uflow-wt/` path = **worker session** → constraints above apply.

Full operator guide: `docs/ai/parallel-sessions.md`.

## Quick Reference

- **Production**: https://ummahflow.com
- **UAT**: https://uat.ummahflow.com
- **Health Check**: `/api/health`
- **Node**: >=18.0.0
- **Package Manager**: npm >=9.0.0
- **Database**: German locale for full-text search
