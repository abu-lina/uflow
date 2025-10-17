# GitHub Workflows Documentation

This document explains the CI/CD pipeline and quality gates for the UmmahFlow project.

## 📋 **Workflow Overview**

We use three optimized workflows following best practices:

### 1. **CI Pipeline** (`ci.yml`)
**Purpose:** Fast validation on every pull request and feature branch push  
**Triggers:** 
- Pull requests to `main` or `develop`
- Pushes to `develop`, `feat/*`, `fix/*` branches
- Manual dispatch

**What it does:**
- ✅ **Lint & Type Check** (5 mins) - ESLint and TypeScript validation
- ✅ **Tests** (10 mins) - Unit and integration tests with coverage
- ✅ **Build Verification** (10 mins) - Ensures the app builds successfully
- ✅ **Security Audit** (5 mins) - npm audit for high/critical vulnerabilities

**Best Practices Applied:**
- Runs jobs in parallel for speed
- Uses npm cache for faster installs
- Only runs on PRs and feature branches (not on main)
- Fast feedback loop (~10-15 minutes total)

---

### 2. **Deploy to Hetzner** (`deploy-hetzner.yml`)
**Purpose:** Automated deployment to production  
**Triggers:**
- Push to `main` branch
- Manual dispatch

**What it does:**
1. 🔨 **Build Docker image** with Supabase secrets
2. 📦 **Save and transfer** image to Hetzner server
3. 🚀 **Deploy** new container (zero-downtime)
4. 🏥 **Health checks** to verify deployment
5. 🔧 **Update Nginx** configuration
6. ✅ **Verify** live deployment

**Best Practices Applied:**
- Only triggers on main branch (production)
- Comprehensive health checks before completion
- Automatic rollback on failure
- Proper error handling and logging
- Secure secrets management

**Deployment Flow:**
```
Push to main → Build Docker → Transfer to Server → Deploy Container → 
Health Check → Update Nginx → Verify Live → Success!
```

---

### 3. **Weekly Quality Gates** (`weekly-quality-gates.yml`)
**Purpose:** Deep quality analysis and monitoring  
**Triggers:**
- Weekly on Sundays at 2 AM UTC
- Manual dispatch

**What it does:**
- 🚦 **Lighthouse Audit** - Performance, accessibility, SEO, best practices
- 🔒 **Deep Security Scan** - Snyk, code analysis, vulnerability detection
- 📦 **Dependency Analysis** - Outdated packages, unused dependencies
- 📊 **Bundle Size Analysis** - Monitor bundle growth over time

**Best Practices Applied:**
- Runs independently (doesn't block development)
- Comprehensive analysis without slowing down CI
- Generates detailed reports as artifacts
- Monitors trends over time

---

## 🎯 **Why This Structure?**

### **Separation of Concerns**
- **CI:** Fast validation for developers
- **Deploy:** Production deployment only
- **Weekly:** Deep analysis without blocking work

### **No Redundancy**
- Each workflow has a clear, distinct purpose
- No duplicate builds or tests
- Optimized triggers prevent conflicts

### **Speed First**
- CI runs in ~10-15 minutes
- Parallel jobs where possible
- Cached dependencies
- Only essential checks in CI

### **Developer Experience**
- Fast feedback on PRs
- Clear error messages
- Automated deployments
- No manual intervention needed

---

## 📊 **Workflow Comparison**

| Feature | CI Pipeline | Deploy | Weekly Gates |
|---------|------------|--------|--------------|
| **When** | PRs, feature branches | Main branch | Sundays 2 AM |
| **Speed** | ~15 mins | ~8 mins | ~30 mins |
| **Purpose** | Validation | Deployment | Deep analysis |
| **Blocks merge?** | Yes | No | No |
| **Depth** | Essential checks | Health checks | Comprehensive |

---

## 🚀 **How to Use**

### **For Developers:**

1. **Create a feature branch:**
   ```bash
   git checkout -b feat/my-feature
   ```

2. **Make changes and push:**
   ```bash
   git push origin feat/my-feature
   ```
   - ✅ CI pipeline runs automatically

3. **Create a pull request:**
   - CI must pass before merge
   - Review test coverage and build output

4. **Merge to main:**
   - Deployment happens automatically
   - Check GitHub Actions for deployment status
   - Verify at https://ummahflow.com/api/health

### **For Monitoring:**

1. **Check weekly reports:**
   - Review artifacts from Sunday runs
   - Monitor performance trends
   - Address security vulnerabilities

2. **Manual workflow triggers:**
   ```
   GitHub → Actions → Select workflow → Run workflow
   ```

---

## 🔧 **Configuration**

### **Required Secrets**
Set these in GitHub Settings → Secrets and variables → Actions:

| Secret | Description |
|--------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `HETZNER_HOST` | Hetzner server IP |
| `HETZNER_SSH_KEY` | SSH private key for deployment |
| `CODECOV_TOKEN` | (Optional) Codecov token |
| `SNYK_TOKEN` | (Optional) Snyk security token |

### **Workflow Files Location**
```
.github/workflows/
├── ci.yml                      # Main CI pipeline
├── deploy-hetzner.yml          # Production deployment
└── weekly-quality-gates.yml    # Weekly deep analysis
```

---

## 📈 **Metrics & Monitoring**

### **CI Pipeline Metrics:**
- ⏱️ **Avg Duration:** ~15 minutes
- 📊 **Success Rate:** Monitor in GitHub Actions
- 🎯 **Coverage Target:** 80%+

### **Deployment Metrics:**
- ⏱️ **Avg Deploy Time:** ~8 minutes
- 🎯 **Uptime:** 99.9%
- 🏥 **Health Check:** Every deployment

### **Quality Metrics (Weekly):**
- 🚦 **Lighthouse Score:** 70%+ performance, 90%+ accessibility
- 🔒 **Security:** No high/critical vulnerabilities
- 📦 **Bundle Size:** Monitor growth trends

---

## 🐛 **Troubleshooting**

### **CI Pipeline Fails:**
1. Check lint errors: `npm run lint`
2. Check type errors: `npm run type-check`
3. Run tests locally: `npm test`
4. Verify build: `npm run build:local`

### **Deployment Fails:**
1. Check GitHub Actions logs
2. Verify secrets are set correctly
3. SSH to server: `ssh root@<HETZNER_HOST>`
4. Check Docker logs: `docker logs uflow-app`
5. Check Nginx: `nginx -t`

### **Weekly Gates Fail:**
- Review artifacts for detailed reports
- Address security vulnerabilities: `npm audit fix`
- Update dependencies: `npm outdated`
- Optimize bundle size if growing

---

## 🎓 **Best Practices We Follow**

### **✅ Do's:**
- Keep CI fast (<20 mins)
- Run essential checks only
- Use caching for dependencies
- Parallel jobs where possible
- Clear error messages
- Automated deployments
- Health checks before completion

### **❌ Don'ts:**
- Don't run heavy analysis in CI
- Don't duplicate checks across workflows
- Don't block development with slow pipelines
- Don't deploy without health checks
- Don't skip security audits

---

## 🔄 **Maintenance**

### **Monthly:**
- Review workflow execution times
- Update actions to latest versions
- Check for deprecated syntax

### **Quarterly:**
- Review and optimize caching strategy
- Update Node.js version if needed
- Review security scan results

### **When Issues Arise:**
- Check GitHub Actions status page
- Review workflow logs
- Update dependencies if needed

---

## 📚 **Additional Resources**

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)

---

## 🤝 **Contributing**

When modifying workflows:

1. Test locally with [act](https://github.com/nektos/act) if possible
2. Use workflow_dispatch for testing
3. Document changes in this file
4. Monitor first few runs after changes
5. Keep workflows focused and fast

---

**Last Updated:** October 2025  
**Maintained By:** UmmahFlow Development Team

