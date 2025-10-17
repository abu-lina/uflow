# ✅ Fixed: 406 Email Confirmation Error

## What Was Fixed

### 1. **Root Cause**
The API was using `.single()` which returns a **406 Not Acceptable** error when no matching token is found in the database.

### 2. **The Fix**
Changed `.single()` to `.maybeSingle()` in `/src/app/api/confirm-email/route.ts` (line 80)

```typescript
// ❌ Before (causes 406 error)
.single();

// ✅ After (returns null gracefully)
.maybeSingle();
```

### 3. **Improved Error Logging**
Enhanced error handling in `/src/app/auth/confirm/page.tsx` to capture more debugging details.

---

## 🔄 Next Steps: RESTART Dev Server

**IMPORTANT:** You must restart your development server for the changes to take effect.

### Option 1: Terminal Restart
```bash
# Stop the server (Ctrl + C in the terminal where it's running)
# Then start it again:
npm run dev
```

### Option 2: Quick Restart (if you can't find the terminal)
```bash
# Kill the server
pkill -f "next dev"

# Start it again
npm run dev
```

---

## 🧪 Test Email Confirmation

After restarting, test the email confirmation flow:

1. **Sign up with a test email**
   - Go to `/signup`
   - Use a valid email (e.g., `test@example.com`)

2. **Check server logs for token creation**
   Look for:
   ```
   [SIGNUP API] Token created successfully
   ```

3. **Copy the confirmation URL from server logs**
   It will look like:
   ```
   http://localhost:3000/auth/confirm?token=abc123...&email=test@example.com
   ```

4. **Visit the confirmation URL**

5. **Check browser console**
   - ✅ Success: `[CONFIRM PAGE] ✅ Email confirmation successful`
   - ❌ Error: Will now show detailed error info including status code

---

## 🐛 If Still Failing

### Check Token Exists in Database

Run this in Supabase SQL Editor:

```sql
-- Replace with your test email
SELECT 
  id,
  email,
  LEFT(token, 20) || '...' as token_preview,
  expires_at,
  expires_at > NOW() as is_valid,
  used,
  created_at
FROM public.email_confirmation_tokens 
WHERE email = 'YOUR_EMAIL_HERE'
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected Results:**
- ✅ 1 row returned with `is_valid = true` and `used = false`
- ❌ No rows → Token wasn't created during signup (check signup API logs)
- ❌ `is_valid = false` → Token expired (need to resend)
- ❌ `used = true` → Already confirmed (can just login)

---

## 📊 What Each Error Means

| Status Code | Meaning | Solution |
|-------------|---------|----------|
| **400** | Token not found / invalid / expired | Check database, verify token creation |
| **406** | `.single()` error (NOW FIXED) | Should not occur anymore |
| **429** | Too many confirmation attempts | Wait 1 hour |
| **500** | Server error | Check server logs |

---

## 🔍 Debugging Checklist

- [ ] Dev server restarted after code changes
- [ ] `email_confirmation_tokens` table exists in Supabase
- [ ] Token created during signup (check server logs)
- [ ] Token is valid (not expired, not used)
- [ ] Email matches exactly (case-sensitive)
- [ ] Browser console shows detailed error info

---

## 💡 Key Improvements Made

1. **No more 406 errors** - Using `.maybeSingle()` handles missing tokens gracefully
2. **Better error messages** - Users see "Invalid or expired confirmation link" instead of generic error
3. **Enhanced logging** - Console now shows HTTP status, headers, and full error details
4. **Consistent behavior** - All edge cases properly handled

