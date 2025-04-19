export const CATEGORIES = [
  {
    id: 'lebensmittel',
    label: 'Lebensmittel',
  },
  {
    id: 'mode',
    label: 'Mode',
  },
  {
    id: 'dienstleistungen',
    label: 'Dienstleistungen',
  },
] as const;

export type CategoryId = typeof CATEGORIES[number]['id']; 