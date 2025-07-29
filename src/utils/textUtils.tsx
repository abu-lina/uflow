import React from 'react';

/**
 * Formats text to style "Allah" with gradient color and Arabic symbol
 */
export function formatAllahText(text: string): React.ReactNode {
  if (!text) return text;

  // Split text by "Allah" or "Allahs" (case insensitive) - using word boundaries
  const parts = text.split(/(\bAllah\b|\bAllahs\b)/gi);

  return parts.map((part, index) => {
    const isAllah = /^Allah$/i.test(part);
    const isAllahs = /^Allahs$/i.test(part);

    if (isAllah || isAllahs) {
      return (
        <span
          key={index}
          style={{
            background:
              'linear-gradient(180deg, #D2B581 -49.22%, #DCC391 -3.81%, #AF8650 88.33%, #E5D1A0 228.56%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            display: 'inline-block',
          }}
        >
          {part} ﷲ
        </span>
      );
    }

    return part;
  });
}

/**
 * Formats text to style "Allah" with gradient color and Arabic symbol (string version)
 */
export function formatAllahTextString(text: string): string {
  if (!text) return text;

  return text.replace(/(\bAllah\b|\bAllahs\b)/gi, (match) => {
    return `${match} ﷲ`;
  });
}
