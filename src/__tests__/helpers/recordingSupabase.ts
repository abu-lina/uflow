import type { SupabaseClient } from '@supabase/supabase-js';

export interface RecordedQuery {
  table: string;
  action: 'select' | 'insert' | 'update';
  values?: Record<string, unknown>;
  filters: Array<[string, unknown[]]>;
}

type Result = { data?: unknown; error?: { message: string; code?: string } | null };

/** Chainable fake: records every call and resolves via `onQuery` when awaited. */
export function recordingSupabase(onQuery: (q: RecordedQuery) => Result): SupabaseClient {
  const builder = (q: RecordedQuery): unknown =>
    new Proxy(
      {},
      {
        get(_t, prop: string) {
          if (prop === 'then') {
            return (resolve: (r: Result) => void) => {
              const r = onQuery(q);
              resolve({ data: r.data ?? null, error: r.error ?? null });
            };
          }
          if (prop === 'maybeSingle') {
            return () => {
              const r = onQuery(q);
              const rows = Array.isArray(r.data) ? r.data : r.data ? [r.data] : [];
              return Promise.resolve({ data: rows[0] ?? null, error: r.error ?? null });
            };
          }
          return (...args: unknown[]) => {
            q.filters.push([prop, args]);
            return builder(q);
          };
        },
      },
    );

  return {
    from: (table: string) => ({
      select: (...args: unknown[]) =>
        builder({ table, action: 'select', filters: [['select', args]] }),
      insert: (values: Record<string, unknown>) =>
        builder({ table, action: 'insert', values, filters: [] }),
      update: (values: Record<string, unknown>) =>
        builder({ table, action: 'update', values, filters: [] }),
    }),
  } as unknown as SupabaseClient;
}

export const hasFilter = (q: RecordedQuery, method: string, ...args: unknown[]) =>
  q.filters.some(([m, a]) => m === method && args.every((v, i) => a[i] === v));
