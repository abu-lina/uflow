# Checking Hetzner Environment Variables

## Your Hetzner Server IP: 91.98.207.106

Follow these commands step by step:

---

## Step 1: Check Current .env.local Content

```bash
ssh root@91.98.207.106 "cat /var/www/.env.local"
```

This will show you the current environment variables.

---

## Step 2: Check if .env.local exists in correct location

```bash
ssh root@91.98.207.106 "ls -la /var/www/uflow/.env.local"
```

---

## Step 3: Check what env the Docker container is using

```bash
ssh root@91.98.207.106 "docker inspect uflow-app | grep -A 20 'Env'"
```

---

## What to Look For

In the output from Step 1, find the line:
```
NEXT_PUBLIC_SITE_URL=...
```

✅ Should be: `NEXT_PUBLIC_SITE_URL=https://your-domain.com`
❌ If it shows: `NEXT_PUBLIC_SITE_URL=http://localhost:3001`

Let me know what you see!

