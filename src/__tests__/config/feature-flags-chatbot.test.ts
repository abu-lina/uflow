import { describe, it, expect, afterEach } from 'vitest';
import {
  defaultFeatureFlags,
  getFeatureFlag,
  getAllFeatureFlags,
} from '@/config/feature-flags';

describe('enableChatbot feature flag', () => {
  afterEach(() => {
    // Clean up env var overrides
    delete process.env.NEXT_PUBLIC_FEATURE_ENABLECHATBOT;
  });

  it('defaults to false', () => {
    expect(defaultFeatureFlags.enableChatbot).toBe(false);
  });

  it('getFeatureFlag returns false by default', () => {
    expect(getFeatureFlag('enableChatbot')).toBe(false);
  });

  it('getAllFeatureFlags includes enableChatbot as false', () => {
    const flags = getAllFeatureFlags();
    expect(flags.enableChatbot).toBe(false);
  });

  it('can be enabled via env var NEXT_PUBLIC_FEATURE_ENABLECHATBOT', () => {
    process.env.NEXT_PUBLIC_FEATURE_ENABLECHATBOT = 'true';
    expect(getFeatureFlag('enableChatbot')).toBe(true);
  });

  it('env var "false" keeps it disabled', () => {
    process.env.NEXT_PUBLIC_FEATURE_ENABLECHATBOT = 'false';
    expect(getFeatureFlag('enableChatbot')).toBe(false);
  });

  it('can be enabled via runtime overrides', () => {
    expect(getFeatureFlag('enableChatbot', { enableChatbot: true })).toBe(true);
  });
});
