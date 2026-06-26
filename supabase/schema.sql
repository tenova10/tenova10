-- ═══════════════════════════════════════════════════
--  tenova10 — Supabase Database Schema
--  Run this entire file in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════

-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists pg_trgm;

-- ─── PRODUCTS ──────────────────────────────────────
create table if not exists products (
  id           uuid    default uuid_generate_v4() primary key,
  name         text    not null,
  description  text    default '',
  price        numeric(12,2) not null,
  old_price    numeric(12,2),
  category     text    not null check (category in ('fashion', 'kitchen', 'household')),
  stock        integer not null default 0,
  image_url    text    default '',
  rating       numeric(3,1) default 0,
  review_count integer default 0,
  is_active    boolean default true,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ─── ORDERS ────────────────────────────────────────
create table if not exists orders (
  id                uuid    default uuid_generate_v4() primary key,
  reference         text    unique not null,
  customer_name     text    not null,
  customer_email    text    not null,
  customer_phone    text,
  customer_address  text    default '',
  items             jsonb   not null default '[]',
  subtotal          numeric(12,2) not null,
  total             numeric(12,2) not null,
  status            text    default 'pending'
                    check (status in ('pending', 'paid', 'shipped', 'delivered', 'cancelled')),
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- ─── AUTO-UPDATE TIMESTAMPS ────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger products_updated_at
  before update on products
  for each row execute function update_updated_at();

create trigger orders_updated_at
  before update on orders
  for each row execute function update_updated_at();

-- ─── ROW LEVEL SECURITY ────────────────────────────
alter table products enable row level security;
alter table orders enable row level security;

-- Anyone can read active products
create policy "Public read active products"
  on products for select using (is_active = true);

-- Anyone can create an order (guest checkout)
create policy "Anyone can create orders"
  on orders for insert with check (true);

-- Service role (backend) can do everything — no explicit policy needed

-- ─── FULL-TEXT & FUZZY SEARCH INDEX ───────────────
create index if not exists products_name_trgm
  on products using gin (name gin_trgm_ops);

create index if not exists products_desc_trgm
  on products using gin (description gin_trgm_ops);

-- ─── REALTIME ──────────────────────────────────────
-- Enable realtime for products (stock updates)
alter publication supabase_realtime add table products;

-- ─── STORAGE BUCKET ────────────────────────────────
-- Run this AFTER the schema to create the product images bucket
insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict do nothing;

create policy "Public can view product images"
  on storage.objects for select
  using (bucket_id = 'products');

create policy "Service role can upload product images"
  on storage.objects for insert
  with check (bucket_id = 'products');

create policy "Service role can update product images"
  on storage.objects for update
  using (bucket_id = 'products');

create policy "Service role can delete product images"
  on storage.objects for delete
  using (bucket_id = 'products');
