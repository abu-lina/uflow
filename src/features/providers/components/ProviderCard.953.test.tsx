import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const cardSource = readFileSync(resolve(__dirname, 'ProviderCard.tsx'), 'utf8');

describe('#953 ProviderCard: virtual venue → delivery only label', () => {
  it('renders a translated deliveryOnly label when address contains "virtual venue"', () => {
    expect(cardSource).toContain('providers.deliveryOnly');
  });

  it('checks for "virtual venue" in address_street to detect virtual providers', () => {
    expect(cardSource).toContain('virtual venue');
  });
});
