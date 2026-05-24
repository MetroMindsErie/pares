create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  agent_email text not null,
  sender_name text,
  sender_email text,
  property_url text,
  message text,
  created_at timestamptz default now()
);

alter table public.contact_messages enable row level security;

-- Allow anonymous inserts (public contact form)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'contact_messages'
      AND policyname = 'allow_public_insert'
  ) THEN
    CREATE POLICY "allow_public_insert"
    ON public.contact_messages
    FOR INSERT
    TO public
    WITH CHECK (true);
  END IF;
END
$$;

-- Only "service role" can read messages (as per your original intent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'contact_messages'
      AND policyname = 'service_role_select'
  ) THEN
    CREATE POLICY "service_role_select"
    ON public.contact_messages
    FOR SELECT
    -- If you really want this to apply to a specific role:
    TO public
    USING (auth.role() = 'service_role');
  END IF;
END
$$;