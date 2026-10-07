import { randomUUID } from 'node:crypto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Page } from '@playwright/test';

import { expect, test, resolveSupabaseEnv, type SupabaseEnv } from './fixtures';

/**
 * Issue 548 — approve/reject a pending restaurant straight from the halal
 * check page, persisting the halal answers in the same transaction.
 *
 * The bug this guards: approve used to write only review_status, so the
 * answers the admin just confirmed were lost, and the halal gate ran on
 * stored (mostly import-defaulted) values — 0 of 914 rows passed.
 *
 * Prerequisite: migrations 129, 131 and 138 on the target project. A local
 * `supabase start` applies the whole directory; DEV must have been pushed
 * manually (see spec comment §0).
 *
 * Creates real auth users and provider rows — never run against PROD.
 */

const PROD_PROJECT_REF = 'rdtdtcfntopcxcigkqoq';

const ADMIN_EMAIL = `e2e-548-admin-${randomUUID()}@uflow.test`;
const USER_EMAIL = `e2e-548-user-${randomUUID()}@uflow.test`;
const ADMIN_PASSWORD = `e2e-548-${randomUUID()}`;
const USER_PASSWORD = `e2e-548-${randomUUID()}`;

let env: SupabaseEnv;

// Same cookie contract as issue547: real session tokens written through
// /api/auth/set, which is what AuthSyncer calls after UI login.
//
// The cookies are also placed explicitly: `npm run start` (production, what
// CI's E2E Smoke job runs) marks them `Secure`, and Playwright's request
// context will not forward a Secure cookie over plain http — while Chromium
// exempts loopback and sends it anyway. That asymmetry made page.request
// calls 401 only in production mode. A non-Secure copy keeps both clients
// consistent; the assertions exercise the app, not the cookie flag.
async function signIn(page: Page, email: string, password: string): Promise<void> {
  const tokenRes = await page
    .context()
    .request.post(`${env.apiUrl}/auth/v1/token?grant_type=password`, {
      headers: { apikey: env.anonKey, 'Content-Type': 'application/json' },
      data: { email, password },
    });
  expect(tokenRes.ok(), `sign-in for ${email}`).toBe(true);
  const { access_token, refresh_token } = (await tokenRes.json()) as {
    access_token: string;
    refresh_token: string;
  };
  const setRes = await page.context().request.post('/api/auth/set', {
    data: { access_token, refresh_token },
  });
  expect(setRes.ok(), 'cookie write via /api/auth/set').toBe(true);
  await page.context().addCookies([
    {
      name: 'sb-access-token',
      value: access_token,
      url: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000',
      httpOnly: true,
      sameSite: 'Lax',
    },
    {
      name: 'sb-refresh-token',
      value: refresh_token,
      url: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
}

function assertNotProduction(apiUrl: string): void {
  const projectRef = new URL(apiUrl).hostname.split('.')[0];
  if (projectRef === PROD_PROJECT_REF) {
    throw new Error(
      `Refusing to run: resolved Supabase URL is PROD (${PROD_PROJECT_REF}). ` +
        `This spec creates real auth users and provider rows. ` +
        `Point NEXT_PUBLIC_SUPABASE_URL at DEV or run the local stack.`,
    );
  }
}

test.describe('issue 548 — halal check approve/reject', () => {
  let admin: SupabaseClient;
  let adminUserId: string;
  let userUserId: string;
  const seededProviderIds: string[] = [];

  test.beforeAll(async () => {
    env = resolveSupabaseEnv();
    assertNotProduction(env.apiUrl);
    admin = createClient(env.apiUrl, env.serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: adminUser, error: adminError } = await admin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
    });
    if (adminError) throw adminError;
    adminUserId = adminUser.user.id;
    // handle_new_user seeds role 'user'; promote via the service client.
    const { error: roleError } = await admin
      .from('users')
      .upsert(
        { user_id: adminUserId, email: ADMIN_EMAIL, role: 'admin' },
        { onConflict: 'user_id' },
      );
    if (roleError) throw roleError;

    const { data: plainUser, error: userError } = await admin.auth.admin.createUser({
      email: USER_EMAIL,
      password: USER_PASSWORD,
      email_confirm: true,
    });
    if (userError) throw userError;
    userUserId = plainUser.user.id;
  });

  test.afterAll(async () => {
    if (admin) {
      for (const id of seededProviderIds) {
        await admin.from('pending_enrichments').delete().eq('provider_id', id);
        await admin.from('providers').delete().eq('provider_id', id);
      }
      if (adminUserId) await admin.auth.admin.deleteUser(adminUserId);
      if (userUserId) await admin.auth.admin.deleteUser(userUserId);
    }
  });

  // One pending food provider with the production-shape attestation row:
  // all three answers false (the import default that made the stored-value
  // gate unpassable before this change).
  async function seedPendingProvider(): Promise<string> {
    const { data, error } = await admin
      .from('providers')
      .insert({
        provider_name: `E2E Halal Review 548 ${randomUUID().slice(0, 8)}`,
        listing_type: 'food',
        address_city: 'Berlin',
        show_address: true,
        review_status: 'pending',
        user_created_id: userUserId,
      })
      .select('provider_id, updated_at')
      .single();
    if (error) throw error;
    const providerId = data.provider_id as string;
    const { error: extError } = await admin.from('food_providers').insert({
      provider_id: providerId,
      no_alcohol: false,
      no_pork: false,
      no_gambling: false,
      verification_method: 'online',
      has_certificate: false,
    });
    if (extError) throw extError;
    seededProviderIds.push(providerId);
    return providerId;
  }

  async function providerRow(providerId: string) {
    const { data, error } = await admin
      .from('providers')
      .select('*')
      .eq('provider_id', providerId)
      .single();
    if (error) throw error;
    return data;
  }

  async function foodRow(providerId: string) {
    const { data, error } = await admin
      .from('food_providers')
      .select('*')
      .eq('provider_id', providerId)
      .single();
    if (error) throw error;
    return data;
  }

  test('AC 10: no session -> 401, row unchanged', async ({ request }) => {
    const providerId = await seedPendingProvider();
    const res = await request.patch('/api/admin/review-provider', {
      data: { providerId, reviewStatus: 'approved' },
    });
    expect(res.status()).toBe(401);
    expect((await providerRow(providerId)).review_status).toBe('pending');
  });

  test('AC 9: role "user" gets 403, row untouched; page redirects to /food', async ({ page }) => {
    const providerId = await seedPendingProvider();
    await signIn(page, USER_EMAIL, USER_PASSWORD);

    const res = await page.request.patch('/api/admin/review-provider', {
      data: {
        providerId,
        reviewStatus: 'approved',
        halal: { noAlcohol: true, noPork: true, noGambling: true },
      },
    });
    expect(res.status()).toBe(403);
    const row = await providerRow(providerId);
    expect(row.review_status).toBe('pending');
    expect(row.reviewed_by).toBeNull();

    await page.goto(`/dashboard/providers/${providerId}/edit/halal`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForURL(/\/food/, { timeout: 15_000 });
    expect(page.url()).toContain('/food');
  });

  test('AC 11: two concurrent reviews, different payloads -> first wins, second 409s', async ({
    page,
  }) => {
    const providerId = await seedPendingProvider();
    const { updated_at } = await providerRow(providerId);
    await signIn(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    // Different reasons per request so the surviving row demonstrably
    // belongs to exactly one winner — identical payloads could not prove
    // the loser did not silently overwrite.
    const base = {
      providerId,
      reviewStatus: 'rejected',
      expectedUpdatedAt: updated_at,
      halal: { noAlcohol: false, noPork: false, noGambling: false },
    };
    const first = await page.request.patch('/api/admin/review-provider', {
      data: { ...base, reviewFeedback: 'first reviewer: not halal-verifiable' },
    });
    expect(first.status()).toBe(200);

    const second = await page.request.patch('/api/admin/review-provider', {
      data: { ...base, reviewFeedback: 'second reviewer: duplicate listing' },
    });
    expect(second.status()).toBe(409);

    const row = await providerRow(providerId);
    expect(row.review_status).toBe('rejected');
    expect(row.review_feedback).toBe('first reviewer: not halal-verifiable');
  });

  test('AC 1 pre-flight: approve with one "not sure" -> 422 before the RPC, rows unchanged', async ({
    page,
  }) => {
    // This exercises the TypeScript pre-flight gate at route.ts:136-155,
    // which returns 422 before updateProviderReview is ever called (the
    // sibling unit test admin-review-provider-halal-payload.test.ts
    // asserts mockReview is not reached for the same input). "Both rows
    // byte-identical" here proves the pre-flight wrote nothing — it is
    // NOT the atomicity assertion. True in-transaction rollback is proven
    // by the PGlite test at
    // src/__tests__/migrations/138-issue548-review-audit.test.ts
    // ("rolls back BOTH writes") and by the direct-RPC case below.
    const providerId = await seedPendingProvider();
    const beforeProvider = await providerRow(providerId);
    const beforeFood = await foodRow(providerId);
    await signIn(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    const res = await page.request.patch('/api/admin/review-provider', {
      data: {
        providerId,
        reviewStatus: 'approved',
        expectedUpdatedAt: beforeProvider.updated_at,
        halal: { noAlcohol: true, noPork: true, noGambling: null },
      },
    });
    expect(res.status()).toBe(422);
    const body = await res.json();
    expect(body.unanswered).toContain('no_gambling');

    // The answers did not persist without the status change.
    expect(await providerRow(providerId)).toEqual(beforeProvider);
    expect(await foodRow(providerId)).toEqual(beforeFood);
  });

  test('AC 1 atomicity in-transaction: omitting p_halal fires the gate inside the RPC and rolls back', async () => {
    // Through PATCH this path can never reach the function: with `halal`
    // absent the route's pre-flight reads the same all-false stored row
    // and 422s first. The in-transaction gate (migration 138, step 2)
    // can only fire via a direct RPC call or a pre-flight/RPC race, so
    // this calls admin_review_provider over PostgREST with p_halal
    // omitted — the function re-reads the stored all-false row, raises
    // HALAL_GATE and must roll back the status write it would have made.
    // Same assertion against real Postgres:
    // src/__tests__/migrations/138-issue548-review-audit.test.ts
    const providerId = await seedPendingProvider();

    const { error } = await admin.rpc('admin_review_provider', {
      p_provider_id: providerId,
      p_review_status: 'approved',
      p_review_feedback: null,
      p_reviewer_id: adminUserId,
      // p_halal deliberately omitted
      p_expected_updated_at: null,
    });
    expect(error).not.toBeNull();
    expect(error?.message ?? '').toContain('HALAL_GATE');

    const row = await providerRow(providerId);
    expect(row.review_status).toBe('pending');
    expect(row.reviewed_by).toBeNull();
    const food = await foodRow(providerId);
    expect(food.no_alcohol).toBe(false);
    expect(food.no_pork).toBe(false);
    expect(food.no_gambling).toBe(false);
  });

  test('AC 1–4: admin approves in the browser, answers persist atomically', async ({ page }) => {
    const providerId = await seedPendingProvider();
    await signIn(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    await page.goto(`/dashboard/providers/${providerId}/edit/halal`, {
      waitUntil: 'domcontentloaded',
    });

    // Wait for the review footer before touching the radios: it only renders
    // once providerMeta has loaded, and that same fetch initializes the form
    // state — clicking earlier races the setData and the answers are lost.
    const approveButton = page.getByRole('button', { name: /genehmigen|approve/i });
    await expect(approveButton).toBeVisible({ timeout: 30_000 });

    // Set all three answers to yes — de is the default locale.
    const yesOptions = page.getByRole('radio', { name: /^(ja|yes)$/i });
    await expect(yesOptions).toHaveCount(3, { timeout: 15_000 });
    for (const yes of await yesOptions.all()) {
      await yes.click();
    }

    await approveButton.click();

    // Approve publishes publicly and irreversibly, so it is gated on a
    // confirmation that names the consequence — nothing is written until
    // the admin confirms inside the dialog.
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await expect(dialog).toContainText(/veröffentlicht|publishes/i);
    expect((await providerRow(providerId)).review_status).toBe('pending');

    await dialog.getByRole('button', { name: /veröffentlichen|publish/i }).click();

    await page.waitForURL(/\/food\?status=pending/, { timeout: 15_000 });

    const row = await providerRow(providerId);
    expect(row.review_status).toBe('approved');
    expect(row.reviewed_by).toBe(adminUserId);
    expect(row.reviewed_at).not.toBeNull();

    const food = await foodRow(providerId);
    expect(food.no_alcohol).toBe(true);
    expect(food.no_pork).toBe(true);
    expect(food.no_gambling).toBe(true);

    // Migration 126 trigger enqueues enrichment exactly once when eligible.
    const { data: enrichments, error } = await admin
      .from('pending_enrichments')
      .select('*')
      .eq('provider_id', providerId);
    if (error) throw error;
    expect(enrichments.length).toBe(1);
  });

  test('AC 7: reject with a reason stores feedback and lands on the pending list', async ({
    page,
  }) => {
    const providerId = await seedPendingProvider();
    await signIn(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    await page.goto(`/dashboard/providers/${providerId}/edit/halal`, {
      waitUntil: 'domcontentloaded',
    });

    await page.getByRole('button', { name: /ablehnen|reject/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await dialog.getByRole('textbox').fill('Halal status could not be verified on site.');
    await dialog.getByRole('button', { name: /confirm|ablehnen/i }).click();

    await page.waitForURL(/\/food\?status=pending/, { timeout: 15_000 });

    const row = await providerRow(providerId);
    expect(row.review_status).toBe('rejected');
    expect(row.review_feedback).toBe('Halal status could not be verified on site.');
    expect(row.reviewed_by).toBe(adminUserId);
    expect(row.reviewed_at).not.toBeNull();
  });
});
