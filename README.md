# UFlow - Community Services Platform

A Next.js application for connecting community service providers with users.

## 🚀 Deployment

This application is deployed on **Hetzner Cloud** with automatic deployment via GitHub Actions.

### Production URL
- **Live App:** https://ummahflow.com

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Deployment
- **Automatic:** Push to `main` branch triggers deployment with health checks
- **Manual:** Run `./deploy-with-monitoring.sh` for manual deployment with monitoring
- **Health Check:** https://ummahflow.com/api/health
- **Monitoring:** Run `./monitor-app.sh` to check app status

### CI/CD Pipeline
- **CI:** Runs on PRs and feature branches (lint, test, build, security)
- **Deploy:** Automated deployment to Hetzner on main branch
- **Quality Gates:** Weekly deep analysis (performance, security, dependencies)
- **Documentation:** See [WORKFLOWS.md](WORKFLOWS.md) for detailed information

## 🛠️ Tech Stack
- **Frontend:** Next.js 15, TypeScript, Tailwind CSS
- **Backend:** Supabase
- **Hosting:** Hetzner Cloud
- **Deployment:** GitHub Actions + Docker
- **Database:** PostgreSQL (Supabase)

## 📁 Project Structure
- `src/app/` - Next.js App Router pages
- `src/components/` - React components
- `src/lib/` - Utilities and configurations
- `src/services/` - API services
- `src/types/` - TypeScript type definitions

## 🔧 Environment Variables
See `.env.local` for required environment variables.

## 📝 License
MIT
