-- Create the site_content table
CREATE TABLE IF NOT EXISTS site_content (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  data JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create an index on key for fast lookups
CREATE INDEX IF NOT EXISTS site_content_key_idx ON site_content(key);

-- Set up Row Level Security
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;

-- Only authenticated admin users can read/write
-- Note: Replace 'authenticated' with 'service_role' or a custom role if needed
CREATE POLICY "Admins can manage site content"
  ON site_content
  FOR ALL
  TO authenticated
  USING (auth.role() = 'authenticated');

-- Allow read access to everyone (public)
CREATE POLICY "Public can read site content"
  ON site_content
  FOR SELECT
  TO public
  USING (true);
