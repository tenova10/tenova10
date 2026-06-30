-- Reconcile products.reserved_stock from active inventory_reservations.
-- This fixes drift where a reservation row is released but product reserved_stock remains stale.

create or replace function sync_product_reserved_stock(
  p_product_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reserved_stock integer;
  v_physical_stock integer;
begin
  select p.stock
  into v_physical_stock
  from public.products as p
  where p.id = p_product_id
  for update of p;

  if not found then
    raise exception 'Product not found: %.', p_product_id;
  end if;

  select coalesce(sum(ir.quantity), 0)::integer
  into v_reserved_stock
  from public.inventory_reservations as ir
  where ir.product_id = p_product_id
    and ir.status = 'active';

  if v_reserved_stock > v_physical_stock then
    raise exception 'Reserved stock % exceeds physical stock % for product %.',
      v_reserved_stock,
      v_physical_stock,
      p_product_id;
  end if;

  update public.products as p
  set reserved_stock = v_reserved_stock
  where p.id = p_product_id;

  return v_reserved_stock;
end;
$$;

create or replace function reconcile_all_reserved_stock()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product record;
  v_count integer := 0;
begin
  for v_product in
    select p.id as product_id
    from public.products as p
    order by p.id
    for update of p
  loop
    perform sync_product_reserved_stock(v_product.product_id);
    v_count := v_count + 1;
  end loop;

  return v_count;
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
    update public.inventory_reservations as ir
    set status = 'released',
        released_at = now(),
        release_reason = p_reason
    where ir.id = v_reservation.id;

    perform sync_product_reserved_stock(v_reservation.product_id);

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
  v_synced_reserved_stock integer;
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

    v_synced_reserved_stock := sync_product_reserved_stock(v_item_id);

    if v_product_row.is_active is not true then
      raise exception '% is no longer available.', v_product_row.name;
    end if;

    if v_product_row.price <> v_item_price then
      raise exception '% has a new price. Please review your cart.', v_product_row.name;
    end if;

    if v_product_row.stock - v_synced_reserved_stock < v_item_qty then
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

    perform sync_product_reserved_stock(v_item_id);
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
  v_synced_reserved_stock integer;
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

    v_synced_reserved_stock := sync_product_reserved_stock(v_item_id);

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

    if v_synced_reserved_stock < v_item_qty then
      update public.orders as o
      set status = 'payment_review',
          payment_review_reason = 'Unable to finalize stock deduction safely.'
      where o.id = v_order_row.id;

      return jsonb_build_object(
        'success', false,
        'manualReview', true,
        'reason', 'reserved_stock_drift_detected'
      );
    end if;

    update public.inventory_reservations as ir
    set status = 'converted',
        released_at = now(),
        release_reason = 'paid'
    where ir.order_id = v_order_row.id
      and ir.product_id = v_item_id
      and ir.status = 'active';

    perform sync_product_reserved_stock(v_item_id);

    update public.products as p
    set stock = p.stock - v_item_qty
    where p.id = v_item_id
      and p.stock >= v_item_qty
      and p.reserved_stock <= p.stock - v_item_qty;

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

  for v_item in
    select order_item.item_value
    from jsonb_array_elements(v_order_row.items) as order_item(item_value)
    order by order_item.item_value->>'id'
  loop
    v_item_id := (v_item->>'id')::uuid;
    perform sync_product_reserved_stock(v_item_id);
  end loop;

  update public.orders as o
  set status = 'paid',
      paid_at = now(),
      reservation_expires_at = null,
      payment_review_reason = null
  where o.id = v_order_row.id;

  return jsonb_build_object('success', true, 'paid', true);
end;
$$;

select reconcile_all_reserved_stock();
