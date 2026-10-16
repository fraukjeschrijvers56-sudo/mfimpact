// Conditional imports - use in-memory for Vercel, SQLite for local
let Database: any;
let db: any = null;

// Check if we're on Vercel or if better-sqlite3 is unavailable
const isVercel = process.env.VERCEL === '1' || process.env.NEXT_PUBLIC_VERCEL_ENV;

export function getDb() {
  if (!db) {
    if (isVercel) {
      // Use in-memory database on Vercel
      const { MemoryDatabase } = require('./db-memory');
      db = new MemoryDatabase();
    } else {
      // Use SQLite locally
      try {
        Database = require('better-sqlite3');
        const { join } = require('path');
        const { mkdirSync, existsSync } = require('fs');
        const dataDir = join(process.cwd(), 'data');
        if (!existsSync(dataDir)) {
          mkdirSync(dataDir, { recursive: true });
        }
        const dbPath = join(dataDir, 'mvo.db');
        db = new Database(dbPath);
        initDb(db);
      } catch (error) {
        // Fallback to in-memory if SQLite fails
        console.warn('SQLite unavailable, using in-memory database');
        const { MemoryDatabase } = require('./db-memory');
        db = new MemoryDatabase();
      }
    }
  }
  return db;
}

function initDb(db: any) {
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

export type {
  Client,
  ClientStatus,
  EvidenceItem,
  ScanAnswer,
  GapItem,
  Legislation,
  ClaimCheck,
} from './db-types';
