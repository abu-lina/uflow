---
ID: 279
Origin: 278
UUID: 2D7B9E41-0C53-4A86-93F1-6E8A5C14B7D0
Status: Complete
Type: fix
Branch: fix/279-trusted-client-ip
Worktree: ../uflow-wt/279-client-ip
Created: 2026-10-01T20:00:00Z
---

# Request 279: Client IP is attacker-controlled, so rate limits and audit IPs are forgeable

## Original request

Found while verifying a concern raised in request 277: that `getRateLimitKey`'s
`'unknown'` fallback might bucket all production users together. **That concern
was wrong and is retracted** -- both nginx templates set `X-Real-IP` and
`X-Forwarded-For` on all 14 `proxy_pass` blocks, so per-client bucketing works.

Checking it surfaced a different and real defect.

## Severity: High

Not theoretical. Present on `main`, in production code paths.

## The defect

nginx sets:

```
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

`$proxy_add_x_forwarded_for` expands to `<client-supplied XFF>, <$remote_addr>`,
so it **appends** rather than replaces. Every consumer in the app then reads
`split(',')[0]`, which is the **client-supplied** half.

nginx never sets or strips `cf-connecting-ip`, and has no `real_ip_module` or
Cloudflare configuration (it terminates Let's Encrypt TLS directly, see
`ssl_certificate /etc/letsencrypt/...`). So `cf-connecting-ip` is pure attacker
input too.

Only `x-real-ip` is trustworthy, because `proxy_set_header` **replaces** any
client-supplied value with `$remote_addr`.

### The root misconception, visible in the comments

- `src/lib/rate-limit.ts:163` calls the Cloudflare header "most reliable"
- `src/utils/security.ts:650` sets priority "Cloudflare > X-Forwarded-For > X-Real-IP"

In this topology that ordering is exactly backwards: it trusts the most forgeable
value first and the only trustworthy value last.

### Impact by call site

| Site                                                 | Impact                                                                                                                                                                   |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/app/api/check-email-exists/route.ts:31`         | The rate limit is the only throttle on **email enumeration**. The F-049-04 comment calls this endpoint enumeration-safe, but that mitigation leans on a bypassable limit |
| `src/app/api/auth/reset-password/route.ts:30`        | Password-reset abuse at unlimited rate                                                                                                                                   |
| `src/lib/audit/adminAudit.ts:76`                     | **Admin audit records an attacker-chosen IP.** Audit-trail integrity                                                                                                     |
| `src/middleware.ts:16`                               | Global limits (100/min pages, 30/min API) bypassable                                                                                                                     |
| `src/lib/rate-limit.ts:159`                          | Same, and trusts the CF header first                                                                                                                                     |
| `src/utils/security.ts:646`                          | Same                                                                                                                                                                     |
| `src/app/api/waitlist/join/route.ts:13`              | Same                                                                                                                                                                     |
| `src/app/api/confirm-email/route.ts:29`              | Same                                                                                                                                                                     |
| `src/app/api/auth/magic-link-diagnostic/route.ts:53` | Diagnostic logging only; low impact but same flaw                                                                                                                        |

Rotating one request header per request defeats all of it.

## Fix, in two phases

### Phase 1: the edge (small, fixes all nine sites at once)

In both `deploy/nginx/nginx-template.conf` and `nginx-uat-template.conf`:

- `proxy_set_header X-Forwarded-For $remote_addr;` so nginx **replaces** instead
  of appending. nginx is the edge here, so `$remote_addr` is the real client.
- Strip inbound `CF-Connecting-IP` with `proxy_set_header CF-Connecting-IP "";`

Every existing app call site then derives a trustworthy IP with no app change.

### Phase 2: the app (durable, topology-independent)

A single `getTrustedClientIp()` helper, used by all nine call sites:

1. `x-real-ip` (nginx replaces it, so trustworthy)
2. else the **last** element of `x-forwarded-for` (the hop nginx appended)
3. else `'unknown'`

Stop trusting `cf-connecting-ip` until nginx is configured with Cloudflare ranges
via `real_ip_module`. Tests must prove a spoofed header cannot move the result.

The app should not blindly trust client headers regardless of what the edge does,
which is why phase 2 matters even after phase 1.

## Deployment note

Both phases reach production through `deploy-hetzner.yml` ("Deploy to
Production"), which is `workflow_dispatch`-only. Merging is not deploying:
someone has to dispatch that workflow, which then applies both the image and the
nginx config. UAT updates automatically on push to `main` via `deploy-uat.yml`.

## Compatibility

The request 276 e2e fixture sets a unique `x-forwarded-for` per test to get
distinct rate-limit buckets. It stays valid under both phases: there is no nginx
in CI, and for a single-element header the first and last entry are the same.

## Status

- [x] Confirm the nginx directives and that only `x-real-ip` is trustworthy
- [x] Enumerate affected call sites
- [x] Branch + tracking
- [x] Phase 1: nginx templates
- [x] Phase 2: `getTrustedClientIp()` helper, call sites, tests
- [x] PR, CI, merge
- [x] Capture learning

## Outcome

Three PRs, all merged.

| PR   | Commit     | Change                                                                                                                                                                 |
| ---- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #480 | `cc25b25a` | nginx stops forwarding client-controlled IP headers: `X-Forwarded-For $remote_addr` (replace, not append) and `CF-Connecting-IP ""` on all 14 blocks in both templates |
| #481 | `15d6f027` | UAT deploy actually applies the nginx config instead of silently skipping it                                                                                           |
| #482 | `4976a3ba` | `getTrustedClientIp()` helper, all nine consumers routed through it, 9 new tests                                                                                       |

### #481 was not planned, and was necessary

#480 merged, `Build & Deploy to UAT` reported **success**, and the config was not
applied. `appleboy/scp-action` v1.0.0 preserves the relative source path, so the
upload landed at `/tmp/deploy/nginx/nginx-uat-template.conf` while the script
only checked `/tmp/nginx-uat-template.conf`, warned, and continued. `nginx -t`
then passed and nginx reloaded, both against the **old** config.

`deploy-hetzner.yml` already carried this fix with a comment explaining the path
behaviour; it had never been back-ported, so UAT nginx changes had been silently
discarded for an unknown period.

The first attempt at that fix used an unconditional `exit 1`, which would have
broken every deploy that does not touch nginx, because the upload step is gated
on the template having changed. Caught before pushing; the merged version reads
the same `changed` flag.

### Verified live in UAT

Dispatched `Deploy to UAT` after #481 merged, since a push that does not touch
the template uploads nothing:

```
🔧 Updating Nginx for UAT...
   using /tmp/deploy/nginx/nginx-uat-template.conf
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
✅ Nginx reloaded for UAT
```

That nested path is the one the old script never checked, and real `nginx -t`
validates the new directives.

### Still required

**Production is not yet patched.** `deploy-hetzner.yml` is `workflow_dispatch`-only.
Someone has to run **Deploy to Production**, which uploads and applies
`nginx-template.conf` and ships the image containing the app-side fix.

### Test evidence

- `npm test` 2691 passed / 24 skipped, up 9 from baseline
- `npm run lint` 0 errors / 132 warnings (baseline), `type-check` clean
- `npm run build` on webpack, PWA guard OK, no new Edge-runtime warnings
- `CI=1 npx playwright test` 6/6, rate limiting live, no 429s, so the request-276
  per-test `x-forwarded-for` fixture still yields distinct buckets
