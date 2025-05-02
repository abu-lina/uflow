# Vercel Deployment Checklist

## Pre-deployment Setup

1. **Environment Variables**
   - [ ] Add the following environment variables in Vercel project settings:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `NEXT_PUBLIC_APP_URL`
     - `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`

2. **Supabase Configuration**
   - [ ] Verify Supabase project is set up
   - [ ] Check database migrations are applied
   - [ ] Verify storage buckets are configured
   - [ ] Test authentication flows using Supabase JS client
   - [ ] Ensure no server-side Supabase client usage
   - [ ] Verify all database operations use Supabase JS
   - [ ] Check no auth helper libraries are used

3. **Build Settings**
   - [ ] Node.js version: 18.x or higher
   - [ ] Build command: `next build`
   - [ ] Output directory: `.next`
   - [ ] Install command: `npm install`
   - [ ] Verify no SSR configurations
   - [ ] Check all Supabase operations are client-side

## Deployment Steps

1. **Initial Deployment**
   - [ ] Push code to GitHub
   - [ ] Import project in Vercel
   - [ ] Configure environment variables
   - [ ] Deploy
   - [ ] Verify client-side Supabase initialization

2. **Post-deployment Checks**
   - [ ] Verify domain configuration
   - [ ] Test Supabase JS authentication
   - [ ] Check image optimization
   - [ ] Verify API routes (if any)
   - [ ] Test form submissions
   - [ ] Check PWA functionality
   - [ ] Verify no SSR is used
   - [ ] Test Supabase JS client operations

3. **Performance Optimization**
   - [ ] Enable Vercel Analytics
   - [ ] Configure caching headers
   - [ ] Set up edge functions if needed (client-side only)
   - [ ] Configure automatic deployments

## Monitoring

1. **Logs and Analytics**
   - [ ] Set up Vercel Analytics
   - [ ] Configure error tracking
   - [ ] Monitor performance metrics
   - [ ] Track Supabase JS client errors

2. **Alerts**
   - [ ] Set up deployment notifications
   - [ ] Configure error alerts
   - [ ] Set up performance alerts
   - [ ] Monitor Supabase JS client issues

## Security

1. **SSL/TLS**
   - [ ] Verify SSL certificate
   - [ ] Check security headers
   - [ ] Test CORS configuration
   - [ ] Verify Supabase JS client security

2. **Access Control**
   - [ ] Verify Supabase JS authentication flows
   - [ ] Check role-based access using Supabase JS
   - [ ] Test API security
   - [ ] Ensure no server-side auth checks

## Backup and Recovery

1. **Data Backup**
   - [ ] Set up Supabase backups
   - [ ] Configure database snapshots
   - [ ] Test restore procedures
   - [ ] Verify client-side data handling

2. **Disaster Recovery**
   - [ ] Document rollback procedures
   - [ ] Test backup restoration
   - [ ] Verify data integrity
   - [ ] Check Supabase JS client recovery

## Maintenance

1. **Regular Checks**
   - [ ] Monitor error rates
   - [ ] Check performance metrics
   - [ ] Review security logs
   - [ ] Verify Supabase JS client updates

2. **Updates**
   - [ ] Schedule dependency updates
   - [ ] Plan for breaking changes
   - [ ] Test updates in staging
   - [ ] Verify Supabase JS compatibility 