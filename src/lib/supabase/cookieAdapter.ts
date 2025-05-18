import { cookies as nextCookies } from 'next/headers';

export const cookieAdapter = {
  get: (key: string) => {
    return nextCookies().get(key)?.value;
  },
  getAll: () => {
    // Return all cookies as an array of { name, value }
    return nextCookies()
      .getAll()
      .map(({ name, value }) => ({ name, value }));
  },
  set: (_key: string, _value: string, _options?: unknown) => {
    // No-op in server components
  },
  remove: (_key: string, _options?: unknown) => {
    // No-op in server components
  },
};
