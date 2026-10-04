---
ID: 251
Origin: 251
UUID: null
Status: QA Complete
---

# QA Report: Frontend Review

**QA Status**: QA Complete (verification report complete; not application or release approval)
**QA Specialist**: qa
**Baseline**: main, b1676dd7
**Plan Reference**: User-supplied verification handoff #251; no planning, implementation, or analysis document exists for this ID. UUID was not supplied and is intentionally unset rather than invented. The ID counter was not read or changed.

## Changelog

| UTC Time          | Handoff             | Summary                                                                                                                                       |
| ----------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-24T18:43Z | Orchestrator to QA  | Began frontend review; application code changes prohibited.                                                                                   |
| 2026-09-24T18:58Z | QA to Code Reviewer | Audit complete: 14 ranked findings, scoped browser checks, 76 passing tests/1 skipped, type-check pass; wider validation explicitly deferred. |

**Review window**: 2026-09-24T18:43Z to 2026-09-24T18:58Z. Strategy was established before browser/test execution. Final report checks passed for source links, finding counts, and unchanged archive contents; editor diagnostics are clear. Application files and the ID counter remain unchanged. An unrelated untracked requests directory appeared during the session and was left untouched.

## Test Strategy

Audit navigation, responsive behavior, accessibility, data states, performance, and maintainability. Trace route entry points into the components and hooks that control behavior; validate suspected issues with focused existing tests and browser checks where available. Rank High/Med/Low by user impact. Label findings **verified** only for demonstrated source or runtime facts, explicitly distinguishing those evidence types; label unmeasured improvement opportunities **suggestion**.

Prioritize discovery/search, provider details, saved items, authentication/profile, create/edit, and shared navigation/dialog primitives. Inventory all page routes and their loading/error boundaries. A route inventory is not an exhaustive runtime test: record uncovered views and deferred scenarios explicitly.

### Infrastructure and Constraints

- Existing: Next.js 15.5, React 18.3, Vitest 3, Testing Library, Playwright 1.60, TypeScript, ESLint, bundle-budget tooling.
- Needed for complete accessibility sign-off: axe integration plus real-device keyboard/screen-reader and contrast checks. No dependencies will be installed for this audit.
- Memory retrieval failed: NO-MEMORY MODE, artifact-first review.
- The referenced QA README is absent; use the QA-mode checklist.
- Roadmap and architecture overview reviewed before strategy design.
- TDD implementation gate: not applicable, this is an audit of existing software, not an implementation handoff or release approval.
- Do not modify production code, dependencies, feature flags, or the document counter.

### Exclusions

Reviewed requests 249 and 250 from backup/wip-requests-and-learnings. Exclude their hydration/layout-tree swaps, portal escapes, responsive action-bar flash, grid padding shifts, splash flash, gallery placeholders, unused fonts, and dead MobileLayoutWrapper work.

### Initial Discriminating Check

Hypothesis: the root viewport's maximumScale=1 constrains user zoom in browsers that honor it. Inspect rendered viewport metadata; do not infer universal browser pinch-zoom behavior from source alone.

## Findings

Priority reflects user impact, not file size. **Verified** means the specified evidence was observed; it does not imply every browser or authenticated role was tested.

### F1 - High - Desktop navigation is clipped at tablet widths

**Classification: verified (browser and source).**

- Location: [Header.tsx](../../src/components/layout/Header.tsx#L209), [layout.tsx](../../src/app/layout.tsx#L74).
- The desktop header starts at 768px but uses `grid-cols-[1fr_800px_1fr]`, an 800px section selector, and 96px horizontal padding, before accounting for logo and auth controls.
- Chromium on `/login`, at both 768px and 1024px: Login spans x=1076..1156 and Register x=1172..1270, outside the viewport. Stores is also clipped. Document horizontal overflow is hidden, so scrolling cannot recover them. At 1440px and 1920px these controls fit horizontally.
- Improve: use shrinking grid tracks and responsive widths, or retain compact navigation until the complete header fits. Test control bounding boxes and hit targets, not just `scrollWidth`. WCAG 1.4.10 reflow risk.

### F2 - High - Page header intercepts desktop navigation clicks

**Classification: verified (browser and source).**

- Location: [LoginPageContent.tsx](<../../src/app/(public)/login/LoginPageContent.tsx#L208>), [PageHeader.tsx](../../src/components/layout/PageHeader.tsx#L186), [Header.tsx](../../src/components/layout/Header.tsx#L201).
- At `/login`, 1440x900, a normal Playwright click on the global Login button failed for 30 seconds because the page's `h1` intercepted pointer events. Both headers are fixed at top=0 with z-index 50; the page header appears later in the DOM.
- Improve: choose one header owner per breakpoint, or position the page header below the global header. A spacer only moves content; it does not move a fixed overlay. This is a persistent desktop obstruction, not the excluded mount-time mobile jank.

### F3 - High - Actual login overlay bypasses accessible Modal

**Classification: verified (browser and source).**

- Location: [LoginModal.tsx](../../src/features/auth/components/LoginModal.tsx#L141), [Modal.tsx](../../src/components/ui/Modal.tsx#L18).
- On `/food` at 1440x900, clicking Login opens a 1142px-wide custom overlay. The rendered DOM contains zero `role=dialog` elements; focus remains on the background Login trigger, the close button has no accessible name, and Escape leaves the overlay open. Source has no focus trap or Escape handler.
- Improve: reuse the existing shared Modal, supply a translated title/close label, and use responsive panel dimensions. Its existing focus/scroll/background isolation behavior is preferable to another custom implementation. WCAG 2.4.3 and 4.1.2; validate keyboard containment and restoration after migration.
- The 12 passing shared-Modal tests do not cover this overlay.

### F4 - High - Failed discovery fetch becomes a successful empty result

**Classification: verified (actual-module failure probe and source; not a live server outage).**

- Location: [renderProvidersPage.tsx](<../../src/app/(public)/providers/renderProvidersPage.tsx#L60>), [ProvidersContent.tsx](<../../src/app/(public)/providers/ProvidersContent.tsx#L269>).
- The server catches a search failure but still passes `{results: [], hasMore: false, totalCount: 0}` as `initialData`. Matching client queries accept that seed with five-minute stale time, `refetchOnMount: false`, and `refetchOnWindowFocus: false`.
- Probe: transpiled and executed the actual renderer with only its search service forced to reject, then passed its returned seed into the installed `InfiniteQueryObserver` using those options. Assertions passed: error logged, empty seed returned, client status `success`, `isError=false`, recovery fetch count **0**.
- Users can see "No results" instead of an outage, without the grid's retry UI. Staleness expiry alone does not initiate a fetch.
- Improve: seed only successful reads; propagate an explicit error or let the client fetch/retry when SSR fails. Add a renderer-to-query regression, including a genuine empty result control. Do not remove the existing server failure log.

### F5 - Med - Form labels and password controls lack accessible relationships

**Classification: verified (browser and source).**

- Location: [FormInput.tsx](../../src/components/ui/FormInput.tsx#L99).
- On `/login` and unauthenticated `/saved`, email/password inputs have `labels.length=0` and no `aria-label`. The visible `<label>` is a sibling with no `htmlFor`; the password visibility button has no text, title, or ARIA name. Inputs also remove their native outline/ring without a replacement focus treatment on the wrapper.
- Placeholders may supply fallback names in some accessibility trees; they do not establish the visible label relationship.
- Improve the shared primitive once: stable id/label association, a translated show/hide-password name, and visible `focus-visible`/`focus-within` styling. Add real-component `getByLabelText` and keyboard tests. WCAG 1.3.1, 2.4.7, 4.1.2.

### F6 - Med - Small form labels have insufficient contrast

**Classification: verified (computed browser styles and WCAG calculation).**

- Location: [FormInput.tsx](../../src/components/ui/FormInput.tsx#L100).
- Default-theme `/login` label: foreground `rgb(135,135,135)`, background white, rendered size 11.104px at the measured desktop viewport. Relative-luminance contrast is **3.59:1**, below **4.5:1** for normal text (WCAG 1.4.3).
- Improve the muted-text token or label-specific color and check all themes and error/disabled variants. Only this foreground/background pair was measured; this is not an all-theme contrast audit.

### F7 - Med - Global viewport requests a zoom limit

**Classification: verified (source and rendered metadata); device effect needs confirmation.**

- Location: [layout.tsx](../../src/app/layout.tsx#L20).
- All six `/login` viewport checks rendered `maximum-scale=1`. Browsers that honor it prevent users from enlarging the interface through pinch zoom.
- Improve: remove `maximumScale: 1`; validate 200% text enlargement and narrow-screen reflow. Chromium desktop metadata inspection does not prove iOS/Android pinch behavior. WCAG 1.4.4 risk.

### F8 - Med - Saved-item failures provide no actionable recovery

**Classification: verified (source; authenticated failure scenario not executed).**

- Location: [saved/page.tsx](<../../src/app/(public)/saved/page.tsx#L129>), [saved/page.tsx](<../../src/app/(public)/saved/page.tsx#L521>), [ClientProviders.tsx](../../src/components/layout/ClientProviders.tsx#L29).
- The query error branch only renders EmptyState, although it tells users to try again; it has no refetch action. Query defaults disable mount/focus refetch. Unsave lookup/delete errors only reach `console.error`, leaving no visible failure feedback.
- Improve: expose explicit retry, announce failure, and show a toast or inline error for unsuccessful unsaves while retaining the saved item. Test the real service rejection and user recovery, not only an empty list.

### F9 - Med - Provider-detail errors are treated as not found

**Classification: verified (source; transient authenticated fetch failure not executed).**

- Location: [ProviderDetailPageClient.tsx](<../../src/app/(public)/p/[id]/ProviderDetailPageClient.tsx#L145>).
- `if (error || !provider) return notFound()` sends both query failures and confirmed absence to the same not-found UI. That is a misleading result for transient network/service failures, including a failed background refresh.
- Improve: distinguish missing records from errors, preserve usable cached content, and offer retry for failures. Add tests for missing record, initial failure, and cached-data refresh failure. This finding does not concern the excluded desktop/mobile layout branching.

### F10 - Med - Create flow advertises a disabled chat destination

**Classification: verified (browser and source).**

- Location: [create/page.tsx](<../../src/app/(public)/create/page.tsx#L107>), [chat/page.tsx](<../../src/app/(public)/chat/page.tsx#L13>).
- At `/create`, the visible "Chat Assistant" link points to `/`. Clicking it navigated home, not to a conversation. Visiting `/chat` also returned home under the current disabled flag.
- Improve: gate the hint on the same chatbot flag and point it to an actual chat entry when enabled. Check mobile and desktop surfaces together.

### F11 - Med - Error copy and authentication handling drift across entry points

**Classification: verified (source); consolidation is a suggestion.**

- Location: [LoginPageContent.tsx](<../../src/app/(public)/login/LoginPageContent.tsx#L74>), [saved/page.tsx](<../../src/app/(public)/saved/page.tsx#L164>), [LoginModal.tsx](../../src/features/auth/components/LoginModal.tsx#L39), [error.tsx](../../src/app/error.tsx#L18).
- Login page and saved-login failure branches contain hardcoded German strings, while LoginModal uses translation keys for analogous failures. The root error boundary is hardcoded English and displays `error.message` directly. Normal English UI was observed in Chromium, making these source-level mixed-language paths relevant.
- Improve: share translated auth-error mapping and recovery behavior across the existing entry points, and use safe localized root error copy. Preserve intentionally different magic-link/password modes. Do not rewrite all forms merely to reduce line counts.

### F12 - Med - Defer chat code at its actual activation boundary

**Classification: suggestion (source import graph; production-byte impact unmeasured).**

- Location: [RootClientLayout.tsx](../../src/components/layout/RootClientLayout.tsx#L8), [ChatFloatingWidget.tsx](../../src/features/chat/components/ChatFloatingWidget.tsx#L5), [ChatWidget.tsx](../../src/features/chat/components/ChatWidget.tsx#L6).
- The root client layout statically imports ChatFloatingWidget, which statically imports ChatWidget and its message/input/hook graph. A state-based runtime feature flag hides rendering but does not create a code-splitting boundary.
- Improve: measure production route chunks with the flag off/on, then dynamically load the widget and/or chat body when needed. Header auth overlays and provider detail already demonstrate dynamic imports; retain those patterns. No claimed kB savings or CWV improvement without a production baseline.
- Image review: ProviderCard uses next/image with explicit `sizes`, loading and priority props. Do not file the already-tracked gallery-placeholder issue again. The 640-1024px `33vw` image hint versus a two-column grid deserves a measured sharpness/network check, not a speculative image rewrite.

### F13 - Low - Consolidate proven domain duplication as files are touched

**Classification: suggestion (source and inventory).**

- Location: [saved/page.tsx](<../../src/app/(public)/saved/page.tsx>), [LoginPageContent.tsx](<../../src/app/(public)/login/LoginPageContent.tsx>), [LoginModal.tsx](../../src/features/auth/components/LoginModal.tsx), [CommunityServiceDetailModal.tsx](../../src/components/community-services/CommunityServiceDetailModal.tsx), [ProviderOptionCard.tsx](../../src/components/create/ProviderOptionCard.tsx).
- Saved page is 579 lines and duplicates credential submission, confirmation resend, and error handling from the 316-line login page and 264-line login modal. Legacy domain folders still include `components/create` and `components/community-services`.
- Improve shared behavior only where differences cause drift (F11), and migrate domain components when already modifying them, per the placement rubric. Avoid a repo-wide folder shuffle or speculative abstraction. A 915-line search page is a maintenance hotspot, not itself a proven user-facing defect.

### F14 - Low - Existing mocks overstate UI-state coverage

**Classification: verified (test-source audit).**

- Location: [page-meal-search.test.tsx](<../../src/__tests__/app/(public)/search/page-meal-search.test.tsx#L142>), [plan082-saved-searchbar-no-results.test.tsx](../../src/__tests__/regression/plan082-saved-searchbar-no-results.test.tsx#L82), [Header.test.tsx](../../src/__tests__/components/Header.test.tsx#L17).
- Search mocks ExpandSection with unconditional children, ignoring `isOpen`; its 12 passing cases and one skipped case cannot establish closed/idle visibility. Saved regression mocks HomeSearchBar and asserts the stub test ID, establishing parent placement only, not interactive clearing. Header's 7 tests cover events/height publication, not rendered width or hit testing.
- Improve these existing tests with a controlled-open mock and real search interaction; add browser header geometry/hit-target checks. A no-file browser assertion in this audit did validate the real What accordion: `aria-expanded=false`, searchbox removed. No test files were changed under the read-only code constraint.

## Execution and Coverage

### Environment and Gates

| Check                             | Result and Evidence                                                                                                                                                                                                                    |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workspace                         | main at b1676dd7; no application edits, dependency installs, DB writes, pushes, or ID allocation                                                                                                                                       |
| Browser                           | Installed Playwright Chromium, headless, fresh unauthenticated context, default theme; app resolved to English; local dev at http://127.0.0.1:3100                                                                                     |
| Runtime versions                  | Server reports Next.js 15.5.22; test runner reports Vitest 3.2.7. Package manifest specifies compatible version ranges, not those exact installed versions.                                                                            |
| Focused tests                     | 5 files passed, 76 tests passed, 1 skipped; command below                                                                                                                                                                              |
| TypeScript                        | `npx tsc --noEmit --incremental false`: PASS, exit 0                                                                                                                                                                                   |
| SSR failure probe                 | Actual renderer executed with rejecting search dependency; real InfiniteQueryObserver: success state, empty data, zero recovery requests                                                                                               |
| Search RPC error                  | Browser-intercepted `**/rest/v1/rpc/search_food*` returned 503: `/search?section=food` displayed "Search is currently unavailable. Please try again." No document horizontal overflow at 375px.                                        |
| Controlled-open browser assertion | PASS: real What section collapsed, aria-expanded=false, its search input absent                                                                                                                                                        |
| Report structure                  | Initial structural assertions passed; final links/status checked before handoff                                                                                                                                                        |
| Build, production bundle/CWV      | NOT RUN. No production build/analyzer artifacts were present; development timings are not valid production-performance evidence. No build-env exception claimed.                                                                       |
| Full tests/coverage scripts       | Inspected run-tests.sh and check-coverage.sh; not run for this audit. They invoke whole-repo suites, and the former needs CI mode to avoid watch behavior. Used an explicit narrow Vitest run instead; no coverage percentage claimed. |
| Lint                              | No application delta to lint; repo-wide lint not used as a release gate for this review-only task                                                                                                                                      |
| Lifecycle                         | Archived terminal reports 217/218 (QA Complete) and 219 (Committed) into qa/closed without content changes; QA README absent; no chain-251 plan/analysis exists to synchronize                                                         |

```sh
npx vitest run \
	'src/__tests__/components/Header.test.tsx' \
	'src/__tests__/regression/plan082-saved-searchbar-no-results.test.tsx' \
	'src/__tests__/components/ui/Modal.test.tsx' \
	'src/__tests__/components/ProviderCard.test.tsx' \
	'src/__tests__/app/(public)/search/page-meal-search.test.tsx' \
	--maxWorkers=2 --minWorkers=1
```

### Responsive and Route Matrix

Inventoried **78 page.tsx entry points** and their colocated loading/error files, including all admin, auth, discovery, create, profile, and legal routes. This is a complete route inventory, **not** runtime coverage of every data-driven view. Missing local boundaries alone are not findings: root boundaries and component-level states may apply.

| Surface                                                                            | Executed Evidence                                                                                                                        | Remaining Coverage                                                                                                                       |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Shared header and `/login`                                                         | 320x900, 375x900, 768x900, 1024x900, 1440x900, 1920x900; bounds, input semantics, viewport; 1440px pointer obstruction                   | All locale/theme combinations, real touch devices, zoom and landscape                                                                    |
| `/food`                                                                            | 375x812 populated list (6 local records), no-param default; `/food?q=qa251-no-match-7f69` empty state; source loading/error/retry review | Delayed SSR loading visuals, long pagination, authenticated bookmarks/moderation                                                         |
| `/search`                                                                          | 375x812 no-param default, `?section=food`, real accordion collapse, intercepted RPC failure; existing 12 passing/1 skipped search tests  | Map/geolocation/privacy profiles and remaining accordion permutations                                                                    |
| `/saved`                                                                           | 375x812 logged-out login-required UI; source loading/error/empty/filter/unsave branches; existing no-match regression                    | Authenticated populated/empty/offline/unsave mutation workflows                                                                          |
| `/profile`                                                                         | Logged-out route redirects to `/login`; route inventory                                                                                  | Authenticated profile, ownership, edit/delete states                                                                                     |
| `/create`                                                                          | 375x812 selection screen, chat hint click to `/`; field-route inventory                                                                  | Form drafts, restored state, uploads, validation/submission; no mutations performed                                                      |
| `/chat` and `/`                                                                    | Disabled chat redirects home; create hint also reaches home                                                                              | Chat-enabled workflows deliberately not enabled                                                                                          |
| `/p/[id]`, community details                                                       | Server/client loading and error ownership read; ProviderCard/shared Modal tests                                                          | Detail browser flow was not established by the bookmark probe; real missing/failing record and authenticated variants remain unvalidated |
| `/food/[city]`, `/food/[city]/[category]`, `/city/[cityName]`, `/stores`, `/ummah` | Inventory and shared discovery-renderer analysis                                                                                         | URL-specific success/empty/error browser cases, inactive-section routing                                                                 |
| Dashboard edit/import/enrichment and profile edit subroutes                        | Inventory; provider-edit source shows loading and read-error handling                                                                    | Role-gated runtime checks require approved test identities; no writes attempted                                                          |
| Auth callback/confirm/signup/reset, onboarding/welcome/waitlist, legal, api-docs   | Entry-point and inherited-boundary inventory                                                                                             | Token flows, resend effects, forms, long-page reflow and tool-route runtime                                                              |

Six `/login` screenshots were generated at `/tmp/uflow-251-login-{320,375,768,1024,1440,1920}.png`. They are temporary operator artifacts; findings above rely on DOM geometry, computed styles, interaction logs, and source, not a claimed manual visual inspection.

### Test Limitations and Deferred Validation

- One exploratory bookmark-keyboard script timed out waiting for navigation. Nested keyboard-handler source is suspicious, but the suspected wrong-destination behavior is **not reproduced** and is not ranked as a confirmed finding. Owner: QA; due before accepting bookmark interaction changes; closure: real Enter/Space versus pointer behavior on the same card, authenticated and logged out.
- The first login-overlay check waited for a dialog role and timed out. Follow-up located the real email input and confirmed F3, rather than misclassifying the timeout as a failure to open. The earlier `/login` click-interception failure remains distinct F2. The interrupted browser was closed; later browser checks used guaranteed cleanup.
- Full 320-1920px validation of every data-driven state is **DEFERRED**, MEDIUM risk. Owner: QA; trigger: before fixes are signed off or a broad frontend pass is claimed. Requires approved owner/admin test accounts and representative records; execute the remaining matrix with slow/failed reads, empty data, long content and localized text. Fallback: named operator runs the same matrix on UAT with screenshots, URLs, role, viewport and console evidence.
- Real-device zoom, screen readers, touch keyboard, restored drafts, programmatic field changes and focus restoration are **DEFERRED**, MEDIUM risk. Owner: QA accessibility/device operator; due before accessibility closure. Fallback: iOS Safari/VoiceOver and Android Chrome/TalkBack manual evidence, plus desktop keyboard testing. No focus code was changed in this audit.
- Production bundle/CWV baseline is **DEFERRED**, MEDIUM risk for performance decisions. Owner: frontend performance reviewer; trigger: before prioritizing F12 or claiming speed improvements. Closure: reproducible production build, compressed route-chunk comparison flag-off/on, image request sizing and LCP/INP/CLS with device/network context. Fallback: CI-built UAT artifact measured by a named operator. No additional caching service is recommended.
- No axe scan, full regression suite, full coverage run, deployment, PWA runtime certification, or UAT business-value verdict was performed. No app-version artifacts changed.

### Telemetry and Failure Diagnosability

F4 has a proven source-level mechanism and an existing server error log; the injected failure confirms that log path executes. Preserve it while exposing a recoverable UI state. For follow-up tests assert structured low-volume **normal** failure context (operation, error class, correlation identifier where available), never credentials or entered personal data. Verbose request traces are **debug**, opt-in and safe to disable. This audit adds no production telemetry and does not claim a telemetry-completeness review.

## Next Phase

Code Reviewer: validate the 14 ranked findings (4 High, 8 Med, 2 Low), confirm provenance metadata for this direct verification chain, and turn accepted findings into scoped implementation work. No release approval is implied. No plan Status was changed because no plan exists for #251. The six requested dimensions were audited with the explicit runtime limits above; app-wide QA certification remains open.
