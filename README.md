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

## Notifications (`/notifications`)

The bell shows the real unread count. Notifications are stored in the same write as the event that causes them:
- **Sign-up:** welcome.
- **Contribution received:** sent to the bill's owner.
- **Bill fully funded:** sent to the owner and every contributor ("You completed a bill!" for the person who finished it).
- **Bill verified or removed:** sent to the owner.
- **Payout made:** sent to the owner and every contributor.

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

## Data

Bills and payments live in a file-backed JSON store (`.data/village-db.json`, gitignored). It's seeded on first run with demo bills whose deadlines are relative to that run. Writes are serialized, which is safe for a single server instance. **For serverless or multi-instance hosting, swap in a real database** by replacing [src/server/db/store.ts](src/server/db/store.ts); the repositories and payment service don't need to change.

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
