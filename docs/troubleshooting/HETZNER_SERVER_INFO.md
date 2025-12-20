# Hetzner Server Information

**Quick Reference** - All server details in one place

## Server Details

- **IP Address**: `91.98.207.106`
- **Hostname**: `uflow-production`
- **User**: `root`
- **Provider**: Hetzner Cloud
- **Location**: Frankfurt, Germany 🇩🇪
- **Server Name**: `uflow-production`

## SSH Connection

```bash
# Using IP address
ssh root@91.98.207.106

# Using hostname (if configured in ~/.ssh/config)
ssh root@uflow-production
```

## Project Paths

The project is typically located at one of these locations:
- `/var/www/uflow` (most common)
- `/root/uflow`

To find the exact location:
```bash
ssh root@91.98.207.106
find / -name "uflow" -type d 2>/dev/null | grep -E "(var/www|root)"
```

## Quick Commands

### Connect to Server
```bash
ssh root@91.98.207.106
```

### Check Running Containers
```bash
ssh root@91.98.207.106 "docker ps"
```

### Check Environment Files
```bash
ssh root@91.98.207.106 "ls -la /var/www/uflow/.env.*"
# or
ssh root@91.98.207.106 "ls -la /root/uflow/.env.*"
```

### View Container Logs
```bash
# Production container
ssh root@91.98.207.106 "docker logs uflow --tail 50"

# UAT container
ssh root@91.98.207.106 "docker logs uflow-uat --tail 50"
```

### Check Container Status
```bash
ssh root@91.98.207.106 "docker ps | grep uflow"
```

## Domains

- **Production**: https://ummahflow.com (port 3000)
- **UAT**: https://uat.ummahflow.com (port 3001)

## Deployment Commands

### Deploy to UAT
```bash
ssh root@91.98.207.106
cd /var/www/uflow  # or /root/uflow
git pull origin main
./scripts/deploy-uat.sh
```

### Deploy to Production
```bash
ssh root@91.98.207.106
cd /var/www/uflow  # or /root/uflow
git pull origin main
./scripts/deploy-hetzner.sh
```

## Health Checks

### Production Health Check
```bash
curl http://localhost:3000/api/health
# or from local machine:
curl https://ummahflow.com/api/health
```

### UAT Health Check
```bash
curl http://localhost:3001/api/health
# or from local machine:
curl https://uat.ummahflow.com/api/health
```

## Related Documentation

- [VERIFY_HETZNER_ENV.md](VERIFY_HETZNER_ENV.md) - Environment file verification
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Complete deployment procedures
- [docs/deployment/HETZNER_DEPLOYMENT.md](docs/deployment/HETZNER_DEPLOYMENT.md) - Full deployment guide
- [SUPABASE_FIX_SUMMARY.md](SUPABASE_FIX_SUMMARY.md) - Supabase fix details

## Notes

- Last login: Sat Nov 29 17:51:40 2025 from 87.157.144.154
- System restart may be required (check with: `ssh root@91.98.207.106 "uptime"`)









