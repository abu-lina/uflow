# Issue tracker: GitHub

Issues are the only state store. No plan files, no local tracking. Use the `gh` CLI; it infers the repo from `git remote`.

## Conventions

- **Create**: `gh issue create --title "<type>: <summary>" --body-file body.md --label type:bugfix,area:ui,P2`. Write the body to a file; heredocs with backticks get mangled by the shell.
- **Read**: `gh issue view <n> --json title,body,labels,comments`. Don't use `--comments`; it fails on some `gh` versions (deprecated GraphQL field).
- **List ready work**: `gh issue list --state open --label ready --json number,title,labels --jq '.[] | "\(.number)\t\([.labels[].name]|join(","))\t\(.title)"'`
- **Comment**: `gh issue comment <n> --body-file note.md`
- **Labels**: `gh issue edit <n> --add-label "ready,P1" --remove-label "needs-triage"`. Only label changes through `issue edit`; don't rewrite bodies written by the owner.
- **Close**: happens automatically when a PR with `Closes #<n>` merges. Close by hand only with a reason: `gh issue close <n> --comment "..."`.

## Sub-issues

An issue too big for one PR is split before it gets `ready`. Create each part with its own acceptance criteria and one `area:*`, then link them:

```bash
PARENT_ID=$(gh api repos/{owner}/{repo}/issues/<parent> --jq .id)
gh api --method POST repos/{owner}/{repo}/issues/<parent>/sub_issues -F sub_issue_id=$(gh api repos/{owner}/{repo}/issues/<child> --jq .id)
```

If sub-issues aren't available, put `Part of #<parent>` as the first line of the child body and a task list in the parent.

## Blocking

Use GitHub's native dependencies so the foreman can see them:

```bash
gh api --method POST repos/{owner}/{repo}/issues/<blocked>/dependencies/blocked_by \
  -F issue_id=$(gh api repos/{owner}/{repo}/issues/<blocker> --jq .id)
```

`issue_id` is the numeric database id, not the `#number`. Fallback: a `Blocked by: #<n>` line at the top of the body. A blocked issue isn't `ready` until every blocker is closed.

## Acceptance criteria

Every `ready` issue has a section headed `Acceptance Criteria` with `- [ ]` items. Each item must be observable and testable; "works correctly" isn't a criterion, "returns 409 with code `EMAIL_TAKEN` when the email exists" is. The lane writes one failing test per item before implementing.

## Pull requests

- One PR per issue, opened as a draft at first push, body starts with `Closes #<n>`.
- Read: `gh pr view <n> --json state,isDraft,statusCheckRollup,reviews`; diff: `gh pr diff <n>`.
- Edit title or body: `gh api -X PATCH repos/{owner}/{repo}/pulls/<n> -f body="$(cat body.md)"` (`gh pr edit` is broken on some versions).
- Checks: `gh pr checks <n>`; mark ready: `gh pr ready <n>`.
- Update onto `main` (foreman only, next PR in line only): `gh pr update-branch <n>`.

GitHub shares one number space across issues and PRs; `gh pr view 42` failing means `#42` is an issue.
