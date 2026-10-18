# Scripts

Developer and operations tooling scripts. **These are not runtime modules** — they are never imported by the Next.js application.

## Usage

Scripts here are invoked via `npm run`, `npx tsx`, or directly in the terminal. They should never appear in `import` statements inside `src/`.

## What belongs here

- Deployment/setup shell scripts (`deploy.sh`, `setup-*.sh`)
- One-off data generation or transformation utilities (`generate-fake-providers.ts`, `transformSvg.ts`)
- CI/CD helpers (`verify-*.sh`)

## What does NOT belong here

- Application runtime code → put in `src/lib/` or `src/utils/`
- Database migrations → put in `supabase/migrations/`
- Test harnesses → put in `tests/` or `src/__tests__/`

## Agent lanes

`lane.sh` holds the `lane`, `lane_done`, `lane_status` and `foreman` shell
functions used by the foreman (`docs/agents/foreman.md`). Source it from
`~/.zshrc`:

```bash
source ~/Projects/uflow/scripts/lane.sh
```

In zsh, sourcing defines only thin wrappers (`lane`, `lane_done`,
`lane_status`, `foreman`). Each calls `scripts/lane <subcommand> "$@"` and
returns its exit status, so all logic runs under bash. `scripts/lane`
(`status`, `start`, `foreman`, `done`) is the only entry point that sources
`lane.sh` under bash and runs the real functions.

It is not executed by CI or runtime code.
