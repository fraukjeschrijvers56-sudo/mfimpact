-- Add full dossier JSONB column to clients table
-- Run this in Supabase SQL Editor

ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS dossier JSONB;

-- Add index for JSONB queries (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_clients_dossier ON clients USING GIN (dossier);

-- Comment explaining the structure
COMMENT ON COLUMN clients.dossier IS 'Full research dossier with structured data: profiel, ketenrisico, vsme_basic, claims, gaten, doorzochte_bronnen. Each field has: {waarde, status, bronnen:[{url,citaat,datum}]}';
