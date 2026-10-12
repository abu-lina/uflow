// @vitest-environment node
/**
 * #606 live reproduction: POST /api/providers through the REAL route, the REAL
 * getUserFromCookie (fetches local GoTrue /auth/v1/user) and the REAL
 * service-role writes against the local Supabase stack. Only next/headers is
 * mocked, to feed the sb-access-token cookie the app writes.
 *
 * Run (local stack must be up):
 *   source /tmp/606-local-keys.env   # LOCAL_ANON_KEY, LOCAL_SERVICE_ROLE_KEY from `supabase status -o env`
 *   npx vitest run --config agent-output/artifacts/606-vitest.config.ts
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const URL_ = 'http://127.0.0.1:54321';
const ANON = process.env.LOCAL_ANON_KEY!;
const SERVICE = process.env.LOCAL_SERVICE_ROLE_KEY!;
const EMAIL = 'repro-606@example.test';
const PASSWORD = 'repro-606-password';

let cookieJar: Record<string, string> = {};
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (n: string) => (n in cookieJar ? { name: n, value: cookieJar[n] } : undefined),
    getAll: () => Object.entries(cookieJar).map(([name, value]) => ({ name, value })),
    set: () => {},
  }),
}));

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } });
let userId = '';
let accessToken = '';

const CATEGORY = {
  foodAndDrink_all: '20c10efe-404b-4a39-bb81-5089a0332d78', // PLACE_TYPE_TO_CATEGORY.restaurant / fast_food / food keywords
  services_all: '1288f269-2cdb-47e8-bd8e-9d552ff25e83', // PLACE_TYPE_TO_CATEGORY.shop
  turkish_food: '232c2870-7929-43eb-a909-6cac90203192', // a section-specific food category (control)
  communitySupport_all: '4470c3e0-458f-40a6-a96e-ca0fbdf145d7', // mosque -> community-service branch
};

/** Sanitised reconstruction of what StreamlinedRecommendForm.handleSubmit posts:
 *  {...contextFormData (initialFormData key order), recommend overrides} minus
 *  images/certificate_file, plus certificate_url + imageUrls (mutations.ts). */
export function recommendPayload(category: string) {
  return {
    creationMode: 'recommendation',
    entityType: 'provider',
    title: 'Beispiel Döner Imbiss',
    category,
    description: 'Sehr leckeres Essen, freundliches Personal.',
    isOnlineBusiness: false,
    street: '',
    zip: '',
    city: 'Berlin',
    country: '',
    latitude: null,
    longitude: null,
    showAddress: false,
    website: '',
    instagram: '@beispiel_doener',
    phone: '',
    email: '',
    offers_ids: [],
    needs_ids: [],
    selectedCommunityServiceIds: [],
    tags: [],
    socialCategory: '',
    socialTitle: '',
    socialDescription: '',
    no_alcohol: true,
    no_pork: true,
    no_gambling: true,
    verification_method: '',
    has_certificate: false,
    certificate_url: '',
    imageUrls: [],
  };
}

async function post(body: unknown) {
  vi.resetModules(); // fresh in-memory rate limiter per call
  const { POST } = await import('@/app/api/providers/route');
  const errSpy = vi.mocked(console.error);
  errSpy.mockClear();
  const res = await POST(
    new NextRequest('http://localhost:3000/api/providers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
  const text = await res.text();
  const serverLog = errSpy.mock.calls
    .filter((c) => String(c[0]).includes('Provider create error'))
    .map((c) => (c[1] instanceof Error ? `${c[1].name}: ${c[1].message}` : JSON.stringify(c[1])));
  console.info(`[606] status=${res.status} bytes=${Buffer.byteLength(text)} body=${text}`);
  if (serverLog.length) console.info(`[606] server-side cause: ${serverLog.join(' | ')}`);
  return { status: res.status, text, serverLog };
}

beforeAll(async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = URL_;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ANON;
  process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE;
  const { data: list } = await admin.auth.admin.listUsers();
  const existing = list?.users.find((u) => u.email === EMAIL);
  if (!existing) {
    const { error } = await admin.auth.admin.createUser({ email: EMAIL, password: PASSWORD, email_confirm: true });
    if (error) throw error;
  }
  const anon = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { data, error } = await anon.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (error) throw error;
  accessToken = data.session!.access_token;
  userId = data.user!.id;
});

afterAll(async () => {
  if (userId) await admin.from('providers').delete().eq('user_created_id', userId);
});

beforeEach(() => {
  cookieJar = {};
});

describe('#606 POST /api/providers, live local stack', () => {
  it('payload size is in the ballpark of the captured 637 bytes', () => {
    const n = Buffer.byteLength(JSON.stringify(recommendPayload(CATEGORY.foodAndDrink_all)));
    console.info(`[606] reconstructed payload bytes=${n}`);
  });

  it('anonymous caller (no cookie) gets 401, not 500', async () => {
    const r = await post(recommendPayload(CATEGORY.turkish_food));
    expect(r.status).toBe(401);
  });

  it('logged-in + section-specific food category (control) persists', async () => {
    cookieJar = { 'sb-access-token': accessToken };
    const r = await post(recommendPayload(CATEGORY.turkish_food));
    expect(r.status).toBe(200);
  });

  // RED on the bug: the user's exact symptom is a 500 with the 37-byte body.
  it('logged-in + "Food & Drink" (all-section, auto-selected for restaurants) must not 500', async () => {
    cookieJar = { 'sb-access-token': accessToken };
    const r = await post(recommendPayload(CATEGORY.foodAndDrink_all));
    expect(r.status).not.toBe(500);
  });

  // The exact category from the production trace at 2026-10-12T05:47:53.048Z.
  it('logged-in + "Other" (all-section, the prod-trace category) must not 500', async () => {
    cookieJar = { 'sb-access-token': accessToken };
    const r = await post(recommendPayload('5e5d910d-d790-4184-a061-9cd74d0950e8'));
    expect(r.status).not.toBe(500);
  });

  it('logged-in + "Services" (all-section, auto-selected for shops) must not 500', async () => {
    cookieJar = { 'sb-access-token': accessToken };
    const r = await post(recommendPayload(CATEGORY.services_all));
    expect(r.status).not.toBe(500);
  });

  it('logged-in + "Community Support" (mosque) branch', async () => {
    cookieJar = { 'sb-access-token': accessToken };
    const r = await post(recommendPayload(CATEGORY.communitySupport_all));
    expect(r.status).not.toBe(500);
  });

  it('expired/garbage token behaves like anonymous (401), not 500', async () => {
    cookieJar = { 'sb-access-token': 'not-a-jwt' };
    const r = await post(recommendPayload(CATEGORY.turkish_food));
    expect(r.status).toBe(401);
  });

  it('an unknown key in the body is a 400 (strict schema), not a 500', async () => {
    cookieJar = { 'sb-access-token': accessToken };
    const r = await post({ ...recommendPayload(CATEGORY.turkish_food), message: 'x' });
    expect(r.status).toBe(400);
  });
});
