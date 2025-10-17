# Documentation Index

This directory contains all project documentation, organized by category.

## 📁 Directory Structure

```
docs/
├── deployment/      # Deployment guides (Hetzner, GitHub Actions, Docker)
├── fixes/           # Bug fix documentation and troubleshooting
├── guides/          # Setup guides and best practices
└── archive/         # Old/historical documentation
```

---

## 🚀 Deployment

**Location:** `docs/deployment/`

Essential deployment documentation:

- **HETZNER_DEPLOYMENT_STEPS.md** - Complete Hetzner deployment guide
- **HETZNER_SETUP_GUIDE.md** - Initial Hetzner server setup
- **GITHUB_SECRETS_CHECKLIST.md** - Required GitHub secrets for CI/CD
- **DOCKER_SECURITY_BEST_PRACTICES.md** - Docker secrets management
- **DEPLOYMENT.md** - General deployment overview

---

## 🔧 Fixes & Troubleshooting

**Location:** `docs/fixes/`

Bug fixes and solutions:

- **FIX_LOGIN_AFTER_EMAIL_CONFIRMATION.md** - Email confirmation login issue
- **FIX_406_EMAIL_CONFIRMATION.md** - 406 error fix
- **BUILD_FIXES_SUMMARY.md** - Build linting error fixes
- **FIXES_SUMMARY_SECURITY.md** - Security fixes summary
- **DEBUG_CONFIRMATION_ERROR.md** - Email confirmation debugging
- **TROUBLESHOOT_EMAIL_CONFIRMATION.md** - Email troubleshooting guide

---

## 📚 Guides

**Location:** `docs/guides/`

Setup and best practice guides:

- **SUPABASE_SETUP_GUIDE.md** - Supabase configuration
- **EMAIL_SETUP.md** - Email service setup
- **BEST_PRACTICE_EMAIL_SETUP.md** - Email best practices
- **AUTH_HOOKS_SUMMARY.md** - Authentication hooks
- **SETUP_GITHUB_AUTH_HETZNER.md** - GitHub authentication for deployment

---

## 📦 Archive

**Location:** `docs/archive/`

Historical documentation and old implementations:

- Feature documentation
- Refactoring summaries
- Old implementation guides
- Component documentation
- Migration guides

---

## 🗃️ SQL Files

**Location:** `../sql/`

Database queries and migrations:

```
sql/
├── migrations/      # Database migrations
│   ├── create-*.sql
│   ├── add-*.sql
│   └── setup-*.sql
├── queries/         # Utility queries  
│   ├── fix-*.sql
│   └── delete-*.sql
└── debug/           # Debugging queries
    ├── check-*.sql
    ├── verify-*.sql
    └── debug-*.sql
```

---

## 🔨 Scripts

**Location:** `../scripts/`

Deployment and utility scripts:

- **deploy-hetzner.sh** - Main deployment script
- **check-deployment.sh** - Deployment verification
- **fix-hetzner-env.sh** - Environment variable fixes
- And more...

---

## 🎯 Quick Start

### New Developer Setup
1. Read `HETZNER_SETUP_GUIDE.md` or `SUPABASE_SETUP_GUIDE.md`
2. Check `GITHUB_SECRETS_CHECKLIST.md` for required secrets
3. Review `BEST_PRACTICE_*.md` files

### Debugging Issues
1. Check `docs/fixes/` for known issues
2. Use SQL queries in `../sql/debug/` to investigate
3. Refer to troubleshooting guides

### Deploying
1. Follow `HETZNER_DEPLOYMENT_STEPS.md`
2. Ensure GitHub secrets are configured
3. Push to main branch for auto-deployment

---

## 📝 Contributing

When adding new documentation:

- **Deployment docs** → `docs/deployment/`
- **Bug fixes** → `docs/fixes/`
- **Setup guides** → `docs/guides/`
- **Old/archived** → `docs/archive/`
- **SQL migrations** → `../sql/migrations/`
- **SQL queries** → `../sql/queries/`
- **Scripts** → `../scripts/`

---

## 🔍 Finding Documentation

Use grep to search across all docs:

```bash
# Search all documentation
grep -r "email confirmation" docs/

# Search specific category
grep -r "Docker" docs/deployment/

# List all fix documents
ls docs/fixes/
```

---

## ✨ Most Important Documents

### For Deployment
1. `deployment/GITHUB_SECRETS_CHECKLIST.md`
2. `deployment/HETZNER_DEPLOYMENT_STEPS.md`
3. `deployment/DOCKER_SECURITY_BEST_PRACTICES.md`

### For Development
1. `guides/SUPABASE_SETUP_GUIDE.md`
2. `guides/BEST_PRACTICE_EMAIL_SETUP.md`
3. `guides/AUTH_HOOKS_SUMMARY.md`

### For Troubleshooting
1. `fixes/FIX_LOGIN_AFTER_EMAIL_CONFIRMATION.md`
2. `fixes/TROUBLESHOOT_EMAIL_CONFIRMATION.md`
3. `fixes/BUILD_FIXES_SUMMARY.md`

---

Last updated: October 17, 2025

