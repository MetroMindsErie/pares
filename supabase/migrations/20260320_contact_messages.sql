create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  agent_email text not null,
  sender_name text,
  sender_email text,
  property_url text,
  message text,
  created_at timestamptz default now()
);

-- Allow anonymous inserts (public contact form)
alter table contact_messages enable row level security;

create policy "allow_public_insert" on contact_messages
  for insert with check (true);

-- Only service role can read messages
create policy "service_role_select" on contact_messages
  for select using (auth.role() = 'service_role');
