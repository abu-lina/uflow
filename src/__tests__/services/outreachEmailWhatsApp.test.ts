/**
 * Tests for WhatsApp contact URL configuration
 * Plan 040: Replace hardcoded WhatsApp number with WHATSAPP_CONTACT_NUMBER
 *
 * TDD: These tests are written BEFORE implementation.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('getWhatsAppContactUrl', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns wa.me URL when WHATSAPP_CONTACT_NUMBER is configured', async () => {
    process.env.WHATSAPP_CONTACT_NUMBER = '4915123456789';
    const { getWhatsAppContactUrl } = await import('@/services/email/outreachEmail');
    expect(getWhatsAppContactUrl()).toBe('https://wa.me/4915123456789');
  });

  it('returns null when WHATSAPP_CONTACT_NUMBER is not set', async () => {
    delete process.env.WHATSAPP_CONTACT_NUMBER;
    const { getWhatsAppContactUrl } = await import('@/services/email/outreachEmail');
    expect(getWhatsAppContactUrl()).toBeNull();
  });

  it('returns null when WHATSAPP_CONTACT_NUMBER is empty string', async () => {
    process.env.WHATSAPP_CONTACT_NUMBER = '';
    const { getWhatsAppContactUrl } = await import('@/services/email/outreachEmail');
    expect(getWhatsAppContactUrl()).toBeNull();
  });

  it('returns null when WHATSAPP_CONTACT_NUMBER is whitespace only', async () => {
    process.env.WHATSAPP_CONTACT_NUMBER = '   ';
    const { getWhatsAppContactUrl } = await import('@/services/email/outreachEmail');
    expect(getWhatsAppContactUrl()).toBeNull();
  });

  it('strips non-digit characters from the number', async () => {
    process.env.WHATSAPP_CONTACT_NUMBER = '+49 151 2345 6789';
    const { getWhatsAppContactUrl } = await import('@/services/email/outreachEmail');
    expect(getWhatsAppContactUrl()).toBe('https://wa.me/4915123456789');
  });
});

describe('outreach email WhatsApp CTA rendering', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('includes WhatsApp CTA with configured number in DE template', async () => {
    process.env.WHATSAPP_CONTACT_NUMBER = '4915199999999';
    process.env.RESEND_API_KEY = 'test-key';
    const { getOutreachEmailHtml } = await import('@/services/email/outreachEmail');
    const html = getOutreachEmailHtml({
      language: 'de',
      tokenUrl: 'https://example.com/token',
      providerName: 'Test Provider',
    });
    expect(html).toContain('https://wa.me/4915199999999');
    expect(html).toContain('WhatsApp');
    expect(html).not.toContain('4915123456789');
  });

  it('includes WhatsApp CTA with configured number in EN template', async () => {
    process.env.WHATSAPP_CONTACT_NUMBER = '4915199999999';
    process.env.RESEND_API_KEY = 'test-key';
    const { getOutreachEmailHtml } = await import('@/services/email/outreachEmail');
    const html = getOutreachEmailHtml({
      language: 'en',
      tokenUrl: 'https://example.com/token',
      providerName: 'Test Provider',
    });
    expect(html).toContain('https://wa.me/4915199999999');
    expect(html).toContain('WhatsApp');
    expect(html).not.toContain('4915123456789');
  });

  it('omits WhatsApp CTA section when number is not configured', async () => {
    delete process.env.WHATSAPP_CONTACT_NUMBER;
    process.env.RESEND_API_KEY = 'test-key';
    const { getOutreachEmailHtml } = await import('@/services/email/outreachEmail');
    const html = getOutreachEmailHtml({
      language: 'de',
      tokenUrl: 'https://example.com/token',
      providerName: 'Test Provider',
    });
    expect(html).not.toContain('wa.me');
    expect(html).not.toContain('WhatsApp');
    expect(html).not.toContain('4915123456789');
  });
});
