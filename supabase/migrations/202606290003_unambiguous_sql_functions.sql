-- Remove ambiguous PL/pgSQL identifiers from checkout lifecycle functions.
-- This migration preserves RPC signatures and behavior.

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
  v_reservation record;
  v_released_count integer := 0;
begin
  perform 1
  from public.orders as o
  where o.id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found.';
  end if;

  for v_reservation in
    select ir.*
    from public.inventory_reservations as ir
    where ir.order_id = p_order_id
      and ir.status = 'active'
    order by ir.product_id, ir.id
    for update of ir
  loop
    update public.products as p
    set reserved_stock = p.reserved_stock - v_reservation.quantity
    where p.id = v_reservation.product_id
      and p.reserved_stock >= v_reservation.quantity;

    if not found then
      raise exception 'Reserved stock invariant failed for product %.', v_reservation.product_id;
    end if;

    update public.inventory_reservations as ir
    set status = 'released',
        released_at = now(),
        release_reason = p_reason
    where ir.id = v_reservation.id;

    v_released_count := v_released_count + 1;
  end loop;

  if p_cancel_order then
    update public.orders as o
    set status = 'cancelled',
        cancelled_at = coalesce(o.cancelled_at, now()),
        reservation_expires_at = null
    where o.id = p_order_id
      and o.status = 'pending';
  else
    update public.orders as o
    set reservation_expires_at = null
    where o.id = p_order_id
      and o.status = 'pending';
  end if;

  return jsonb_build_object(
    'success', true,
    'releasedCount', v_released_count
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
  v_order_to_release record;
  v_released_count integer := 0;
  v_release_result jsonb;
begin
  for v_order_to_release in
    select o.id as order_id
    from public.orders as o
    where exists (
      select 1
      from public.inventory_reservations as ir
      where ir.order_id = o.id
        and ir.status = 'active'
        and ir.expires_at <= now()
    )
    order by o.id
    for update of o skip locked
  loop
    v_release_result := release_order_reservations(
      v_order_to_release.order_id,
      'timer_expired',
      true
    );
    v_released_count := v_released_count + coalesce((v_release_result->>'releasedCount')::integer, 0);
  end loop;

  return v_released_count;
end;
$$;

create or replace function cleanup_expired_pending_orders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_to_expire record;
  v_expired_count integer := 0;
begin
  for v_order_to_expire in
    select o.id as order_id
    from public.orders as o
    where o.status = 'pending'
      and o.expires_at <= now()
    order by o.id
    for update of o skip locked
  loop
    perform release_order_reservations(
      v_order_to_expire.order_id,
      'order_expired',
      false
    );

    update public.orders as o
    set status = 'expired',
        cancelled_at = coalesce(o.cancelled_at, now()),
        reservation_expires_at = null
    where o.id = v_order_to_expire.order_id
      and o.status = 'pending';

    v_expired_count := v_expired_count + 1;
  end loop;

  return v_expired_count;
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
  v_order_row public.orders%rowtype;
  v_item jsonb;
  v_product_row public.products%rowtype;
  v_item_id uuid;
  v_item_qty integer;
  v_item_price numeric(12,2);
  v_reservation_expiry_ts timestamptz := now() + make_interval(mins => p_ttl_minutes);
begin
  perform cleanup_expired_reservations();

  select o.*
  into v_order_row
  from public.orders as o
  where o.id = p_order_id
  for update of o;

  if not found then
    raise exception 'Order not found.';
  end if;

  if v_order_row.status <> 'pending' then
    raise exception 'This order is no longer pending.';
  end if;

  perform release_order_reservations(p_order_id, 'replaced', false);

  for v_item in
    select order_item.item_value
    from jsonb_array_elements(v_order_row.items) as order_item(item_value)
    order by order_item.item_value->>'id'
  loop
    v_item_id := (v_item->>'id')::uuid;
    v_item_qty := coalesce((v_item->>'qty')::integer, (v_item->>'quantity')::integer);
    v_item_price := (v_item->>'price')::numeric;

    if v_item_qty is null or v_item_qty <= 0 then
      raise exception 'Invalid quantity in cart.';
    end if;

    select p.*
    into v_product_row
    from public.products as p
    where p.id = v_item_id
    for update of p;

    if not found or v_product_row.deleted_at is not null then
      raise exception 'A product in your cart is no longer available.';
    end if;

    if v_product_row.is_active is not true then
      raise exception '% is no longer available.', v_product_row.name;
    end if;

    if v_product_row.price <> v_item_price then
      raise exception '% has a new price. Please review your cart.', v_product_row.name;
    end if;

    update public.products as p
    set reserved_stock = p.reserved_stock + v_item_qty
    where p.id = v_item_id
      and p.stock - p.reserved_stock >= v_item_qty;

    if not found then
      raise exception '% is no longer available in the requested quantity.', v_product_row.name;
    end if;

    insert into public.inventory_reservations (
      order_id,
      product_id,
      quantity,
      status,
      expires_at
    )
    values (
      p_order_id,
      v_item_id,
      v_item_qty,
      'active',
      v_reservation_expiry_ts
    );
  end loop;

  update public.orders as o
  set reservation_expires_at = v_reservation_expiry_ts
  where o.id = p_order_id;

  return jsonb_build_object(
    'success', true,
    'expiresAt', v_reservation_expiry_ts
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
  v_order_row public.orders%rowtype;
  v_item jsonb;
  v_item_id uuid;
  v_item_qty integer;
  v_reservation_qty integer;
begin
  select o.*
  into v_order_row
  from public.orders as o
  where o.reference = p_reference
  for update of o;

  if not found then
    return jsonb_build_object('success', false, 'reason', 'order_not_found');
  end if;

  if v_order_row.status = 'paid' then
    return jsonb_build_object('success', true, 'alreadyProcessed', true);
  end if;

  if v_order_row.status in ('cancelled', 'expired') then
    update public.orders as o
    set status = 'payment_review',
        payment_review_reason = 'Payment arrived after checkout was no longer active.'
    where o.id = v_order_row.id;

    return jsonb_build_object(
      'success', false,
      'manualReview', true,
      'reason', 'order_not_active'
    );
  end if;

  if v_order_row.status <> 'pending' then
    return jsonb_build_object(
      'success', true,
      'alreadyProcessed', true,
      'status', v_order_row.status
    );
  end if;

  for v_item in
    select order_item.item_value
    from jsonb_array_elements(v_order_row.items) as order_item(item_value)
    order by order_item.item_value->>'id'
  loop
    v_item_id := (v_item->>'id')::uuid;
    v_item_qty := coalesce((v_item->>'qty')::integer, (v_item->>'quantity')::integer);

    select ir.quantity
    into v_reservation_qty
    from public.inventory_reservations as ir
    where ir.order_id = v_order_row.id
      and ir.product_id = v_item_id
      and ir.status = 'active'
      and ir.expires_at > now()
    for update of ir;

    if not found or v_reservation_qty < v_item_qty then
      perform release_order_reservations(
        v_order_row.id,
        'payment_without_active_reservation',
        false
      );

      update public.orders as o
      set status = 'payment_review',
          payment_review_reason = 'Payment arrived without an active reservation.'
      where o.id = v_order_row.id;

      return jsonb_build_object(
        'success', false,
        'manualReview', true,
        'reason', 'reservation_not_active'
      );
    end if;

    update public.products as p
    set stock = p.stock - v_item_qty,
        reserved_stock = p.reserved_stock - v_item_qty
    where p.id = v_item_id
      and p.stock >= v_item_qty
      and p.reserved_stock >= v_item_qty;

    if not found then
      update public.orders as o
      set status = 'payment_review',
          payment_review_reason = 'Unable to finalize stock deduction safely.'
      where o.id = v_order_row.id;

      return jsonb_build_object(
        'success', false,
        'manualReview', true,
        'reason', 'stock_deduction_failed'
      );
    end if;
  end loop;

  update public.inventory_reservations as ir
  set status = 'converted',
      released_at = now(),
      release_reason = 'paid'
  where ir.order_id = v_order_row.id
    and ir.status = 'active';

  update public.orders as o
  set status = 'paid',
      paid_at = now(),
      reservation_expires_at = null,
      payment_review_reason = null
  where o.id = v_order_row.id;

  return jsonb_build_object('success', true, 'paid', true);
end;
$$;
