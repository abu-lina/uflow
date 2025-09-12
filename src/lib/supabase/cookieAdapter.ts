import { cookies as nextCookies } from 'next/headers';

export const cookieAdapter = {
  get: async (key: string) => {
    const cookies = await nextCookies();
    return cookies.get(key)?.value;
  },
  getAll: async () => {
    // Return all cookies as an array of { name, value }
    const cookies = await nextCookies();
    return cookies
      .getAll()
      .map(({ name, value }: { name: string; value: string }) => ({ name, value }));
  },
  set: (_key: string, _value: string, _options?: unknown) => {
    // No-op in server components
  },
  remove: (_key: string, _options?: unknown) => {
    // No-op in server components
  },
};
