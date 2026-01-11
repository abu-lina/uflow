# Documentation Index

This directory contains all project documentation, organized by category following best practices.

## 📁 Directory Structure

```
docs/
├── architecture/      # System architecture, design decisions, database schema
├── design/            # UI/UX design system, components, styling
├── features/          # Feature documentation and specifications
├── implementation/   # Implementation details and technical guides
├── deployment/       # Deployment guides (Hetzner, GitHub Actions, Docker)
├── guides/           # Setup guides, configuration, and best practices
├── fixes/            # Bug fix documentation and solutions
├── troubleshooting/  # Troubleshooting guides, diagnostics, and status reports
├── action-items/     # Action items, quick fixes, and urgent tasks
├── reviews/          # Code reviews, security reviews, architecture reviews
├── performance/      # Performance analysis, optimization, and testing
├── summaries/        # Project summaries, status reports, progress tracking
├── archive/          # Historical and archived documentation
│   └── nextjs-supabase-starter/ # Original starter template (archived)
├── README.md         # This file
├── INDEX.md          # Quick navigation index
└── USER_GUIDE.md     # Complete user guide for end users
```

---

## 🏗️ Architecture

**Location:** `docs/architecture/`

System architecture, design decisions, and database documentation:

- **ARCHITECTURE_OVERVIEW.md** - Complete system architecture overview
- **ARCHITECTURE_RECOMMENDATION.md** - Architecture recommendations
- **ARCHITECTURE_VISUAL_SUMMARY.md** - Visual architecture diagrams
- **DATABASE_DRIVEN_SUGGESTIONS.md** - Database-driven feature suggestions
- **SCHEMA_CONSOLIDATION_SUMMARY.md** - Database schema documentation

---

## 🎨 Design

**Location:** `docs/design/`

UI/UX design system, components, and styling guidelines:

- **COLOR_*.md** - Color palette, state mapping, structure
- **BUTTON_*.md** - Button component design and refactoring
- **ICON_*.md** - Icon standardization and usage standards
- **COMPONENT_NAMING_COMPARISON.md** - Component naming conventions
- **SIGNUP_FLOW_DESIGN.md** - Signup flow design documentation
- **TAILWIND_CONFIG_OPTIMIZATION.md** - Tailwind configuration
- **previews/** - Design preview HTML files

---

## ✨ Features

**Location:** `docs/features/`

Feature documentation and specifications:

- **QUICK_CREATE_*.md** - Quick create feature documentation
- **OFFERS_NEEDS_MATCHING_FEATURE.md** - Matching feature specification
- **UNIFIED_CREATION_IMPLEMENTATION.md** - Unified creation flow
- **CATEGORIZATION_MAPPING.md** - Category mapping documentation

---

## 🔧 Implementation

**Location:** `docs/implementation/`

Implementation details and technical guides:

- **I18N_IMPLEMENTATION.md** - Internationalization implementation
- **i18n-best-practices.md** - i18n best practices
- **AUTOMATIC_LANGUAGE_DETECTION.md** - Language detection implementation
- **LOADING_STRATEGY_ANALYSIS.md** - Loading strategy analysis

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

## 📚 Guides

**Location:** `docs/guides/`

Setup guides, configuration, and best practices:

### Security Guides
- **SECURITY_OVERVIEW.md** - Complete security overview (Overall Grade: A)
- **CSP_BEST_PRACTICES.md** - Content Security Policy best practices
- **SIGNUP_SECURITY_IMPLEMENTATION.md** - Bot protection and signup security
- **SIGNUP_SECURITY_BEST_PRACTICES_REVIEW.md** - Security assessment

### Setup and Configuration Guides
- **SUPABASE_SETUP_GUIDE.md** - Supabase configuration
- **UAT_SETUP_GUIDE.md** - UAT environment setup
- **ENVIRONMENT_SETUP_QUICK_START.md** - Quick environment setup
- **API_KEYS_SETUP.md** - API keys configuration
- **EMAIL_SETUP.md** - Email service setup
- **BEST_PRACTICE_EMAIL_SETUP.md** - Email best practices
- **AUTH_HOOKS_SUMMARY.md** - Authentication hooks
- **SETUP_GITHUB_AUTH_HETZNER.md** - GitHub authentication for deployment

---

## 🔧 Fixes & Troubleshooting

**Location:** `docs/fixes/`, `docs/troubleshooting/`, and `docs/action-items/`

Bug fixes, solutions, troubleshooting guides, and action items:

### Fixes
- **FIX_LOGIN_AFTER_EMAIL_CONFIRMATION.md** - Email confirmation login issue
- **FIX_406_EMAIL_CONFIRMATION.md** - 406 error fix
- **BUILD_FIXES_SUMMARY.md** - Build linting error fixes
- **FIXES_SUMMARY_SECURITY.md** - Security fixes summary

### Troubleshooting
- **CONNECTIVITY_*.md** - Connectivity status and troubleshooting
- **MIME_*.md** - MIME type diagnostics and resolutions
- **SUPABASE_FIX_*.md** - Supabase-related fixes and diagnostics
- **HETZNER_*.md** - Hetzner server information and verification
- **UAT_*.md** - UAT environment troubleshooting

### Action Items
- **ACTION_ITEMS.md** - Current action items and tasks
- **PURGE_CLOUDFLARE_NOW.md** - Cloudflare cache purging
- **CLEAR_BROWSER_CACHE.md** - Browser cache clearing instructions

---

## 📋 Reviews

**Location:** `docs/reviews/`

Code reviews, security reviews, and architecture reviews:

- **BACKEND_REVIEW*.md** - Backend code reviews
- **FRONTEND_REVIEW*.md** - Frontend code reviews
- **UX_UI_REVIEW*.md** - UX/UI design reviews
- **SECURITY_REVIEW*.md** - Security reviews
- **BEST_PRACTICES_REVIEW.md** - Best practices review
- **CODE_REVIEW_CLIENT_PROVIDERS.md** - Client providers review
- **COMPLIANCE_REVIEW.md** - Compliance review
- **REVIEW_SUMMARY.md** - Review summaries

---

## ⚡ Performance

**Location:** `docs/performance/`

Performance analysis, optimization, and testing:

- **PERFORMANCE_ISSUES_ANALYSIS.md** - Performance issues analysis
- **PERFORMANCE_FIX_*.md** - Performance fix documentation
- **PERFORMANCE_TESTING.md** - Performance testing guide
- **PERFORMANCE_OPTIMIZATION_SUMMARY.md** - Optimization summary
- **PERFORMANCE_TEST_NEXT_STEPS.md** - Next steps for performance testing
- **PERFORMANCE_TEST_SETUP_INSTRUCTIONS.md** - Performance test setup
- **TEST_LOCAL_BUILD.md** - Local build testing
- **IMPLEMENTATION_SUMMARY.md** - Performance implementation summary

---

## 📊 Summaries

**Location:** `docs/summaries/`

Project summaries, status reports, and progress tracking:

- **CLEANUP_SUMMARY.md** - Project cleanup summary
- **SECURITY_SUMMARY.md** - Security summary
- **ENVIRONMENT_STATUS.md** - Environment status
- **REFACTOR_PROGRESS.md** - Refactoring progress
- **epic-descriptions.md** - Epic descriptions
- **notion-prioritization.md** - Notion prioritization

---

## 📦 Archive

**Location:** `docs/archive/`

Historical documentation, old implementations, and archived reference material:

- **nextjs-supabase-starter/** - Original Next.js + Supabase starter template (archived)
- Feature documentation
- Refactoring summaries
- Old implementation guides
- Component documentation
- Migration guides

---

## 🗃️ Related Resources

**Location:** `../sql/` and `../scripts/`

### SQL Files
```
sql/
├── migrations/      # Database migrations
├── queries/        # Utility queries
└── debug/          # Debugging queries
```

### Scripts
```
scripts/
├── deploy-*.sh     # Deployment scripts
├── setup-*.sh      # Setup scripts
└── verify-*.sh     # Verification scripts
```

---

## 🎯 Quick Start

### New Developer Setup
1. Read `guides/ENVIRONMENT_SETUP_QUICK_START.md`
2. Review `guides/SUPABASE_SETUP_GUIDE.md`
3. Check `deployment/GITHUB_SECRETS_CHECKLIST.md` for required secrets
4. Review `guides/BEST_PRACTICE_*.md` files

### Understanding the System
1. Start with `architecture/ARCHITECTURE_OVERVIEW.md`
2. Review `design/` for UI/UX guidelines
3. Check `features/` for feature specifications

### Debugging Issues
1. Check `fixes/` for known issues
2. Use SQL queries in `../sql/debug/` to investigate
3. Refer to `troubleshooting/` guides

### Deploying
1. Follow `deployment/HETZNER_DEPLOYMENT_STEPS.md`
2. Ensure GitHub secrets are configured
3. Push to main branch for auto-deployment

---

## 📝 Contributing

When adding new documentation:

- **Architecture docs** → `docs/architecture/`
- **Design docs** → `docs/design/`
- **Feature docs** → `docs/features/`
- **Implementation docs** → `docs/implementation/`
- **Deployment docs** → `docs/deployment/`
- **Setup guides** → `docs/guides/`
- **Bug fixes** → `docs/fixes/`
- **Troubleshooting/Diagnostics** → `docs/troubleshooting/`
- **Action items/Quick fixes** → `docs/action-items/`
- **Reviews** → `docs/reviews/`
- **Performance** → `docs/performance/`
- **Summaries** → `docs/summaries/`
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

### For End Users
1. **USER_GUIDE.md** - Complete guide for using Ummah Flow (seekers and providers)

### For New Developers
1. `guides/ENVIRONMENT_SETUP_QUICK_START.md`
2. `architecture/ARCHITECTURE_OVERVIEW.md`
3. `guides/SUPABASE_SETUP_GUIDE.md`

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
2. `troubleshooting/VAPID_SETUP.md`
3. `fixes/BUILD_FIXES_SUMMARY.md`

---

Last updated: December 2024
