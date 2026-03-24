export interface MuslimBusinessSourceBusiness {
  id: number;
  name: string | null;
  email?: string | null;
  telefonnummer?: string | null;
  social_media?: string | null;
  link?: string | null;
}

export interface MuslimBusinessSourceStandort {
  id: number;
  standort: string | null;
}

export interface MuslimBusinessSourceBranche {
  id: number;
  branche: string | null;
}

export interface MuslimBusinessSourceBusinessStandortRelation {
  id_business: number;
  id_standort: number;
}

export interface MuslimBusinessSourceBusinessBrancheRelation {
  id_business: number;
  id_branche: number;
}

export interface ClientDatasetInput {
  businesses: MuslimBusinessSourceBusiness[];
  standorte: MuslimBusinessSourceStandort[];
  branchen: MuslimBusinessSourceBranche[];
  standortRelations: MuslimBusinessSourceBusinessStandortRelation[];
  brancheRelations: MuslimBusinessSourceBusinessBrancheRelation[];
}

export interface ClientDatasetCard {
  id: number;
  name: string;
  standorte: string;
  branchen: string;
  email: string;
  telefon: string;
  socialMedia: string;
}

export function buildCardsFromClientDataset(input: ClientDatasetInput): ClientDatasetCard[] {
  const standortById = new Map<number, string>();
  for (const standort of input.standorte) {
    if (standort?.id == null) continue;
    standortById.set(standort.id, (standort.standort ?? '').trim());
  }

  const brancheById = new Map<number, string>();
  for (const branche of input.branchen) {
    if (branche?.id == null) continue;
    brancheById.set(branche.id, (branche.branche ?? '').trim());
  }

  const standorteByBusinessId = new Map<number, string[]>();
  for (const rel of input.standortRelations) {
    const value = standortById.get(rel.id_standort);
    if (!value) continue;
    const list = standorteByBusinessId.get(rel.id_business) ?? [];
    list.push(value);
    standorteByBusinessId.set(rel.id_business, list);
  }

  const branchenByBusinessId = new Map<number, string[]>();
  for (const rel of input.brancheRelations) {
    const value = brancheById.get(rel.id_branche);
    if (!value) continue;
    const list = branchenByBusinessId.get(rel.id_business) ?? [];
    list.push(value);
    branchenByBusinessId.set(rel.id_business, list);
  }

  return input.businesses
    .map((business) => {
      const name = (business.name ?? '').trim();
      const standorte = (standorteByBusinessId.get(business.id) ?? []).join(', ');
      const branchen = (branchenByBusinessId.get(business.id) ?? []).join(', ');

      const email = (business.email ?? '').trim();
      const telefon = (business.telefonnummer ?? '').trim();

      const socialMedia = ((business.social_media ?? '').trim() || (business.link ?? '').trim());

      return {
        id: business.id,
        name,
        standorte,
        branchen,
        email,
        telefon,
        socialMedia,
      } satisfies ClientDatasetCard;
    })
    .filter((card) => Boolean(card.name));
}
