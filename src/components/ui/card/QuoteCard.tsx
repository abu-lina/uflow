'use client';

import { Card, CardContent } from '@/components/ui/card/card';
import { QUOTES } from '@/constants/quotes';

export function QuoteCard() {
  return (
    <Card>
      <CardContent className="p-6">
        <blockquote className="text-lg italic">
          &quot;{QUOTES[0].text}&quot;
          <footer className="mt-4 text-right">- {QUOTES[0].author}</footer>
        </blockquote>
      </CardContent>
    </Card>
  );
}

QuoteCard.displayName = 'QuoteCard';
