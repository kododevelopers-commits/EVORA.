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

-- Create the visitors table for analytics tracking
CREATE TABLE IF NOT EXISTS visitors (
  id TEXT PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  day TEXT NOT NULL,
  path TEXT NOT NULL,
  referrer TEXT
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS visitors_day_idx ON visitors(day);
CREATE INDEX IF NOT EXISTS visitors_ts_idx ON visitors(ts DESC);

-- Set up Row Level Security
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;

-- Only authenticated admin users can read/write
CREATE POLICY "Admins can manage visitors"
  ON visitors
  FOR ALL
  TO authenticated
  USING (auth.role() = 'authenticated');

-- Allow read access to everyone (public) - for analytics API
CREATE POLICY "Public can read visitors"
  ON visitors
  FOR SELECT
  TO public
  USING (true);

-- Grant permissions to service_role for server-side operations
GRANT INSERT, SELECT ON public.visitors TO service_role;

-- Create the staff table
CREATE TABLE IF NOT EXISTS staff (
  email TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Set up Row Level Security
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- Only authenticated admin users can read/write
CREATE POLICY "Admins can manage staff"
  ON staff
  FOR ALL
  TO authenticated
  USING (auth.role() = 'authenticated');

-- Grant permissions to service_role for server-side operations
GRANT INSERT, SELECT, UPDATE, DELETE ON public.staff TO service_role;
