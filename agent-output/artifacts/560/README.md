# Issue #560 — browser evidence

Admin session against the local Supabase stack, captured by `560-capture.mjs`.

- `560-filtered-pending-badge-no-save.png` — `/food?status=pending`: the pending badge renders in the card's top-right corner with no Save button over it. This is the filtered-status tab where Save is suppressed (`hideBookmark`).
- `560-all-tab-badge-and-save.png` — `/food` (All tab): badge and Save both render, matching `main`.

The heart Save button visibly clips the badge text (`App`, `Rej`, `Pe` truncated) on the All tab. That overlap is pre-existing on `main`, accepted by the owner, and deliberately out of scope for this fix. It is not a regression introduced here.
