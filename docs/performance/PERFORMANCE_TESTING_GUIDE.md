# Performance Testing Guide

This guide outlines performance benchmarks, test scenarios, and acceptance criteria for the application.

## Target Performance Metrics

### Core Web Vitals
- **First Contentful Paint (FCP)**: <1.5s
- **Largest Contentful Paint (LCP)**: <2.5s
- **Time to Interactive (TTI)**: <3s
- **Cumulative Layout Shift (CLS)**: <0.1
- **First Input Delay (FID)**: <100ms
- **Total Blocking Time (TBT)**: <300ms

### Application-Specific Metrics
- **Search Results Load**: <500ms (cached), <1s (fresh)
- **Offers Page Load**: <500ms
- **Provider Detail Load**: <400ms (cached), <800ms (fresh)
- **Bundle Size**: <400KB (first load JS)
- **Image Load Time**: <1s (above fold)

## Test Scenarios

### 1. Load Testing

#### Test with Large Datasets
```bash
# Test with 100+ providers
# Test with 500+ offers
# Test with multiple categories
```

**Acceptance Criteria**:
- No loading states >2 seconds for cached data
- Smooth scrolling with 100+ items
- No layout shifts during loading
- All images load progressively

### 2. Network Conditions Testing

#### Test on Different Network Speeds
- **3G**: Test on throttled 3G connection
- **4G**: Test on standard 4G connection
- **WiFi**: Test on fast WiFi connection

**Tools**:
- Chrome DevTools Network Throttling
- Lighthouse Network Throttling
- WebPageTest

**Acceptance Criteria**:
- App remains functional on 3G
- Progressive loading works correctly
- Images load with appropriate quality for connection speed

### 3. Device Testing

#### Test on Different Devices
- **Low-end devices**: Test on devices with limited CPU/RAM
- **Mid-range devices**: Test on average devices
- **High-end devices**: Test on flagship devices

**Acceptance Criteria**:
- Smooth scrolling on low-end devices
- No janky animations
- Responsive interactions

### 4. Browser Testing

#### Test on Different Browsers
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

**Acceptance Criteria**:
- Consistent performance across browsers
- No browser-specific performance issues

## Performance Testing Tools

### 1. Lighthouse
```bash
# Run Lighthouse audit
npm run lighthouse

# Or use Chrome DevTools
# Open DevTools > Lighthouse > Run audit
```

**Metrics to Check**:
- Performance score >90
- All Core Web Vitals in green
- No accessibility issues
- Best practices score >90

### 2. WebPageTest
- Test URL: https://www.webpagetest.org/
- Test from multiple locations
- Test on different connection speeds

### 3. Chrome DevTools Performance Tab
- Record performance profile
- Check for long tasks
- Identify performance bottlenecks
- Check memory usage

### 4. React DevTools Profiler
- Profile component renders
- Identify unnecessary re-renders
- Check component mount times

## Test Scenarios Checklist

### Initial Load
- [ ] First Contentful Paint <1.5s
- [ ] Time to Interactive <3s
- [ ] No layout shifts
- [ ] Images load progressively
- [ ] Bundle size <400KB

### Search Performance
- [ ] Search results load <500ms (cached)
- [ ] Search results load <1s (fresh)
- [ ] No N+1 query problems
- [ ] Smooth infinite scroll
- [ ] Prefetching works on hover

### Navigation Performance
- [ ] Page transitions <200ms
- [ ] Prefetched pages load instantly
- [ ] No loading spinners for cached data
- [ ] Smooth route transitions

### Image Performance
- [ ] Images use appropriate formats (AVIF/WebP)
- [ ] Lazy loading works correctly
- [ ] Priority images load first
- [ ] No layout shifts from images

### Caching Performance
- [ ] React Query cache works correctly
- [ ] Service Worker cache works correctly
- [ ] CDN cache works correctly
- [ ] Cache invalidation works correctly

## Performance Regression Testing

### Before Deployment
1. Run Lighthouse audit
2. Check bundle size
3. Test on slow network
4. Test on low-end device
5. Check for memory leaks

### After Deployment
1. Monitor Core Web Vitals
2. Check error rates
3. Monitor API response times
4. Check database query performance

## Performance Monitoring

### Production Monitoring
- Set up Real User Monitoring (RUM)
- Monitor Core Web Vitals in production
- Track API response times
- Monitor error rates

### Alerts
- Alert if LCP >2.5s
- Alert if TTI >3s
- Alert if error rate >1%
- Alert if API response time >1s

## Performance Optimization Checklist

### Completed Optimizations
- ✅ Fixed N+1 query problems
- ✅ Added pagination to offers page
- ✅ Enhanced skeleton screens with shimmer
- ✅ Lazy loaded heavy components (modals)
- ✅ Implemented prefetching on hover
- ✅ Added rate limiting
- ✅ Optimized re-renders with React.memo
- ✅ Added prefetching for likely next pages

### Future Optimizations
- [ ] Implement request deduplication
- [ ] Add optimistic updates
- [ ] Progressive loading for large lists
- [ ] Service Worker improvements
- [ ] Database query optimization
- [ ] CDN optimization

## Running Performance Tests

### Local Testing
```bash
# Build for production
npm run build

# Start production server
npm start

# Run Lighthouse
npm run lighthouse

# Or use Chrome DevTools
# Open DevTools > Lighthouse > Run audit
```

### CI/CD Testing
- Add Lighthouse CI to GitHub Actions
- Run performance tests on every PR
- Fail PR if performance regresses

## Performance Budget

### Bundle Size Budget
- First Load JS: <400KB
- Total JS: <1MB
- Images: Optimize all images
- Fonts: Use system fonts where possible

### Performance Budget
- FCP: <1.5s
- LCP: <2.5s
- TTI: <3s
- CLS: <0.1

## Notes

- All performance tests should be run in production mode
- Development mode is intentionally slower
- Always test with realistic data volumes
- Monitor performance in production continuously

