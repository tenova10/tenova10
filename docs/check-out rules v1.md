Tenova10 Checkout & Inventory Rules (v1.0)
A. Cart Validation
1. ✅ Always validate the cart on the server before checkout.

The browser cart is never trusted. The server is the source of truth.

2. ✅ Validate every product for:
Product still exists.
Product is Live (not Hidden).
Requested quantity is available.
Current selling price matches.
Product details are up-to-date.
3. ✅ Automatically repair invalid carts.

If validation detects changes:

Remove deleted products.
Remove hidden products.
Reduce quantities that exceed available stock.
Update changed prices.
Update changed product information.

Save the repaired cart back to localStorage.

4. ✅ Clearly notify the customer of every automatic change.

Examples:

"The product 'Ankara Dress' is no longer available and has been removed."
"The quantity of Blender has been reduced from 5 to 2 due to limited stock."
"The price of Microwave changed from ₦55,000 to ₦59,000."

Notifications remain visible until dismissed.

B. Reservation Rules
5. Clicking "Pay" creates:
a Pending Order
Inventory Reservations
then launches Paystack

Never launch Paystack before successfully reserving inventory.

6. Inventory reservation belongs to the Order, not the customer account.

Reservations are linked to:

order_id
product_id
quantity
expiration date

Customer accounts are optional for this architecture.

7. 🟡 Available stock is always:
Available Stock = Physical Stock − Reserved Stock

All stock checks throughout the application use this formula.

8. Reservation locks:
quantity
price

A customer pays the price that existed when the reservation was created.

C. Pending Orders
9. Every checkout creates only ONE active pending order.

If the same customer attempts checkout again before paying:

Update the existing pending order instead of creating another.

10. Pending orders remain active for 7 days.

Purpose:

customer follow-up
payment retry
inventory reservation
11. After 7 days:
order becomes Expired
reservations are released
inventory becomes available again
D. Payment Rules
12. 🟡 Successful payment:
changes order to Paid ✅
deducts physical stock
releases reservation
stores product snapshots
triggers order confirmation
13. Payment processing must be idempotent.

Receiving duplicate Paystack callbacks must never:

deduct stock twice
create duplicate orders
send duplicate emails
14. If payment is attempted after reservation expiry:

Do not automatically fulfill.

Flag for manual review or refund.

E. Customer Actions
15. Customer intentionally closes Paystack.

Immediately:

cancel checkout
release reservation
cancel/delete pending order

Customer may continue shopping normally.

16. Customer closes browser or loses internet.

Do NOT release reservation.

Keep the pending order until:

payment succeeds
customer resumes checkout
order expires after 7 days
17. Customer returns before expiry.

Resume the existing pending order instead of creating a new one.

Offer:

"You have an unfinished order. Continue payment?"

18. Editing cart after checkout.

When customer changes the cart:

release old reservation
update pending order
create a new reservation

Never stack reservations.

F. Admin Rules
19. ✅ Hidden products.

Products with active reservations:

may be Hidden
disappear from storefront
existing reservations remain valid
20. Reserved products cannot be deleted.

Deletion is blocked until all reservations are released.

21. Admin cannot reduce stock below reserved quantity.

Example:

Stock = 20
Reserved = 15

Minimum allowable stock is 15.

22. Admin edits while stock changes.

If stock changed while the admin was editing:

Warn the admin before saving to prevent accidental overwrites.

G. Product History
23. Every paid order stores a snapshot.

Snapshot includes:

product name
price paid
image
description
category

Historical orders never change even if the product changes later.

24. Deleting products.

Prefer soft delete/archive.

Products disappear from storefront but remain available for historical orders.

H. Concurrency & Security
25. Reservation creation must be atomic.

If two customers reserve the last item simultaneously:

Only one reservation succeeds.

The other receives:

"Sorry, this item has just sold out."

26. ✅ Checkout always trusts the server.

Never trust:

browser prices
browser quantities
cached product information

Everything is revalidated server-side.

27. ✅ Multiple devices.

Every checkout revalidates independently.

Old carts on another device are automatically repaired before payment.

I. Fraud Protection
28. Limit active pending orders.

Prevent inventory abuse.

Example:

Maximum 3 active pending orders per email or phone.

29. Prevent reservation deadlocks.

Whenever reservations change:

release old reservation first
then create the new reservation

Never allow multiple active reservations for the same unfinished order.

J. Customer Experience
30. ✅ Live cart updates.

If products become:

hidden
deleted
out of stock
price changed

the customer's cart updates automatically with a clear explanation.

31. Live storefront updates.

Products becoming unavailable should immediately:

disappear
become Out of Stock
disable Add to Cart

(with realtime updates when implemented).

32. Reservation countdown.

Show customers how much time remains before their reservation expires.

Example:

Reserved for 6 days 22 hours.

Future Enhancements (Not Required Yet)

These are valuable but can wait until later versions:

Customer accounts
Wishlists
Coupons and promo codes
Multiple warehouses
Product variants (size/color)
Backorders and pre-orders
Split shipments
Delivery slot reservations
Loyalty points
Returns and refunds portal
Inventory audit dashboard


✅ Phase 1 – Reservation Engine
Create the inventory_reservations table.
Build reservation service functions (create, release, expire).
Update reserved_stock automatically when reservations change.

Phase 2 – Checkout Integration
Modify the Pay API to create reservations before launching Paystack.
Prevent duplicate pending orders.
Cancel checkout when Paystack is closed.

Phase 3 – Payment Finalization
Update the webhook to finalize inventory.
Store product snapshots.
Release reservations.

Phase 4 – Background Jobs
Seven-day expiration.
Automatic reservation cleanup.

Phase 5 – Admin Safeguards
Prevent deleting reserved products.
Prevent lowering stock below reserved.
Soft delete.

✅ Current status

We've now completed these checkout protections:

✅ Cart validation on page load.
✅ Cart validation immediately before checkout.
✅ Automatic removal of hidden/deleted products.
✅ Automatic adjustment for stock reductions.
✅ Automatic adjustment for price changes.
✅ Customer notifications explaining any changes.
✅ Seven-day pending order expiration.
✅ Inventory reservations.
✅ Automatic reserved_stock synchronization.
✅ One active pending order per customer.
✅ Editing a pending order instead of creating duplicates.
✅ Reservation refresh when the cart changes.