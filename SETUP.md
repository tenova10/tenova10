# tenova10 — Setup Guide

Complete step-by-step guide to get your store live.

---

## Prerequisites
- Node.js 18+ installed (download from nodejs.org)
- A code editor (VS Code recommended)
- Your Supabase account (already created ✅)
- Your Vercel account (already created ✅)
- Your Paystack account (already have ✅)

---

## Step 1 — Install & Run Locally

```bash
# 1. Open terminal in this folder (tenova10/)
cd tenova10

# 2. Install dependencies
npm install

# 3. Copy the env file
cp .env.local.example .env.local
```

Then open `.env.local` in your editor and fill in the values (see Steps 2–4 below).

---

## Step 2 — Set Up Supabase

1. Go to **supabase.com** → open your project
2. Click **SQL Editor** in the left sidebar
3. Paste the entire contents of `supabase/schema.sql`
4. Click **Run** — this creates your tables, indexes, and storage bucket

### Get your Supabase keys:
- Go to **Settings → API**
- Copy **Project URL** → paste as `NEXT_PUBLIC_SUPABASE_URL`
- Copy **anon public** key → paste as `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Copy **service_role** key → paste as `SUPABASE_SERVICE_ROLE_KEY`

> ⚠️ Keep `SUPABASE_SERVICE_ROLE_KEY` secret — never expose it in frontend code.

---

## Step 3 — Set Up Paystack

1. Go to **dashboard.paystack.com → Settings → API Keys**
2. Use **Test keys** while testing, **Live keys** when you go live
3. Copy **Public Key** → paste as `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`
4. Copy **Secret Key** → paste as `PAYSTACK_SECRET_KEY`

---

## Step 4 — Set Admin Password

Set a strong password in `.env.local`:

```
NEXT_PUBLIC_ADMIN_PASSWORD=your_strong_password_here
```

Your admin dashboard will be at `/admin`.

---

## Step 5 — Run Locally

```bash
npm run dev
```

Open **http://localhost:3000** — your store is running!
Open **http://localhost:3000/admin** to add your first products.

---

## Step 6 — Add Products

1. Go to `/admin` and log in with your password
2. Fill in the product form:
   - **Name**, **Category**, **Price**, **Stock**
   - Upload a product image (stored in Supabase)
   - Add an old price if it's on sale
3. Click **Add Product** — it appears on the store instantly

---

## Step 7 — Deploy to Vercel

```bash
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Deploy
vercel
```

Follow the prompts. When asked to link to a Vercel project, create a new one.

### Add environment variables to Vercel:
1. Go to **vercel.com → your project → Settings → Environment Variables**
2. Add ALL variables from your `.env.local` file
3. Redeploy: `vercel --prod`

---

## Step 8 — Configure Paystack Webhook

After deploying, tell Paystack where to send payment confirmations:

1. Go to **Paystack Dashboard → Settings → Webhooks**
2. Add webhook URL: `https://your-vercel-domain.vercel.app/api/webhook`
3. Select event: **charge.success**
4. Save

This is how stock auto-updates after every purchase.

---

## Step 9 — Custom Domain (Optional)

1. Buy a domain (Namecheap, GoDaddy, etc.)
2. In Vercel → your project → **Settings → Domains**
3. Add your domain and follow DNS instructions

---

## Your Store URLs

| URL | What it is |
|-----|-----------|
| `/` | Customer-facing shop |
| `/admin` | Your product & order dashboard |
| `/order/success` | Post-payment confirmation page |
| `/api/paystack/initialize` | Creates order + payment reference |
| `/api/webhook` | Paystack confirms payment here |

---

## Features Included

- ✅ Product grid with category filters
- ✅ Fuzzy search (handles typos)
- ✅ Add to cart with live stock checks
- ✅ Persistent cart (survives page refresh)
- ✅ Paystack popup checkout
- ✅ Real-time stock updates via Supabase Realtime
- ✅ Admin dashboard — add/edit/delete products
- ✅ Product image upload to Supabase Storage
- ✅ Order management with status updates
- ✅ Wishlist (heart button)
- ✅ "Only X left!" low stock alerts
- ✅ Sale badges for discounted items
- ✅ Order confirmation page
- ✅ Mobile responsive

---

## Going Live Checklist

- [ ] Switched Paystack keys from Test → Live
- [ ] Updated `NEXT_PUBLIC_SITE_URL` to your real domain
- [ ] Webhook URL set in Paystack dashboard
- [ ] Admin password is strong and private
- [ ] At least one product added via `/admin`
- [ ] Test order placed successfully

---

Need help? The key files are:
- `app/page.js` — the storefront
- `app/admin/page.js` — admin dashboard
- `app/globals.css` — all styling
- `supabase/schema.sql` — database setup
