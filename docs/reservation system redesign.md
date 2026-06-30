Phase 1 – Reservation System Redesign
Backend
✅ 1. Separate pending orders from inventory reservations
Pending orders remain for 7 days.
Inventory reservations last 10 minutes only.
✅ 2. Remove reservation creation from /api/paystack/initialize
That route should only:
validate cart,
create/update pending order,
return the order reference.
✅ 3. Create /api/reservations/create
Validate stock atomically.
Create reservation rows.
Update reserved_stock.
Return reservation expiry time.
✅ 4. Create /api/reservations/release
Release reservations.
Update reserved_stock.
Safe to call multiple times.
✅ 5. Webhook changes

When payment succeeds:

Release reservation.
Deduct actual stock.
Mark order as paid.
Prevent duplicate webhook processing.
✅ 6. Reservation cleanup

Automatically release reservations after 10 minutes.

Frontend
✅ 7. New checkout flow
Validate cart
↓
Create/update pending order
↓
Reserve inventory
↓
Start timer
↓
Open Paystack
✅ 8. Reservation countdown

Display:

🔒 Items reserved

09:59 remaining
✅ 9. Countdown warnings

Show reminders:

2 minutes left
1 minute left
30 seconds left
✅ 10. Reservation expiry

When timer reaches zero:

Release reservation.
Revalidate cart.
Update cart automatically.
Show explanatory modal.
✅ 11. Customer cancels payment

If Paystack closes:

Release reservation immediately.
Stop timer.
Keep pending order for 7 days.
Reliability
✅ 12. Final webhook validation

If payment succeeds after reservation expired:

Never oversell.
Mark order for admin review if necessary.
✅ 13. Cart synchronization

If reservation expires:

Remove unavailable items.
Reduce quantities if needed.
Update prices.
Notify customer.
✅ 14. Reservation analytics

Store:

reservation start time
reservation expiry time
reservation status
Customer Experience
✅ 15. Better messaging

Customers always know:

why an item disappeared,
why quantity changed,
why price changed,
why payment can no longer continue.