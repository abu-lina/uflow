import { describe, it, expect } from 'vitest';
import { buildCardsFromClientDataset } from '@/utils/muslimbusiness-client-dataset';

describe('buildCardsFromClientDataset', () => {
  it('joins locations and branchen by relation tables', () => {
    const cards = buildCardsFromClientDataset({
      businesses: [
        {
          id: 1,
          name: 'Example Business',
          email: 'info@example.com',
          telefonnummer: '012345',
          social_media: 'example.handle',
          link: 'https://example.com',
        },
      ],
      standorte: [
        { id: 10, standort: 'Berlin' },
        { id: 11, standort: 'Hamburg' },
      ],
      branchen: [
        { id: 20, branche: 'IT' },
        { id: 21, branche: 'Marketing' },
      ],
      standortRelations: [
        { id_business: 1, id_standort: 10 },
        { id_business: 1, id_standort: 11 },
      ],
      brancheRelations: [
        { id_business: 1, id_branche: 20 },
        { id_business: 1, id_branche: 21 },
      ],
    });

    expect(cards).toHaveLength(1);
    expect(cards[0].name).toBe('Example Business');
    expect(cards[0].standorte).toBe('Berlin, Hamburg');
    expect(cards[0].branchen).toBe('IT, Marketing');
    expect(cards[0].email).toBe('info@example.com');
    expect(cards[0].telefon).toBe('012345');
    expect(cards[0].socialMedia).toBe('example.handle');
  });

  it('falls back to link when social_media is empty', () => {
    const cards = buildCardsFromClientDataset({
      businesses: [
        { id: 1, name: 'Example', social_media: '', link: 'https://example.com' },
      ],
      standorte: [],
      branchen: [],
      standortRelations: [],
      brancheRelations: [],
    });

    expect(cards[0].socialMedia).toBe('https://example.com');
  });
});
