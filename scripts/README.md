# Scripts

Developer and operations tooling scripts. **These are not runtime modules** — they are never imported by the Next.js application.

## Usage

Scripts here are invoked via `npm run`, `npx tsx`, or directly in the terminal. They should never appear in `import` statements inside `src/`.

## What belongs here

- Deployment/setup shell scripts (`deploy.sh`, `setup-*.sh`)
- One-off data generation or transformation utilities (`generate-fake-providers.ts`, `transformSvg.ts`)
- CI/CD helpers (`verify-*.sh`)
- Notion/Jira/Sprint tooling (`plan-sprint.ts`, etc.)

## What does NOT belong here

- Application runtime code → put in `src/lib/` or `src/utils/`
- Database migrations → put in `supabase/migrations/`
- Test harnesses → put in `tests/` or `src/__tests__/`
