# Migration 068: GeoNames Cities Import - Deployment Instructions

## Overview

- **File**: `068_add_international_cities.sql`
- **Size**: 1.1MB (27,368 lines)
- **Data**: 27,127 cities from GeoNames cities15000 dataset
- **License**: CC-BY 4.0 (Creative Commons Attribution)
- **Source**: https://download.geonames.org/export/dump/cities15000.zip

## ⚠️ CRITICAL: Cannot Use Supabase SQL Editor

**Issue**: Migration exceeds Supabase SQL Editor query size limit (~1MB).

**Error**: "Query is too large to be run via the SQL Editor. Run this query by connecting to your database directly."

## ✅ Solution: Direct psql Connection

### Prerequisites

- `psql` client installed (comes with PostgreSQL)
- Supabase database connection string (from Project Settings → Database)

### Step-by-Step Deployment

#### 1. Get Connection String

From Supabase Dashboard:
1. Project Settings → Database
2. Connection String → **Direct** (not Transaction or Session)
3. Copy the connection string (format below)

```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
```

**For UAT**:
- Project: uat.ummahflow.com
- Get password from `.env.uat` or Supabase UAT project settings

**For Production**:
- Project: ummahflow.com
- Get password from `.env.production` or Supabase production project settings

#### 2. Apply Migration

```bash
# Navigate to project root
cd /path/to/uflow

# Apply migration via psql
psql "postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres" \
  -f supabase/migrations/068_add_international_cities.sql
```

**Expected output**:
```
INSERT 0 500
INSERT 0 500
... (repeated ~54 times for 27,000 cities)
INSERT 0 127
COMMENT
```

**Duration**: ~30-60 seconds depending on network latency.

#### 3. Verify Migration

```bash
# Check total city count
psql "postgresql://..." -c "SELECT COUNT(*) as total_cities FROM cities;"
# Expected: 27129 (or 27127 GeoNames + existing German cities)

# Spot-check key cities
psql "postgresql://..." -c "
  SELECT city_name, country 
  FROM cities 
  WHERE city_name IN ('Los Angeles', 'New York City', 'London', 'Paris', 'Dubai', 'Berlin') 
  ORDER BY city_name;
"
# Expected: All 6 cities returned

# Check country distribution (top 10)
psql "postgresql://..." -c "
  SELECT country, COUNT(*) as city_count 
  FROM cities 
  GROUP BY country 
  ORDER BY city_count DESC 
  LIMIT 10;
"
# Expected: India (3679), United States (2813), Brazil (2230), etc.
```

#### 4. Update Migration History

```bash
# Mark migration as applied in Supabase migration history
psql "postgresql://..." -c "
  INSERT INTO supabase_migrations.schema_migrations (version)
  VALUES ('068')
  ON CONFLICT (version) DO NOTHING;
"
```

### Idempotency

Migration uses `ON CONFLICT (city_name) DO NOTHING` — **safe to re-run** if:
- Process interrupted
- Network failure mid-migration
- Need to re-apply

### Rollback (If Needed)

```sql
-- Remove all GeoNames cities (keeps original 20 German cities from migration 017)
DELETE FROM cities WHERE country != 'Germany';

-- Or remove ALL cities and re-apply migration 017
TRUNCATE cities CASCADE;
-- Then re-apply 017_create_cities_table.sql
```

## Country Coverage

| Country | Cities | % of Total |
|---------|--------|------------|
| 🇮🇳 India | 3,679 | 13.5% |
| 🇺🇸 United States | 2,813 | 10.3% |
| 🇧🇷 Brazil | 2,230 | 8.2% |
| 🇨🇳 China | 1,893 | 7.0% |
| 🇯🇵 Japan | 1,244 | 4.6% |
| 🇩🇪 Germany | 1,137 | 4.2% |
| 🇷🇺 Russia | 1,086 | 4.0% |
| 🇬🇧 United Kingdom | 817 | 3.0% |
| 🇪🇸 Spain | 711 | 2.6% |
| 🇫🇷 France | 679 | 2.5% |
| Others | ~13,738 | ~50.6% |

## Troubleshooting

### Error: "psql: command not found"

Install PostgreSQL client:
```bash
# macOS
brew install postgresql

# Ubuntu/Debian
sudo apt-get install postgresql-client

# Windows
# Download from https://www.postgresql.org/download/windows/
```

### Error: "connection refused" or timeout

- Verify connection string is correct (Project Settings → Database)
- Check password is URL-encoded (special chars like `@`, `#`, `!` need encoding)
- Verify IP whitelisting in Supabase project settings (Network Restrictions)

### Error: "duplicate key value violates unique constraint"

This is **expected and safe** if cities already exist. The migration uses `ON CONFLICT DO NOTHING`.

## Post-Deployment Validation

### Functional Test

1. Navigate to https://uat.ummahflow.com/search (or production URL)
2. Click "Wo" (Where) section
3. Type "Los Angeles" → Should show EmptyCityCard (notify-me feature)
4. Type "New York" → Should show EmptyCityCard
5. Type "Berlin" → Should show provider list (existing city with providers)
6. Type "Atlantis" → Should show "City not recognized" message

### Database Validation

```sql
-- Check fetchAllValidCities() function works
SELECT * FROM cities ORDER BY city_name LIMIT 10;

-- Verify no duplicates
SELECT city_name, COUNT(*) 
FROM cities 
GROUP BY city_name 
HAVING COUNT(*) > 1;
-- Expected: 0 rows (no duplicates)
```

## Support

If migration fails or cities not loading:
1. Check psql connection string
2. Verify migration file exists: `supabase/migrations/068_add_international_cities.sql`
3. Check database logs in Supabase Dashboard
4. Contact @implementer.agent or DevOps team

---

**Related**: Plan 093 - City Interest: "Notify Me" for Unavailable Cities  
**Implementation Doc**: `agent-output/implementation/093-city-interest-notify-me.md`
