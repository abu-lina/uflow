import { inspect } from 'node:util';
import { vi } from 'vitest';

export const PROBE_EMAIL = 'pii-probe@example.test';
export const PROBE_IP = '203.0.113.77';
export const PROBE_TEST_KEY = 'FAKE-TEST-KEY-0123456789';
export const PROBE_TOKEN = 'probe-token-abcdef0123456789';

const CONSOLE_METHODS = ['log', 'info', 'warn', 'error', 'debug'] as const;

export function spyOnConsole(): void {
  for (const method of CONSOLE_METHODS) {
    vi.spyOn(console, method).mockImplementation(() => {});
  }
}

function serialise(arg: unknown): string[] {
  let json = '';
  try {
    json = JSON.stringify(arg) ?? '';
  } catch {
    json = '';
  }
  return [json, String(arg), inspect(arg, { depth: Infinity, showHidden: true })];
}

/** Every captured console argument, serialised with JSON.stringify, String and util.inspect. */
export function capturedLogArgs(): string[] {
  return CONSOLE_METHODS.flatMap((method) =>
    vi.mocked(console[method]).mock.calls.flatMap((call) => call.flatMap(serialise)),
  );
}

export function leakedValues(values: string[]): string[] {
  const logs = capturedLogArgs();
  return values.filter((value) => logs.some((log) => log.includes(value)));
}

export function sixCharSubstrings(value: string): string[] {
  return Array.from({ length: value.length - 5 }, (_, index) => value.slice(index, index + 6));
}
