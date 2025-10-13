# Hetzner Cloud Setup - Complete Guide

## Difficulty Assessment

**Honest Rating: 6/10 difficulty** ⭐⭐⭐⭐⭐⭐

**Railway for comparison: 2/10** (almost as easy as Vercel)

---

## What Makes Hetzner Harder?

### You Need to Know/Learn:

1. **Basic Linux commands** ⭐⭐
   - `ssh`, `cd`, `ls`, `nano`
   - Not hard, just unfamiliar if you haven't used terminal

2. **Docker basics** ⭐⭐⭐⭐
   - Build Docker images
   - Run containers
   - Manage volumes
   - This is the hardest part

3. **Nginx reverse proxy** ⭐⭐⭐
   - Configure web server
   - SSL certificates
   - Domain routing

4. **Server maintenance** ⭐⭐⭐
   - Security updates
   - Monitoring
   - Troubleshooting

**Total learning curve: 4-6 hours if you're new to these concepts**

---

## Time Investment

### Initial Setup:
- **If you know Docker:** 1-2 hours
- **If you're learning Docker:** 4-6 hours
- **With my step-by-step guide:** 2-3 hours

### Ongoing Maintenance:
- **Weekly:** 5-10 minutes (check logs, updates)
- **Monthly:** 30 minutes (security patches)
- **When deploying updates:** 5-10 minutes

---

## What You'll Actually Do (Step-by-Step)

### Phase 1: Server Setup (30 minutes)

```bash
# 1. Create Hetzner account (5 min)
# 2. Create server via web UI (5 min)
# 3. SSH into server (2 min)
# 4. Install Docker (5 min)
# 5. Install Nginx (5 min)
# 6. Configure firewall (5 min)
# 7. Set up SSL (3 min)
```

**Difficulty: ⭐⭐ Easy** (mostly clicking buttons)

### Phase 2: Docker Setup (1 hour)

**This is the hardest part** ⭐⭐⭐⭐

You need to:
1. Create a `Dockerfile` (I'll provide one)
2. Build Docker image
3. Run Docker container
4. Set up environment variables
5. Configure networking

**But I can provide you all the commands!**

### Phase 3: Deployment Setup (30 minutes)

```bash
# 1. Clone your GitHub repo (2 min)
# 2. Create .env file (3 min)
# 3. Build Docker image (10 min)
# 4. Run container (2 min)
# 5. Configure Nginx (10 min)
# 6. Test everything (3 min)
```

**Difficulty: ⭐⭐⭐ Medium** (following commands)

### Phase 4: Domain & SSL (20 minutes)

```bash
# 1. Point domain to server IP (5 min)
# 2. Install Certbot (5 min)
# 3. Get SSL certificate (5 min)
# 4. Configure Nginx for HTTPS (5 min)
```

**Difficulty: ⭐⭐ Easy** (mostly automated)

---

## Comparison: Railway vs Hetzner

### Railway (Easy)

```bash
# Total commands:
railway login
railway init
railway up
# Done! ✅
```

**Time:** 15 minutes  
**Knowledge needed:** None  
**Cost:** $7/month  
**Difficulty:** ⭐⭐

### Hetzner (Harder but Cheaper)

```bash
# Many more steps:
# - Create server
# - SSH setup
# - Install Docker
# - Write Dockerfile
# - Build image
# - Configure Nginx
# - Set up SSL
# - Deploy
# - Monitor
```

**Time:** 2-3 hours (first time)  
**Knowledge needed:** Linux, Docker, Nginx basics  
**Cost:** €4/month  
**Difficulty:** ⭐⭐⭐⭐⭐⭐

---

## Is It Worth It?

### Hetzner Pros:
- ✅ **€4/month** vs Railway's $7/month
- ✅ **Saves €36/year** ($40/year)
- ✅ **Full control** over server
- ✅ **Learn valuable DevOps skills**
- ✅ **German company** (EU-based)
- ✅ **Better performance** (dedicated resources)

### Hetzner Cons:
- ❌ **More complex** setup
- ❌ **You maintain** everything
- ❌ **More time** investment
- ❌ **Debugging** is harder
- ❌ **Security** is your responsibility

### Is €3/month Worth 2-3 Hours Setup + Ongoing Maintenance?

**At 500 DAU:** Probably not worth it  
**At 2,000+ DAU:** Definitely worth it (savings add up)

**For learning:** Worth it if you want DevOps skills!

---

## Step-by-Step Setup (Simplified)

I'll guide you through each step with exact commands:

### Step 1: Create Hetzner Server (10 minutes)

1. Go to [hetzner.com/cloud](https://www.hetzner.com/cloud)
2. Create account
3. Add payment method
4. Create new project: "uflow"
5. Create server:
   - **Location:** Falkenstein (Germany) 🇩🇪
   - **Image:** Ubuntu 22.04
   - **Type:** CPX11 (€4.15/month)
   - **SSH Key:** Upload your public key (or use password)
6. Click "Create & Buy now"

**Done! Server boots in 30 seconds** ✅

### Step 2: Connect to Server (2 minutes)

```bash
# Copy your server IP from Hetzner dashboard
# Connect via SSH
ssh root@YOUR_SERVER_IP

# You're in! 🎉
```

### Step 3: Install Docker (5 minutes)

```bash
# Run this script (installs Docker automatically)
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Verify installation
docker --version
# Should show: Docker version 24.x.x

# Done! ✅
```

### Step 4: Install Nginx (3 minutes)

```bash
# Update system
apt update

# Install Nginx
apt install -y nginx

# Start Nginx
systemctl start nginx
systemctl enable nginx

# Verify
curl localhost
# Should show: "Welcome to nginx!"

# Done! ✅
```

### Step 5: Clone Your Repo (5 minutes)

```bash
# Install Git
apt install -y git

# Clone your repo
cd /var/www
git clone https://github.com/abu-lina/uflow.git
cd uflow

# Done! ✅
```

### Step 6: Create Dockerfile (I'll provide it!)

I'll create the Dockerfile for you. Just copy-paste it:

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Build application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production

RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

**You don't need to understand this - just copy it!**

### Step 7: Update next.config.js (Important!)

Add this to your `next.config.js`:

```javascript
// Add this line at the top
output: 'standalone',
```

This tells Next.js to build for Docker.

### Step 8: Create .env File (3 minutes)

```bash
# Create .env file on server
nano .env.local

# Add your variables (copy from your local .env.local):
NEXT_PUBLIC_SUPABASE_URL=https://rdtdtcfntopcxcigkqoq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key-here
SUPABASE_SERVICE_ROLE_KEY=your-key-here

# Save: Ctrl+X, then Y, then Enter
```

### Step 9: Build Docker Image (10 minutes)

```bash
# Build the image (takes ~5-10 minutes)
docker build -t uflow .

# You'll see lots of output - this is normal!
# Wait for: "Successfully built [image-id]"

# Done! ✅
```

### Step 10: Run Docker Container (2 minutes)

```bash
# Run the container
docker run -d \
  --name uflow \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env.local \
  uflow

# Check if it's running
docker ps
# Should show: uflow container running

# Test locally
curl localhost:3000
# Should show: Your app's HTML!

# Done! ✅
```

### Step 11: Configure Nginx (10 minutes)

```bash
# Create Nginx config
nano /etc/nginx/sites-available/uflow

# Paste this config:
server {
    listen 80;
    server_name your-domain.com;  # Change this!

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
    }
}

# Save: Ctrl+X, then Y, then Enter

# Enable the site
ln -s /etc/nginx/sites-available/uflow /etc/nginx/sites-enabled/

# Remove default site
rm /etc/nginx/sites-enabled/default

# Test Nginx config
nginx -t
# Should show: "syntax is ok"

# Reload Nginx
systemctl reload nginx

# Done! ✅
```

### Step 12: Point Domain to Server (5 minutes)

1. Go to your domain registrar (e.g., Namecheap, GoDaddy)
2. Find DNS settings
3. Add A record:
   - **Name:** @ (or your subdomain)
   - **Type:** A
   - **Value:** YOUR_SERVER_IP
   - **TTL:** 300

Wait 5-10 minutes for DNS to propagate.

### Step 13: Install SSL Certificate (5 minutes)

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate (replace your-domain.com)
certbot --nginx -d your-domain.com

# Follow prompts:
# - Enter email
# - Agree to terms
# - Choose: Redirect HTTP to HTTPS (option 2)

# Done! ✅
# Your site now has HTTPS! 🔒
```

### Step 14: Test Everything (3 minutes)

```bash
# Visit your domain in browser
# https://your-domain.com

# Should see your app! 🎉

# Check if it's working:
# ✅ Homepage loads
# ✅ Supabase connection works
# ✅ Images load
# ✅ Login works
# ✅ HTTPS works (🔒 in browser)
```

---

## Future Deployments (Easy!)

After initial setup, deploying updates is simple:

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
docker stop uflow
docker rm uflow

# Start new container
docker run -d \
  --name uflow \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env.local \
  uflow

# Done! New version deployed! ✅
```

**Time:** 5 minutes per deployment

---

## Automation (Optional)

### Auto-Deploy from GitHub (Advanced)

Set up GitHub Actions to auto-deploy:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Hetzner

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_IP }}
          username: root
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /var/www/uflow
            git pull
            docker build -t uflow .
            docker stop uflow || true
            docker rm uflow || true
            docker run -d --name uflow --restart unless-stopped -p 3000:3000 --env-file .env.local uflow
```

Now every `git push` auto-deploys! 🎉

---

## Monitoring & Maintenance

### Weekly Checks (5 minutes)

```bash
# SSH into server
ssh root@YOUR_SERVER_IP

# Check container is running
docker ps

# Check logs for errors
docker logs uflow --tail 50

# Check disk space
df -h

# Check memory
free -h

# Done! ✅
```

### Monthly Updates (30 minutes)

```bash
# Update system packages
apt update && apt upgrade -y

# Renew SSL (automatic, but check)
certbot renew

# Restart if needed
systemctl restart nginx
docker restart uflow

# Done! ✅
```

---

## Help & Support

### Common Issues:

**1. Docker build fails**
```bash
# Clear Docker cache
docker system prune -a
docker build --no-cache -t uflow .
```

**2. Container crashes**
```bash
# Check logs
docker logs uflow

# Common fix: Check environment variables
cat .env.local
```

**3. Nginx errors**
```bash
# Check Nginx logs
tail -f /var/log/nginx/error.log

# Test config
nginx -t
```

**4. SSL renewal fails**
```bash
# Manual renewal
certbot renew --force-renewal
```

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

### When to Upgrade to CPX21 (€8.03/month)

- > 5,000 DAU
- High traffic spikes
- Need more RAM/CPU

---

## Hetzner vs Railway: Final Comparison

### Choose Hetzner if:
- ✅ You want to save money (€3/month = €36/year)
- ✅ You want to learn DevOps skills
- ✅ You're comfortable with Linux/Docker
- ✅ You have 2-3 hours for initial setup
- ✅ You prefer German company

### Choose Railway if:
- ✅ You want it deployed in 15 minutes
- ✅ You don't want to manage servers
- ✅ You value time over money
- ✅ You want auto-deploys from GitHub (built-in)
- ✅ You want Vercel-like experience

---

## My Honest Recommendation

### For Your 500 DAU Goal:

**Use Railway** ✅

**Why:**
1. Setup time: 15 min vs 2-3 hours
2. Cost difference: $7 vs €4 = $3/month ($36/year)
3. **Your time is worth more than $36/year!**
4. Less stress, less maintenance
5. Focus on building features, not managing servers

### When to Switch to Hetzner:

**At 2,000+ DAU** when:
- Costs scale up on Railway
- You have time to learn Docker
- Savings become significant (€100+/year)
- You want more control

---

## Bottom Line

**Hetzner Difficulty:** 6/10 ⭐⭐⭐⭐⭐⭐

**Is it doable?** Yes, absolutely!  
**Is it hard?** Moderate - Docker is the learning curve  
**Is it worth it?** Depends on your situation:
- **500 DAU:** Probably not (use Railway)
- **2,000+ DAU:** Yes! (savings add up)
- **Want to learn:** Yes! (valuable skills)

---

## What I Can Provide

If you want to try Hetzner, I can give you:

1. ✅ **Complete Dockerfile** (copy-paste ready)
2. ✅ **All commands** (step-by-step)
3. ✅ **Nginx config** (copy-paste ready)
4. ✅ **Deployment script** (one command deploy)
5. ✅ **Troubleshooting guide**
6. ✅ **Help debugging** if issues arise

**With my help, difficulty drops to 4/10** ⭐⭐⭐⭐

---

## Decision Time

**What would you like to do?**

**Option A: Try Hetzner** (I'll guide you step-by-step)
- Time: 2-3 hours
- Cost: €4/month
- Learning: High

**Option B: Use Railway** (easy path)
- Time: 15 minutes
- Cost: $7/month
- Learning: Low

**Option C: Compare both** (try Railway now, switch to Hetzner later)
- Best of both worlds
- Learn Railway first
- Migrate to Hetzner when you scale

Which sounds best for you? 🤔

