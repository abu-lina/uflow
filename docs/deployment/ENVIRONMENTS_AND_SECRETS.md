# Environments and secrets

Deploys run from `.github/workflows/deploy-uat.yml` (environment `uat`, on push to `main`) and `deploy-hetzner.yml` (environment `production`, manual dispatch). Every job sets `environment:`, and secrets are read under their plain names with no `||` fallback.

## Repository-level secrets

Shared by both environments. Set under Settings > Secrets and variables > Actions > Repository secrets.

| Secret            | Where to get it                                                        |
| ----------------- | ---------------------------------------------------------------------- |
| `GHCR_PAT`        | GitHub PAT with `read:packages`/`write:packages`, created by the owner |
| `HETZNER_HOST`    | IP or hostname of the Hetzner server (Hetzner Cloud console)           |
| `HETZNER_SSH_KEY` | Private key whose public half is in the server's `authorized_keys`     |
| `GITHUB_TOKEN`    | Provided by GitHub Actions, nothing to set                             |

The deploy workflows use `GHCR_PAT` for `docker login ghcr.io`. When it is empty, the login falls back to `GITHUB_TOKEN`, which may lack package read rights on a private repo. Keep `GHCR_PAT` set.

Do not keep any `UAT_*` repository secrets; they were replaced by the `uat` environment secrets below.

## Environment-level secrets

Set these names in both the `uat` and `production` environments, with different values (`TEST_API_KEY` is uat only, see below). Settings > Environments > `<env>` > Environment secrets.

| Secret                           | Where to get it                                                         |
| -------------------------------- | ----------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`       | Supabase project settings > API (one project per environment)           |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | Supabase project settings > API keys (publishable key)                  |
| `SUPABASE_SERVICE_ROLE_KEY`      | Supabase project settings > API keys (secret key); server only          |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare dashboard > Turnstile widget                                 |
| `TURNSTILE_SECRET_KEY`           | Cloudflare dashboard > Turnstile widget                                 |
| `RESEND_API_KEY`                 | Resend dashboard > API keys                                             |
| `MISTRAL_API_KEY`                | Mistral console > API keys                                              |
| `ADMIN_DEBUG_KEY`                | Generate: `openssl rand -hex 32`                                        |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`   | `npx web-push generate-vapid-keys` (public key); build-time             |
| `VAPID_PRIVATE_KEY`              | `npx web-push generate-vapid-keys` (private key); server only           |
| `VAPID_EMAIL`                    | Contact address for push; optional, defaults to `noreply@ummahflow.com` |

The VAPID public key is inlined into the client bundle, so `deploy-*.yml` passes it as a build-arg and as a container `-e`. `VAPID_PRIVATE_KEY` and `VAPID_EMAIL` are runtime `-e` flags only; never make them build-args. Generate one key pair per environment. A new pair invalidates existing push subscriptions for that environment.

`TEST_API_KEY` is a uat-only environment secret; only `deploy-uat.yml` passes it, and production must not have it. Generate it with `openssl rand -hex 16`. The k6 tests in `tests/performance/` read it from your shell to bypass rate limits: export it locally, never commit it.

`WEBHOOK_SECRET` is not a GitHub secret. Only the Supabase edge function `send-confirmation-email` reads it, as a Supabase function secret (`supabase secrets set`).

## Rotation

Rotate a key by changing it in the environment (or repo) secret, then redeploy. Rotate any key that ever appeared in a local file or log.

## Related

- `GITHUB_SECRETS.md` in this folder is older and predates the environment split.
