import Database from 'better-sqlite3';
import { join } from 'path';

let db: Database.Database | null = null;

export function getDb() {
  if (!db) {
    const dbPath = join(process.cwd(), 'data', 'mvo.db');
    db = new Database(dbPath);
    initDb(db);
  }
  return db;
}

function initDb(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      naam TEXT NOT NULL,
      kvk TEXT,
      sector TEXT,
      aantal_medewerkers INTEGER,
      omzet REAL,
      balanstotaal REAL,
      afnemers TEXT,
      banken TEXT,
      tenders TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS client_status (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      stap TEXT NOT NULL,
      status TEXT NOT NULL,
      notitie TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS evidence_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      titel TEXT NOT NULL,
      type TEXT NOT NULL,
      link_notitie TEXT,
      datum DATE,
      geldig_tot DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS scan_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      question_key TEXT NOT NULL,
      answer TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      UNIQUE(client_id, category, question_key)
    );

    CREATE TABLE IF NOT EXISTS gap_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      gap_title TEXT NOT NULL,
      priority TEXT NOT NULL,
      suggested_evidence TEXT,
      status TEXT DEFAULT 'open',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS legislation (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      naam TEXT NOT NULL,
      type TEXT NOT NULL,
      niveau TEXT NOT NULL,
      status TEXT NOT NULL,
      peildatum DATE,
      drempels TEXT,
      doorwerking TEXT,
      bronlink TEXT,
      te_verifieren INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS claim_checks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      claim_text TEXT NOT NULL,
      result TEXT NOT NULL,
      risks TEXT,
      suggestions TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );
  `);
}

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
