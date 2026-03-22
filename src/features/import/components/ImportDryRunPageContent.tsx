'use client';

import { useState } from 'react';
import { buildCliWriteCommand, type ImportLimit, type DryRunResult } from '@/lib/import/joinhalal';

const LIMIT_OPTIONS: { value: ImportLimit; label: string }[] = [
  { value: 10, label: '10 records' },
  { value: 50, label: '50 records' },
  { value: 100, label: '100 records' },
  { value: 'all', label: 'All records (may be slow)' },
];

type State =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'result'; data: DryRunResult; limit: ImportLimit }
  | { phase: 'error'; message: string };

export function ImportDryRunPageContent() {
  const [limit, setLimit] = useState<ImportLimit>(10);
  const [state, setState] = useState<State>({ phase: 'idle' });
  const [copied, setCopied] = useState(false);

  async function runPreview() {
    setState({ phase: 'loading' });
    try {
      const resp = await fetch('/api/admin/import-joinhalal/dry-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit }),
      });
      const json = await resp.json();
      if (!resp.ok) {
        setState({ phase: 'error', message: json.error ?? 'Preview failed' });
        return;
      }
      setState({ phase: 'result', data: json as DryRunResult, limit });
    } catch (err) {
      setState({
        phase: 'error',
        message: err instanceof Error ? err.message : 'Network error',
      });
    }
  }

  async function copyCommand(cmd: string) {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available — silent fail
    }
  }

  return (
    <div className="container mx-auto max-w-5xl p-4 md:p-6">
      <h1 className="mb-2 text-2xl font-bold">JoinHalal Import — Dry-Run Preview</h1>
      <p className="mb-6 text-sm text-gray-500">
        This is a <strong>dry-run preview only</strong>. No data will be written to the database.
        Use the CLI write command below to execute an actual import.
      </p>

      {/* Controls */}
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="import-limit">
            Limit
          </label>
          <select
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            disabled={state.phase === 'loading'}
            id="import-limit"
            value={String(limit)}
            onChange={(e) => {
              const v = e.target.value;
              setLimit(v === 'all' ? 'all' : (Number(v) as ImportLimit));
            }}
          >
            {LIMIT_OPTIONS.map((opt) => (
              <option key={String(opt.value)} value={String(opt.value)}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <button
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={state.phase === 'loading'}
          type="button"
          onClick={runPreview}
        >
          {state.phase === 'loading' ? 'Running…' : 'Run Dry-Run Preview'}
        </button>
      </div>

      {/* Loading */}
      {state.phase === 'loading' && (
        <div className="flex items-center gap-2 text-sm text-gray-600" role="status">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          Running dry-run preview…
        </div>
      )}

      {/* Error */}
      {state.phase === 'error' && (
        <div
          className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          role="alert"
        >
          <strong>Preview failed:</strong> {state.message}
        </div>
      )}

      {/* Results */}
      {state.phase === 'result' && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
                Dry-Run Summary
              </h2>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {[
                  { label: 'URLs discovered', value: state.data.stats.total },
                  { label: 'Successfully parsed', value: state.data.stats.parsed },
                  { label: 'Category mapped', value: state.data.stats.mapped },
                  { label: 'Unmapped category', value: state.data.stats.unmapped },
                  { label: 'Skipped (duplicate)', value: state.data.stats.skipped },
                  { label: 'Parse failures', value: state.data.stats.failed },
                  { label: 'Would INSERT', value: state.data.stats.wouldInsert },
                  { label: 'Would UPDATE', value: state.data.stats.wouldUpdate },
                ].map(({ label, value }) => (
                  <tr key={label} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-2 text-gray-500">{label}</td>
                    <td className="px-4 py-2 text-right font-medium text-gray-900">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Unmapped categories */}
          {state.data.unmappedGroups.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <h2 className="mb-2 text-sm font-semibold text-amber-800">
                Unmapped Categories ({state.data.unmappedGroups.length})
              </h2>
              <ul className="space-y-1 text-sm text-amber-700">
                {state.data.unmappedGroups.map((g) => (
                  <li key={g.sourceCategory}>
                    <span className="font-mono">&quot;{g.sourceCategory}&quot;</span> — {g.count}{' '}
                    record{g.count !== 1 ? 's' : ''}, e.g. &quot;{g.example}&quot;
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Sample records */}
          {state.data.samples.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
                  Sample Records (first {state.data.samples.length})
                </h2>
              </div>
              <ul className="divide-y divide-gray-100">
                {state.data.samples.map((r, i) => (
                  <li key={i} className="px-4 py-3 text-sm">
                    <p className="font-medium text-gray-900">{r.provider_name}</p>
                    <p className="text-gray-500">
                      {r.address_city ?? '—'} · {r.category_id ?? 'UNMAPPED'} ·{' '}
                      {r.address_street ?? '—'}
                    </p>
                    {r.social_website && (
                      <p className="truncate text-gray-400">{r.social_website}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* CLI write command */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h2 className="mb-2 text-sm font-semibold text-gray-700">
              To execute this import, run in your terminal:
            </h2>
            <div className="flex items-center gap-2">
              <code className="flex-1 overflow-x-auto rounded bg-gray-800 px-3 py-2 font-mono text-sm text-green-400">
                {buildCliWriteCommand(state.limit)}
              </code>
              <button
                className="shrink-0 rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
                type="button"
                onClick={() => copyCommand(buildCliWriteCommand(state.limit))}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-400">
              This command writes to the database — run it only after reviewing the dry-run results
              above.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
