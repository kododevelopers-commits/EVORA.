-- ============================================================================
-- Evora — Supabase schema (orders + contacts)
-- ----------------------------------------------------------------------------
-- Paste this whole file into Supabase -> SQL Editor -> New query -> Run.
-- It is safe to run more than once: tables, indexes and grants are idempotent.
--
-- Access model: the Netlify function connects with the service_role key, so
-- RLS is enabled with no policies — the public anon key can read nothing.
-- ============================================================================

create table if not exists public.orders (
  id              text primary key,
  status          text not null default 'received',
  received_at     timestamptz not null default now(),
  status_updated_at timestamptz,
  customer_name   text not null,
  customer_email  text not null,
  customer_phone  text not null,
  customer_address text not null,
  customer_area   text not null default 'Karachi',
  items           jsonb not null default '[]'::jsonb,
  payment_method  text not null default 'cod',
  payment_label   text not null default 'Cash on Delivery',
  subtotal        integer not null default 0,
  gst             integer not null default 0,
  delivery        integer not null default 0,
  total           integer not null default 0
);

create index if not exists orders_received_at_idx on public.orders (received_at desc);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_customer_email_idx on public.orders (lower(customer_email));

create table if not exists public.contacts (
  id          bigint generated always as identity primary key,
  contact_id  text not null unique,
  received_at timestamptz not null default now(),
  name        text not null,
  email       text not null,
  phone       text not null default '',
  subject     text not null default 'general',
  message     text not null
);

create index if not exists contacts_received_at_idx on public.contacts (received_at desc);

-- Nobody but the server (service_role) touches these tables.
alter table public.orders enable row level security;
alter table public.contacts enable row level security;

revoke all on public.orders from anon, authenticated;
revoke all on public.contacts from anon, authenticated;

grant usage on schema public to service_role;
grant select, insert, update, delete on public.orders to service_role;
grant select, insert, update, delete on public.contacts to service_role;
grant usage, select on all sequences in schema public to service_role;
