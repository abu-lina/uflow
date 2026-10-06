import { randomUUID } from 'node:crypto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Page } from '@playwright/test';

import { expect, test, resolveSupabaseEnv, TEST_EMAIL, TEST_PASSWORD } from './fixtures';

/**
 * Issue 547 — a pending provider used to answer 404 for EVERY caller,
 * including the user who created it, because the middleware guard and the
 * SSR fetch both ran anon and anon RLS exposes approved rows only.
 *
 * The visibility rule is caller-dependent: anon and unrelated users get a
 * 404 indistinguishable from a nonexistent id, while the creator (or an
 * admin) gets 200 with a review-state banner. These specs seed a pending
 * provider owned by the smoke user and assert the real wire status in both
 * directions — a body-level assertion would have passed during the bug.
 *
 * Requires migration 137 (provider_route_visibility) on the target project:
 * the local `supabase start` stack applies it automatically.
 *
 * This spec creates a real auth user, so it must never run against PROD:
 * `resolveSupabaseEnv()` prefers env vars, and one run with PROD
 * credentials exported would leave a permanent account behind.
 */

const PROD_PROJECT_REF = 'rdtdtcfntopcxcigkqoq';

// Generated per run — no credential, real or placeholder, lives in the
// repo. A leaked leftover from an interrupted run is also impossible to
// correlate back to this spec.
const UNRELATED_EMAIL = `e2e-unrelated-${randomUUID()}@uflow.test`;

async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login', { waitUntil: 'load' });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => url.pathname !== '/login', { timeout: 15_000 });
}

function assertNotProduction(apiUrl: string): void {
  const projectRef = new URL(apiUrl).hostname.split('.')[0];
  if (projectRef === PROD_PROJECT_REF) {
    throw new Error(
      `Refusing to run: resolved Supabase URL is PROD (${PROD_PROJECT_REF}). ` +
        `This spec creates a real auth user and a real provider row. ` +
        `Point NEXT_PUBLIC_SUPABASE_URL at DEV or run the local stack. ` +
        `Note that uat.ummahflow.com ships the PROD project too.`,
    );
  }
}

async function userIdByEmail(admin: SupabaseClient, email: string): Promise<string> {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const user = data.users.find((u) => u.email === email);
  if (!user) throw new Error(`test user ${email} not found`);
  return user.id;
}

test.describe('issue 547 — pending provider visibility', () => {
  let admin: SupabaseClient;
  let providerId: string | undefined;
  let unrelatedUserId: string | undefined;
  let unrelatedPassword: string;

  test.beforeAll(async () => {
    const { apiUrl, serviceRoleKey } = resolveSupabaseEnv();
    assertNotProduction(apiUrl);
    admin = createClient(apiUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // A second user for the "unrelated signed-in user" case, with a per-run
    // password so nothing with a repo-known credential can outlive the run.
    unrelatedPassword = `e2e-${randomUUID()}`;
    const { data: created, error: userError } = await admin.auth.admin.createUser({
      email: UNRELATED_EMAIL,
      password: unrelatedPassword,
      email_confirm: true,
    });
    if (userError) throw userError;
    unrelatedUserId = created.user.id;

    const creatorId = await userIdByEmail(admin, TEST_EMAIL);
    const { data, error } = await admin
      .from('providers')
      .insert({
        provider_name: 'E2E Pending Provider 547',
        address_city: 'Berlin',
        show_address: true,
        review_status: 'pending',
        // Production shape: all 1,127 real pending rows have
        // provider_owner_id NULL and identify their creator only through
        // user_created_id — exercise that clause, not the other one.
        user_created_id: creatorId,
        provider_owner_id: null,
      })
      .select('provider_id')
      .single();
    if (error) throw error;
    providerId = data.provider_id;
  });

  test.afterAll(async () => {
    // Runs even when a test body fails: leave no rows and no accounts.
    if (admin && providerId) {
      await admin.from('providers').delete().eq('provider_id', providerId);
    }
    if (admin && unrelatedUserId) {
      const { error } = await admin.auth.admin.deleteUser(unrelatedUserId);
      if (error) throw error;
    }
  });

  test('anon request gets a real 404, indistinguishable from a nonexistent id', async ({
    request,
  }) => {
    const res = await request.get(`/p/${providerId}`);
    expect(res.status()).toBe(404);
  });

  test('an unrelated signed-in user gets a real 404', async ({ page }) => {
    await login(page, UNRELATED_EMAIL, unrelatedPassword);
    const res = await page.goto(`/p/${providerId}`, { waitUntil: 'domcontentloaded' });
    expect(res?.status()).toBe(404);
  });

  test('the creator gets 200 with a review-state banner', async ({ page }) => {
    await login(page, TEST_EMAIL, TEST_PASSWORD);
    const res = await page.goto(`/p/${providerId}`, { waitUntil: 'domcontentloaded' });
    expect(res?.status()).toBe(200);
    await expect(page.getByText(/awaiting.*review|awaiting a manual review/i).first()).toBeVisible({
      timeout: 15_000,
    });
    // Non-approved pages must stay out of the index.
    const html = await page.content();
    expect(html).not.toContain('content="index, follow"');
  });
});
