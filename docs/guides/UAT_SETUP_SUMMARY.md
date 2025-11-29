# UAT Setup Summary

Quick reference for UAT environment setup and deployment.

## ✅ What's Been Set Up

1. **DNS Configuration** ✅
   - `uat.ummahflow.com` A record points to Hetzner server (91.98.207.106)
   - Cloudflare proxy enabled (orange cloud)

2. **Configuration Files** ✅
   - `nginx-uat-template.conf` - Nginx config for UAT subdomain
   - `env.uat.template` - Updated with `uat.ummahflow.com` URL
   - `scripts/deploy-uat.sh` - UAT deployment script
   - `scripts/setup-uat-ssl.sh` - SSL certificate setup

3. **Documentation** ✅
   - `docs/deployment/UAT_DEPLOYMENT.md` - Complete deployment guide

## 🚀 Quick Start

### On Hetzner Server

1. **Set up SSL certificate:**
   ```bash
   ./scripts/setup-uat-ssl.sh
   ```

2. **Deploy UAT:**
   ```bash
   ./scripts/deploy-uat.sh
   ```

3. **Verify:**
   ```bash
   curl https://uat.ummahflow.com/api/health
   ```

## 📋 Prerequisites Checklist

Before deploying, ensure:

- [ ] `.env.uat` file exists with UAT credentials
- [ ] UAT Supabase project is set up
- [ ] DNS A record for `uat.ummahflow.com` is configured
- [ ] You have SSH access to Hetzner server
- [ ] Docker is installed on Hetzner server

## 🏗️ Architecture

```
Production (ummahflow.com)     UAT (uat.ummahflow.com)
├── Port: 3000                 ├── Port: 3001
├── Container: uflow           ├── Container: uflow-uat
├── Database: Production        ├── Database: UAT (same Supabase project)
└── Node Env: production      └── Node Env: development
```

Both run on the same Hetzner server, isolated in separate Docker containers.

## 📚 Documentation

- **Full Deployment Guide:** `docs/deployment/UAT_DEPLOYMENT.md`
- **Database Setup:** `docs/guides/UAT_SETUP_GUIDE.md`
- **Environment Setup:** `docs/guides/ENVIRONMENT_SETUP.md`

## 🔧 Common Commands

```bash
# Deploy UAT
./scripts/deploy-uat.sh

# View UAT logs
docker logs -f uflow-uat

# Restart UAT
docker restart uflow-uat

# Stop UAT
docker stop uflow-uat

# Check UAT health
curl https://uat.ummahflow.com/api/health
```

## ⚠️ Important Notes

- UAT runs on port **3001** (production uses 3000)
- UAT uses the **same Supabase project** as production (different config)
- UAT runs in `development` mode (debug features enabled)
- UAT has its own SSL certificate
- Both environments share the same Hetzner server

## 🎯 Next Steps

1. Create `.env.uat` from `env.uat.template`
2. Fill in UAT Supabase credentials
3. Run SSL setup script
4. Deploy UAT container
5. Test at https://uat.ummahflow.com

