# Snyk PR Review Template

**PR Number**: #____  
**PR Title**: ________________________________  
**Branch**: ________________________________  
**Reviewer**: ________________________________  
**Date**: ________________________________  

---

## PR Metadata

- **Snyk PR**: [ ] Yes [ ] No
- **Branch Pattern**: [ ] `snyk-fix-*` [ ] Other: _______________
- **Files Changed**: 
  - [ ] `package.json` only
  - [ ] `package-lock.json` only
  - [ ] Both `package.json` and `package-lock.json`
  - [ ] Other files (specify): _______________

---

## Vulnerability Information

- **CVE ID**: ________________________________
- **Severity**: [ ] Critical [ ] High [ ] Medium [ ] Low
- **CVSS Score**: ________________________________
- **Package(s) Affected**: ________________________________
- **Version Update Type**: [ ] Patch [ ] Minor [ ] Major
- **Previous Version**: ________________________________
- **New Version**: ________________________________

---

## Expert Reviews

### Architecture Expert Review

**Reviewer**: ________________________________

#### System Design Impact
- [ ] Only dependency files modified
- [ ] No source code files changed
- [ ] No configuration files modified
- [ ] Folder structure unchanged

#### Deployment Considerations
- [ ] Hetzner deployment compatibility maintained
- [ ] Docker build process unaffected
- [ ] Environment variables unchanged
- [ ] No new deployment requirements

#### Next.js Compatibility
- [ ] Next.js version compatibility maintained
- [ ] App Router patterns unaffected
- [ ] Server/client component separation maintained
- [ ] API routes remain functional

#### Supabase Compatibility
- [ ] Supabase client libraries compatible
- [ ] Authentication flow unaffected
- [ ] Database client compatibility maintained
- [ ] RLS policies unaffected

#### Version Compatibility
- [ ] Node.js version requirement met (>=18.0.0)
- [ ] npm version requirement met (>=9.0.0)
- [ ] React version compatibility (18.3.1 pinned)

**Notes**:  
________________________________  
________________________________  
________________________________  

**Status**: [ ] ✅ Approved [ ] ⚠️ Concerns [ ] ❌ Rejected

---

### Backend Expert Review

**Reviewer**: ________________________________

#### API Compatibility
- [ ] API route handlers remain functional
- [ ] Request/response formats unchanged
- [ ] Error handling patterns maintained
- [ ] Middleware compatibility verified

#### Database Impact
- [ ] Supabase client library updates compatible
- [ ] Query performance unaffected
- [ ] Database connection handling unchanged
- [ ] Migration compatibility maintained

#### Service Layer
- [ ] Service layer dependencies compatible
- [ ] Business logic unaffected
- [ ] Data transformation functions work
- [ ] External API clients compatible

#### Performance Considerations
- [ ] No performance degradation expected
- [ ] Query optimization maintained
- [ ] Caching strategies unaffected
- [ ] Bundle size impact assessed

**Notes**:  
________________________________  
________________________________  
________________________________  

**Status**: [ ] ✅ Approved [ ] ⚠️ Concerns [ ] ❌ Rejected

---

### Security Expert Review

**Reviewer**: ________________________________

#### Vulnerability Assessment
- [ ] CVE ID documented in PR description
- [ ] Severity assessed (High/Critical)
- [ ] CVSS score reviewed
- [ ] Exploitability checked

#### Fix Appropriateness
- [ ] Update version addresses the CVE
- [ ] Fix is the recommended solution
- [ ] No workarounds needed
- [ ] Changelog reviewed for security notes

#### Breaking Changes Risk
- [ ] No new security vulnerabilities introduced
- [ ] Authentication mechanisms unaffected
- [ ] Authorization checks remain intact
- [ ] Input validation libraries compatible

#### Authentication/Authorization
- [ ] Auth library updates are safe
- [ ] Session management unaffected
- [ ] Token handling unchanged
- [ ] Role-based access control maintained

#### Input Validation
- [ ] Validation library updates compatible
- [ ] XSS prevention maintained
- [ ] SQL injection prevention intact
- [ ] CSRF protection unaffected

**Notes**:  
________________________________  
________________________________  
________________________________  

**Status**: [ ] ✅ Approved [ ] ⚠️ Concerns [ ] ❌ Rejected

---

### Compliance Expert Review

**Reviewer**: ________________________________

#### Data Protection
- [ ] Privacy-related library updates reviewed
- [ ] Data encryption mechanisms unaffected
- [ ] PII handling unchanged
- [ ] Data retention policies maintained

#### GDPR Impact
- [ ] GDPR compliance unaffected
- [ ] User rights implementation intact
- [ ] Data portability features work
- [ ] Consent mechanisms functional

#### Legal Compliance
- [ ] Compliance library updates safe
- [ ] Terms of Service compatibility
- [ ] Privacy Policy requirements met
- [ ] Cookie consent mechanisms work

**Notes**:  
________________________________  
________________________________  
________________________________  

**Status**: [ ] ✅ Approved [ ] ⚠️ Concerns [ ] ❌ Rejected

---

### Frontend Expert Review

**Reviewer**: ________________________________

#### Component Compatibility
- [ ] React components remain functional
- [ ] Component props unchanged
- [ ] Hooks compatibility maintained
- [ ] Context providers work

#### TypeScript Compatibility
- [ ] Type definitions updated if needed
- [ ] No new TypeScript errors
- [ ] Type safety maintained
- [ ] Generated types compatible

#### Bundle Size
- [ ] Bundle size impact assessed
- [ ] No significant size increase
- [ ] Code splitting unaffected
- [ ] Tree shaking works

#### Performance
- [ ] Render performance maintained
- [ ] Client-side caching unaffected
- [ ] React Query compatibility
- [ ] Image optimization works

**Notes**:  
________________________________  
________________________________  
________________________________  

**Status**: [ ] ✅ Approved [ ] ⚠️ Concerns [ ] ❌ Rejected

---

### UX/UI Expert Review

**Reviewer**: ________________________________

#### Design System
- [ ] UI library updates compatible
- [ ] Design tokens unchanged
- [ ] Component variants maintained
- [ ] Styling compatibility verified

#### Accessibility
- [ ] Accessibility library updates safe
- [ ] ARIA labels functional
- [ ] Keyboard navigation works
- [ ] Screen reader compatibility maintained

#### Responsive Design
- [ ] Layout library updates compatible
- [ ] Breakpoints unchanged
- [ ] Mobile responsiveness maintained
- [ ] Tailwind CSS compatibility verified

**Notes**:  
________________________________  
________________________________  
________________________________  

**Status**: [ ] ✅ Approved [ ] ⚠️ Concerns [ ] ❌ Rejected

---

## Automated Verification Results

### CI/CD Status
- [ ] All CI checks passing
- [ ] Build successful
- [ ] Tests passing
- [ ] Lint check passed
- [ ] Type check passed

### Local Verification
- [ ] `npm ci` installs successfully
- [ ] `npm run build` completes without errors
- [ ] `npm run test` passes all tests
- [ ] `npm run lint` shows no errors
- [ ] `npm run type-check` passes
- [ ] Application starts successfully (`npm run dev`)

### Verification Script Output
```bash
# Run: npm run verify:snyk-pr
# Output:
________________________________
________________________________
________________________________
```

---

## Risk Assessment Matrix

| Factor | Assessment | Notes |
|--------|------------|-------|
| **Version Type** | [ ] Patch [ ] Minor [ ] Major | |
| **Package Type** | [ ] Dev dependency [ ] Utility library [ ] Core framework | |
| **Breaking Changes** | [ ] None [ ] Possible [ ] Confirmed | |
| **Test Coverage** | [ ] High [ ] Medium [ ] Low | |
| **Documentation** | [ ] Complete [ ] Partial [ ] Missing | |
| **Overall Risk** | [ ] Low [ ] Medium [ ] High | |

---

## Testing Checklist

### Critical User Flows
- [ ] Authentication flow works
- [ ] Data fetching works
- [ ] Form submissions work
- [ ] API calls work
- [ ] Database queries work
- [ ] File uploads work (if applicable)

### Browser Testing
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browsers

### Performance Testing
- [ ] Page load times acceptable
- [ ] No memory leaks
- [ ] Bundle size within limits
- [ ] API response times acceptable

---

## Approval Decision

### Approval Criteria Checklist
- [ ] Only `package.json` and `package-lock.json` modified
- [ ] High or Critical severity vulnerability
- [ ] Patch or minor version update
- [ ] All CI checks passing
- [ ] Build succeeds
- [ ] Tests pass
- [ ] No breaking changes identified
- [ ] Expert reviews completed (minimum: Security + Architecture)

### Decision
- [ ] ✅ **APPROVED** - Safe to merge
- [ ] ⚠️ **CONDITIONAL APPROVAL** - Merge with monitoring
- [ ] ❌ **REJECTED** - Do not merge

### Conditions/Concerns
________________________________  
________________________________  
________________________________  

### Reviewer Sign-off
**Primary Reviewer**: ________________________________  
**Date**: ________________________________  
**Signature**: ________________________________  

---

## Post-Merge Monitoring Plan

- [ ] Monitor CI/CD pipeline
- [ ] Check application logs
- [ ] Verify no runtime errors
- [ ] Monitor error tracking
- [ ] Check performance metrics
- [ ] Monitor for 24-48 hours

### Rollback Plan
If issues detected:
1. Revert commit: `git revert <merge-commit-hash>`
2. Assess root cause
3. Create new PR with corrected approach
4. Document lessons learned

---

## Additional Notes

________________________________  
________________________________  
________________________________  
________________________________  

---

**Template Version**: 1.0  
**Last Updated**: 2025-01-27  
**Reference**: [Snyk PR Review Guide](../guides/SNYK_PR_REVIEW.md)
