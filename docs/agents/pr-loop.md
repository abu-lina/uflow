# PR loop

From the first push until the PR is green and ready. Runs inside the lane worktree.

## Open the PR at first push

Push as soon as the red tests and the first implementation commit exist, before the work is finished. CI then covers every later commit.

```bash
git push -u origin "$(git branch --show-current)"
gh pr create --draft \
  --title "<type>: <plain-language summary>" \
  --body "Closes #<issue>. Draft; description lands when verify passes."
```

`<type>` is `fix`, `feat`, `refactor`, `chore`, `test` or `docs`, matching the branch prefix. The body must contain `Closes #<issue>` so the issue closes on merge.

## Watch CI

```bash
gh pr checks <pr> --watch --interval 180
```

Check at most every few minutes. Don't poll in a tight loop and don't re-trigger CI by pushing empty commits. The required checks are `Lint & Type Check`, `Run Tests`, `Build Verification` and `Playwright smoke suite`. `Security Audit` is advisory.

## Fix CI failures

For each red check:

1. Read the log: `gh run view <run-id> --log-failed` (run id from `gh pr checks`).
2. Reproduce locally with the same command CI used (`npm run lint`, `npm run type-check`, `npx vitest run`, `npm run build`, `npx playwright test`).
3. Fix, run the local command again, commit by path, push.

Count every push that was meant to fix CI as one attempt. **After 3 failed attempts on the same check, stop.** Comment on the PR with: the check name, what you tried in each attempt, the error text, and your best guess at the cause. Then end your turn. The owner decides what happens next.

Never fix CI by deleting or skipping a test, loosening a type, raising `--max-warnings`, or editing a workflow file. If the failure is in a test you didn't touch, say so in the PR comment and stop; it's probably a `main` problem.

## Answer review comments

For each review thread:

- If you agree: fix it, commit by path, push, reply with the commit SHA.
- If you disagree: reply with the reason in two sentences and leave the thread open. Don't resolve threads you didn't open.
- Blocking and should-fix items must be fixed or argued down before marking ready. Nits can wait for the owner.

Review comments count toward the same 3-attempt limit per thread. Three pushes that don't satisfy a reviewer means stop and report.

## Mark ready

When verify passed locally, CI is green and no blocking or should-fix thread is open:

```bash
cat > /tmp/pr-body.md <<'EOF'
Closes #<issue>

## What changed
- ...

## Acceptance criteria -> tests
- AC1: `src/.../x.test.ts` "..."
- AC2: ...

## Out of scope / follow-ups
- #<new issue> ...

## Learning
One sentence.
EOF
gh api -X PATCH "repos/{owner}/{repo}/pulls/<pr>" -f body="$(cat /tmp/pr-body.md)"
gh pr ready <pr>
```

Write the body to a file first so backticks and `$(` aren't expanded by the shell. Use `gh api -X PATCH` rather than `gh pr edit`: on some `gh` versions `pr edit` fails on a deprecated GraphQL field.

Then post the report on the issue (see `docs/agents/lane.md`, step 6) and end your turn.

## After ready

Nothing. The owner merges. If `main` moved and the PR needs updating, the foreman runs `gh pr update-branch`. Don't rebase, don't merge `main` yourself, don't push again unless a reviewer asks.

## Stop conditions, summarized

Stop and report instead of continuing when:

- 3 fix attempts failed on one check or one review thread
- a failing test is outside the files you changed
- CI needs a secret, a workflow change or a settings change
- the fix would need a schema change not covered by the issue
- you can't reproduce the CI failure locally after one honest try
