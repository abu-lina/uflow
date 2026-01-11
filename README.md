# UFlow - Community Services Platform

A Next.js application for connecting community service providers with users.

## 🚀 Deployment

This application is deployed on **Hetzner Cloud** with automatic deployment via GitHub Actions.

### URLs
- **Production:** https://ummahflow.com
- **UAT:** https://uat.ummahflow.com

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Deployment
- **Production (Automatic):** Push to `main` branch triggers deployment with health checks
- **Production (Manual):** Run `./deploy-with-monitoring.sh` for manual deployment with monitoring
- **UAT:** See [UAT Deployment Guide](docs/deployment/UAT_DEPLOYMENT.md) for UAT setup
- **Health Checks:** 
  - Production: https://ummahflow.com/api/health
  - UAT: https://uat.ummahflow.com/api/health
- **Monitoring:** Run `./monitor-app.sh` to check app status

### CI/CD Pipeline
- **CI:** Runs on PRs and feature branches (lint, test, build, security)
- **Deploy:** Automated deployment to Hetzner on main branch
- **Quality Gates:** Weekly deep analysis (performance, security, dependencies)
- **Documentation:** See [WORKFLOWS.md](WORKFLOWS.md) for detailed information

## 🛠️ Tech Stack
- **Frontend:** Next.js 15, TypeScript, Tailwind CSS
- **Backend:** Supabase (Auth, Database, Storage, Functions)
- **Database:** PostgreSQL (Supabase) with full-text search (tsvector)
- **Search:** Postgres native full-text search with GIN indexes
- **Hosting:** Hetzner Cloud (EU-based, cost-effective)
- **Deployment:** GitHub Actions + Docker
- **CDN/Security:** Cloudflare
- **Email:** Resend

### Stack Philosophy
**"Start with Postgres. It can probably do more than you think."**

We follow a Postgres-first approach, using native features (full-text search, materialized views) before adding external services. This keeps the stack simple, cost-effective, and maintainable. See [Architecture Overview](docs/architecture/ARCHITECTURE_OVERVIEW.md) for details.

## 📁 Project Structure
- `src/app/` - Next.js App Router pages
- `src/components/` - React components
- `src/lib/` - Utilities and configurations
- `src/services/` - API services
- `src/types/` - TypeScript type definitions
  - `docs/` - All project documentation (see [docs/README.md](docs/README.md))
  - `docs/deployment/` - Deployment guides and procedures
  - `docs/troubleshooting/` - Troubleshooting guides and diagnostics
  - `docs/performance/` - Performance analysis and testing
  - `docs/action-items/` - Action items and quick fixes
  - `docs/archive/` - Archived starter template and reference material

## 🔧 Environment Variables
See `.env.local` for required environment variables.

## 📝 License
MIT
