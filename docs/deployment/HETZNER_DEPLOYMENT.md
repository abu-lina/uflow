# Hetzner Deployment Guide

Complete guide for deploying to Hetzner Cloud with Docker, Nginx, and SSL.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Initial Setup](#initial-setup)
4. [Deployment Steps](#deployment-steps)
5. [Post-Deployment](#post-deployment)
6. [Maintenance](#maintenance)
7. [Troubleshooting](#troubleshooting)

---

## Overview

### Difficulty Assessment

**Rating: 6/10** ⭐⭐⭐⭐⭐⭐

**Time Investment:**
- Initial setup: 2-3 hours (first time)
- Future deployments: 5-10 minutes
- Weekly maintenance: 5-10 minutes

**What You'll Learn:**
- Basic Linux commands
- Docker basics
- Nginx reverse proxy
- SSL certificate management

### Cost

**Hetzner CPX11:** €4.15/month
- 2 vCPU cores
- 2 GB RAM
- 40 GB SSD
- 20 TB traffic

**Good for:** 500-2,000 DAU

---

## Prerequisites

- [ ] Hetzner Cloud account
- [ ] Domain name configured
- [ ] SSH access to server
- [ ] Environment variables ready
- [ ] Dockerfile in repository

---

## Initial Setup

### Step 1: Create Hetzner Server

1. Go to [Hetzner Cloud Console](https://console.hetzner.cloud)
2. Create new project: "uflow"
3. Click "Add Server"
4. Configure:
   - **Location:** Falkenstein or Nuremberg (Germany 🇩🇪)
   - **Image:** Ubuntu 22.04
   - **Type:** CPX11 (€4.15/month)
   - **SSH Key:** Upload your public key (or use password)
   - **Name:** "uflow-production"
5. Click "Create & Buy now"

**Wait ~30 seconds for server to boot**

### Step 2: Connect to Server

```bash
# Replace with your server IP
ssh root@YOUR_SERVER_IP
```

### Step 3: Install Docker

```bash
# Update system
apt update

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Verify installation
docker --version
# Should show: Docker version 24.x.x
```

### Step 4: Install Nginx

```bash
# Install Nginx
apt install -y nginx

# Start and enable Nginx
systemctl start nginx
systemctl enable nginx

# Verify
systemctl status nginx
```

### Step 5: Configure Firewall

```bash
# Allow HTTP, HTTPS, and SSH
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS

# Enable firewall
ufw --force enable

# Check status
ufw status
```

---

## Deployment Steps

### Step 1: Clone Repository

```bash
# Install Git
apt install -y git

# Clone repository
cd /var/www
git clone https://github.com/abu-lina/uflow.git
cd uflow
```

### Step 2: Create Environment File

```bash
# Create .env.local file
nano .env.local
```

**Add your environment variables:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
RESEND_API_KEY=your-resend-key
# ... other variables
```

**Save:** `Ctrl + X`, then `Y`, then `Enter`

### Step 3: Build Docker Image

```bash
# Build the image (takes 5-10 minutes)
docker build -t uflow .

# Wait for: "Successfully built [image-id]"
```

### Step 4: Run Docker Container

```bash
# Run the container
docker run -d \
  --name uflow-app \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env.local \
  uflow

# Verify it's running
docker ps
# Should show: uflow-app container running

# Test locally
curl http://localhost:3000
```

### Step 5: Configure Nginx

```bash
# Create Nginx configuration
nano /etc/nginx/sites-available/uflow
```

**Paste this configuration:**

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Cache static files
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Security: Block access to sensitive files
    location ~ /\.(?!well-known) {
        deny all;
    }
}
```

**Remember to replace `yourdomain.com` with your actual domain!**

**Enable the site:**
```bash
# Create symlink
ln -s /etc/nginx/sites-available/uflow /etc/nginx/sites-enabled/

# Remove default site
rm /etc/nginx/sites-enabled/default

# Test configuration
nginx -t

# Reload Nginx
systemctl reload nginx
```

### Step 6: Point Domain to Server

1. Go to your domain registrar
2. Add A record:
   - **Type:** A
   - **Name:** @ (or www)
   - **Value:** YOUR_SERVER_IP
   - **TTL:** 300

**Wait 5-10 minutes for DNS propagation**

### Step 7: Install SSL Certificate

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow prompts:
# 1. Enter email address
# 2. Agree to terms (Y)
# 3. Share email with EFF? (your choice)
# 4. Choose: Redirect HTTP to HTTPS (option 2)
```

**Your site now has HTTPS!** 🔒

---

## Post-Deployment

### Verification Checklist

- [ ] Visit `https://yourdomain.com` - Homepage loads
- [ ] Test navigation - All pages work
- [ ] Test login/signup - Authentication works
- [ ] Test provider search - Search works
- [ ] Test create provider - Form works
- [ ] Check images - Images load
- [ ] Check HTTPS - Padlock shows
- [ ] Test mobile - Responsive works
- [ ] Test PWA install - PWA works

### Monitor Your App

```bash
# Check container logs
docker logs uflow-app --tail 100

# Follow logs in real-time
docker logs uflow-app -f

# Check resource usage
docker stats uflow-app
```

---

## Maintenance

### Future Deployments

When you want to deploy updates:

```bash
# SSH into server
ssh root@YOUR_SERVER_IP

# Go to app directory
cd /var/www/uflow

# Pull latest code
git pull

# Rebuild Docker image
docker build -t uflow .

# Stop old container
docker stop uflow-app
docker rm uflow-app

# Start new container
docker run -d \
  --name uflow-app \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env.local \
  uflow
```

**Time:** 5-10 minutes per deployment

### Weekly Checks (5 minutes)

```bash
# Check container is running
docker ps

# Check logs for errors
docker logs uflow-app --tail 50

# Check disk space
df -h

# Check memory
free -h
```

### Monthly Updates (30 minutes)

```bash
# Update system packages
apt update && apt upgrade -y

# Renew SSL (automatic, but check)
certbot renew

# Restart if needed
systemctl restart nginx
docker restart uflow-app
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker logs uflow-app

# Common issues:
# 1. Environment variables missing
# 2. Port 3000 already in use
# 3. Build failed
```

### Nginx Errors

```bash
# Check Nginx logs
tail -f /var/log/nginx/error.log

# Test configuration
nginx -t

# Restart Nginx
systemctl restart nginx
```

### SSL Issues

```bash
# Test SSL renewal
certbot renew --dry-run

# Force renewal
certbot renew --force-renewal
```

### App Not Accessible

```bash
# Check firewall
ufw status

# Check Nginx
systemctl status nginx

# Check Docker
docker ps
```

### Docker Build Fails

```bash
# Clear Docker cache
docker system prune -a

# Rebuild without cache
docker build --no-cache -t uflow .
```

---

## Pre-Deployment Checklist

Before deploying, ensure:

- [ ] Dockerfile created
- [ ] .dockerignore created
- [ ] next.config.js has `output: 'standalone'`
- [ ] Environment variables documented
- [ ] Domain DNS configured
- [ ] GitHub secrets configured (if using CI/CD)

---

## Security Best Practices

- [ ] Firewall configured (UFW)
- [ ] SSH key authentication enabled
- [ ] SSL certificate installed
- [ ] Security headers configured in Nginx
- [ ] Regular system updates scheduled
- [ ] Docker container runs as non-root user
- [ ] Environment variables secured

See `DOCKER_SECURITY_BEST_PRACTICES.md` for detailed security guidelines.

---

## Related Documentation

- [UAT Deployment](./UAT_DEPLOYMENT.md) - Deploying UAT environment
- [GitHub Secrets](./GITHUB_SECRETS.md) - Configuring CI/CD secrets
- [Turnstile Setup](./TURNSTILE_SETUP_HETZNER.md) - Cloudflare Turnstile configuration
- [Production Readiness](./PRODUCTION_READINESS_REPORT.md) - Pre-launch checklist

---

## Cost Breakdown

### Hetzner CPX11 (€4.15/month)

**Specs:**
- 2 vCPU cores
- 2 GB RAM
- 40 GB SSD
- 20 TB traffic

**Good for:**
- 500 DAU ✅
- 1,000 DAU ✅
- 2,000 DAU ✅
- 5,000 DAU ⚠️ (might need upgrade)

### When to Upgrade

Upgrade to CPX21 (€8.03/month) when:
- > 5,000 DAU
- High traffic spikes
- Need more RAM/CPU

---

## Summary

**What you've accomplished:**
- ✅ Created Hetzner server in Germany 🇩🇪
- ✅ Installed Docker & Nginx
- ✅ Deployed Next.js app
- ✅ Configured SSL/HTTPS
- ✅ App live at https://yourdomain.com
- ✅ GDPR compliant (EU hosting)
- ✅ Cost: €4.15/month

**Congratulations! You've deployed to Hetzner!** 🚀



