-- Property search cache with trigram fuzzy search
-- Caches Trestle property data in Supabase for faster lookups & address search

CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE TABLE IF NOT EXISTS public.property_search_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_key TEXT NOT NULL UNIQUE,
  unparsed_address TEXT,
  street_number TEXT,
  street_name TEXT,
  street_suffix TEXT,
  city TEXT,
  county TEXT,
  state TEXT DEFAULT 'PA',
  zip TEXT,
  list_price NUMERIC,
  beds INT,
  baths INT,
  living_area NUMERIC,
  property_type TEXT,
  standard_status TEXT,
  special_listing_conditions TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  primary_photo_url TEXT,
  snapshot JSONB NOT NULL DEFAULT '{}',
  modification_timestamp TIMESTAMPTZ,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigram index on full address for fuzzy search
CREATE INDEX IF NOT EXISTS psc_address_trgm_idx
  ON public.property_search_cache
  USING GIN (unparsed_address gin_trgm_ops);

-- Trigram index on street name for partial match
CREATE INDEX IF NOT EXISTS psc_street_trgm_idx
  ON public.property_search_cache
  USING GIN (street_name gin_trgm_ops);

-- B-tree indexes for exact/range filters
CREATE INDEX IF NOT EXISTS psc_city_idx ON public.property_search_cache (city);
CREATE INDEX IF NOT EXISTS psc_county_idx ON public.property_search_cache (county);
CREATE INDEX IF NOT EXISTS psc_zip_idx ON public.property_search_cache (zip);
CREATE INDEX IF NOT EXISTS psc_status_idx ON public.property_search_cache (standard_status);
CREATE INDEX IF NOT EXISTS psc_price_idx ON public.property_search_cache (list_price);
CREATE INDEX IF NOT EXISTS psc_listing_key_idx ON public.property_search_cache (listing_key);
CREATE INDEX IF NOT EXISTS psc_updated_idx ON public.property_search_cache (updated_at DESC);

-- Composite for common filter combos
CREATE INDEX IF NOT EXISTS psc_county_status_idx
  ON public.property_search_cache (county, standard_status);

-- RLS: bypass via service key, read-only for anon
ALTER TABLE public.property_search_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access for all"
  ON public.property_search_cache FOR SELECT
  USING (true);

CREATE POLICY "Allow service role full access"
  ON public.property_search_cache FOR ALL
  USING (auth.role() = 'service_role');

-- Function: fuzzy address search with similarity scoring
CREATE OR REPLACE FUNCTION search_properties_by_address(
  query_text TEXT,
  similarity_threshold FLOAT DEFAULT 0.15,
  max_results INT DEFAULT 25
)
RETURNS TABLE (
  id UUID,
  listing_key TEXT,
  unparsed_address TEXT,
  city TEXT,
  county TEXT,
  zip TEXT,
  list_price NUMERIC,
  beds INT,
  baths INT,
  living_area NUMERIC,
  standard_status TEXT,
  primary_photo_url TEXT,
  snapshot JSONB,
  similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    c.id, c.listing_key, c.unparsed_address,
    c.city, c.county, c.zip,
    c.list_price, c.beds, c.baths, c.living_area,
    c.standard_status, c.primary_photo_url, c.snapshot,
    GREATEST(
      similarity(c.unparsed_address, query_text),
      similarity(c.street_name, query_text)
    ) AS similarity
  FROM public.property_search_cache c
  WHERE
    c.unparsed_address % query_text
    OR c.street_name % query_text
  ORDER BY similarity DESC
  LIMIT max_results;
$$;

-- Function: full-text + filter search combining trigram with structured filters
CREATE OR REPLACE FUNCTION search_cached_properties(
  address_query TEXT DEFAULT NULL,
  filter_city TEXT DEFAULT NULL,
  filter_county TEXT DEFAULT NULL,
  filter_zip TEXT DEFAULT NULL,
  filter_status TEXT DEFAULT NULL,
  min_price NUMERIC DEFAULT NULL,
  max_price NUMERIC DEFAULT NULL,
  min_beds INT DEFAULT NULL,
  min_baths INT DEFAULT NULL,
  sort_by TEXT DEFAULT 'relevance',
  max_results INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  listing_key TEXT,
  unparsed_address TEXT,
  city TEXT,
  county TEXT,
  zip TEXT,
  list_price NUMERIC,
  beds INT,
  baths INT,
  living_area NUMERIC,
  standard_status TEXT,
  special_listing_conditions TEXT,
  primary_photo_url TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  snapshot JSONB,
  relevance FLOAT
)
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id, c.listing_key, c.unparsed_address,
    c.city, c.county, c.zip,
    c.list_price, c.beds, c.baths, c.living_area,
    c.standard_status, c.special_listing_conditions,
    c.primary_photo_url, c.latitude, c.longitude, c.snapshot,
    CASE
      WHEN address_query IS NOT NULL AND address_query != '' THEN
        GREATEST(
          similarity(c.unparsed_address, address_query),
          similarity(c.street_name, address_query)
        )
      ELSE 1.0
    END::FLOAT AS relevance
  FROM public.property_search_cache c
  WHERE
    -- Address fuzzy match (if provided)
    (address_query IS NULL OR address_query = '' OR
     c.unparsed_address % address_query OR c.street_name % address_query)
    -- Structured filters
    AND (filter_city IS NULL OR lower(c.city) = lower(filter_city))
    AND (filter_county IS NULL OR lower(c.county) = lower(filter_county))
    AND (filter_zip IS NULL OR c.zip = filter_zip)
    AND (filter_status IS NULL OR lower(c.standard_status) = lower(filter_status))
    AND (min_price IS NULL OR c.list_price >= min_price)
    AND (max_price IS NULL OR c.list_price <= max_price)
    AND (min_beds IS NULL OR c.beds >= min_beds)
    AND (min_baths IS NULL OR c.baths >= min_baths)
  ORDER BY
    CASE WHEN sort_by = 'relevance' THEN
      CASE WHEN address_query IS NOT NULL AND address_query != '' THEN
        GREATEST(similarity(c.unparsed_address, address_query), similarity(c.street_name, address_query))
      ELSE 1.0 END
    END DESC NULLS LAST,
    CASE WHEN sort_by = 'price-asc' THEN c.list_price END ASC NULLS LAST,
    CASE WHEN sort_by = 'price-desc' THEN c.list_price END DESC NULLS LAST,
    CASE WHEN sort_by = 'newest' THEN c.updated_at END DESC NULLS LAST,
    CASE WHEN sort_by = 'sqft-desc' THEN c.living_area END DESC NULLS LAST
  LIMIT max_results;
END;
$$;
