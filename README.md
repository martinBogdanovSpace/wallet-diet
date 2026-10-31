# Wallet Diet

Shared income & expense tracker for two people. Next.js 16 + Supabase, installable as a PWA.

## Features

- Quick add: amount, category, paid with **Cash / Card / Transfer**, date, note
- **ATM withdrawals** and a **cash wallet** (cash on hand, "count cash" correction)
- Dashboard: month balance, income vs expenses, spending by category, who paid
- History grouped by day, with filters (who / method / category) and month switcher
- **Monthly budgets** per category (amber at 80%, red when over)
- **Recurring** income & payments (salary, rent, subscriptions), posted automatically when the app is opened
- Household invite link/code; live updates when the other person changes something
- Edit entries in the same drawer as adding them; deleting takes a second tap
- History search (notes and categories) and a filter drawer
- Works on a bad connection: new entries are kept on the phone and sent when it's back online
- Export every entry to CSV (More → Export), readable by Excel in either language
- Follows the phone's light or dark mode

## Setup

### 1. Supabase

1. Create a free project at <https://supabase.com>.
2. **SQL Editor** → paste and run each file in `supabase/migrations/`, oldest first
   (`20261030000000_init.sql`, then `20261031000000_hardening.sql`).
3. **Authentication → Sign In / Providers → Email**: turn **off** "Confirm email" (simplest for two people),
   or keep it on and add `https://<your-domain>/auth/callback` under **Authentication → URL Configuration → Redirect URLs**.
4. **Project Settings → API Keys**: copy the project URL and the **publishable** key.

### 2. Local

```bash
cp .env.example .env.local   # fill in the two values
npm install
npm run dev
```

### 3. Vercel

Import the repo as a new project, add the same two env vars plus `NEXT_PUBLIC_SITE_URL`
(the site's address, used in confirmation emails), deploy.
Set Supabase **Authentication → URL Configuration → Site URL** to the Vercel URL.

### 4. First use

1. Create your account → create the household.
2. **More → Share invite link** → your partner opens it, creates an account, joins.
3. Once both of you have accounts: Supabase **Authentication → Sign In / Providers** → turn off
   **Allow new users to sign up**, so nobody else can create an account.
4. On iPhone: open the site in Safari → Share → **Add to Home Screen**. Log in once inside the installed app.

## Notes

- Amounts are stored as integer cents; everything is EUR.
- "Today" / "this month" use the household's timezone (taken from the browser that created it).
- Row-level security restricts every table to members of the household.
- `npm test` runs the unit tests (amount parsing, keypad, dates, CSV).
