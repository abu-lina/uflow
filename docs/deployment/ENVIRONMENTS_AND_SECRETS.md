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

Do not keep any `UAT_*` repository secrets; they were replaced by the `uat` environment secrets below.

## Environment-level secrets

Set the same names in both the `uat` and `production` environments, with different values. Settings > Environments > `<env>` > Environment secrets.

| Secret                           | Where to get it                                                                                                                      |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`       | Supabase project settings > API (one project per environment)                                                                        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | Supabase project settings > API keys (publishable key)                                                                               |
| `SUPABASE_SERVICE_ROLE_KEY`      | Supabase project settings > API keys (secret key); server only                                                                       |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare dashboard > Turnstile widget                                                                                              |
| `TURNSTILE_SECRET_KEY`           | Cloudflare dashboard > Turnstile widget                                                                                              |
| `RESEND_API_KEY`                 | Resend dashboard > API keys                                                                                                          |
| `MISTRAL_API_KEY`                | Mistral console > API keys                                                                                                           |
| `ADMIN_DEBUG_KEY`                | Generate: `openssl rand -hex 32`                                                                                                     |
| `TEST_API_KEY`                   | Generate: `openssl rand -hex 16`; used by k6 tests in `tests/performance/` to bypass rate limits. Export it locally, never commit it |
| `WEBHOOK_SECRET`                 | Generate: `openssl rand -hex 32`; must match the secret configured on the Supabase side                                              |

## Rotation

Rotate a key by changing it in the environment (or repo) secret, then redeploy. Rotate any key that ever appeared in a local file or log.

## Related

- `GITHUB_SECRETS.md` in this folder is older and predates the environment split.
