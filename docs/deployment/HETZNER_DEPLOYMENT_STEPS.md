# Hetzner Deployment - Step-by-Step Checklist

Follow these steps **in order**. Check off each one as you complete it!

---

## ✅ Pre-Deployment (Local - 10 minutes)

- [x] ✅ Dockerfile created
- [x] ✅ .dockerignore created  
- [x] ✅ next.config.js updated with `output: 'standalone'`
- [x] ✅ deploy-hetzner.sh script created
- [ ] Commit and push changes to GitHub

### Commit Your Changes

```bash
git add Dockerfile .dockerignore next.config.js deploy-hetzner.sh
git commit -m "Add Hetzner deployment configuration"
git push origin main
```

---

## 🏗️ Phase 1: Create Hetzner Server (10 minutes)

### Step 1.1: Create Hetzner Account

1. Go to: [https://www.hetzner.com/cloud](https://www.hetzner.com/cloud)
2. Click **"Sign up"**
3. Fill in details:
   - Email: your@email.com
   - Password: (create strong password)
4. Verify email
5. Add payment method (credit card or PayPal)

**✅ Account created!**

---

### Step 1.2: Create New Project

1. Log into [Hetzner Cloud Console](https://console.hetzner.cloud)
2. Click **"New Project"**
3. Name it: **"uflow"**
4. Click **"Add Project"**

**✅ Project created!**

---

### Step 1.3: Create Server

1. Click **"Add Server"** (big button)
2. **Location:** Select **"Falkenstein"** or **"Nuremberg"** (Germany 🇩🇪)
3. **Image:** Select **"Ubuntu 22.04"**
4. **Type:** Select **"CPX11"**
   - 2 vCPU
   - 2 GB RAM
   - 40 GB SSD
   - **€4.15/month**
5. **SSH Key:**
   - If you have SSH key: Upload it
   - If you don't: Skip for now (use password)
6. **Server name:** "uflow-production"
7. Click **"Create & Buy now"**

**Wait ~30 seconds for server to boot**

**✅ Server created!**

---

### Step 1.4: Note Your Server Details

After server boots, you'll see:

```
IP Address: XXX.XXX.XXX.XXX  ← Copy this!
Root Password: (if no SSH key) ← Copy this!
```

**Save these details!** You'll need them.

---

## 🔐 Phase 2: Connect to Server (5 minutes)

### Step 2.1: SSH into Server

Open your terminal and run:

```bash
# Replace XXX.XXX.XXX.XXX with your server IP
ssh root@XXX.XXX.XXX.XXX
```

**If using password:**
- Type: `yes` (to accept fingerprint)
- Paste root password
- Press Enter

**If using SSH key:**
- Should connect automatically

**You should see:**
```
Welcome to Ubuntu 22.04.x LTS
root@uflow-production:~#
```

**✅ Connected to server!**

---

## 🐳 Phase 3: Install Docker (5 minutes)

### Step 3.1: Install Docker

Run these commands **on the server**:

```bash
# Update system
apt update

# Install Docker (automated script)
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Verify installation
docker --version
```

**You should see:** `Docker version 24.x.x`

**✅ Docker installed!**

---

### Step 3.2: Install Docker Compose (Optional but Useful)

```bash
apt install -y docker-compose

# Verify
docker-compose --version
```

**✅ Docker Compose installed!**

---

## 🌐 Phase 4: Install Nginx (5 minutes)

### Step 4.1: Install Nginx

```bash
# Install Nginx
apt install -y nginx

# Start Nginx
systemctl start nginx
systemctl enable nginx

# Verify
systemctl status nginx
```

**You should see:** `active (running)`

**✅ Nginx installed!**

---

### Step 4.2: Configure Firewall

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

**✅ Firewall configured!**

---

## 📦 Phase 5: Deploy Your App (20 minutes)

### Step 5.1: Install Git

```bash
apt install -y git

# Verify
git --version
```

**✅ Git installed!**

---

### Step 5.2: Clone Your Repository

```bash
# Go to /var/www
cd /var/www

# Clone your repo
git clone https://github.com/abu-lina/uflow.git

# Enter directory
cd uflow

# Verify files
ls -la
```

**You should see:** Dockerfile, package.json, etc.

**✅ Repository cloned!**

---

### Step 5.3: Create Environment File

```bash
# Create .env.local file
nano .env.local
```

**Paste your environment variables:**

```env
NEXT_PUBLIC_SUPABASE_URL=https://rdtdtcfntopcxcigkqoq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**To save in nano:**
1. Press `Ctrl + X`
2. Press `Y` (yes)
3. Press `Enter` (confirm)

**✅ Environment variables set!**

---

### Step 5.4: Build Docker Image

```bash
# Build the image (takes 5-10 minutes)
docker build -t uflow .
```

**You'll see lots of output. Wait for:**
```
Successfully built [image-id]
Successfully tagged uflow:latest
```

**✅ Docker image built!**

---

### Step 5.5: Run Docker Container

```bash
# Run the container
docker run -d \
  --name uflow \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env.local \
  uflow

# Check if running
docker ps
```

**You should see:**
```
CONTAINER ID   IMAGE   STATUS      PORTS
xxxxx          uflow   Up 2 sec    0.0.0.0:3000->3000/tcp
```

**✅ Container running!**

---

### Step 5.6: Test Locally

```bash
# Test the app
curl http://localhost:3000
```

**You should see:** HTML output from your app

**✅ App working locally!**

---

## 🔧 Phase 6: Configure Nginx (10 minutes)

### Step 6.1: Create Nginx Configuration

```bash
# Create config file
nano /etc/nginx/sites-available/uflow
```

**Paste this configuration:**

```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN.com www.YOUR_DOMAIN.com;

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

**Remember to replace `YOUR_DOMAIN.com` with your actual domain!**

**Save:** `Ctrl + X`, `Y`, `Enter`

**✅ Nginx config created!**

---

### Step 6.2: Enable the Site

```bash
# Create symlink
ln -s /etc/nginx/sites-available/uflow /etc/nginx/sites-enabled/

# Remove default site
rm /etc/nginx/sites-enabled/default

# Test configuration
nginx -t
```

**You should see:**
```
nginx: configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

**✅ Nginx config valid!**

---

### Step 6.3: Reload Nginx

```bash
# Reload Nginx
systemctl reload nginx

# Check status
systemctl status nginx
```

**✅ Nginx reloaded!**

---

## 🌍 Phase 7: Point Domain to Server (10 minutes)

### Step 7.1: Update DNS Records

Go to your domain registrar (Namecheap, GoDaddy, Cloudflare, etc.)

**Add A Record:**
- **Type:** A
- **Name:** @ (for root domain) or www
- **Value:** YOUR_SERVER_IP
- **TTL:** 300 (5 minutes)

**Example:**
```
Type: A
Name: @
Value: 142.132.xxx.xxx
TTL: 300
```

**For subdomain (optional):**
```
Type: A
Name: app
Value: 142.132.xxx.xxx
TTL: 300
```

**✅ DNS updated!**

**⏳ Wait 5-10 minutes for DNS propagation**

---

### Step 7.2: Test DNS

On your local machine:

```bash
# Test DNS resolution (replace with your domain)
ping yourdomain.com
```

**You should see your server IP!**

**✅ DNS working!**

---

## 🔒 Phase 8: Install SSL Certificate (5 minutes)

### Step 8.1: Install Certbot

Back on the server:

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx
```

**✅ Certbot installed!**

---

### Step 8.2: Get SSL Certificate

```bash
# Get certificate (replace with your domain)
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow prompts:
# 1. Enter email address
# 2. Agree to terms (Y)
# 3. Share email with EFF? (your choice, N is fine)
# 4. Choose: Redirect HTTP to HTTPS (option 2)
```

**You should see:**
```
Congratulations! You have successfully enabled HTTPS!
```

**✅ SSL certificate installed!**

---

### Step 8.3: Test HTTPS

Visit in browser:
```
https://yourdomain.com
```

**You should see:**
- 🔒 Padlock in browser
- Your app loads!
- HTTPS working!

**✅ HTTPS working!**

---

## 🎉 Phase 9: Final Verification (5 minutes)

### Checklist:

- [ ] Visit `https://yourdomain.com` - Homepage loads
- [ ] Test navigation - All pages work
- [ ] Test login/signup - Authentication works
- [ ] Test provider search - Search works
- [ ] Test create provider - Form works
- [ ] Test images - Images load
- [ ] Check HTTPS - Padlock shows
- [ ] Check mobile - Responsive works
- [ ] Test PWA install - PWA works

**✅ All working? Congratulations! 🎉**

---

## 📊 Post-Deployment Tasks

### Monitor Your App

```bash
# Check container logs
docker logs uflow --tail 100

# Follow logs in real-time
docker logs uflow -f

# Check resource usage
docker stats uflow
```

---

### Make Deployment Script Executable

```bash
# Make script executable
chmod +x deploy-hetzner.sh
```

---

### Future Deployments

When you want to deploy updates:

```bash
# SSH into server
ssh root@YOUR_SERVER_IP

# Go to app directory
cd /var/www/uflow

# Run deployment script
./deploy-hetzner.sh
```

**That's it!** Updates deploy in ~5 minutes.

---

## 🔧 Troubleshooting

### Container Won't Start

```bash
# Check logs
docker logs uflow

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

---

## 📞 Need Help?

If you get stuck:
1. Check the logs first
2. Google the error message
3. Ask me! Share the error and I'll help debug

---

## 🎯 Summary

**What you've accomplished:**
- ✅ Created Hetzner server in Germany 🇩🇪
- ✅ Installed Docker & Nginx
- ✅ Deployed Next.js app
- ✅ Configured SSL/HTTPS
- ✅ App live at https://yourdomain.com
- ✅ GDPR compliant (EU hosting)
- ✅ Cost: €4.15/month

**Congratulations! You've deployed to Hetzner! 🚀**

---

## Next Steps

1. Set up monitoring (optional)
2. Configure backups (recommended)
3. Set up auto-deployments with GitHub Actions (optional)
4. Add application monitoring (Sentry, etc.)

You're live in the EU! 🇪🇺

