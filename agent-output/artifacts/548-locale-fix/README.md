# Issue #548 — Locale-fix evidence (ar)

Captured against the real app: `npm run dev` spawned by Playwright's
webServer (127.0.0.1:3000) from worktree `feature/548-halal-approve-reject`,
local Supabase (migration 138 applied), signed in as a seeded `role=admin`
user (`users.role` + `user_metadata.role`, supabase-js localStorage session
hydrated so the header renders signed-in state). Provider is a seeded
pending food listing named **Al-Sham Bakery Berlin** — deliberately
Latin-script so the ApproveModal proves bidi-isolated interpolation. Its
`food_providers` row is `no_alcohol=false, no_pork=NULL, no_gambling=NULL`
so the failure panels render BOTH groups: "declared non-compliant" and
"not answered".

Locale pinned via `localStorage['preferred-language']='ar'` in an init
script; `dir="rtl"` and `lang="ar"` asserted on `<html>`.

Every caption below is backed by an in-run assertion, not visual
inspection:

| File                                     | What it shows (asserted before capture)                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `01-mobile-390-rtl-ar-top.png`           | 390×844, ar. Asserted: `طريقة التحقق` (verification heading), `شهادة حلال` (certificate heading), `يجب تأكيد أسئلة التوثيق الثلاثة` (gate warning), `مُدرج كغير مطابق` + `بدون إجابة` (both failure groups), `يُشتق مستوى الحلال تلقائيًا` (tier explainer) all present; `Verifizierungsmethode`, `Halal-Zertifikat`, `Bezeugungsfragen`, `Nicht genehmigungsbereit` all absent. |
| `02-mobile-390-rtl-ar-bottom.png`        | Same page scrolled to the end. Asserted: `عبر الإنترنت` (method card), `غير جاهز للموافقة` (red verdict title) present; footer shows `موافقة` / `رفض` / `حفظ`.                                                                                                                                                                                                                   |
| `03-mobile-390-rtl-ar-approve-modal.png` | ApproveModal open in ar. Asserted: `role="dialog"` visible, contains `الموافقة والنشر؟`, and textContent contains `U+2066` + `Al-Sham Bakery Berlin` + `U+2069` — the provider name wrapped in FIRST STRONG ISOLATE / POP DIRECTIONAL ISOLATE by `t()`, which is what keeps surrounding Arabic punctuation in place. `Genehmigung` absent.                                       |
| `04-mobile-390-rtl-ar-gate-422.png`      | After confirming the modal: the PATCH 422s on the stored row and the gate panel renders under the answers. Asserted: `لا يمكن الموافقة بعد` visible, modal dismissed.                                                                                                                                                                                                            |

## What changed underneath

- `t()` (`LanguageProvider`) now wraps interpolated values in FSI/PDI when
  the active locale is RTL — this fixes the general defect (Latin names,
  numbers in RTL sentences), not just this instance. LTR output is
  byte-identical.
- `adminHalalEdit.*` and the page-rendered `createHalal.*` keys now carry
  real ar/tr/ur/ps translations; `createHalal.stepTitle/title/attestationIntro`
  stay INTERIM German on purpose (create wizard, not this page, #415 debt).
- `RejectModal` copy was hardcoded English; it now reads
  `adminHalalEdit.review.rejectConfirm.*` in all six catalogues.
- `EditSubPageLayout`'s default close aria-label was hardcoded 'Close';
  now `t('common.close')`.

## Method

`e2e/zz-548-locale-shots.spec.ts` ran under the suite's own webServer
lifecycle and was deleted afterwards (a standalone `next dev` is not
permitted in this environment). Seeded users and the provider row were
deleted by `afterAll`.
