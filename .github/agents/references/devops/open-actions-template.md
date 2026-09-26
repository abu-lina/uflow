# Open Actions [ID]: Deferred Post-Deploy Follow-ups

## Summary

- Why deferred (1–2 lines)
- Release/version context (if relevant)

## Open Actions

| Item                                   | Owner       | Trigger/Due    | Evidence to close      | Status |
| -------------------------------------- | ----------- | -------------- | ---------------------- | ------ |
| [e.g., Plausible dashboard validation] | [name/role] | [date/trigger] | [link/screenshot/logs] | Open   |

## Changelog

| Date (UTC) | Agent  | Change                                    |
| ---------- | ------ | ----------------------------------------- |
| YYYY-MM-DD | devops | Created tracker from deferred validations |

````

10. Update plan status to "Committed for Release [X.Y.Z]".
11. Report to Roadmap agent (handoff): Plan committed, release tracker needs update.
12. Inform user: "[Plan ID] committed locally for release [X.Y.Z]. [N] of [M] plans committed for this release."
13. Store memory (MANDATORY): After Stage 1 local commit — what's committed, what remains, next steps.
    - After storing memory, immediately retrieve using query:
      "Plan <ID> DevOps Stage 1 <version>"
      Confirm at least one result.

---

**STAGE 2: Release Execution (When All Plans Ready)**

_Triggered when: User requests release approval. Goal: Bundle, push, publish._

**Phase 2A: Release Readiness Verification**

1. Query Roadmap for release status: All plans for target version must be "Committed".
2. If any plans incomplete: Report status, list pending plans, await further commits.
3. Verify version consistency across ALL committed changes.
   3b. **Security audit evidence (MANDATORY)**:
   - Run `npm audit --audit-level=high` (or an equivalent audit command agreed for this repo).
   - If HIGH or CRITICAL vulnerabilities appear, **verify whether they are pre-existing on `origin/main` before treating them as a blocker** (PI-8):

     ```bash
     git show origin/main:package-lock.json | \
       python3 -c "import json,sys; d=json.load(sys.stdin); \
       pkg=d.get('packages',{}).get('node_modules/<package>',{}); \
       print('version on main:', pkg.get('version','not found'))"
     ```

     - **Same version as `origin/main`** → pre-existing; document in deployment doc; do NOT block release.
     - **Newer version (bumped by this release)** → investigate; potentially a blocker.
     - **New package not present on `origin/main`** → investigate before releasing.

   - Record whether any **new** HIGH/CRITICAL vulnerabilities appear compared to the start of Stage 2.
   - If new HIGH/CRITICAL vulnerabilities are introduced by this release work, treat as a blocker unless the user explicitly accepts the risk.
4. Validate packaging: Build, package, verify all bundled changes.
   4b. **PWA Browser Verification Requirements (MANDATORY when plan touches PWA surface area)**:
   PWA surface area includes: `next.config.js` (workboxOptions), service worker routes, offline fallback, push notification handlers, or any file under `lib/pwa/`.

   If the plan touched any of these areas, include the following in the release readiness summary presented to the user (Phase 2B). These items can be deferred with user acknowledgment, but they MUST be visible — not silently omitted:

   Required manual validations before production promotion:
   □ DevTools → Application → Service Workers: SW active, version matches build
   □ Icon pages (e.g., `/providers/[id]`): icons render; no SW console errors
   □ Network tab: CDN icon requests not intercepted by SW (status 200 from CDN, not SW)
   □ Offline mode: `/offline.html` fallback served correctly
   □ Push (only if push handler was changed): test notification delivered

   **Closure discipline (MANDATORY for PWA/service-worker runtime bugfixes)**:

- Do not treat this checklist as visibility-only.
- Before marking Stage 2 complete, require either:
  - at least one executed browser-backed validation recorded in the deployment doc, OR
  - an explicit DEFERRED risk record (owner + trigger/due + closure evidence) in the deployment doc or open-actions tracker.

If these are already tracked as deferred DF-N items in the open-actions tracker, reference them explicitly in the release summary with their status. Do not create duplicate trackers.

**Hotfix note (WHEN APPLICABLE)**: If the release followed a compressed hotfix pipeline without a formal UAT artifact, the deployment doc MUST include a `Live Verification` subsection summarizing:

- route(s) checked
- browser/profile context
- observed outcome
````
