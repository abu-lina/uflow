# 🚀 GitHub Actions Workflows

This repository uses a **best-practice, two-tier workflow architecture** designed for optimal CI/CD performance and quality assurance.

## 📋 Workflow Overview

### **1. Main CI Pipeline** (`ci.yml`)
**Purpose**: Fast, essential checks that run on every push/PR
**Trigger**: Push to any branch, PR to main/develop
**Frequency**: Every code change

**What it does**:
- ✅ **Quality Checks** (8 min): ESLint, TypeScript, dependency check
- ✅ **Tests** (12 min): Unit tests with coverage
- ✅ **Build & Test** (15 min): Build app, test critical endpoints
- ✅ **Security Basic** (8 min): npm audit for moderate+ vulnerabilities
- ✅ **Status Report**: Comprehensive summary of all checks

**Total CI Time**: ~43 minutes (parallel execution)

### **2. Weekly Quality Gates** (`weekly-quality-gates.yml`)
**Purpose**: Comprehensive quality monitoring and regression prevention
**Trigger**: Weekly schedule + manual + main branch changes
**Frequency**: Weekly (Sundays 2 AM UTC)

**What it does**:
- 🔍 **Performance Monitoring** (25 min): Lighthouse CI for performance, accessibility, SEO
- 🔒 **Security Scanning** (20 min): npm audit, Snyk, code security analysis
- 🧪 **Regression Tests** (20 min): Critical user journey testing
- 📊 **Quality Summary**: Weekly quality report

**Total Quality Gates Time**: ~65 minutes (parallel execution)

## 🎯 Best Practices Implemented

### **Fast Feedback Loop**
- **Essential checks run first** (quality, tests)
- **Parallel job execution** where possible
- **Optimized timeouts** for each job type
- **Early failure detection** prevents wasted resources

### **Quality Gates Strategy**
- **Daily CI** catches immediate issues
- **Weekly deep scans** prevent quality degradation
- **Performance monitoring** prevents regressions
- **Security scanning** maintains security standards

### **Resource Optimization**
- **No duplicate builds** between workflows
- **Efficient caching** with npm cache
- **Smart job dependencies** prevent unnecessary runs
- **Artifact retention** for 30 days

## 🚦 Workflow Triggers

### **Main CI Pipeline**
```yaml
on:
  push:
    branches: [main, develop, 'feat/*', 'fix/*']
  pull_request:
    branches: [main, develop]
  workflow_dispatch: # Manual trigger
```

### **Weekly Quality Gates**
```yaml
on:
  schedule:
    - cron: '0 2 * * 0'  # Sundays 2 AM UTC
  workflow_dispatch: # Manual trigger
  push:
    branches: [main]
    paths: ['src/**', 'package.json', 'package-lock.json']
```

## 🔧 Required Secrets

### **Essential (for CI)**
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### **Optional (for enhanced security)**
```bash
CODECOV_TOKEN=your_codecov_token
SNYK_TOKEN=your_snyk_token
```

#### **Setting up Snyk Token**
1. Sign up at [snyk.io](https://snyk.io)
2. Go to Account Settings → API Token
3. Generate a new token
4. Add it as `SNYK_TOKEN` in GitHub repository secrets
5. **Note**: Without this token, Snyk scans will be skipped (workflow continues)

## 📊 Monitoring & Reports

### **CI Pipeline Reports**
- **GitHub Step Summary**: Real-time status updates
- **Artifacts**: Bundle analysis, test coverage
- **Job Dependencies**: Clear success/failure chain

### **Quality Gates Reports**
- **Lighthouse CI**: Performance, accessibility, SEO scores
- **Security Reports**: Vulnerability analysis, code security
- **Regression Reports**: Critical path test results

## 🚨 Troubleshooting

### **Common Issues**

#### **Build Failures**
```bash
# Check environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY

# Verify build locally
npm run build
```

#### **Test Failures**
```bash
# Run tests locally
npm run test

# Check test coverage
npm run test:coverage
```

#### **Linting Issues**
```bash
# Fix auto-fixable issues
npm run lint:fix

# Check specific files
npx eslint src/components/MyComponent.tsx
```

### **Workflow Debugging**
1. **Check job dependencies** in workflow files
2. **Verify secret values** are set correctly
3. **Review timeout settings** for long-running jobs
4. **Check artifact uploads** for reports

## 🔄 Manual Execution

### **Run Main CI**
```bash
gh workflow run "Main CI Pipeline"
```

### **Run Quality Gates**
```bash
gh workflow run "Weekly Quality Gates"
```

### **Re-run Failed Jobs**
- Use GitHub UI to re-run specific failed jobs
- Avoid re-running entire workflows unless necessary

## 📈 Performance Metrics

### **Target Times**
- **Quality Checks**: < 8 minutes
- **Tests**: < 12 minutes  
- **Build & Test**: < 15 minutes
- **Security Basic**: < 8 minutes
- **Total CI**: < 45 minutes

### **Quality Gates Targets**
- **Performance**: < 25 minutes
- **Security**: < 20 minutes
- **Regression**: < 20 minutes
- **Total Quality**: < 65 minutes

## 🎉 Success Indicators

### **CI Pipeline Success**
- ✅ All quality checks pass
- ✅ Tests pass with coverage
- ✅ Build succeeds
- ✅ Critical endpoints accessible
- ✅ No security vulnerabilities

### **Quality Gates Success**
- ✅ Performance scores > 0.7
- ✅ Accessibility scores > 0.9
- ✅ No high/critical security issues
- ✅ All critical user journeys work
- ✅ No regressions detected

## 🔮 Future Enhancements

### **Potential Additions**
- **Visual regression testing** with Playwright
- **Bundle size monitoring** with size-limit
- **Performance budgets** enforcement
- **Automated dependency updates** with Dependabot
- **Deployment automation** to staging/production

### **Optimization Opportunities**
- **Parallel job execution** improvements
- **Caching strategy** enhancements
- **Test parallelization** for faster feedback
- **Conditional job execution** based on changes

---

**💡 Pro Tip**: Use the GitHub Actions UI to monitor workflow performance and identify bottlenecks. The weekly quality gates provide valuable insights into long-term quality trends.
