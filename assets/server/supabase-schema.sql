-- ============================================================================
-- Evora — Supabase schema (orders + contacts + staff + products)
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

create table if not exists public.staff (
  email      text primary key,
  name       text not null default '',
  role       text not null default 'viewer' check (role in ('owner', 'admin', 'viewer')),
  created_at timestamptz not null default now(),
  check (email = lower(email) and length(email) <= 254),
  check (length(name) between 1 and 100),
  check ((role = 'owner') = (email = 'evora.reply@gmail.com'))
);

insert into public.staff (email, name, role)
select initial.email, initial.name, initial.role from (values
  ('evora.reply@gmail.com', 'EVORA', 'owner'),
  ('kododevelopers@gmail.com', 'KODO', 'admin'),
  ('muhammadammarsheikh11@gmail.com', 'Ammar Sheikh', 'admin')
) as initial(email, name, role)
where not exists (select 1 from public.staff)
on conflict (email) do nothing;

create table if not exists public.products (
  id text primary key,
  data jsonb not null,
  position integer not null default 0,
  version integer not null default 1 check (version > 0),
  check (jsonb_typeof(data) = 'object'),
  check (data->>'id' = id)
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Nobody but the server (service_role) touches these tables.
alter table public.orders enable row level security;
alter table public.contacts enable row level security;
alter table public.staff enable row level security;
alter table public.products enable row level security;

revoke all on public.orders from anon, authenticated;
revoke all on public.contacts from anon, authenticated;
revoke all on public.staff from anon, authenticated;
revoke all on public.products from anon, authenticated;

grant usage on schema public to service_role;
grant select, insert, update, delete on public.orders to service_role;
grant select, insert, update, delete on public.contacts to service_role;
grant select, insert, update, delete on public.staff to service_role;
grant select, insert, update, delete on public.products to service_role;
grant usage, select on all sequences in schema public to service_role;
