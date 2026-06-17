import { describe, it, expect } from 'vitest';
import { getRecommendationIcon } from '@/utils/chat-icons';
import { UtensilsCrossed, MapPin, Plus, Sparkles } from 'lucide-react';

describe('getRecommendationIcon', () => {
  it('returns UtensilsCrossed for food keywords', () => {
    expect(getRecommendationIcon('Türkisch').type).toBe(UtensilsCrossed);
  });

  it('returns MapPin for city keywords', () => {
    expect(getRecommendationIcon('Berlin').type).toBe(MapPin);
  });

  it('returns Plus for registration keywords', () => {
    expect(getRecommendationIcon('Registrieren').type).toBe(Plus);
  });

  it('returns Sparkles for unknown keywords', () => {
    expect(getRecommendationIcon('Etwas ganz anderes').type).toBe(Sparkles);
  });
});
