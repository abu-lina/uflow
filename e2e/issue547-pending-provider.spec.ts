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
 */

const UNRELATED_EMAIL = 'e2e-unrelated@uflow.test';
const UNRELATED_PASSWORD = 'e2e-unrelated-pw-547';

async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login', { waitUntil: 'load' });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => url.pathname !== '/login', { timeout: 15_000 });
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
  let providerId: string;

  test.beforeAll(async () => {
    const { apiUrl, serviceRoleKey } = resolveSupabaseEnv();
    admin = createClient(apiUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // A second smoke user for the "unrelated signed-in user" case.
    const { error: userError } = await admin.auth.admin.createUser({
      email: UNRELATED_EMAIL,
      password: UNRELATED_PASSWORD,
      email_confirm: true,
    });
    if (
      userError &&
      !/already (been )?registered|already exists|duplicate/i.test(userError.message)
    ) {
      throw userError;
    }

    const creatorId = await userIdByEmail(admin, TEST_EMAIL);
    const { data, error } = await admin
      .from('providers')
      .insert({
        provider_name: 'E2E Pending Provider 547',
        address_city: 'Berlin',
        show_address: true,
        review_status: 'pending',
        user_created_id: creatorId,
        provider_owner_id: creatorId,
      })
      .select('provider_id')
      .single();
    if (error) throw error;
    providerId = data.provider_id;
  });

  test.afterAll(async () => {
    if (admin && providerId) {
      await admin.from('providers').delete().eq('provider_id', providerId);
    }
  });

  test('anon request gets a real 404, indistinguishable from a nonexistent id', async ({
    request,
  }) => {
    const res = await request.get(`/p/${providerId}`);
    expect(res.status()).toBe(404);
  });

  test('an unrelated signed-in user gets a real 404', async ({ page }) => {
    await login(page, UNRELATED_EMAIL, UNRELATED_PASSWORD);
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
