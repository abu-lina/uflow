import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SCRIPT = resolve(process.cwd(), 'scripts/verify-vapid-config.js');
const source = readFileSync(SCRIPT, 'utf8');

describe('#967 verify-vapid-config.js contains only valid JavaScript', () => {
  it('criterion 1: no XML or think tags in the script', () => {
    expect(source).not.toMatch(/<think>/);
    expect(source).not.toMatch(/<\/think>/);
    expect(source).not.toMatch(/<｜tool/);
    expect(source).not.toMatch(/run_terminal_cmd/);
  });

  it('criterion 2: script runs without error', () => {
    const result = execSync(`node ${SCRIPT}`, {
      encoding: 'utf8',
      env: {
        ...process.env,
        NEXT_PUBLIC_VAPID_PUBLIC_KEY: '',
        VAPID_PRIVATE_KEY: '',
        VAPID_EMAIL: '',
      },
    });
    expect(result).toContain('VAPID');
  });

  it('criterion 3: VAPID verification logic checks all three env vars', () => {
    expect(source).toContain('NEXT_PUBLIC_VAPID_PUBLIC_KEY');
    expect(source).toContain('VAPID_PRIVATE_KEY');
    expect(source).toContain('VAPID_EMAIL');
  });
});
