# Fix UAT Now - Command Reference Card

## 🔥 Emergency Quick Fix

```bash
# Local: Commit fixes
git add Dockerfile scripts/*.sh *.md
git commit -m "Fix: UAT static files missing in Docker"
git push

# Server: Apply fix
ssh root@hetzner-ip
cd /path/to/uflow
git pull
./scripts/fix-uat-static-files.sh
```

## 🔍 Diagnose First

```bash
# Quick check (30 seconds)
ssh root@hetzner-ip
cd /path/to/uflow
./scripts/diagnose-uat-now.sh
```

## 🎯 What's Wrong

- **Issue**: 404 errors on CSS/JS files
- **Cause**: Docker container missing static files
- **Impact**: Broken styling, MIME type errors

## ✅ Verify Fix Worked

```bash
# On server
docker exec uflow-uat find .next/static -type f | wc -l
# Should show 50+ files

curl https://uat.ummahflow.com/api/health
# Should return {"status":"healthy"}
```

## 🌐 Browser Check

1. Clear cache: `Ctrl+Shift+Delete`
2. Hard refresh: `Ctrl+F5`
3. Check DevTools (F12) - no 404s

## 📚 More Info

- Quick overview: `QUICK_FIX_UAT.md`
- Complete guide: `UAT_STATIC_FILES_FIX.md`
- Visual explanation: `UAT_ISSUE_VISUAL.md`
- Full analysis: `UAT_404_FIX_SUMMARY.md`

## ⚡ Super Quick Manual Fix

```bash
# If scripts don't work
export $(cat .env.uat | grep -v '^#' | xargs)
docker build --no-cache \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  --build-arg NEXT_PUBLIC_SITE_URL="https://uat.ummahflow.com" \
  -t uflow-uat:latest .
docker stop uflow-uat && docker rm uflow-uat
docker run -d --name uflow-uat --restart unless-stopped \
  -p 3001:3000 --env-file .env.uat uflow-uat:latest
```

## 🆘 Troubleshooting

**Still broken after fix?**
```bash
# Check logs
docker logs --tail 100 uflow-uat
sudo tail -f /var/log/nginx/error.log

# Verify environment
docker exec uflow-uat env | grep NEXT_PUBLIC

# Test direct access
curl -I http://localhost:3001/api/health
```

**Build fails?**
```bash
# Check build output
docker build ... 2>&1 | tee build.log
grep -i "error\|warning" build.log
```

**Files still missing?**
```bash
# Inspect builder stage
docker build --target builder -t test-builder .
docker run -it test-builder /bin/sh
ls -la .next/static
```

