# Tech Stack Best Practices

**Last Updated:** 2025-01-XX  
**Philosophy:** "Start with Postgres. It can probably do more than you think."

## Core Principles

### 1. Postgres-First Approach

Use native Postgres features before adding external services:

- ✅ **Full-text search**: Use `tsvector` with GIN indexes (10-100x faster than ILIKE)
- ✅ **Materialized views**: For expensive aggregations (dashboard stats)
- ✅ **Jobs table pattern**: Simple background job processing
- ❌ **Avoid**: Redis, Elasticsearch, separate queue services until actually needed

### 2. Keep It Simple

**Current Stack:**
- Next.js 15 + Supabase + Hetzner
- Postgres full-text search (tsvector)
- React Query for client-side caching
- Service Worker for offline support
- Cloudflare CDN for static assets

**When to Add Services:**
- **Redis**: Only when scaling to multiple servers (>5,000 DAU, need shared state)
- **Elasticsearch**: Only if Postgres full-text search isn't sufficient (rare)
- **Queue Service**: Only for high-volume, mission-critical background jobs

### 3. Cost-Effective

Target: <€100/month for 2,000+ daily active users

- Hetzner: ~€4-8/month
- Supabase: €0-25/month (free tier often sufficient)
- Cloudflare: Free
- Resend: €0-20/month (usage-based)
- **Total: €4-53/month** (vs. €200+/month with unnecessary services)

## Search Implementation

### ✅ DO: Use Postgres Full-Text Search

```typescript
// ✅ Good: Use RPC function with tsvector
const { data, error } = await supabase.rpc('search_offers', {
  search_query: 'search term',
  limit_count: 100,
  offset_count: 0,
});
```

**Benefits:**
- 10-100x faster than ILIKE
- Language-aware stemming (German/English)
- Relevance ranking with `ts_rank`
- Uses GIN indexes for sub-millisecond searches

### ❌ DON'T: Use ILIKE for Search

```typescript
// ❌ Bad: Slow, no index usage
const { data } = await supabase
  .from('offers')
  .select('*')
  .ilike('name_de', `%${query}%`);
```

**Problems:**
- Sequential scan (very slow on large tables)
- No relevance ranking
- No language-aware stemming

## Caching Strategy

### ✅ DO: Use Appropriate Caching Layers

1. **Client-side**: React Query (5min stale, 30min GC)
2. **Service Worker**: PWA offline caching
3. **CDN**: Cloudflare for static assets
4. **Database**: Materialized views for expensive aggregations

### ❌ DON'T: Add Redis Prematurely

**When NOT to add Redis:**
- Single server setup
- <5,000 DAU
- Can use Postgres materialized views instead
- In-memory caching is sufficient

**When to add Redis:**
- Multiple servers (need shared state)
- >5,000 DAU
- Need distributed session storage
- High read traffic requiring faster response times

## Background Jobs

### ✅ DO: Use Jobs Table Pattern

```sql
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_type TEXT NOT NULL,
  payload JSONB,
  status TEXT DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_jobs_status_scheduled ON jobs(status, scheduled_at) 
WHERE status = 'pending';
```

**Benefits:**
- Simple, no external service needed
- Handles thousands of jobs without issues
- Easy to debug and monitor
- Can be processed by Supabase Edge Function or cron

### ❌ DON'T: Add Queue Service Prematurely

**When NOT to add:**
- Low to medium job volume
- Jobs table pattern handles the load
- No mission-critical, high-volume requirements

**When to add:**
- High-volume, mission-critical job processing
- Need advanced features (priority queues, delayed jobs, etc.)

## Materialized Views

### ✅ DO: Use for Expensive Aggregations

```sql
CREATE MATERIALIZED VIEW provider_stats AS
SELECT 
  category_id,
  COUNT(*) as provider_count,
  COUNT(DISTINCT address_city) as city_count
FROM providers
GROUP BY category_id;

-- Refresh periodically
REFRESH MATERIALIZED VIEW provider_stats;
```

**Use cases:**
- Dashboard statistics
- Popular searches or categories
- User activity summaries
- Any expensive GROUP BY queries

**Benefits:**
- Pre-computed results (sub-millisecond response)
- No Redis needed
- Supabase supports natively

## Database Indexes

### ✅ DO: Create Proper Indexes

```sql
-- Standard indexes
CREATE INDEX idx_providers_city ON providers(city);
CREATE INDEX idx_providers_created_at ON providers(created_at DESC);

-- Full-text search indexes (GIN indexes)
CREATE INDEX idx_providers_name_search 
  ON providers USING gin(to_tsvector('german', provider_name));
CREATE INDEX idx_providers_description_search 
  ON providers USING gin(to_tsvector('german', provider_description));
```

**Index types:**
- **B-tree**: Standard indexes for equality, range queries
- **GIN**: Full-text search indexes (tsvector)
- **Partial**: Indexes with WHERE clause (exclude NULLs)

## Query Optimization

### ✅ DO: Use EXPLAIN ANALYZE

```sql
EXPLAIN ANALYZE
SELECT * FROM providers 
WHERE provider_name ILIKE '%search%';
```

**Check for:**
- Sequential scans (bad - add index)
- Index scans (good)
- Query execution time
- Rows examined vs. rows returned

### ✅ DO: Optimize Queries

- Use `select()` to limit returned columns
- Use filters to limit results
- Use pagination for large datasets
- Avoid N+1 queries (use joins or batch queries)
- Use materialized views for expensive aggregations

## Migration Checklist

When adding new features:

- [ ] Are search queries using tsvector (not ILIKE)?
- [ ] Are expensive aggregations candidates for materialized views?
- [ ] Are proper indexes created (including full-text search indexes)?
- [ ] Are queries optimized (use EXPLAIN ANALYZE)?
- [ ] Is caching strategy appropriate (React Query, materialized views, or Redis)?
- [ ] Are we using Postgres native features before adding external services?
- [ ] Is the solution simple enough? (avoid premature complexity)

## Cost Comparison

| Setup | Monthly Cost | When to Use |
|-------|-------------|-------------|
| **Current (Simple)** | €4-33 | <5,000 DAU, single server |
| **With Redis** | €8-48 | Multiple servers, >5,000 DAU |
| **With Elasticsearch** | €54-103 | Postgres search insufficient (rare) |
| **Full Stack** | €100+ | Large scale, multiple services |

**Recommendation:** Start simple, add services only when hitting actual bottlenecks.

## References

- [Architecture Overview](ARCHITECTURE_OVERVIEW.md)
- [Backend Expert Rules](../../.cursor/rules/backend-expert.mdc)
- [Architecture Expert Rules](../../.cursor/rules/architecture-expert.mdc)







