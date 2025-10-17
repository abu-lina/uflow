# Docker Security Best Practices - Build vs Runtime Secrets

## ❌ What We Had Before (INSECURE)

We were passing secrets as Docker build arguments:

```dockerfile
ARG SUPABASE_SERVICE_ROLE_KEY  # ❌ SECRET in build!
ARG RESEND_API_KEY              # ❌ SECRET in build!
ENV SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
ENV RESEND_API_KEY=$RESEND_API_KEY
```

### Why This Was Bad

1. **Secrets baked into image layers**
   ```bash
   docker history uflow:latest
   # Anyone can see: ENV SUPABASE_SERVICE_ROLE_KEY=sb_secret_xyz...
   ```

2. **Permanent exposure**
   - Secrets remain in image even after container stops
   - If you push/share image, secrets are exposed
   - No way to rotate secrets without rebuilding

3. **Violates security principle**: Build-time != Runtime

---

## ✅ Proper Solution (SECURE)

### 1. Lazy Initialization Pattern

**Before (runs at module load during build):**
```typescript
// ❌ This runs during `docker build`!
const supabaseAdmin = createClient(
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Requires secret at build time
  ...
);
```

**After (runs only when API is called):**
```typescript
// ✅ This runs only when API endpoint is called at runtime
function getSupabaseAdmin() {
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseServiceKey) {
    throw new Error('Missing secret');
  }
  
  return createClient(supabaseServiceKey, ...);
}

// In API route:
export async function POST(request: Request) {
  const supabase = getSupabaseAdmin(); // Only runs at runtime!
  // ...
}
```

### 2. Updated Dockerfile

**Build time** (baked into image):
```dockerfile
# Only public variables
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY  
ARG NEXT_PUBLIC_SITE_URL

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

RUN npm run build  # Build succeeds without secrets!
```

**Runtime** (passed when container starts):
```bash
docker run -d \
  -e SUPABASE_SERVICE_ROLE_KEY="${SECRET_KEY}" \    # ✅ Secret at runtime only!
  -e RESEND_API_KEY="${RESEND_KEY}" \                # ✅ Secret at runtime only!
  --env-file .env.local \                            # ✅ Or load from file
  uflow:latest
```

---

## 📊 Comparison

| Aspect | Build Args (❌ Bad) | Runtime Env (✅ Good) |
|--------|---------------------|----------------------|
| **Stored in image** | Yes, permanent | No |
| **Visible in history** | Yes | No |
| **Can rotate** | No (must rebuild) | Yes (just restart) |
| **Can share image** | No (has secrets) | Yes (no secrets) |
| **Best practice** | ❌ | ✅ |

---

## 🔒 Security Benefits

### Before
```bash
# Anyone with image access can extract secrets
docker history uflow:latest | grep SECRET
# Shows: ENV SUPABASE_SERVICE_ROLE_KEY=sb_secret_abc123...
```

### After
```bash
# Image contains NO secrets
docker history uflow:latest | grep SECRET
# Shows nothing!

# Secrets only in running container
docker inspect uflow-app --format '{{.Config.Env}}' | grep SECRET
# Only visible with container access
```

---

## 🎯 Best Practices Summary

### ✅ DO

1. **Build time**: Only `NEXT_PUBLIC_*` variables
2. **Runtime**: All secrets (`*_KEY`, `*_SECRET`, etc.)
3. **Lazy init**: Initialize clients when first called, not at module load
4. **Separate concerns**: Build = code compilation, Runtime = app execution

### ❌ DON'T

1. Pass secrets as `ARG` or build-time `ENV`
2. Initialize clients at top-level (module load)
3. Commit `.env.local` to git
4. Share Docker images containing secrets

---

## 📦 Deployment Checklist

- [ ] Dockerfile only has public `ARG` variables
- [ ] API routes use lazy initialization (`getSupabaseAdmin()`)
- [ ] Secrets passed via `-e` flags or `--env-file`
- [ ] `.env.local` in `.gitignore`
- [ ] Build succeeds without secrets
- [ ] Runtime errors if secrets missing

---

## 🔄 Migration Steps (What We Did)

1. ✅ Changed all API routes to use `getSupabaseAdmin()` function
2. ✅ Removed secrets from Dockerfile `ARG`/`ENV`
3. ✅ Updated GitHub Actions to not pass secrets during build
4. ✅ Verified build works without secrets
5. ✅ Ensured secrets passed at runtime only

---

## 🧪 Testing

### Test Build (No Secrets Needed)
```bash
docker build -t uflow:latest \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="https://..." \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="..." \
  --build-arg NEXT_PUBLIC_SITE_URL="https://..." \
  .

# ✅ Should succeed without any secrets!
```

### Test Runtime (Secrets Required)
```bash
docker run -d \
  -e SUPABASE_SERVICE_ROLE_KEY="..." \
  -e RESEND_API_KEY="..." \
  --name test \
  uflow:latest

# ✅ Container starts with secrets
# ✅ API routes work correctly
```

---

## 📚 References

- [Docker Multi-Stage Builds](https://docs.docker.com/develop/develop-images/multistage-build/)
- [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [Twelve-Factor App: Config](https://12factor.net/config)

---

## ✅ Result

**Your app is now secure!** 🎉

- Secrets never stored in image
- Can share/push image safely
- Can rotate secrets without rebuilding
- Follows industry best practices

