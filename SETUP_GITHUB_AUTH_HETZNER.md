# Setup GitHub Authentication on Hetzner Server

You're getting this error because your Hetzner server needs credentials to pull from your private GitHub repository.

---

## ✅ Option 1: SSH Key (RECOMMENDED - Most Secure)

### Step 1: Generate SSH Key on Hetzner Server

```bash
# SSH into your server
ssh root@91.98.207.106

# Generate SSH key
ssh-keygen -t ed25519 -C "hetzner-uflow-server"

# Press Enter 3 times (accept defaults, no passphrase)

# Display the public key
cat ~/.ssh/id_ed25519.pub
```

**Copy the entire output** (starts with `ssh-ed25519 ...`)

---

### Step 2: Add Key to GitHub

1. Go to: https://github.com/settings/keys
2. Click **"New SSH key"**
3. Title: `Hetzner uFlow Server`
4. Key type: **Authentication key**
5. Paste the key you copied
6. Click **"Add SSH key"**

---

### Step 3: Update Git Remote to Use SSH

Still on the Hetzner server:

```bash
cd /var/www/uflow

# Check current remote
git remote -v

# Change from HTTPS to SSH
git remote set-url origin git@github.com:abu-lina/uflow.git

# Test connection
ssh -T git@github.com

# You should see: "Hi abu-lina! You've successfully authenticated"

# Now try pulling
git pull
```

✅ **This should work now!**

---

## Option 2: Personal Access Token (Alternative)

If you prefer using HTTPS instead of SSH:

### Step 1: Create Personal Access Token

1. Go to: https://github.com/settings/tokens
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Name: `Hetzner uFlow Deploy`
4. Expiration: Choose duration (90 days or custom)
5. Select scopes:
   - ✅ `repo` (Full control of private repositories)
6. Click **"Generate token"**
7. **COPY THE TOKEN** (starts with `ghp_...`) - you won't see it again!

---

### Step 2: Configure Git to Use Token

On Hetzner server:

```bash
cd /var/www/uflow

# Configure Git to cache credentials
git config --global credential.helper store

# Pull (you'll be prompted for credentials)
git pull

# Username: abu-lina
# Password: [paste your token here - starts with ghp_...]
```

The token will be stored and you won't need to enter it again.

---

## ⚠️ Security Note

**SSH Key** = More secure, doesn't expire
**Personal Access Token** = Expires, can be revoked

I recommend **SSH Key (Option 1)** for production servers.

---

## Quick Test

After setting up either option:

```bash
ssh root@91.98.207.106
cd /var/www/uflow
git pull
```

Should now work without errors! ✅

