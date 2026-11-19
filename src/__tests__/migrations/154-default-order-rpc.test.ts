import { readdirSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

// No database is reachable from a lane, so this checks the migration text.
// The owner applies it to DEV/UAT and verifies the order with a real query.
const dir = resolve(__dirname, '../../../supabase/migrations');
const sql = readFileSync(resolve(dir, '154_issue953_city_population.sql'), 'utf-8');

describe('#953 migration 154: city population and default-order RPC', () => {
  it('is the only migration numbered 154', () => {
    expect(readdirSync(dir).filter((f) => f.startsWith('154_'))).toHaveLength(1);
  });

  it('adds cities.population (the live DB does not have it yet)', () => {
    expect(sql).toMatch(/ALTER TABLE public\.cities\s+ADD COLUMN IF NOT EXISTS population integer/);
  });

  it('defines get_default_order_providers with the section/review_status filter params', () => {
    expect(sql).toMatch(/FUNCTION public\.get_default_order_providers\(\s*section_filter text/);
    expect(sql).toContain("review_status_filter text DEFAULT 'approved'");
  });

  it('orders by population desc, then city, name and provider_id for stable paging', () => {
    expect(sql).toMatch(
      /ORDER BY c\.population DESC NULLS LAST, lower\(NULLIF\(btrim\(p\.address_city\), ''\)\) ASC NULLS LAST, p\.provider_name ASC, p\.provider_id ASC/,
    );
  });

  it('joins cities on city_name without multiplying providers', () => {
    expect(sql).toMatch(/GROUP BY lower\(btrim\(city_name\)\)/);
  });

  it('runs as the caller so RLS still applies', () => {
    expect(sql).toContain('SECURITY INVOKER');
    expect(sql).not.toMatch(/SECURITY DEFINER/);
  });

  it('limits execute to anon, authenticated and service_role (as migrations 137/141)', () => {
    const sig = 'public.get_default_order_providers(text, text)';
    expect(sql).toContain(`REVOKE ALL ON FUNCTION ${sig} FROM PUBLIC;`);
    for (const role of ['anon', 'authenticated', 'service_role']) {
      expect(sql).toContain(`GRANT EXECUTE ON FUNCTION ${sig} TO ${role};`);
    }
  });

  it("matches cities ignoring case and spaces, and treats '' as no city ('Frankfurt Am Main' ranks with Frankfurt)", () => {
    expect(sql).toContain("c.city_key = lower(NULLIF(btrim(p.address_city), ''))");
    expect(sql).toContain('WHERE lower(btrim(c.city_name)) = lower(btrim(v.city_name))');
    expect(sql).toContain("('Frankfurt am Main', 773000)");
  });
});
