// Vitest config for the #606 live reproduction. Reuses the repo config but
// replaces (not appends) `include`, so only the harness runs.
import base from '../../vitest.config';
import type { UserConfig } from 'vitest/config';

const cfg = base as UserConfig;
export default {
  ...cfg,
  test: { ...cfg.test, include: ['./agent-output/artifacts/606-*.test.ts'], testTimeout: 30000 },
};
