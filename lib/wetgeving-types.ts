export interface WetgevingArtikel {
  artikel: string;
  onderwerp: string;
  citaat: string;
}

export interface WetgevingWijziging {
  titel: string;
  nummer: string;
  url: string;
  effect: string;
}

export interface WetgevingBron {
  key: string;
  label: string;
  titel: string;
  nummer: string;
  celex_of_bwb: string;
  url: string;
  url_artikel: string;
  artikelen: WetgevingArtikel[];
  wijzigingen: WetgevingWijziging[];
  toelichting_url: string;
  status_wet: 'wet' | 'norm' | 'aanbeveling' | string;
  geverifieerd: boolean;
  opmerking: string;
}

export interface LegalWijzigingLink {
  label: string;
  url: string;
}

export interface LegalSourceDisplay {
  key: string;
  bronLabel: string;
  urlArtikel: string;
  toelichtingUrl?: string;
  wijzigingen: LegalWijzigingLink[];
  geverifieerd: boolean;
  opmerking?: string;
  normGeenWet: boolean;
  statusWet: string;
}
