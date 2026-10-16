export interface Client {
  id?: number;
  naam: string;
  kvk?: string;
  sector?: string;
  aantal_medewerkers?: number;
  omzet?: number;
  balanstotaal?: number;
  afnemers?: string;
  banken?: string;
  tenders?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ClientStatus {
  id?: number;
  client_id: number;
  stap: string;
  status: string;
  notitie?: string;
  updated_at?: string;
}

export interface EvidenceItem {
  id?: number;
  client_id: number;
  titel: string;
  type: string;
  link_notitie?: string;
  datum?: string;
  geldig_tot?: string;
  created_at?: string;
}

export interface ScanAnswer {
  id?: number;
  client_id: number;
  category: string;
  question_key: string;
  answer?: string;
  updated_at?: string;
}

export interface GapItem {
  id?: number;
  client_id: number;
  gap_title: string;
  priority: string;
  suggested_evidence?: string;
  status?: string;
  created_at?: string;
}

export interface Legislation {
  id?: number;
  naam: string;
  type: string;
  niveau: string;
  status: string;
  peildatum?: string;
  drempels?: string;
  doorwerking?: string;
  bronlink?: string;
  te_verifieren?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ClaimCheck {
  id?: number;
  client_id: number;
  claim_text: string;
  result: string;
  risks?: string;
  suggestions?: string;
  created_at?: string;
}
