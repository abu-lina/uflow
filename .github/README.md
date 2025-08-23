# 🧪 GitHub Actions Testing & Regression Detection

This directory contains comprehensive GitHub Actions workflows for testing, regression detection, and quality assurance of the Ummah Flow application.

## 📋 Workflow Overview

### 1. **Comprehensive CI & Regression Testing** (`ci.yml`)
**Triggers:** Push to main/develop/feat/*/fix/*, Pull Requests
**Purpose:** Full CI pipeline with comprehensive testing

**Jobs:**
- **Lint & Type Check**: ESLint, TypeScript validation, dependency analysis
- **Unit & Integration Tests**: Jest tests with coverage reporting
- **Build & Build-time Tests**: Next.js build, bundle analysis, validation
- **E2E Regression Tests**: Critical user journey testing
- **Performance Tests**: Lighthouse CI performance monitoring
- **Security Scan**: npm audit and Snyk security scanning
- **Final Status Check**: Comprehensive test result summary

### 2. **Critical Path Regression Tests** (`regression-tests.yml`)
**Triggers:** Daily at 2 AM UTC, Manual dispatch, Push to main
**Purpose:** Focused regression testing of critical user paths

**Jobs:**
- **Critical User Journey Tests**: Homepage, search, profile, API endpoints
- **Visual Regression Tests**: Screenshot comparison with Playwright
- **Accessibility Tests**: axe-core accessibility compliance
- **Regression Summary**: Comprehensive test result report

### 3. **Performance Monitoring** (`performance-monitoring.yml`)
**Triggers:** Weekly on Sundays at 3 AM UTC, Manual dispatch, Push to main
**Purpose:** Performance regression detection and monitoring

**Jobs:**
- **Lighthouse Performance Tests**: Performance, accessibility, SEO scores
- **Bundle Size Analysis**: JavaScript bundle size monitoring
- **Core Web Vitals**: LCP, FID, CLS performance metrics
- **Performance Summary**: Performance test result report

### 4. **Security Scanning** (`security-scanning.yml`)
**Triggers:** Daily at 4 AM UTC, Manual dispatch, Push to main
**Purpose:** Security vulnerability detection and prevention

**Jobs:**
- **Dependency Security Audit**: npm audit for vulnerabilities
- **Snyk Security Scan**: Third-party security analysis
- **Code Security Analysis**: Security-focused code review
- **Environment Security Check**: Hardcoded secrets detection
- **Build Security Check**: Build output security validation
- **Security Summary**: Security scan result report

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- GitHub repository with Actions enabled
- Required secrets configured (see below)

### Required GitHub Secrets

#### For Supabase Integration (Required):
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

#### For Security Scanning:
```bash
SNYK_TOKEN=your_snyk_token_here
```

#### For Code Coverage (Optional):
```bash
CODECOV_TOKEN=your_codecov_token_here
```

### Manual Workflow Execution
You can manually trigger any workflow from the GitHub Actions tab:
1. Go to **Actions** tab in your repository
2. Select the workflow you want to run
3. Click **Run workflow**
4. Choose branch and click **Run workflow**

## 📊 Test Coverage & Metrics

### What Gets Tested
- ✅ **Code Quality**: ESLint, TypeScript, dependency analysis
- ✅ **Functionality**: Unit tests, integration tests, E2E tests
- ✅ **Performance**: Lighthouse scores, Core Web Vitals, bundle size
- ✅ **Security**: Vulnerability scanning, code security, build security
- ✅ **Accessibility**: WCAG compliance, screen reader compatibility
- ✅ **User Experience**: Critical user journeys, mobile responsiveness

### Performance Thresholds
- **Lighthouse Performance**: ≥ 70 (warning), ≥ 90 (error)
- **Lighthouse Accessibility**: ≥ 90 (error)
- **Lighthouse Best Practices**: ≥ 80 (warning)
- **Lighthouse SEO**: ≥ 80 (warning)
- **Core Web Vitals**:
  - LCP: < 2.5s
  - FID: < 0.1s
  - CLS: < 0.1

## 🔧 Customization

### Adding New Test Paths
To add new critical paths to regression testing:

1. **Edit `regression-tests.yml`**:
```yaml
- name: Test New Feature
  run: |
    echo "Testing new feature..."
    response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/new-feature)
    if [ "$response" = "200" ]; then
      echo "✅ New feature loads successfully"
    else
      echo "❌ New feature failed to load"
      exit 1
    fi
```

2. **Add to visual regression tests**:
```yaml
npx playwright screenshot http://localhost:3000/new-feature screenshots/new-feature.png
```

### Modifying Performance Thresholds
Edit the Lighthouse CI configuration in `performance-monitoring.yml`:

```json
"assertions": {
  "categories:performance": ["warn", {"minScore": 0.8}],
  "categories:accessibility": ["error", {"minScore": 0.95}]
}
```

### Adding New Security Checks
Extend security scanning in `security-scanning.yml`:

```yaml
- name: Custom Security Check
  run: |
    # Add your custom security checks here
    if grep -r "suspicious_pattern" src/; then
      echo "❌ Security issue detected"
      exit 1
    fi
```

## 📈 Monitoring & Alerts

### Daily Reports
- **Regression Tests**: Run daily at 2 AM UTC
- **Security Scans**: Run daily at 4 AM UTC
- **Performance Tests**: Run weekly on Sundays at 3 AM UTC

### Failure Notifications
- All workflows send detailed reports to GitHub Actions
- Failed tests are clearly marked with ❌
- Warnings are marked with ⚠️
- Success indicators use ✅

### Artifacts & Reports
- **Test Coverage**: Uploaded to Codecov (if configured)
- **Performance Reports**: Lighthouse CI reports with temporary storage
- **Security Reports**: Snyk vulnerability reports
- **Visual Regression**: Screenshots stored as artifacts
- **Bundle Analysis**: Bundle size reports

## 🐛 Troubleshooting

### Common Issues

#### Workflow Fails on Dependency Installation
```bash
# Check package-lock.json is committed
git add package-lock.json
git commit -m "Update package-lock.json"
git push
```

#### Workflow Fails Due to Missing Environment Variables
```bash
# Ensure these secrets are set in GitHub repository settings:
# Settings > Secrets and variables > Actions
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Or set them directly in the workflow if not sensitive:
env:
  NEXT_PUBLIC_SUPABASE_URL: "https://your-project.supabase.co"
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "your_anon_key"
```

#### Performance Tests Fail
```bash
# Check if application starts within timeout
# Increase timeout in workflow if needed
timeout-minutes: 30
```

#### Security Scan Fails
```bash
# Run locally to debug
npm audit
npm audit fix
```

#### Visual Regression Tests Fail
```bash
# Check Playwright installation
npx playwright install --with-deps
```

### Debugging Workflows
1. **Check workflow logs** in GitHub Actions
2. **Run tests locally** to reproduce issues
3. **Check environment variables** and secrets
4. **Verify Node.js version** compatibility

## 📚 Best Practices

### For Developers
1. **Run tests locally** before pushing
2. **Keep dependencies updated** for security
3. **Monitor performance metrics** regularly
4. **Address security warnings** promptly

### For DevOps
1. **Monitor workflow success rates**
2. **Set up notifications** for failures
3. **Regularly review** performance trends
4. **Update security tools** and thresholds

### For QA
1. **Review regression test results** daily
2. **Validate critical user journeys** manually
3. **Report visual inconsistencies** found
4. **Test accessibility** on different devices

## 🔄 Continuous Improvement

### Regular Reviews
- **Weekly**: Review performance trends
- **Monthly**: Update security thresholds
- **Quarterly**: Add new test paths
- **Annually**: Evaluate testing strategy

### Metrics to Track
- **Test Coverage**: Aim for >80%
- **Performance Scores**: Maintain >90
- **Security Issues**: Zero critical vulnerabilities
- **Build Time**: Optimize for speed
- **Failure Rate**: <5% of workflow runs

## 📞 Support

For questions or issues with the testing setup:
1. Check this README first
2. Review workflow logs in GitHub Actions
3. Check GitHub Issues for known problems
4. Contact the development team

---

**Last Updated**: August 2025  
**Version**: 1.0.0  
**Maintainer**: Development Team
