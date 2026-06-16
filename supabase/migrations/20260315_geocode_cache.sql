-- Geocode cache: stores resolved lat/lng for property addresses
-- Used by the map view to avoid re-geocoding on every load.

CREATE TABLE IF NOT EXISTS public.geocode_cache (
  address_key TEXT PRIMARY KEY,
  lat NUMERIC NOT NULL,
  lng NUMERIC NOT NULL,
  raw_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS gc_created_idx ON public.geocode_cache (created_at DESC);

-- RLS: anyone can read, only service role can write
ALTER TABLE public.geocode_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access for all" ON public.geocode_cache;
CREATE POLICY "Allow read access for all"
  ON public.geocode_cache FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow service role full access" ON public.geocode_cache;
CREATE POLICY "Allow service role full access"
  ON public.geocode_cache FOR ALL
  USING (auth.role() = 'service_role');
