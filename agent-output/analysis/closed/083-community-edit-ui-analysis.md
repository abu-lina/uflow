---
ID: 083
Origin: 083
UUID: f7a2d8c3
Status: Committed
---

# 083 — Community Services Edit UI Analysis

## Changelog

| Date       | Agent    | Summary                                                 |
|------------|----------|---------------------------------------------------------|
| 2026-04-06 | Analyst  | Initial investigation: located reference UI, identified gap, documented findings |
| 2026-04-06 | Planner  | Status → Planned; plan created at agent-output/planning/083-community-edit-ui-plan.md |

## Value Statement & Business Objective

**Why this matters**: Community services are first-class entities in UFlow. When an admin navigates to edit a community service, the UI must be consistent with the provider edit experience — same sectioned layout, same field groupings, same UX patterns. Currently, **no dedicated community services edit page exists in the Next.js app**, so admins either have no edit path at all, or fall back to an external interface (e.g. Supabase Studio) for editing community services. This creates friction, inconsistency, and audit gaps.

**Objective**: Document the exact gap between the existing provider edit UI (reference) and the absent community services edit UI, enabling Planner to scope a build-out or adaptation plan.

## Context

- **Session**: S83-community-edit-ui
- **Branch**: session/83-community-edit-ui
- **Scope**: Community services edit page vs provider edit page UI parity
- **Historical context**: Plan 058 and Plan 061 explicitly scoped community services **out** of moderation and admin editing. Community services have been view-only in the admin flow.

## Methodology

- **Upstream Tracing**: Followed the user navigation flow from profile → community service card → detail → edit
- **Component Isolation**: Identified all edit-related components for providers and all community-service-related components
- **Grep + file search**: Exhaustive search across `src/` for community service edit routes, forms, and translation keys

---

## Findings

### F1 — Provider Edit UI (Reference Design) — L1 Proven

The provider edit form is a mature, richly sectioned component:

**Routes**:
- Owner: `/profile/providers/[provider_id]/edit` → [ProviderEditPage](src/components/providers/ProviderEditPage.tsx) → [ProviderEditForm](src/components/providers/ProviderEditForm.tsx)
- Admin: `/dashboard/providers/[id]/edit` → [AdminProviderEditPage](src/app/(dashboard)/dashboard/providers/[id]/edit/page.tsx) → [ProviderEditForm](src/components/providers/ProviderEditForm.tsx)

**UI Structure** (ProviderEditForm — 816 lines):

| Section | Accordion | Fields | Notes |
|---------|-----------|--------|-------|
| **Basics** | Collapsible (`expandedSections.basics`) | Titel* (text input), Beschreibung (textarea), Kategorie* (sub-page nav → `/edit/category`), Was biete ich?* (sub-page nav → `/edit/offers`), Was suche ich? (sub-page nav → `/edit/needs`) | Required fields marked with `*` |
| **Standort** | Collapsible (`expandedSections.location`) | Online-Geschäft toggle, Straße, PLZ, Stadt*, Land* | Address fields hidden when Online toggle is on; shows icon + label state |
| **Kontakt** | Collapsible (`expandedSections.contact`) | Website, Instagram, E-Mail, Telefon | Website auto-normalized on blur |
| **Media** | Collapsible (`expandedSections.media`) | Bilder (sub-page nav → `/edit/images`), Soziale Initiativen (sub-page nav → `/edit/social`) | Shows count of selected items |

**Footer**:
- **Owner context**: `FooterAction` with Save (primary) + Discard (secondary icon button)
- **Admin context**: Fixed footer with Reject (danger) + Approve (success) buttons, passed via `reviewFooterActions` prop

**Sub-pages** (category, offers, needs, images, social) exist at:
- `/profile/providers/[id]/edit/{subpage}`
- `/dashboard/providers/[id]/edit/{subpage}`

**Shared components**: `PageHeader`, `FooterAction`, `Button`, `RejectModal`, `Icon` (iconify)

### F2 — Community Services Edit Page — L1 Proven: Does Not Exist

**Critical finding**: There is **no** community services edit route or component anywhere in the codebase.

- No route at `/dashboard/community-services/[id]/edit`
- No route at `/profile/community-services/[id]/edit`
- No `CommunityServiceEditForm`, `CommunityServiceEditPage`, or equivalent component
- No API endpoint at `/api/admin/edit-community-service`
- The `src/app/(dashboard)/dashboard/` directory only contains `import/` and `providers/`

The user's Image 3 ("current edit form" with Status badge, flat fields, Genehmigen/Überarbeitung/Ablehnen buttons) is **not found in the Next.js codebase**. Those German labels (Genehmigen, Überarbeitung, Ablehnen) do not appear in any source file or translation file. This suggests the current editing is done via:
1. Supabase Studio (table editor) — most likely, given the flat field layout
2. A direct Supabase dashboard RPC — possible but no evidence

### F3 — Community Service Data Model vs Provider Data Model — L1 Proven

The community_services table is structurally parallel to providers:

| Field | Providers | Community Services | Gap |
|-------|-----------|-------------------|-----|
| Name | `provider_name` | `community_service_name` | Naming only |
| Description | `provider_description` / `description` | `community_service_description` | Naming only |
| Images | `provider_images` (JSON string: `{urls:[...]}`) | `community_service_images` (TEXT array: `string[]`) | **Format mismatch** — provider images are JSON string, CS images are native Postgres array |
| Category | `category_id` → categories FK | `category_id` → categories FK | Same |
| Offers | `offers_ids` (uuid[]) | `offers_ids` (uuid[]) | Same |
| Needs | `needs_ids` (uuid[]) | `needs_ids` (uuid[]) | Same |
| Address | `address_street/zip/city/country` | `address_street/zip/city/country` | Same |
| Location | `location_latitude/longitude` | `location_latitude/longitude` | Same |
| Contact | `contact_email/phone` | `contact_email/phone` | Same |
| Social | `social_website/instagram` | `social_website/instagram` | Same |
| Online toggle | via `show_address` + absence of address | `show_address` | Same |
| Review status | `review_status` | `review_status` | Same enum |
| Owner tracking | `provider_owner_id` / `user_created_id` | `user_created_id` | Similar |
| Logo | N/A | `community_service_logo` (JSONB) | CS extra |
| Verified | N/A | `is_verified`, `verified_at`, `verified_by` | CS extra |
| View count | N/A | `community_service_view_count` | CS extra |
| Donation count | N/A | `donation_count` | CS extra |
| Barakah effects | `barakah_effects` (text[]) | `barakah_effects` (text[]) | Same |
| Bookmarks | bookmark_count (computed) | N/A (bookmarks exist in `bookmarks` table) | Same mechanism |
| Linked entity | N/A | `provider_id` (FK to providers) | CS can link to a provider |

### F4 — ProviderEditForm Reuse Potential — L2 Observed

The `ProviderEditForm` is already designed for multi-context reuse:
- Accepts `subPageBaseUrl` prop for sub-page navigation
- Accepts `enableLocalStorage` / `localStoragePrefix` for state isolation
- Accepts `reviewFooterActions` for admin moderation buttons
- Accepts `onSubmitForm` for custom save handlers

However, it is **tightly coupled to the Provider type and providers table**:
- Form state type is `ProviderEditFormData` with provider-specific field names (`providerName`, `providerDescription`, `images` as JSON string)
- Default submit writes to `supabase.from('providers')`
- Sub-page routes assume provider_id-based paths
- Image handling assumes `{urls:[...]}` JSON string format, not TEXT array

**Reuse strategy options**:
1. **Adapter pattern**: Create a wrapper that transforms CommunityService ↔ Provider format, reusing ProviderEditForm directly with `onSubmitForm` override
2. **Generalize ProviderEditForm**: Refactor to accept entity-agnostic props (more invasive)
3. **Clone and adapt**: Copy ProviderEditForm for community services (creates maintenance debt)

Option 1 (Adapter) is likely the lowest-risk approach given the existing `onSubmitForm` and `subPageBaseUrl` extensibility.

### F5 — Navigation Flow Gap — L1 Proven

Current community service detail → edit navigation:
- Profile page community service cards navigate to `/community-services/${id}`
- `CommunityServiceDetailPageClient` renders `CommunityServiceDetailModal` (desktop) or `ProviderDetailPage` (mobile)
- Neither component has an "edit" button — the `ProviderDetailPage` has a `customActionButtons` slot but it is **not populated** when rendering community service detail
- The `ProfileProviderDetailPage` (used for profile provider detail) has "Bearbeiten" button → `/profile/providers/${id}/edit`, but this is provider-specific

**Result**: There is no way for a user (admin or owner) to reach a community services edit form from the UI. The entire edit path is missing.

### F6 — Admin API Gap — L1 Proven

- `/api/admin/edit-provider` exists (PATCH, writes to providers table)
- `/api/admin/review-provider` exists (PATCH, sets review_status on providers)
- No equivalent endpoints exist for community services
- No server action or API route for updating `community_services` table from admin context

### F7 — Image Format Mismatch — L1 Proven

This is a critical implementation detail:
- **Providers**: `provider_images` stored as JSON string `'{"urls":["url1","url2"]}'`
- **Community Services**: `community_service_images` stored as Postgres TEXT array `{"url1","url2"}`

The `ProviderEditForm` and all image sub-pages handle the JSON string format. Reusing the form for community services requires image format conversion at the adapter layer.

---

## Remaining Gaps

| # | Unknown | Blocker | Required Action | Owner |
|---|---------|---------|-----------------|-------|
| 1 | What UI does the user currently see (Image 3)? | The form shown in Image 3 is not in the codebase. May be Supabase Studio or an external tool. | Confirm with user whether Image 3 is Supabase Studio or a different app. | User/Planner |
| 2 | Should community services have sub-pages (category, offers, needs, images) identical to providers? | Need to confirm scope of parity — full sub-page nav or simplified inline. | Planner decision based on user requirements. | Planner |
| 3 | Should community service edit be available for both admin AND owner, or admin-only? | The provider edit has both flows (owner at `/profile/.../edit`, admin at `/dashboard/.../edit`). | Planner to scope the flow(s) needed. | Planner |
| 4 | RLS policies for community_services UPDATE — do they permit admin writes? | Not traced; only SELECT policies observed in migration 034. | Trace RLS UPDATE policies for community_services table. | Planner/Implementer |
| 5 | Community-service-specific fields (logo, verified, view count, donation count) — editable or display-only? | These exist in the schema but have no UI presence. | Planner to decide if these appear in edit form or are admin-only metadata. | Planner |

---

## Analysis Recommendations

1. **Trace RLS UPDATE policies** for the `community_services` table to determine if admin writes are permitted without migration changes.
2. **Confirm with user** whether Image 3 (the "current" inferior form) is Supabase Studio — this affects whether the task is "build from scratch" vs "replace existing."
3. **Evaluate adapter approach**: The ProviderEditForm already supports `onSubmitForm` + `subPageBaseUrl`. A thin adapter wrapping CommunityService → ProviderEditFormData (with image format conversion) may be the fastest path to UI parity.
4. **Scope sub-page routes**: The provider edit has 5 sub-pages (category, offers, needs, images, social). Determine which are needed for community services — likely all except "social" (Soziale Initiativen), since community services ARE the social initiatives that providers link to.
5. **Scope admin API**: A new `/api/admin/edit-community-service` endpoint (or generalized entity endpoint) and optionally `/api/admin/review-community-service` will be needed.

## Open Questions

1. Is the "inferior form" in the screenshots from Supabase Studio rather than the Next.js app?
2. Which flows are needed: owner edit only, admin edit only, or both?
3. Should the "Soziale Initiativen" sub-page be excluded from community service edit (since CS entities don't link to other CS entities)?
