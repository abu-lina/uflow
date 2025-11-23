export interface Quote {
  heading: string;
  quote: string;
  author?: string;
}

export const quotes: Quote[] = [
  {
    heading: 'Wo finde ich halal Anbieter?',
    quote:
      'Tausende Muslime suchen nach halal Angeboten in Ihrer Stadt und wenn sie auf Reisen sind. Es gibt sie, aber man findet sie nicht so einfach.Lasst uns das gemeinsam ändern - inshaAllah.',
  },
  {
    heading: 'Ein Marktplatz mit Barakah.',
    quote:
      'Halal. Transparent. In deiner Stadt.<br>Für dich und deine Ummah.'
  },
  {
    heading: 'Alles an einem Ort.',
    quote:
      'Finde muslimische Anbieter.<br>Teile eigene Angebote.<br>Entdecke Barakah in deiner Nähe.',
  },
];
