# Connectivity Troubleshooting Guide

If you cannot reach `ummahflow.com` or `uat.ummahflow.com`, follow this guide to diagnose and fix the issue.

## Quick Diagnosis

Run the diagnostic script on your Hetzner server:

```bash
ssh root@91.98.207.106
cd /var/www/uflow  # or /root/uflow
./scripts/diagnose-connectivity.sh
```

This will check:
- DNS resolution
- Nginx status and configuration
- SSL certificates
- Docker containers
- Port listening
- Firewall rules
- Local health checks

## Common Issues and Fixes

### Issue 1: DNS Not Configured

**Symptoms:**
- Domain doesn't resolve
- "This site can't be reached" error
- DNS timeout

**Check:**
```bash
dig ummahflow.com
dig uat.ummahflow.com
```

**Fix:**
1. Go to your DNS provider (Cloudflare, etc.)
2. Add A records:
   - `ummahflow.com` → `91.98.207.106`
   - `uat.ummahflow.com` → `91.98.207.106`
3. Wait 5-10 minutes for DNS propagation

### Issue 2: Nginx Not Running

**Symptoms:**
- Connection refused
- 502 Bad Gateway
- No response from server

**Check:**
```bash
sudo systemctl status nginx
```

**Fix:**
```bash
sudo systemctl start nginx
sudo systemctl enable nginx
sudo systemctl reload nginx
```

### Issue 3: Nginx Configuration Missing or Broken

**Symptoms:**
- Nginx running but sites not accessible
- Configuration test fails

**Check:**
```bash
sudo nginx -t
ls -la /etc/nginx/sites-enabled/
```

**Fix for Production:**
```bash
cd /var/www/uflow  # or /root/uflow
# Replace {{DOMAIN}} with ummahflow.com in nginx-template.conf
sed 's/{{DOMAIN}}/ummahflow.com/g' nginx-template.conf | sudo tee /etc/nginx/sites-available/ummahflow
sudo ln -sf /etc/nginx/sites-available/ummahflow /etc/nginx/sites-enabled/ummahflow
sudo nginx -t
sudo systemctl reload nginx
```

**Fix for UAT:**
```bash
cd /var/www/uflow  # or /root/uflow
sudo cp nginx-uat-template.conf /etc/nginx/sites-available/uat-ummahflow
sudo ln -sf /etc/nginx/sites-available/uat-ummahflow /etc/nginx/sites-enabled/uat-ummahflow
sudo nginx -t
sudo systemctl reload nginx
```

### Issue 4: SSL Certificates Missing

**Symptoms:**
- SSL certificate errors
- Browser shows "Not Secure"
- Nginx errors about missing certificate files

**Check:**
```bash
ls -la /etc/letsencrypt/live/ummahflow.com/
ls -la /etc/letsencrypt/live/uat.ummahflow.com/
```

**Fix:**
```bash
# Install Certbot if not installed
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# Get certificates
sudo certbot --nginx -d ummahflow.com -d www.ummahflow.com
sudo certbot --nginx -d uat.ummahflow.com

# Reload Nginx
sudo systemctl reload nginx
```

### Issue 5: Docker Containers Not Running

**Symptoms:**
- 502 Bad Gateway
- Health checks fail
- No response from application

**Check:**
```bash
docker ps | grep uflow
docker logs uflow --tail 50
docker logs uflow-uat --tail 50
```

**Fix:**
```bash
cd /var/www/uflow  # or /root/uflow

# Deploy production
./scripts/deploy-hetzner.sh

# Deploy UAT
./scripts/deploy-uat.sh
```

### Issue 6: Ports Not Listening

**Symptoms:**
- Connection refused
- Port not accessible

**Check:**
```bash
netstat -tlnp | grep -E "(3000|3001|80|443)"
```

**Fix:**
- If port 3000 not listening: Start production container
- If port 3001 not listening: Start UAT container
- If ports 80/443 not listening: Start Nginx

### Issue 7: Firewall Blocking Ports

**Symptoms:**
- Connection timeout
- Ports not accessible from outside

**Check:**
```bash
sudo ufw status
sudo iptables -L -n | grep -E "(80|443)"
```

**Fix:**
```bash
# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload

# Or if using iptables directly
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
```

### Issue 8: Containers Crashing

**Symptoms:**
- Containers start then immediately stop
- Health checks fail
- Logs show errors

**Check:**
```bash
docker ps -a | grep uflow
docker logs uflow
docker logs uflow-uat
```

**Common causes:**
- Missing environment variables
- Invalid Supabase credentials
- Port already in use
- Build errors

**Fix:**
1. Check environment files exist:
   ```bash
   ls -la .env.production .env.uat
   ```

2. Verify environment variables:
   ```bash
   grep NEXT_PUBLIC_SUPABASE_URL .env.production
   grep NEXT_PUBLIC_SUPABASE_URL .env.uat
   ```

3. Check if ports are in use:
   ```bash
   lsof -i :3000
   lsof -i :3001
   ```

4. Rebuild and redeploy:
   ```bash
   ./scripts/deploy-hetzner.sh
   ./scripts/deploy-uat.sh
   ```

## Step-by-Step Recovery

If everything is broken, follow this order:

### Step 1: Verify Server Access
```bash
ssh root@91.98.207.106
```

### Step 2: Check Basic Services
```bash
# Check Nginx
sudo systemctl status nginx
sudo systemctl start nginx

# Check Docker
docker ps
systemctl status docker
```

### Step 3: Verify DNS
```bash
dig ummahflow.com
dig uat.ummahflow.com
```

Both should resolve to `91.98.207.106`

### Step 4: Check Nginx Configuration
```bash
cd /var/www/uflow  # or /root/uflow
sudo nginx -t
```

Fix any errors shown.

### Step 5: Ensure SSL Certificates Exist
```bash
ls -la /etc/letsencrypt/live/ummahflow.com/
ls -la /etc/letsencrypt/live/uat.ummahflow.com/
```

If missing, run Certbot (see Issue 4).

### Step 6: Deploy Containers
```bash
cd /var/www/uflow  # or /root/uflow
./scripts/deploy-hetzner.sh
./scripts/deploy-uat.sh
```

### Step 7: Verify Everything Works
```bash
# Test locally
curl http://localhost:3000/api/health
curl http://localhost:3001/api/health

# Test through Nginx (if SSL is set up)
curl https://ummahflow.com/api/health
curl https://uat.ummahflow.com/api/health
```

## Quick Health Check Commands

Run these on the server to quickly check status:

```bash
# All-in-one status check
echo "=== Nginx ===" && systemctl is-active nginx && echo "✅" || echo "❌"
echo "=== Production Container ===" && docker ps | grep -q "uflow" && echo "✅" || echo "❌"
echo "=== UAT Container ===" && docker ps | grep -q "uflow-uat" && echo "✅" || echo "❌"
echo "=== Port 3000 ===" && netstat -tlnp | grep -q ":3000" && echo "✅" || echo "❌"
echo "=== Port 3001 ===" && netstat -tlnp | grep -q ":3001" && echo "✅" || echo "❌"
echo "=== Port 443 ===" && netstat -tlnp | grep -q ":443" && echo "✅" || echo "❌"
```

## Still Not Working?

1. Check Hetzner Cloud firewall rules in the Hetzner console
2. Verify server is running: `uptime`
3. Check system resources: `free -h` and `df -h`
4. Review all logs:
   ```bash
   docker logs uflow --tail 100
   docker logs uflow-uat --tail 100
   sudo tail -100 /var/log/nginx/error.log
   sudo journalctl -u nginx -n 50
   ```

## Prevention

To prevent future issues:

1. Set up monitoring for containers
2. Enable automatic SSL renewal: `sudo certbot renew --dry-run`
3. Set up health check alerts
4. Document any custom configurations
5. Keep deployment scripts updated









