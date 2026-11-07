# VILLAGE — Bills to Pay

Discover other people's bills, filter by category and price, swipe through them, and pay or contribute through Paystack.

Built with Next.js 16 (App Router, Cache Components), React 19, TypeScript and Tailwind CSS v4.

## Getting started

```bash
npm install
cp .env.example .env.local   # add your PAYSTACK_SECRET_KEY
npm run dev                  # http://localhost:3000 → redirects to /bills
```

Without `PAYSTACK_SECRET_KEY` the app still runs, but checkout stays disabled and the page says why. Payments are never simulated.

## Accounts

There are two account types, both defined in [src/lib/roles.ts](src/lib/roles.ts). Rename them there.

| Role | Can | Lands on after sign-up |
| --- | --- | --- |
| **Supporter** (giver) | Contribute to bills, see their giving history | `/bills` |
| **Beneficiary** (receiver) | Post bills, track what's been raised (can also contribute to others' bills) | `/bills/new` |

- **Pages:** `/register` (pick a role, then details), `/login`, `/account`, `/bills/new` (Beneficiaries only).
- **Contributing requires sign-in.** The receipt goes to the account email, payments are stored with `userId`, and nobody can pay their own bill.
- **Security** uses Node's built-in crypto only, with no extra packages:
  - Passwords are hashed with scrypt (N=2¹⁷).
  - Sessions use a random 256-bit token in an `httpOnly`, `SameSite=Lax` cookie that's `Secure` in production. Only its SHA-256 hash is stored, and sessions last 30 days.
  - Login responses take the same time whether or not the email exists.
  - Sign-in is limited to 5 failed attempts per 15 minutes per email and IP, in memory.
  - `?next=` redirects only accept same-site paths.
- **Helpers:** use `getCurrentUser()` / `requireUser(path, role?)` from [src/server/auth/session.ts](src/server/auth/session.ts) in new pages.
- **Not built yet:** email verification and password reset.

## App tabs

Each tab adapts to who's viewing: signed out, Supporter or Beneficiary. The numbers come from [src/server/insights.ts](src/server/insights.ts).

| Tab | Signed out | Supporter | Beneficiary |
| --- | --- | --- | --- |
| **Home** (`/`) | Welcome with both sign-up paths | Greeting, what you've given | Your bill's progress, post a bill |
| | *All: village totals, bills ending soon, bills almost funded, categories, latest activity* | | |
| **Bills** | Swipeable feed + filters | ← same | ← same, plus a post-a-bill shortcut |
| **Community** | Activity feed (contributions, new bills, funded/paid bills) with filters | ← same | ← same |
| **Impact** | Village totals and money raised by category | Totals, giving per month, giving by category, milestones | Raised for you, per-bill totals, who helped |
| **Wallet** | Sign-in prompt | Payment history and receipts | Payout tracker per bill (Raising → Funded → Paid to payee) |

- **Wallet:** there's no stored balance, because money goes straight to each bill's payee through Paystack.
- **Privacy:** receipts can only be opened by the account that paid, and anonymous contributors are never named in Community.

## Admin console (`/admin`)

Grant access with `VILLAGE_ADMIN_EMAILS=ops@village.ng,…` on the server. Admins sign up normally; their emails are checked on every request. Non-admins get a 404, so the console isn't advertised.

| Tab | Purpose |
| --- | --- |
| **Verify** | Member-posted bills awaiting checks, with the owner's phone and email. *Verify* adds the badge; *Remove* takes the bill out of every public list and shows the owner the reason. |
| **Payouts** | Fully funded bills. After transferring to the payee, record the bank reference: the bill becomes *Paid to payee* and the owner and contributors are notified. Payouts are blocked until a bill is verified. |
| **Review** | Payments Paystack reported as successful but for an unexpected amount. They are never credited; reconcile them in the Paystack dashboard. |
| **Log** | Append-only audit trail: who did what, when, and why. |

Every admin action re-checks authorization on the server and re-checks the bill's state inside the write lock. That means a payout can't be recorded twice, or recorded for a bill that isn't fully funded.

## Posting limits & VILLAGE Plus (`/plus`)

All limits live in [src/lib/plans.ts](src/lib/plans.ts). Windows are rolling: a slot frees up 7 days after it was used.

| Each week | Free | Plus |
| --- | --- | --- |
| New fundraisers | 1 | 4 |
| Fundraisers open at once | 2 | 6 |
| Contracts offered in Pro rooms | 2 | 10 |

- **Enforcement:** limits are checked inside the write that saves the post, so double-submits can't slip past them. Removed bills still count, so deleting and re-posting doesn't reset the allowance.
- **Plan setup:** Plus is a Paystack Plan. Create it in the dashboard (Products → Plans) and set `PAYSTACK_PLUS_PLAN_CODE`; the price and interval are read from Paystack. Without it, the page shows "coming soon".
- **Activation:** Plus starts only after Paystack verifies the exact plan, amount and currency. Renewals arrive through the webhook (`charge.success` with the plan), are re-verified, and each payment reference is applied once.
- **Cancelling:** calls Paystack's `subscription/disable`. The member keeps Plus until the end of the paid period.

## Pro rooms (`/community/rooms`)

- **Joining:** any member can add a professional profile at `/pro`: trade, headline, state, years of experience, and an optional licence number. Colleagues see "licence on file", never the number. Each trade in [src/lib/trades.ts](src/lib/trades.ts) has one room, and only members of that trade can read it, both on the page and through the messages endpoint.
- **Chat:** messages are up to 1,000 characters, with a limit of 10 per minute. Authors can remove their own messages and admins can remove any. New messages arrive by polling `GET /api/rooms/[trade]/messages` every 4 seconds while the tab is visible. Swap in WebSockets or Server-Sent Events when you move to a real-time backend.
- **Contracts:** members offer jobs with a location, optional budget and start date. "I'm interested" shares that applicant's email and phone with the poster only, and the poster is notified. When the poster awards the job, the awardee is notified and sees the poster's contact details.

## Notifications (`/notifications`)

The bell shows the real unread count. Notifications are stored in the same write as the event that causes them:
- **Sign-up:** welcome.
- **Contribution received:** sent to the bill's owner.
- **Bill fully funded:** sent to the owner and every contributor ("You completed a bill!" for the person who finished it).
- **Bill verified or removed:** sent to the owner.
- **Payout made:** sent to the owner and every contributor.
- **Contract interest:** sent to the poster.
- **Contract awarded:** sent to the awardee.
- **Plus activated:** sent to the subscriber.

Opening a notification marks it read; "Mark all read" clears them all.

## Payments (Paystack)

1. **Start.** The `beginContribution` server action ([src/app/actions/contribute.ts](src/app/actions/contribute.ts)) re-validates the amount against the bill's current state, records a **pending** payment and opens a Paystack checkout.
2. **Return.** Paystack redirects to `/payments/callback?reference=…`. That page verifies the transaction with Paystack's API.
3. **Webhook.** Paystack also calls `POST /api/payments/paystack/webhook`, which checks the HMAC-SHA512 signature. Register this URL in the Paystack dashboard so bills are credited even if the payer closes their browser.

A bill is credited **only** when Paystack reports `success` for the exact amount (in kobo) and currency (NGN) that was recorded. Crediting is idempotent, so the callback, webhook and page reloads can never double-count. A mismatched amount is flagged `review` and isn't credited. All of this logic is in [src/server/payments/service.ts](src/server/payments/service.ts).

| Variable | Purpose |
| --- | --- |
| `PAYSTACK_SECRET_KEY` | `sk_test_…` / `sk_live_…`. Server-only. |
| `APP_URL` | Public URL for the callback (recommended in production). |
| `PAYSTACK_BASE_URL` | Optional override (staging proxy or a mock gateway in tests). |
| `VILLAGE_DATA_DIR` | Optional location of the file data store. |

## Data & deployment

The storage backend is chosen automatically ([src/server/db/mode.ts](src/server/db/mode.ts)):

| Environment | Storage | Payments |
| --- | --- | --- |
| `DATABASE_URL` (or `POSTGRES_URL`) set | **Postgres**: one JSONB row, every write under a row lock, so it's safe across many server instances | ✅ |
| Local / single server, no database | JSON file in `.data/` (gitignored) | ✅ |
| Vercel with no database | Temporary folder that can reset at any time; a "Demo mode" banner is shown | ❌ switched off, so no payment can be lost |

On first run the app creates its table and seeds the demo bills; there are no migrations to run.

### Deploying to Vercel with Supabase

1. **Create a database.** Create a project at [supabase.com](https://supabase.com). London or Frankfurt are the closest regions to Nigeria.
2. **Copy the connection string.** Click **Connect** and copy the **Transaction pooler** URI (port **6543**). Replace `[YOUR-PASSWORD]` with your database password. If the password contains symbols such as `@`, `#` or `/`, URL-encode them.
3. **Add it to Vercel.** Go to Project → Settings → Environment Variables and add `DATABASE_URL` with that URI, for Production and Preview. *Or* install the **Supabase** integration from the Vercel Marketplace, which sets `POSTGRES_URL` for you; that works too.
4. **Add the other settings:** `PAYSTACK_SECRET_KEY`, `APP_URL` (your site's URL), `VILLAGE_ADMIN_EMAILS`, and optionally `PAYSTACK_PLUS_PLAN_CODE`.
5. **Redeploy.** The demo banner disappears and payments switch on.

Use the transaction pooler (port 6543), not the direct connection (5432). Serverless functions open many short-lived connections, which the pooler is built for, and the direct host is IPv6-only on Supabase's free plan.

**Security:** Supabase exposes `public` tables through its Data API using the browser-visible anon key. When the app creates its table, it turns on row-level security with no policies and revokes access for the `anon` and `authenticated` roles, so the Data API can't read it. The app connects as the table owner and is unaffected. Never share the database URL; it grants full access.

**Scaling:** the whole state is one JSONB document, which is fine for an early-stage app. As usage grows, move busy collections (payments, room messages) into their own tables behind the same `read()`/`transaction()` API.

## Structure

```
src/app/(tabs)/bills          Discovery page (header, price chips, categories, carousel)
src/app/(flow)/bills/[id]     Bill details + contribute form + review sheet
src/app/(flow)/payments/callback  Payment verification & confirmation screen
src/app/api/payments/paystack/webhook
src/components/bills          Explorer, filters, carousel, card, empty state
src/lib                       Pure domain logic (categories, price ranges, formatting, validation)
src/server                    Data store, repositories, Paystack client, payment service
```

The filters live in the URL (`/bills?category=education&price=10k-50k`), so they can be shared and survive navigation. Price ranges are half-open: ₦10,000 falls in "₦10,000–₦50,000" and ₦100,000 in "₦100,000 and above".
