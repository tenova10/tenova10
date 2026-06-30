-- Production hardening for checkout, reservation, payment, and inventory consistency.
-- Run after 202606290001_checkout_lifecycle.sql.

alter table products
  drop constraint if exists products_name_not_blank,
  add constraint products_name_not_blank check (length(trim(name)) > 0) not valid;

alter table products
  drop constraint if exists products_price_nonnegative,
  add constraint products_price_nonnegative check (price >= 0) not valid;

alter table products
  drop constraint if exists products_old_price_nonnegative,
  add constraint products_old_price_nonnegative check (old_price is null or old_price >= 0) not valid;

alter table products
  drop constraint if exists products_rating_range,
  add constraint products_rating_range check (rating >= 0 and rating <= 5) not valid;

alter table products
  drop constraint if exists products_review_count_nonnegative,
  add constraint products_review_count_nonnegative check (review_count >= 0) not valid;

alter table orders
  drop constraint if exists orders_reference_not_blank,
  add constraint orders_reference_not_blank check (length(trim(reference)) > 0) not valid;

alter table orders
  drop constraint if exists orders_customer_email_not_blank,
  add constraint orders_customer_email_not_blank check (length(trim(customer_email)) > 0) not valid;

alter table orders
  drop constraint if exists orders_totals_nonnegative,
  add constraint orders_totals_nonnegative check (subtotal >= 0 and total >= 0) not valid;

alter table orders
  drop constraint if exists orders_items_array,
  add constraint orders_items_array check (jsonb_typeof(items) = 'array') not valid;

alter table inventory_reservations
  drop constraint if exists inventory_reservations_release_state,
  add constraint inventory_reservations_release_state
  check (
    (status = 'active' and released_at is null)
    or
    (status <> 'active' and released_at is not null)
  ) not valid;

create index if not exists orders_expires_pending_idx
  on orders(expires_at)
  where status = 'pending';

create index if not exists inventory_reservations_order_status_idx
  on inventory_reservations(order_id, status);

create or replace function prevent_paid_order_snapshot_mutation()
returns trigger
language plpgsql
as $$
begin
  if old.status in ('paid', 'shipped', 'delivered') then
    if new.reference is distinct from old.reference
      or new.customer_name is distinct from old.customer_name
      or new.customer_email is distinct from old.customer_email
      or new.customer_phone is distinct from old.customer_phone
      or new.customer_address is distinct from old.customer_address
      or new.items is distinct from old.items
      or new.subtotal is distinct from old.subtotal
      or new.total is distinct from old.total
      or new.paid_at is distinct from old.paid_at
    then
      raise exception 'Paid order snapshots are immutable.';
    end if;

    if old.status = 'paid' and new.status not in ('paid', 'shipped', 'delivered') then
      raise exception 'Paid orders cannot return to an unpaid state.';
    end if;

    if old.status = 'shipped' and new.status not in ('shipped', 'delivered') then
      raise exception 'Shipped orders cannot return to an earlier state.';
    end if;

    if old.status = 'delivered' and new.status <> 'delivered' then
      raise exception 'Delivered orders are terminal.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_paid_order_snapshot_mutation_trigger on orders;
create trigger prevent_paid_order_snapshot_mutation_trigger
  before update on orders
  for each row execute function prevent_paid_order_snapshot_mutation();

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

  if not found then
    raise exception 'Order not found.';
  end if;

  for reservation in
    select *
    from inventory_reservations
    where order_id = p_order_id
      and status = 'active'
    order by product_id, id
    for update
  loop
    update products
    set reserved_stock = reserved_stock - reservation.quantity
    where id = reservation.product_id
      and reserved_stock >= reservation.quantity;

    if not found then
      raise exception 'Reserved stock invariant failed for product %.', reservation.product_id;
    end if;

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

create or replace function cleanup_expired_reservations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  order_to_release record;
  released_count integer := 0;
  result jsonb;
begin
  for order_to_release in
    select o.id
    from orders o
    where exists (
      select 1
      from inventory_reservations ir
      where ir.order_id = o.id
        and ir.status = 'active'
        and ir.expires_at <= now()
    )
    order by o.id
    for update of o skip locked
  loop
    result := release_order_reservations(order_to_release.id, 'timer_expired', true);
    released_count := released_count + coalesce((result->>'releasedCount')::integer, 0);
  end loop;

  return released_count;
end;
$$;

create or replace function cleanup_expired_pending_orders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  order_to_expire record;
  expired_count integer := 0;
begin
  for order_to_expire in
    select id
    from orders
    where status = 'pending'
      and expires_at <= now()
    order by id
    for update skip locked
  loop
    perform release_order_reservations(order_to_expire.id, 'order_expired', false);

    update orders
    set status = 'expired',
        cancelled_at = coalesce(cancelled_at, now()),
        reservation_expires_at = null
    where id = order_to_expire.id
      and status = 'pending';

    expired_count := expired_count + 1;
  end loop;

  return expired_count;
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

  for item in
    select value
    from jsonb_array_elements(order_row.items) as items(value)
    order by value->>'id'
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

    update products
    set reserved_stock = reserved_stock + item_qty
    where id = item_id
      and stock - reserved_stock >= item_qty;

    if not found then
      raise exception '% is no longer available in the requested quantity.', product_row.name;
    end if;

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
    );
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
  reservation_qty integer;
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

  for item in
    select value
    from jsonb_array_elements(order_row.items) as items(value)
    order by value->>'id'
  loop
    item_id := (item->>'id')::uuid;
    item_qty := coalesce((item->>'qty')::integer, (item->>'quantity')::integer);

    select quantity
    into reservation_qty
    from inventory_reservations
    where order_id = order_row.id
      and product_id = item_id
      and status = 'active'
      and expires_at > now()
    for update;

    if not found or reservation_qty < item_qty then
      perform release_order_reservations(order_row.id, 'payment_without_active_reservation', false);

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

    update products
    set stock = stock - item_qty,
        reserved_stock = reserved_stock - item_qty
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
