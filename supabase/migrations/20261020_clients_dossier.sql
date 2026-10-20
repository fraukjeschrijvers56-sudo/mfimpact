-- Full research dossier JSONB on clients.
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS dossier JSONB;

CREATE INDEX IF NOT EXISTS idx_clients_dossier ON clients USING GIN (dossier);

COMMENT ON COLUMN clients.dossier IS 'Full research dossier with structured data: profiel, ketenrisico, vsme_basic, claims, gaten, doorzochte_bronnen. Each field has: {waarde, status, bronnen:[{url,citaat,datum}]}';
