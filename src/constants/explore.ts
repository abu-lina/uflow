export interface ExploreCard {
  title: string;
  address: string;
  category: string;
  tags: string[];
  imageUrl: string;
  gradient?: boolean;
}

export const exploreCards: ExploreCard[] = [
  {
    title: 'Bilal Moschee',
    address: 'Kornbergstr. 44, 70176 Stuttgart',
    category: 'Moschee',
    tags: ['Iman', 'Zakat', 'Sunnah'],
    imageUrl: 'https://placehold.co/296x269',
  },
  {
    title: 'Wüstenkind e.V.',
    address: 'Fangelsbachstr. 13, 70180 Stuttgart',
    category: 'Zakat',
    tags: ['Iman', 'Zakat', 'Sunnah'],
    imageUrl: 'https://placehold.co/296x269',
    gradient: true,
  },
  {
    title: 'Al-Umma-Moschee',
    address: 'Fangelsbachstr. 13, 70180 Stuttgart',
    category: 'Moschee',
    tags: ['Iman', 'Zakat', 'Sunnah'],
    imageUrl: 'https://placehold.co/296x269',
  },
  {
    title: 'Café Blüte',
    address: 'Schlossstr. 13, 70176 Stuttgart',
    category: 'Cafe & Restaurants',
    tags: ['Halal', 'Zakat'],
    imageUrl: 'https://placehold.co/296x269',
  },
];
