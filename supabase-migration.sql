-- MVO-bewijs Werkbank Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Main clients table
CREATE TABLE IF NOT EXISTS clients (
  id BIGSERIAL PRIMARY KEY,
  naam TEXT NOT NULL,
  kvk TEXT,
  sector TEXT,
  aantal_medewerkers INTEGER,
  omzet NUMERIC,
  balanstotaal NUMERIC,
  afnemers TEXT,
  banken TEXT,
  tenders TEXT,
  website_url TEXT,
  plaats TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Client status tracking
CREATE TABLE IF NOT EXISTS client_status (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  stap TEXT NOT NULL,
  status TEXT NOT NULL,
  notitie TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Evidence/proof items
CREATE TABLE IF NOT EXISTS evidence_items (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  titel TEXT NOT NULL,
  type TEXT NOT NULL,
  link_notitie TEXT,
  datum DATE,
  geldig_tot DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scan answers (VSME B1-B11 etc.)
CREATE TABLE IF NOT EXISTS scan_answers (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  question_key TEXT NOT NULL,
  answer TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, category, question_key)
);

-- Gap analysis items
CREATE TABLE IF NOT EXISTS gap_items (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  gap_title TEXT NOT NULL,
  priority TEXT NOT NULL,
  suggested_evidence TEXT,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Legislation/regulations reference data
CREATE TABLE IF NOT EXISTS legislation (
  id BIGSERIAL PRIMARY KEY,
  naam TEXT NOT NULL,
  type TEXT NOT NULL,
  niveau TEXT NOT NULL,
  status TEXT NOT NULL,
  peildatum DATE,
  drempels TEXT,
  doorwerking TEXT,
  bronlink TEXT,
  te_verifieren INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Claim checks (ECGT + ACM)
CREATE TABLE IF NOT EXISTS claimcheck (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  claim_text TEXT NOT NULL,
  result TEXT NOT NULL,
  risks TEXT,
  suggestions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_status_client_id ON client_status(client_id);
CREATE INDEX IF NOT EXISTS idx_evidence_items_client_id ON evidence_items(client_id);
CREATE INDEX IF NOT EXISTS idx_scan_answers_client_id ON scan_answers(client_id);
CREATE INDEX IF NOT EXISTS idx_gap_items_client_id ON gap_items(client_id);
CREATE INDEX IF NOT EXISTS idx_gap_items_status ON gap_items(status);
CREATE INDEX IF NOT EXISTS idx_claimcheck_client_id ON claimcheck(client_id);

-- Updated_at trigger for clients
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) - Optional, enable if needed
-- ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE client_status ENABLE ROW LEVEL SECURITY;
-- etc.

-- Grant permissions (adjust as needed for your service role)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
