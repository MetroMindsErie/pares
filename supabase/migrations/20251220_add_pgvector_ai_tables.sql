-- Enable required extensions for vector search and UUID generation
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Generic document store for embeddings (cookbooks, docs, summaries)
CREATE TABLE IF NOT EXISTS public.ai_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL DEFAULT 'doc', -- e.g., 'cookbook', 'schema', 'conversation'
    content TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    embedding VECTOR(1536),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_documents_metadata_idx ON public.ai_documents USING GIN (metadata);
CREATE INDEX IF NOT EXISTS ai_documents_embedding_idx ON public.ai_documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- MLS listing chunks (per-listing chunks of remarks/address/etc.)
CREATE TABLE IF NOT EXISTS public.listing_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id TEXT NOT NULL,
    chunk_ordinal INTEGER NOT NULL DEFAULT 0,
    content TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}', -- expected keys: location/county/city, property_type, status
    embedding VECTOR(1536),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (listing_id, chunk_ordinal)
);

CREATE INDEX IF NOT EXISTS listing_chunks_metadata_idx ON public.listing_chunks USING GIN (metadata);
CREATE INDEX IF NOT EXISTS listing_chunks_embedding_idx ON public.listing_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 200);
CREATE INDEX IF NOT EXISTS listing_chunks_listing_id_idx ON public.listing_chunks (listing_id);
