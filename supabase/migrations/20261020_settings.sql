-- Settings table for application configuration (huisstijl, etc.)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for updated_at queries
CREATE INDEX IF NOT EXISTS idx_settings_updated_at ON settings(updated_at);

-- Example huisstijl settings (optional initial data)
-- INSERT INTO settings (key, value) VALUES 
-- ('huisstijl', '{"primary_color": "#10b981", "secondary_color": "#3b82f6", "font": "Aptos"}'::jsonb)
-- ON CONFLICT (key) DO NOTHING;
