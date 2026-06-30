-- Tenova10 checkout, reservation, and payment lifecycle redesign.
-- Run this migration after the original schema.sql.

create extension if not exists "uuid-ossp";

alter table products
  add column if not exists reserved_stock integer not null default 0,
  add column if not exists deleted_at timestamptz;

alter table products
  drop constraint if exists products_stock_nonnegative,
  add constraint products_stock_nonnegative check (stock >= 0);

alter table products
  drop constraint if exists products_reserved_stock_nonnegative,
  add constraint products_reserved_stock_nonnegative check (reserved_stock >= 0);

alter table products
  drop constraint if exists products_reserved_stock_not_above_stock,
  add constraint products_reserved_stock_not_above_stock check (reserved_stock <= stock);

drop policy if exists "Public read active products" on products;
create policy "Public read active products"
  on products for select using (is_active = true and deleted_at is null);

alter table orders
  add column if not exists expires_at timestamptz default (now() + interval '7 days'),
  add column if not exists reservation_expires_at timestamptz,
  add column if not exists paid_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists payment_review_reason text;

alter table orders
  drop constraint if exists orders_status_check;

alter table orders
  add constraint orders_status_check
  check (status in (
    'pending',
    'paid',
    'shipped',
    'delivered',
    'cancelled',
    'expired',
    'payment_review'
  ));

create table if not exists inventory_reservations (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id),
  quantity integer not null check (quantity > 0),
  status text not null default 'active'
    check (status in ('active', 'released', 'expired', 'converted')),
  expires_at timestamptz not null,
  released_at timestamptz,
  release_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Upgrade an older reservation table if it already existed before this migration.
-- create table if not exists does not add missing columns to an existing table.
alter table inventory_reservations
  add column if not exists id uuid default uuid_generate_v4(),
  add column if not exists status text not null default 'active',
  add column if not exists released_at timestamptz,
  add column if not exists release_reason text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table inventory_reservations
  drop constraint if exists inventory_reservations_quantity_check,
  add constraint inventory_reservations_quantity_check check (quantity > 0);

alter table inventory_reservations
  drop constraint if exists inventory_reservations_status_check,
  add constraint inventory_reservations_status_check
  check (status in ('active', 'released', 'expired', 'converted'));

create index if not exists inventory_reservations_order_idx
  on inventory_reservations(order_id);

create index if not exists inventory_reservations_product_active_idx
  on inventory_reservations(product_id)
  where status = 'active';

create index if not exists inventory_reservations_expiry_idx
  on inventory_reservations(expires_at)
  where status = 'active';

create unique index if not exists inventory_reservations_one_active_item
  on inventory_reservations(order_id, product_id)
  where status = 'active';

create index if not exists orders_pending_customer_idx
  on orders(customer_email, status, expires_at)
  where status = 'pending';

drop trigger if exists inventory_reservations_updated_at on inventory_reservations;
create trigger inventory_reservations_updated_at
  before update on inventory_reservations
  for each row execute function update_updated_at();

create or replace function cleanup_expired_reservations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  reservation record;
  released_count integer := 0;
begin
  for reservation in
    select *
    from inventory_reservations
    where status = 'active'
      and expires_at <= now()
    order by expires_at
    for update skip locked
  loop
    update products
    set reserved_stock = greatest(0, reserved_stock - reservation.quantity)
    where id = reservation.product_id;

    update inventory_reservations
    set status = 'expired',
        released_at = now(),
        release_reason = 'timer_expired'
    where id = reservation.id;

    update orders
    set status = 'cancelled',
        cancelled_at = coalesce(cancelled_at, now()),
        reservation_expires_at = null
    where id = reservation.order_id
      and status = 'pending';

    released_count := released_count + 1;
  end loop;

  return released_count;
end;
$$;

create or replace function release_order_reservations(
  p_order_id uuid,
  p_reason text default 'released',
  p_cancel_order boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  reservation record;
  released_count integer := 0;
begin
  perform 1
  from orders
  where id = p_order_id
  for update;

  for reservation in
    select *
    from inventory_reservations
    where order_id = p_order_id
      and status = 'active'
    for update
  loop
    update products
    set reserved_stock = greatest(0, reserved_stock - reservation.quantity)
    where id = reservation.product_id;

    update inventory_reservations
    set status = 'released',
        released_at = now(),
        release_reason = p_reason
    where id = reservation.id;

    released_count := released_count + 1;
  end loop;

  if p_cancel_order then
    update orders
    set status = 'cancelled',
        cancelled_at = coalesce(cancelled_at, now()),
        reservation_expires_at = null
    where id = p_order_id
      and status = 'pending';
  else
    update orders
    set reservation_expires_at = null
    where id = p_order_id
      and status = 'pending';
  end if;

  return jsonb_build_object(
    'success', true,
    'releasedCount', released_count
  );
end;
$$;

create or replace function reserve_order_inventory(
  p_order_id uuid,
  p_ttl_minutes integer default 10
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  order_row orders%rowtype;
  item jsonb;
  product_row products%rowtype;
  item_id uuid;
  item_qty integer;
  item_price numeric(12,2);
  expires_at timestamptz := now() + make_interval(mins => p_ttl_minutes);
begin
  perform cleanup_expired_reservations();

  select *
  into order_row
  from orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found.';
  end if;

  if order_row.status <> 'pending' then
    raise exception 'This order is no longer pending.';
  end if;

  perform release_order_reservations(p_order_id, 'replaced', false);

  for item in select * from jsonb_array_elements(order_row.items)
  loop
    item_id := (item->>'id')::uuid;
    item_qty := coalesce((item->>'qty')::integer, (item->>'quantity')::integer);
    item_price := (item->>'price')::numeric;

    if item_qty is null or item_qty <= 0 then
      raise exception 'Invalid quantity in cart.';
    end if;

    select *
    into product_row
    from products
    where id = item_id
    for update;

    if not found or product_row.deleted_at is not null then
      raise exception 'A product in your cart is no longer available.';
    end if;

    if product_row.is_active is not true then
      raise exception '% is no longer available.', product_row.name;
    end if;

    if product_row.price <> item_price then
      raise exception '% has a new price. Please review your cart.', product_row.name;
    end if;

    if product_row.stock - product_row.reserved_stock < item_qty then
      raise exception '% is no longer available in the requested quantity.', product_row.name;
    end if;

    update products
    set reserved_stock = reserved_stock + item_qty
    where id = item_id;

    insert into inventory_reservations (
      order_id,
      product_id,
      quantity,
      status,
      expires_at
    )
    values (
      p_order_id,
      item_id,
      item_qty,
      'active',
      expires_at
    )
    on conflict (order_id, product_id) where status = 'active'
    do update set
      quantity = excluded.quantity,
      expires_at = excluded.expires_at,
      updated_at = now();
  end loop;

  update orders
  set reservation_expires_at = expires_at
  where id = p_order_id;

  return jsonb_build_object(
    'success', true,
    'expiresAt', expires_at
  );
end;
$$;

create or replace function finalize_paid_order(
  p_reference text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  order_row orders%rowtype;
  item jsonb;
  item_id uuid;
  item_qty integer;
  active_reservations integer;
begin
  select *
  into order_row
  from orders
  where reference = p_reference
  for update;

  if not found then
    return jsonb_build_object('success', false, 'reason', 'order_not_found');
  end if;

  if order_row.status = 'paid' then
    return jsonb_build_object('success', true, 'alreadyProcessed', true);
  end if;

  if order_row.status in ('cancelled', 'expired') then
    update orders
    set status = 'payment_review',
        payment_review_reason = 'Payment arrived after checkout was no longer active.'
    where id = order_row.id;

    return jsonb_build_object(
      'success', false,
      'manualReview', true,
      'reason', 'order_not_active'
    );
  end if;

  if order_row.status <> 'pending' then
    return jsonb_build_object('success', true, 'alreadyProcessed', true, 'status', order_row.status);
  end if;

  select count(*)
  into active_reservations
  from inventory_reservations
  where order_id = order_row.id
    and status = 'active'
    and expires_at > now();

  if active_reservations = 0 then
    perform release_order_reservations(order_row.id, 'payment_after_expiry', false);

    update orders
    set status = 'payment_review',
        payment_review_reason = 'Payment arrived without an active reservation.'
    where id = order_row.id;

    return jsonb_build_object(
      'success', false,
      'manualReview', true,
      'reason', 'reservation_not_active'
    );
  end if;

  for item in select * from jsonb_array_elements(order_row.items)
  loop
    item_id := (item->>'id')::uuid;
    item_qty := coalesce((item->>'qty')::integer, (item->>'quantity')::integer);

    update products
    set stock = stock - item_qty,
        reserved_stock = greatest(0, reserved_stock - item_qty)
    where id = item_id
      and stock >= item_qty
      and reserved_stock >= item_qty;

    if not found then
      update orders
      set status = 'payment_review',
          payment_review_reason = 'Unable to finalize stock deduction safely.'
      where id = order_row.id;

      return jsonb_build_object(
        'success', false,
        'manualReview', true,
        'reason', 'stock_deduction_failed'
      );
    end if;
  end loop;

  update inventory_reservations
  set status = 'converted',
      released_at = now(),
      release_reason = 'paid'
  where order_id = order_row.id
    and status = 'active';

  update orders
  set status = 'paid',
      paid_at = now(),
      reservation_expires_at = null,
      payment_review_reason = null
  where id = order_row.id;

  return jsonb_build_object('success', true, 'paid', true);
end;
$$;
