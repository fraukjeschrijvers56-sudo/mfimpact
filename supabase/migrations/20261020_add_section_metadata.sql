-- Migration: Add per-section metadata and raw research storage
-- Date: 2026-10-20
-- Backwards compatible: additive only, no breaking changes

-- Add columns to clients table for raw research and section metadata
ALTER TABLE clients ADD COLUMN IF NOT EXISTS onderzoek_ruw JSONB DEFAULT '{}'::jsonb;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS section_metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS edited_fields JSONB DEFAULT '[]'::jsonb;

-- Create dossier_versions table for history
CREATE TABLE IF NOT EXISTS dossier_versions (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  version_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dossier_snapshot JSONB NOT NULL,
  section_name TEXT,
  changed_by TEXT,
  change_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dossier_versions_client_id ON dossier_versions(client_id);
CREATE INDEX IF NOT EXISTS idx_dossier_versions_timestamp ON dossier_versions(version_timestamp DESC);

-- Create section_jobs table for async execution tracking
CREATE TABLE IF NOT EXISTS section_jobs (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  section_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued', -- queued, running, done, error
  progress INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_section_jobs_client_section ON section_jobs(client_id, section_name);
CREATE INDEX IF NOT EXISTS idx_section_jobs_status ON section_jobs(status);
CREATE INDEX IF NOT EXISTS idx_section_jobs_created ON section_jobs(created_at DESC);

COMMENT ON TABLE dossier_versions IS 'Versiegeschiedenis van dossiers per sectie';
COMMENT ON TABLE section_jobs IS 'Async uitvoering tracking per sectie';
COMMENT ON COLUMN clients.onderzoek_ruw IS 'Raw research data (bronnen, citaten, gelezen paginas)';
COMMENT ON COLUMN clients.section_metadata IS 'Per-section metadata (updated_at, versions, status)';
COMMENT ON COLUMN clients.edited_fields IS 'List of manually edited field paths';
