# Architecture Overview - UFlow Platform

## System Architecture Diagram

```mermaid
flowchart TB
    subgraph "Client Layer"
        User["👤 User / Browser"]
        PWA["📱 PWA\n(Offline Support)"]
    end

    subgraph "CDN & Security Layer"
        Cloudflare["☁️ Cloudflare\n• CDN & Global Distribution\n• DDoS Protection\n• Bot Protection (Turnstile)\n• SSL/TLS Termination at Edge\n• Rate Limiting"]
    end

    subgraph "Hosting Infrastructure"
        Hetzner["🖥️ Hetzner Cloud\n• Ubuntu 22.04 Server\n• Docker Container Runtime\n• SSL Certificates (Let's Encrypt)"]
        Nginx["🌐 Nginx\n• Reverse Proxy\n• SSL/TLS Termination at Server\n• Static File Serving\n• Health Check Proxy\n• Security Headers"]
        Docker["🐳 Docker Container\n• Next.js Standalone Build\n• Node.js 20 Runtime\n• Port 3000 (HTTP)"]
    end

    subgraph "Application Layer"
        NextApp["⚛️ Next.js 15 Application\n• App Router\n• Server Components\n• API Routes\n• Static Generation\n• ISR"]
    end

    subgraph "CI/CD Pipeline"
        GitHub["🔷 GitHub\n• Source Code Repository\n• Secrets Management"]
        Actions["⚙️ GitHub Actions\n• Docker Build\n• Deployment Automation\n• Health Check Verification"]
    end

    subgraph "Backend Services (Supabase)"
        Auth["🔐 Authentication Service\n• Email/Password Auth\n• Session Management\n• JWT Tokens"]
        Database["🗄️ PostgreSQL Database\n• Relational Data\n• Row Level Security\n• Automatic Backups\n• Point-in-Time Recovery"]
        Storage["📦 File Storage\n• Image Uploads\n• Public/Private Buckets"]
        Functions["⚡ Edge Functions\n• Serverless Functions\n• Webhooks"]
        Realtime["📡 Realtime Subscriptions\n• WebSocket Connections\n• Live Updates"]
    end

    subgraph "External Services"
        Resend["📧 Resend\n• Transactional Emails"]
        Maps["🗺️ OpenStreetMap\n• Geocoding Services"]
    end

    subgraph "Monitoring & Observability"
        HealthCheck["🏥 Health Checks\n• /api/health endpoint\n• Deployment verification"]
        Logs["📋 Logging\n• Application logs\n• Nginx access logs"]
        Metrics["📊 Metrics\n• Server resources\n• Application performance"]
    end

    %% User Flow (HTTPS)
    User -->|"HTTPS Request"| Cloudflare
    PWA -->|"HTTPS Request"| Cloudflare
    
    %% CDN & Security Flow
    Cloudflare -->|"HTTPS (Proxied)"| Nginx
    Cloudflare -.->|"Bot Verification"| Cloudflare
    
    %% Infrastructure Flow
    Hetzner -->|"Hosts"| Nginx
    Nginx -->|"HTTP Proxy Pass\n(Port 3000)"| Docker
    Docker -->|"Runs"| NextApp
    
    %% CI/CD Flow
    GitHub -->|"Push to main\nTriggers"| Actions
    Actions -->|"SCP Upload\nSSH Deploy"| Hetzner
    Actions -->|"Health Check"| HealthCheck
    
    %% Application to Backend
    NextApp -->|"API Calls"| Auth
    NextApp -->|"SQL Queries"| Database
    NextApp -->|"File Uploads"| Storage
    NextApp -->|"Invoke"| Functions
    NextApp -->|"WebSocket"| Realtime
    
    %% External Services
    NextApp -->|"Send Emails"| Resend
    NextApp -->|"Geocoding API"| Maps
    
    %% Backend Internal Connections
    Auth -->|"Stores Sessions"| Database
    Functions -->|"Queries"| Database
    Functions -->|"Accesses"| Storage
    Realtime -->|"Subscribes to"| Database
    Storage -.->|"CDN Integration"| Cloudflare
    
    %% Monitoring Connections
    NextApp -->|"Logs"| Logs
    NextApp -->|"Health Status"| HealthCheck
    Nginx -->|"Access Logs"| Logs
    Hetzner -->|"Resource Metrics"| Metrics
    Database -.->|"Backup Status"| Metrics
    
    %% Backup Connections
    Database -.->|"Daily Backups"| Database

    %% Styling
    classDef clientLayer fill:#e1f5ff,stroke:#01579b,stroke-width:2px
    classDef cdnLayer fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef infraLayer fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef appLayer fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    classDef cicdLayer fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    classDef backendLayer fill:#fff9c4,stroke:#f57f17,stroke-width:2px
    classDef externalLayer fill:#f1f8e9,stroke:#33691e,stroke-width:2px
    classDef monitoringLayer fill:#fafafa,stroke:#616161,stroke-width:2px

    class User,PWA clientLayer
    class Cloudflare cdnLayer
    class Hetzner,Nginx,Docker infraLayer
    class NextApp appLayer
    class GitHub,Actions cicdLayer
    class Auth,Database,Storage,Functions,Realtime backendLayer
    class Resend,Maps externalLayer
    class HealthCheck,Logs,Metrics monitoringLayer
```

## Architecture Components

### 1. Client Layer

#### User / Browser
- **Role**: End-user interface
- **Technologies**: Modern browsers (Chrome, Firefox, Safari, Edge)
- **Features**: Responsive design, accessibility support

#### Progressive Web App (PWA)
- **Role**: Offline-capable web application
- **Technologies**: Service Workers, Web App Manifest
- **Features**:
  - Offline functionality
  - Installable on mobile devices
  - Push notifications support
  - Background sync

### 2. CDN & Security Layer

#### Cloudflare
- **Role**: Global CDN, security, and performance optimization
- **Services**:
  - **CDN**: Global content distribution, edge caching
  - **DDoS Protection**: Automatic attack mitigation
  - **Bot Protection**: Cloudflare Turnstile CAPTCHA
  - **SSL/TLS**: SSL termination at edge (HTTPS → HTTPS to origin)
  - **Rate Limiting**: API request throttling
- **Configuration**:
  - DNS proxying enabled
  - SSL mode: Full (strict) - Cloudflare terminates SSL at edge
  - Security level: Medium
  - Bot fight mode: Enabled
- **SSL Flow**: User (HTTPS) → Cloudflare Edge (SSL termination) → Hetzner Origin (HTTPS)

### 3. Hosting Infrastructure

#### Hetzner Cloud
- **Role**: Primary hosting provider
- **Specifications**:
  - **Server Type**: CPX11 (2 vCPU, 2GB RAM, 40GB SSD)
  - **Location**: Falkenstein/Nuremberg, Germany (EU)
  - **OS**: Ubuntu 22.04 LTS
  - **Cost**: ~€4.15/month
- **Benefits**:
  - EU-based (GDPR compliance)
  - Cost-effective
  - Full server control
  - High performance

#### Nginx Reverse Proxy
- **Role**: Web server and reverse proxy
- **Features**:
  - SSL/TLS termination at server (HTTPS from Cloudflare → HTTP to Docker)
  - Static file serving with caching
  - Health check endpoint (`/api/health`)
  - Security headers (HSTS, X-Frame-Options, etc.)
  - MIME type handling
  - HTTP/2 support
- **SSL Flow**: Cloudflare (HTTPS) → Nginx (SSL termination with Let's Encrypt) → Docker (HTTP on port 3000)
- **Configuration**: `nginx-template.conf`

#### Docker Container
- **Role**: Application runtime environment
- **Base Image**: `node:20-alpine`
- **Build Strategy**: Multi-stage build with standalone output
- **Port**: 3000 (internal)
- **Security**: Non-root user (nextjs:nodejs)
- **Configuration**: `Dockerfile`

### 4. Application Layer

#### Next.js 15 Application
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Key Features**:
  - **Server Components**: Default rendering on server
  - **Client Components**: Interactive UI with React
  - **API Routes**: Server-side endpoints (`app/api/`)
  - **Static Generation**: Pre-rendered pages
  - **ISR**: Incremental Static Regeneration
  - **Middleware**: Request interception and routing
- **Build Output**: Standalone mode for Docker
- **Styling**: Tailwind CSS
- **State Management**: React Context, TanStack Query

### 5. CI/CD Pipeline

#### GitHub
- **Role**: Source code repository
- **Branch Strategy**: `main` branch for production
- **Features**: Pull requests, code reviews, issue tracking

#### GitHub Actions
- **Role**: Automated CI/CD pipeline
- **Workflows**:
  - **CI**: Lint, type-check, test on PRs (via separate workflow)
  - **Deploy**: Automated deployment to Hetzner on `main` push
- **Deployment Process**:
  1. Checkout code
  2. Set up Docker Buildx
  3. Build Docker image with build arguments
  4. Save and compress Docker image
  5. Upload image and nginx config to Hetzner server via SCP
  6. SSH into server and:
     - Stop and remove old container
     - Load new Docker image
     - Start new container with environment variables
     - Wait for app startup (10 seconds)
     - Perform health check (30 retries, 2-second intervals)
     - Update Nginx configuration
     - Reload Nginx
     - Verify deployment through domain
- **Current Limitations**:
  - No automated testing before deployment (tests run separately on PRs)
  - No linting/type-checking in deployment workflow
  - Direct deployment on push to main (no approval gates)
- **Configuration**: `.github/workflows/deploy-hetzner.yml`
- **Future Improvements**:
  - Add testing step before deployment
  - Add linting and type-checking gates
  - Consider staged deployments (blue-green)
  - Add deployment approval for production

### 6. Backend Services (Supabase)

#### Authentication Service
- **Role**: User authentication and authorization
- **Features**:
  - Email/password authentication
  - Email verification
  - Password reset
  - Session management
  - JWT token handling
- **Security**:
  - Rate limiting (3 signups/hour per IP)
  - Cloudflare Turnstile CAPTCHA
  - Honeypot fields
  - Input validation
  - Disposable email blocking

#### PostgreSQL Database
- **Role**: Primary data storage
- **Features**:
  - Relational data model
  - Row Level Security (RLS)
  - Full-text search
  - JSON/JSONB support
  - Array operations
  - Triggers and functions
- **Performance**:
  - Indexed queries
  - Connection pooling
  - Query optimization
- **Security**: RLS policies for data access control
- **Backup Strategy**: See [Database Backup & Disaster Recovery](#database-backup--disaster-recovery) section
- **Migrations**: See [Database Migrations](#database-migrations) section

#### File Storage
- **Role**: Media and file storage
- **Features**:
  - Public and private buckets
  - Image uploads
  - CDN integration
  - Signed URLs for private files
- **Use Cases**: Profile images, document uploads

#### Edge Functions
- **Role**: Serverless compute
- **Features**:
  - Webhook handlers
  - Background jobs
  - Custom business logic
  - Integration with external APIs

#### Realtime Subscriptions
- **Role**: Real-time data synchronization
- **Features**:
  - WebSocket connections
  - Live data updates
  - Presence tracking
  - Channel subscriptions

### 7. External Services

#### Resend
- **Role**: Transactional email service
- **Features**:
  - Email delivery
  - Email templates
  - Delivery tracking
- **Use Cases**: Welcome emails, password resets, notifications

#### OpenStreetMap / Nominatim
- **Role**: Geocoding and location services
- **Features**:
  - Address to coordinates
  - Reverse geocoding
  - Location search
- **Use Cases**: Provider location mapping, address validation

## Data Flow

### Request Flow (User → Backend)

```
1. User Request
   ↓
2. Cloudflare (CDN, Security, Bot Protection)
   ↓
3. Hetzner Server (Nginx)
   ↓
4. Docker Container (Next.js)
   ↓
5. Next.js Application
   ├─ Static Route → Serve from cache
   ├─ API Route → Process request
   └─ Dynamic Route → Render on server
   ↓
6. Supabase Services
   ├─ Database Query
   ├─ Authentication Check
   ├─ File Storage Access
   └─ Realtime Subscription
   ↓
7. Response → User
```

### Deployment Flow

```
1. Developer pushes to GitHub
   ↓
2. GitHub Actions triggered
   ↓
3. Build Docker image
   ↓
4. Run tests and linting
   ↓
5. Upload image to Hetzner
   ↓
6. SSH into server
   ↓
7. Load Docker image
   ↓
8. Stop old container
   ↓
9. Start new container
   ↓
10. Health check verification
    ↓
11. Deployment complete
```

## Security Architecture

### Defense in Depth Layers

1. **Cloudflare Layer**
   - DDoS protection
   - Bot detection (Turnstile)
   - Rate limiting
   - SSL/TLS encryption

2. **Nginx Layer**
   - Security headers (HSTS, X-Frame-Options, etc.)
   - Request filtering
   - SSL termination

3. **Application Layer**
   - Input validation
   - Output escaping (React)
   - CSRF protection
   - Authentication checks
   - Rate limiting

4. **Database Layer**
   - Row Level Security (RLS)
   - Parameterized queries
   - Connection encryption
   - Access control policies

### Security Best Practices

- ✅ HTTPS everywhere (SSL/TLS)
- ✅ Content Security Policy (CSP)
- ✅ Secure authentication (Supabase Auth)
- ✅ Input validation and sanitization
- ✅ Rate limiting (multiple layers)
- ✅ Bot protection (Cloudflare Turnstile)
- ✅ Security headers (Nginx)
- ✅ Non-root Docker user
- ✅ Environment variable security
- ✅ Regular security updates

## Performance Optimization

### Caching Strategy

1. **Cloudflare CDN**
   - Static assets cached at edge
   - HTML pages cached with appropriate TTL
   - Cache-Control headers

2. **Nginx**
   - Static file caching (1 year for immutable assets)
   - Proxy caching for API responses

3. **Next.js**
   - Static generation for public pages
   - ISR for dynamic content
   - Image optimization
   - Code splitting

4. **Browser**
   - Service Worker caching (PWA)
   - HTTP caching headers

### Database Optimization

- Indexed queries
- Connection pooling
- Query optimization
- Efficient data models

## Scalability Considerations

### Current Setup Capacity
- **Target**: 500-2,000 Daily Active Users (DAU)
- **Server**: Single Hetzner CPX11 (2 vCPU, 2GB RAM, 40GB SSD)
- **Estimated Capacity**:
  - **Current**: ~500-1,000 concurrent users comfortably
  - **Peak**: ~2,000 DAU with good performance
  - **Bottleneck**: RAM (2GB) likely first constraint
- **Database**: Supabase managed PostgreSQL (scales automatically)
- **CDN**: Cloudflare handles global distribution

### Performance Characteristics
- **Response Time**: <200ms for most requests (with CDN)
- **Database Queries**: <50ms average (indexed queries)
- **Static Assets**: Served from Cloudflare edge (<50ms globally)
- **API Routes**: <300ms average (including database queries)

### Scaling Triggers
Monitor these metrics to determine when to scale:
1. **CPU Usage**: Sustained >70% average
2. **Memory Usage**: Sustained >80% average
3. **Response Times**: P95 >500ms consistently
4. **Error Rate**: >1% of requests failing
5. **Database Connections**: Approaching pool limits

### Scaling Options

#### 1. Vertical Scaling (Easiest)
- **Upgrade Server**: CPX11 → CPX21 (4 vCPU, 8GB RAM) → CPX31 (8 vCPU, 16GB RAM)
- **Cost**: €4.15 → €8.30 → €16.60/month
- **When**: Single server can handle load but needs more resources
- **Pros**: Simple, no code changes
- **Cons**: Single point of failure, limited scalability

#### 2. Horizontal Scaling (Recommended for >5,000 DAU)
- **Multiple Servers**: 2-3 Hetzner servers
- **Load Balancer**: 
  - Option A: Cloudflare Load Balancing (managed)
  - Option B: Nginx load balancer on separate server
- **Session Management**: 
  - Stateless sessions (JWT tokens) - already implemented
  - Or Redis for session storage
- **Cost**: ~€12-20/month (2-3 servers)
- **When**: Need redundancy or >3,000 DAU
- **Pros**: High availability, better scalability
- **Cons**: More complex, requires load balancer setup

#### 3. Database Scaling
- **Read Replicas**: Supabase supports read replicas
- **Connection Pooling**: Already using Supabase connection pooling
- **Query Optimization**: Index optimization, query caching
- **When**: Database becomes bottleneck (>100ms average queries)
- **Cost**: Additional Supabase costs for replicas

#### 4. Caching Layer
- **Redis**: For session storage, rate limiting, query caching
- **Implementation**: 
  - Redis on separate Hetzner server (€4/month)
  - Or managed Redis (Upstash, Redis Cloud)
- **Benefits**: 
  - Faster response times
  - Reduced database load
  - Better rate limiting accuracy
- **When**: High read traffic, need faster response times

### Cost Projections

| DAU | Setup | Monthly Cost | Notes |
|-----|-------|--------------|-------|
| 500-2,000 | Single CPX11 | ~€4 | Current setup |
| 2,000-5,000 | CPX21 | ~€8 | Vertical scale |
| 5,000-10,000 | 2x CPX11 + LB | ~€12 | Horizontal scale |
| 10,000+ | 3x CPX21 + LB + Redis | ~€30 | Full scaling |

*Note: Costs exclude Supabase, Cloudflare, and domain costs*

## Database Migrations

### Migration Strategy
- **Location**: `supabase/migrations/` directory
- **Format**: SQL files with numbered prefixes (e.g., `001_`, `002_`)
- **Current Migrations**: 10 migration files covering:
  - Offers and needs tables
  - Provider relationships
  - Category suggestions
  - Push subscriptions
  - Data categorization and fixes

### Migration Workflow

#### Development
1. **Create Migration**:
   ```bash
   # Create new migration file
   touch supabase/migrations/011_new_feature.sql
   ```

2. **Write Migration SQL**:
   - Include `CREATE TABLE`, `ALTER TABLE`, `CREATE INDEX`, etc.
   - Include rollback SQL in comments (for manual rollback)
   - Test locally first

3. **Apply Locally**:
   ```bash
   # Via Supabase CLI (if configured)
   supabase db push
   
   # Or manually via Supabase Dashboard SQL Editor
   ```

#### Production Deployment
1. **Review Migration**: Code review of migration SQL
2. **Backup Database**: Create backup before applying (Supabase automatic)
3. **Apply Migration**: 
   - Via Supabase Dashboard → SQL Editor
   - Or via Supabase CLI in CI/CD (if configured)
4. **Verify**: Check migration applied successfully
5. **Monitor**: Watch for errors or performance issues

### Migration Best Practices
- ✅ **Version Control**: All migrations in git
- ✅ **Idempotent**: Migrations should be safe to run multiple times (use `IF NOT EXISTS`)
- ✅ **Backward Compatible**: Avoid breaking changes when possible
- ✅ **Tested**: Test migrations on staging before production
- ✅ **Documented**: Include comments explaining migration purpose
- ✅ **Rollback Plan**: Document rollback procedure for each migration

### Rollback Strategy
- **Automatic Backups**: Supabase creates automatic backups before migrations
- **Manual Rollback**: 
  1. Restore from Supabase backup
  2. Or create reverse migration SQL
  3. Apply reverse migration via SQL Editor
- **Data Migration Rollback**: 
  - For data migrations, create backup of affected tables
  - Document data transformation steps
  - Test rollback procedure in staging

### Migration Files Structure
```
supabase/migrations/
├── 001_create_offers_and_needs_tables.sql
├── 002_create_provider_community_services_relationship.sql
├── 003_create_category_suggestions_tables.sql
├── 004_add_created_by_to_offers_needs.sql
├── 005_add_category_to_offers_needs.sql
├── 006_fill_missing_categories.sql
├── 007_categorize_existing_offers.sql
├── 008_fix_offer_categorizations.sql
├── 009_merge_synonym_offers_needs.sql
└── 010_create_push_subscriptions.sql
```

## Database Backup & Disaster Recovery

### Backup Strategy

#### Supabase Automatic Backups
- **Frequency**: Daily automatic backups
- **Retention**: 7 days (Supabase free tier) or 30 days (paid tier)
- **Type**: Point-in-time recovery (PITR) available on paid plans
- **Location**: Managed by Supabase (encrypted, secure)
- **Access**: Via Supabase Dashboard → Database → Backups

#### Manual Backups
- **When**: Before major migrations or deployments
- **Method**: 
  1. Supabase Dashboard → Database → Backups → Create Backup
  2. Or via Supabase CLI: `supabase db dump`
- **Storage**: Download and store securely (encrypted)
- **Frequency**: Before critical changes

### Disaster Recovery Procedures

#### Database Corruption or Data Loss
1. **Identify Issue**: 
   - Check error logs
   - Verify data integrity
   - Identify affected tables/records

2. **Assess Damage**:
   - Determine scope of data loss
   - Check backup availability
   - Estimate recovery time

3. **Recovery Steps**:
   ```
   a. Stop application (prevent further data corruption)
   b. Access Supabase Dashboard → Database → Backups
   c. Select appropriate backup (before corruption)
   d. Restore database from backup
   e. Verify data integrity
   f. Restart application
   g. Monitor for issues
   ```

4. **Post-Recovery**:
   - Document incident
   - Identify root cause
   - Implement prevention measures
   - Update backup strategy if needed

#### Complete Server Failure
1. **Database**: Restore from Supabase backup (database is separate from server)
2. **Application**: 
   - Redeploy from GitHub (code is in version control)
   - Restore environment variables from GitHub Secrets
   - Restart Docker container
3. **Recovery Time**: ~30-60 minutes (assuming Hetzner server replacement)

#### Partial Data Recovery
- **Supabase Point-in-Time Recovery**: Available on paid plans
- **Selective Restore**: Restore specific tables from backup
- **Data Export**: Regular exports of critical data (JSON/CSV)

### Backup Verification
- **Monthly**: Test restore procedure in staging environment
- **Quarterly**: Full disaster recovery drill
- **Documentation**: Keep recovery procedures up-to-date

### Recovery Time Objectives (RTO) & Recovery Point Objectives (RPO)
- **RTO**: 1 hour (time to restore service)
- **RPO**: 24 hours (maximum acceptable data loss)
- **Current Setup**: Meets RTO/RPO with Supabase automatic backups

## Deployment Rollback Procedures

### Application Rollback

#### Automated Rollback (GitHub Actions)
Currently not automated. Manual process:

1. **Identify Issue**: 
   - Health check fails
   - Error logs show critical errors
   - User reports indicate problems

2. **Quick Rollback** (via SSH):
   ```bash
   # SSH into Hetzner server
   ssh root@your-server-ip
   
   # Stop current container
   docker stop uflow-app
   docker rm uflow-app
   
   # Load previous Docker image (if saved)
   docker load < /tmp/uflow-previous.tar.gz
   
   # Start previous version
   docker run -d -p 3000:3000 \
     -e NEXT_PUBLIC_SUPABASE_URL="..." \
     # ... other env vars ...
     --name uflow-app uflow:previous
   
   # Verify health
   curl http://localhost:3000/api/health
   ```

3. **Git-Based Rollback** (Recommended):
   ```bash
   # On local machine
   git revert HEAD  # Revert last commit
   git push origin main  # Triggers new deployment
   ```

#### Rollback Best Practices
- ✅ **Keep Previous Image**: Save previous Docker image before deployment
- ✅ **Version Tagging**: Tag Docker images with version numbers
- ✅ **Health Checks**: Automated health checks prevent bad deployments
- ✅ **Staged Rollout**: Consider blue-green deployment for zero-downtime
- ✅ **Database Compatibility**: Ensure rollback doesn't break database schema

### Database Migration Rollback

#### Schema Rollback
1. **Create Reverse Migration**:
   ```sql
   -- Example: Rollback of adding a column
   ALTER TABLE providers DROP COLUMN IF EXISTS new_column;
   ```

2. **Apply via Supabase Dashboard**:
   - SQL Editor → Run reverse migration
   - Verify schema restored

3. **Or Restore from Backup**:
   - Restore database from backup taken before migration
   - Faster but loses any data changes since migration

#### Data Migration Rollback
1. **Backup Affected Data**: Before data migration, export affected tables
2. **Document Changes**: Keep log of data transformations
3. **Reverse Process**: 
   - Restore from backup
   - Or manually reverse data transformations
   - Verify data integrity

### Rollback Decision Matrix

| Issue Type | Rollback Method | Time | Data Loss Risk |
|------------|----------------|------|----------------|
| Application bug | Git revert + redeploy | 10-15 min | None |
| Critical error | Docker image rollback | 5-10 min | None |
| Database schema issue | Reverse migration | 15-30 min | Low |
| Data corruption | Database restore | 30-60 min | Up to 24h |

## Monitoring & Observability

### Health Checks
- **Endpoint**: `/api/health`
- **Current Implementation**: Basic health check that returns:
  - Application status (`healthy`/`unhealthy`)
  - Timestamp
  - Process uptime
  - Environment (production/development)
  - Application version
- **Note**: Currently does not verify database connectivity or external service dependencies
- **Monitoring**: 
  - Automated checks via GitHub Actions during deployment
  - Health check endpoint accessible at `/api/health` for external monitoring tools
- **Future Enhancement**: Consider adding dependency checks (database, external APIs)

### Logging
- **Application Logs**: Docker container stdout/stderr
  - Access via: `docker logs uflow-app`
  - Log retention: Managed by Docker (default rotation)
- **Nginx Access Logs**: Server access logs
  - Location: `/var/log/nginx/access.log`
  - Error logs: `/var/log/nginx/error.log`
- **Current State**: Basic logging in place
- **Planned Improvements**:
  - Centralized log aggregation (e.g., ELK stack, Loki)
  - Structured logging (JSON format)
  - Log levels (debug, info, warn, error)
  - Application performance logging

### Error Tracking
- **Current State**: Not implemented
- **Recommended Solutions**:
  - **Sentry**: Application error tracking and performance monitoring
  - **LogRocket**: Session replay and error tracking
  - **Rollbar**: Real-time error tracking
- **Implementation Priority**: High (critical for production debugging)

### Metrics & Performance Monitoring
- **Server Metrics**: 
  - CPU, RAM, Disk usage (via Hetzner Cloud Console)
  - Network traffic
- **Application Metrics**:
  - Response times
  - Request rates
  - Error rates
  - Database query performance
- **Recommended Tools**:
  - **UptimeRobot** or **BetterStack**: Uptime monitoring
  - **Grafana + Prometheus**: Metrics collection and visualization
  - **New Relic** or **Datadog**: APM (Application Performance Monitoring)
- **Current State**: Basic server metrics available via Hetzner dashboard

### Alerting
- **Current State**: Manual monitoring
- **Recommended Setup**:
  - Health check alerts (UptimeRobot/BetterStack)
  - Error rate alerts (when error tracking implemented)
  - Server resource alerts (CPU > 80%, Disk > 90%)
  - Database connection alerts
- **Notification Channels**: Email, Slack, SMS

## Environment Variables & Secrets Management

### Public Variables (Client-Side)
These are exposed to the browser and included in the client bundle:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key (safe to expose)
- `NEXT_PUBLIC_SITE_URL` - Application URL
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` - Cloudflare Turnstile site key

### Server-Only Variables
These are never exposed to the client and only available in server-side code:
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (full database access)
- `TURNSTILE_SECRET_KEY` - Cloudflare Turnstile secret key
- `RESEND_API_KEY` - Resend email service API key
- Database connection strings (if any)

### Secrets Management in Production (Hetzner)

#### Current Implementation
- **Storage**: Environment variables passed directly to Docker container via `docker run -e`
- **Source**: GitHub Secrets (accessed during CI/CD)
- **Deployment**: Secrets injected during container startup
- **Security**: Secrets stored in GitHub repository secrets, never committed to code

#### Secrets Flow
```
GitHub Secrets → GitHub Actions → Docker Build Args (public only) → 
Docker Container Environment Variables (all secrets)
```

#### Best Practices
- ✅ Secrets stored in GitHub repository secrets
- ✅ Never committed to version control
- ✅ Passed securely via GitHub Actions
- ⚠️ **Current Limitation**: Secrets visible in Docker container environment
- ⚠️ **Current Limitation**: No secret rotation automation

#### Recommended Improvements
1. **Secret Rotation**:
   - Implement automated secret rotation schedule
   - Document rotation procedures
   - Test rotation process in staging

2. **Secret Management Tools** (Future):
   - **HashiCorp Vault**: Centralized secret management
   - **AWS Secrets Manager** or **Azure Key Vault**: Cloud secret management
   - **Docker Secrets**: For Docker Swarm (if migrating to orchestration)

3. **Environment Variable Validation**:
   - Validate all required variables at startup
   - Fail fast if critical secrets are missing
   - Log warnings for missing optional variables

4. **Environment Separation**:
   - Separate secrets for development, staging, production
   - Use different Supabase projects per environment
   - Document environment-specific configurations

### Local Development
- **File**: `.env.local` (gitignored)
- **Template**: `env.template` (committed, no secrets)
- **Required Variables**: See `env.template` for complete list

## Best Practices

### Code Organization
- ✅ Feature-based folder structure
- ✅ Separation of concerns
- ✅ Reusable components
- ✅ Type safety (TypeScript)
- ✅ Consistent naming conventions

### Deployment
- ✅ Automated CI/CD pipeline
- ✅ Health checks before deployment
- ✅ Zero-downtime deployments
- ✅ Rollback capability
- ✅ Environment variable management

### Security
- ✅ Defense in depth
- ✅ Regular security updates
- ✅ Secure secrets management
- ✅ Input validation
- ✅ Output escaping

### Performance
- ✅ Static generation where possible
- ✅ Image optimization
- ✅ Code splitting
- ✅ CDN utilization
- ✅ Database query optimization

## Technology Stack Summary

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | Next.js | 15.5.2 |
| **Language** | TypeScript | 5.5.4 |
| **Styling** | Tailwind CSS | 3.4.1 |
| **Backend** | Supabase | Latest |
| **Database** | PostgreSQL | (via Supabase) |
| **Hosting** | Hetzner Cloud | Ubuntu 22.04 |
| **Container** | Docker | Node 20 Alpine |
| **Web Server** | Nginx | Latest |
| **CDN/Security** | Cloudflare | Latest |
| **CI/CD** | GitHub Actions | Latest |
| **Email** | Resend | Latest |
| **Testing** | Vitest | 3.1.2 |

## Conclusion

This architecture provides:

- ✅ **Scalability**: Ready for growth with Docker containerization
- ✅ **Security**: Multiple layers of protection
- ✅ **Performance**: CDN, caching, and optimization strategies
- ✅ **Reliability**: Health checks, automated deployments
- ✅ **Cost-Effective**: Hetzner hosting at ~€4/month
- ✅ **EU Compliance**: GDPR-friendly infrastructure
- ✅ **Developer Experience**: Modern stack, TypeScript, automated workflows

The architecture follows industry best practices and is designed for production use with room for future scaling.

## Project Folder Structure

### Source Code Organization (`src/`)

The project follows a scalable, modular structure with strict separation of concerns:

```
src/
├── app/                    # Next.js App Router
│   ├── (public)/          # Public-facing routes
│   ├── (dashboard)/       # Authenticated/protected routes
│   ├── api/               # API route handlers (server-only)
│   └── api-docs/          # API documentation (Swagger)
│
├── components/            # Pure, reusable UI components
│   ├── ui/               # Atomic design: buttons, inputs, etc.
│   ├── common/           # Shared small components
│   ├── shared/           # Shared blocks like cards, headers
│   └── layout/           # App/page layout containers
│
├── features/              # Feature-specific modules (UI + hooks + services)
├── hooks/                 # Custom React hooks
├── providers/            # React context providers
├── services/             # External service wrappers (Supabase, APIs)
├── lib/                  # General utilities (Supabase client, PWA helpers)
├── utils/                # Pure utility functions and error helpers
├── config/               # Static configuration files
├── constants/           # App-wide constants and enums
├── types/               # Global TypeScript types and interfaces
├── styles/              # Global CSS/Tailwind styles
└── __tests__/           # Unit and integration tests
```

### Key Principles
- **Feature-based**: Related code grouped by feature
- **Separation of Concerns**: Clear boundaries between layers
- **Reusability**: Shared components in `components/`, utilities in `utils/`
- **Type Safety**: TypeScript types in `types/`
- **Testability**: Tests co-located with code

### Directory Purposes

#### `app/`
- Next.js App Router pages and layouts
- API routes (server-side only)
- Route groups for organization

#### `components/`
- **`ui/`**: Small atomic components (Button, Input, Card)
- **`common/`**: Generic reusable components
- **`shared/`**: Larger shared UI blocks
- **`layout/`**: Layout components (Header, Footer, PageLayout)

#### `features/`
- Feature-specific modules combining:
  - UI components
  - Custom hooks
  - Service functions
  - Types

#### `services/`
- External API clients
- Supabase service wrappers
- Third-party integrations

#### `lib/`
- Supabase client initialization
- PWA configuration
- Database helpers
- General utilities

#### `utils/`
- Pure utility functions
- Error handling helpers
- Validation functions
- Formatting utilities

## Disaster Recovery & Incident Response

### Disaster Recovery Plan

#### Scenario 1: Complete Server Failure
**Recovery Steps**:
1. **Assess**: Determine scope of failure (hardware, network, etc.)
2. **Notify**: Alert team and stakeholders
3. **Infrastructure**: 
   - Create new Hetzner server
   - Restore from server snapshot (if available)
   - Or set up fresh server and redeploy
4. **Application**: 
   - Redeploy from GitHub (code is version controlled)
   - Restore environment variables from GitHub Secrets
5. **Database**: 
   - Database is on Supabase (separate from server)
   - Verify database connectivity
   - Restore from backup if needed
6. **DNS**: Update DNS if server IP changed
7. **Verification**: Health checks, smoke tests
8. **Recovery Time**: 1-2 hours

#### Scenario 2: Database Corruption
**Recovery Steps**:
1. **Isolate**: Stop application to prevent further corruption
2. **Assess**: Identify affected tables/data
3. **Restore**: 
   - Access Supabase Dashboard → Backups
   - Select backup from before corruption
   - Restore database
4. **Verify**: Check data integrity
5. **Restart**: Restart application
6. **Monitor**: Watch for issues
7. **Recovery Time**: 30-60 minutes

#### Scenario 3: Security Breach
**Recovery Steps**:
1. **Contain**: Isolate affected systems
2. **Assess**: Determine scope of breach
3. **Notify**: Alert security team and stakeholders
4. **Mitigate**: 
   - Rotate all secrets and API keys
   - Revoke compromised credentials
   - Patch vulnerabilities
5. **Restore**: Restore from clean backup if data compromised
6. **Document**: Document incident and lessons learned
7. **Prevent**: Implement additional security measures

### Incident Response Procedures

#### Severity Levels

**Critical (P1)** - Service completely down
- Response Time: Immediate
- Escalation: On-call engineer + team lead
- Communication: Status page, team chat

**High (P2)** - Major functionality broken
- Response Time: < 1 hour
- Escalation: On-call engineer
- Communication: Team chat

**Medium (P3)** - Minor issues, workarounds available
- Response Time: < 4 hours
- Escalation: Next business day
- Communication: Issue tracker

**Low (P4)** - Cosmetic issues, feature requests
- Response Time: Next sprint
- Escalation: Product backlog
- Communication: Issue tracker

#### Incident Response Workflow
1. **Detection**: Automated alerts or user reports
2. **Triage**: Assess severity and impact
3. **Communication**: Update status page, notify team
4. **Investigation**: Identify root cause
5. **Resolution**: Fix issue or implement workaround
6. **Verification**: Confirm fix works
7. **Post-Mortem**: Document incident, lessons learned, action items

## Compliance & Data Residency

### GDPR Compliance
- **Data Location**: 
  - Application: Hetzner Cloud (Germany/EU)
  - Database: Supabase (EU region)
  - CDN: Cloudflare (global, EU data centers)
- **Data Processing**: 
  - User consent for data collection
  - Right to access, rectification, erasure
  - Data portability
- **Security**: 
  - Encryption in transit (HTTPS/TLS)
  - Encryption at rest (Supabase)
  - Access controls (RLS policies)

### Data Residency
- **Primary**: EU (Germany)
- **Backup**: Managed by Supabase (EU region)
- **CDN**: Global distribution, EU data centers prioritized

### Compliance Checklist
- ✅ Data stored in EU
- ✅ HTTPS/TLS encryption
- ✅ Access controls (RLS)
- ✅ User data deletion capability
- ✅ Privacy policy and terms of service
- ⚠️ **To Implement**: Data export functionality
- ⚠️ **To Implement**: Cookie consent banner
- ⚠️ **To Implement**: Privacy policy page

## Cost Analysis

### Current Infrastructure Costs (Monthly)

| Service | Plan | Monthly Cost | Notes |
|---------|------|--------------|-------|
| **Hetzner Cloud** | CPX11 | ~€4.15 | 2 vCPU, 2GB RAM, 40GB SSD |
| **Supabase** | Free/Pro | €0-25 | Database, Auth, Storage (usage-based) |
| **Cloudflare** | Free | €0 | CDN, DDoS protection, SSL |
| **Resend** | Free/Pro | €0-20 | Email service (usage-based) |
| **Domain** | - | ~€10/year | ~€0.83/month |
| **Total** | - | **~€5-50/month** | Varies with usage |

### Cost Breakdown by Component

#### Hosting (Hetzner)
- **Base**: €4.15/month (CPX11)
- **Scaling**: 
  - CPX21 (4 vCPU, 8GB): €8.30/month
  - CPX31 (8 vCPU, 16GB): €16.60/month

#### Database (Supabase)
- **Free Tier**: 
  - 500MB database
  - 1GB file storage
  - 50,000 monthly active users
- **Pro Tier**: €25/month
  - 8GB database
  - 100GB file storage
  - Unlimited users
  - Daily backups (30-day retention)

#### CDN & Security (Cloudflare)
- **Free Tier**: 
  - Unlimited bandwidth
  - DDoS protection
  - SSL certificates
  - Basic analytics

#### Email (Resend)
- **Free Tier**: 3,000 emails/month
- **Pro Tier**: €20/month
  - 50,000 emails/month
  - Advanced features

### Cost Optimization Strategies
1. **Right-Sizing**: Monitor usage, scale down if over-provisioned
2. **Caching**: Reduce database queries (already implemented)
3. **CDN**: Leverage Cloudflare caching (already implemented)
4. **Database**: Optimize queries, use indexes (already implemented)
5. **Email**: Batch emails, use templates efficiently

### Future Cost Projections

| DAU | Infrastructure | Database | Total | Notes |
|-----|---------------|----------|-------|-------|
| 500-2,000 | €4 | €0-25 | €5-30 | Current |
| 2,000-5,000 | €8 | €25 | €33 | Vertical scale |
| 5,000-10,000 | €12 | €25 | €37 | Horizontal scale |
| 10,000+ | €30 | €25 | €55 | Full scaling |

*All costs in EUR. Excludes domain and one-time costs.*

## API Documentation

### Swagger/OpenAPI Documentation
- **Endpoint**: `/api-docs`
- **Format**: OpenAPI 3.0
- **Access**: Public (read-only)
- **Features**:
  - Interactive API explorer
  - Request/response examples
  - Authentication documentation
  - Health check endpoint documentation

### API Endpoints
- **Health Check**: `GET /api/health`
- **Authentication**: `POST /api/auth/signup`, `POST /api/auth/login`
- **Providers**: Various provider-related endpoints
- **See**: `/api-docs` for complete API documentation

## Performance Benchmarks

### Current Performance Metrics
- **Page Load Time**: <2s (First Contentful Paint)
- **Time to Interactive**: <3s
- **API Response Time**: <300ms (P95)
- **Database Query Time**: <50ms (average)
- **Static Asset Delivery**: <50ms (via Cloudflare CDN)

### Performance Targets
- **Page Load**: <1.5s (target)
- **API Response**: <200ms (target)
- **Database Queries**: <30ms (target)

### Monitoring
- **Tools**: Browser DevTools, Lighthouse, WebPageTest
- **Frequency**: Weekly performance audits
- **Optimization**: Continuous improvement based on metrics

