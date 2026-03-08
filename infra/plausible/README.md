# Plausible CE — Self-Hosted Analytics for UmmahFlow

> **Plan 036 — M1**: Plausible Community Edition deployed on the same Hetzner VPS as the main app, isolated as a separate Docker Compose stack.

## Architecture Decision (ADR-006)

- **Separate stack** — no shared networks or volumes with the Next.js app
- **GDPR-compliant** — cookie-free, no PII stored, no consent banner needed
- **Non-fatal** — analytics failures never affect user-facing functionality
- **Activates via env** — app is a no-op until `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` + `NEXT_PUBLIC_PLAUSIBLE_HOST` are set

## Prerequisites

- Docker Engine ≥ 23 with Compose plugin on Hetzner VPS
- Domain A-record for `analytics.ummahflow.com` pointing to the VPS IP
- Nginx already installed (for TLS termination and reverse proxy)

## Setup

```bash
# 1. Copy and edit env file — NEVER commit this file
cp plausible-conf.env.example plausible-conf.env

# 2. Generate a strong SECRET_KEY_BASE
openssl rand -base64 64 | tr -d '\n'

# 3. Set a strong POSTGRES_PASSWORD (same value goes in plausible-conf.env)

# 4. Update BASE_URL to your analytics domain (e.g. https://analytics.ummahflow.com)

# 5. Start the stack
docker compose up -d

# 6. Check health
docker compose ps
docker compose logs plausible --tail 50
```

## Nginx Config Snippet

Add this server block to your existing Nginx config (e.g. `/etc/nginx/sites-available/analytics`):

```nginx
server {
    listen 443 ssl http2;
    server_name analytics.ummahflow.com;

    # TLS — obtain with Certbot: certbot --nginx -d analytics.ummahflow.com
    ssl_certificate     /etc/letsencrypt/live/analytics.ummahflow.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/analytics.ummahflow.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name analytics.ummahflow.com;
    return 301 https://$host$request_uri;
}
```

## App Integration

Set these env vars in UAT/production `.env`:

```bash
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=ummahflow.com
NEXT_PUBLIC_PLAUSIBLE_HOST=https://analytics.ummahflow.com
```

The CSP in `next.config.js` already reads `NEXT_PUBLIC_PLAUSIBLE_HOST` — no code changes needed.

## Access Controls (R3 — Mandatory)

After first `docker compose up`, visit `https://analytics.ummahflow.com` to create the admin account, then:

1. Set `DISABLE_REGISTRATION=true` in `plausible-conf.env` and restart: `docker compose up -d`
2. Create the `ummahflow.com` site in the dashboard
3. Configure goals:
   - `contact_intent_triggered` (goal type: Custom Event)
   - `provider_profile_completed` (goal type: Custom Event)

## Operations

```bash
# View logs
docker compose logs plausible --tail 100 -f

# Restart after config change
docker compose up -d --force-recreate plausible

# Full restart
docker compose down && docker compose up -d

# Backup Postgres data
docker exec plausible_plausible_db_1 pg_dump -U plausible plausible > backup-$(date +%Y%m%d).sql

# Update Plausible version — edit image tag in docker-compose.yml, then:
docker compose pull && docker compose up -d
```

## ⚠️ Security Checklist

- [ ] `plausible-conf.env` is in `.gitignore` (never committed)
- [ ] `SECRET_KEY_BASE` is a unique random 64-char string
- [ ] `POSTGRES_PASSWORD` is a strong unique password
- [ ] `DISABLE_REGISTRATION=true` is set after admin account creation
- [ ] Nginx blocks direct access to port 8000 from external IPs (bind to 127.0.0.1)
- [ ] TLS certificate is valid and auto-renewing (Certbot)
