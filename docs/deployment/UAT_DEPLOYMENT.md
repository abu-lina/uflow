# UAT Deployment Guide

Complete guide for deploying the UAT environment to `uat.ummahflow.com` on Hetzner.

## Overview

UAT runs as a **separate Docker container** on port **3001**, while production runs on port **3000**. This allows both environments to run simultaneously on the same server.

## Prerequisites

- ✅ DNS A record for `uat.ummahflow.com` pointing to your Hetzner server IP (already configured)
- ✅ Access to Hetzner server via SSH
- ✅ `.env.uat` file created with UAT credentials
- ✅ UAT Supabase project set up

---

## Step 1: Prepare Environment File

1. **Create `.env.uat` from template:**
   ```bash
   cp env.uat.template .env.uat
   ```

2. **Fill in your UAT credentials:**
   ```bash
   nano .env.uat
   ```

   Required variables:
   - `NEXT_PUBLIC_SUPABASE_URL` - Your UAT Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - UAT anon key
   - `SUPABASE_SERVICE_ROLE_KEY` - UAT service role key
   - `NEXT_PUBLIC_SITE_URL=https://uat.ummahflow.com` (already set in template)
   - Other API keys (Resend, Google Maps, etc.)

3. **Verify the file:**
   ```bash
   cat .env.uat | grep NEXT_PUBLIC_SITE_URL
   # Should show: NEXT_PUBLIC_SITE_URL=https://uat.ummahflow.com
   ```

---

## Step 2: Set Up SSL Certificate

On your Hetzner server, run:

```bash
# Make script executable (if not already)
chmod +x scripts/setup-uat-ssl.sh

# Run SSL setup
./scripts/setup-uat-ssl.sh
```

This will:
- Install Certbot (if needed)
- Obtain Let's Encrypt certificate for `uat.ummahflow.com`
- Set up auto-renewal

**Manual SSL setup (if script fails):**
```bash
sudo certbot certonly --nginx -d uat.ummahflow.com
```

---

## Step 3: Deploy UAT Container

On your Hetzner server:

```bash
# Make script executable (if not already)
chmod +x scripts/deploy-uat.sh

# Deploy UAT
./scripts/deploy-uat.sh
```

This script will:
1. ✅ Load environment variables from `.env.uat`
2. ✅ Build Docker image for UAT
3. ✅ Stop existing UAT container (if any)
4. ✅ Start new UAT container on port 3001
5. ✅ Perform health check
6. ✅ Configure Nginx for UAT subdomain
7. ✅ Reload Nginx

---

## Step 4: Verify Deployment

### Check Container Status
```bash
docker ps | grep uflow-uat
# Should show: uflow-uat container running on port 3001
```

### Check Container Logs
```bash
docker logs uflow-uat
```

### Test Health Endpoint
```bash
# Direct container test
curl http://localhost:3001/api/health

# Through Nginx (after SSL setup)
curl https://uat.ummahflow.com/api/health
```

### Test in Browser
Visit: **https://uat.ummahflow.com**

---

## Step 5: Configure Nginx (Manual Setup)

If the deployment script didn't configure Nginx automatically:

1. **Copy UAT Nginx config:**
   ```bash
   sudo cp nginx-uat-template.conf /etc/nginx/sites-available/uat-ummahflow
   ```

2. **Enable the site:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/uat-ummahflow /etc/nginx/sites-enabled/uat-ummahflow
   ```

3. **Test configuration:**
   ```bash
   sudo nginx -t
   ```

4. **Reload Nginx:**
   ```bash
   sudo systemctl reload nginx
   ```

---

## Architecture

```
┌─────────────────────────────────────────┐
│         Hetzner Server                  │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │         Nginx (Port 443)          │  │
│  │                                    │  │
│  │  ┌────────────┐  ┌────────────┐  │  │
│  │  │ Production │  │    UAT     │  │  │
│  │  │ :3000      │  │  :3001     │  │  │
│  │  └────────────┘  └────────────┘  │  │
│  └──────────────────────────────────┘  │
│                                         │
│  ┌────────────┐      ┌────────────┐   │
│  │ uflow      │      │ uflow-uat  │   │
│  │ (prod)     │      │ (uat)      │   │
│  └────────────┘      └────────────┘   │
└─────────────────────────────────────────┘
         │                    │
         │                    │
    ummahflow.com      uat.ummahflow.com
```

---

## Updating UAT

To update UAT with new code:

```bash
# On your local machine, push changes
git push origin main

# On Hetzner server, pull and redeploy
git pull origin main
./scripts/deploy-uat.sh
```

Or manually:
```bash
# Stop UAT container
docker stop uflow-uat

# Rebuild and restart
./scripts/deploy-uat.sh
```

---

## Troubleshooting

### Container won't start
```bash
# Check logs
docker logs uflow-uat

# Check if port 3001 is in use
sudo lsof -i :3001

# Check environment variables
docker exec uflow-uat env | grep NEXT_PUBLIC
```

### SSL certificate issues
```bash
# Check certificate exists
sudo ls -la /etc/letsencrypt/live/uat.ummahflow.com/

# Renew certificate manually
sudo certbot renew --cert-name uat.ummahflow.com
```

### Nginx errors
```bash
# Test configuration
sudo nginx -t

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Check if site is enabled
ls -la /etc/nginx/sites-enabled/ | grep uat
```

### Health check fails
```bash
# Test container directly
curl http://localhost:3001/api/health

# Check if container is running
docker ps | grep uflow-uat

# Check container logs
docker logs uflow-uat --tail 50
```

### DNS not resolving
```bash
# Test DNS resolution
nslookup uat.ummahflow.com

# Check DNS propagation
dig uat.ummahflow.com

# Verify Cloudflare proxy is enabled (orange cloud)
```

---

## Environment Differences

| Setting | Production | UAT |
|---------|-----------|-----|
| **URL** | `ummahflow.com` | `uat.ummahflow.com` |
| **Port** | 3000 | 3001 |
| **Container** | `uflow` | `uflow-uat` |
| **Database** | Production Supabase | UAT Supabase (same project) |
| **Node Env** | `production` | `development` |
| **Feature Flags** | Debug disabled | Debug enabled |

---

## Quick Reference

### Start UAT
```bash
docker start uflow-uat
```

### Stop UAT
```bash
docker stop uflow-uat
```

### View UAT Logs
```bash
docker logs -f uflow-uat
```

### Restart UAT
```bash
docker restart uflow-uat
```

### Rebuild UAT
```bash
./scripts/deploy-uat.sh
```

### Check UAT Status
```bash
curl https://uat.ummahflow.com/api/health
```

---

## Security Notes

- ✅ UAT uses separate container (isolated from production)
- ✅ UAT has its own SSL certificate
- ✅ UAT uses same Supabase project but different config
- ✅ Feature flags distinguish UAT from production
- ⚠️  UAT runs in `development` mode (for debugging)
- ⚠️  UAT shares the same server as production (consider separate server for production)

---

## Next Steps

After UAT is deployed:

1. ✅ Test all features on `uat.ummahflow.com`
2. ✅ Share UAT URL with stakeholders for testing
3. ✅ Monitor UAT logs for issues
4. ✅ Set up monitoring/alerts for UAT
5. ✅ Document any UAT-specific configurations

---

## Related Files

- `nginx-uat-template.conf` - Nginx configuration for UAT
- `scripts/deploy-uat.sh` - UAT deployment script
- `scripts/setup-uat-ssl.sh` - SSL certificate setup
- `env.uat.template` - UAT environment template
- `docs/guides/UAT_SETUP_GUIDE.md` - UAT database setup guide















