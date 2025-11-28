# PalmKicks

A sneaker storefront with an admin panel, built with Next.js 16 (App Router), React 19, Prisma 7 and PostgreSQL.

Customers browse, add items to a cart and place guest orders. Payment is not integrated: the shop owner coordinates payment and fulfilment manually with the customer over Instagram after an order is placed.

## Features

### Storefront

- Product listing with name search and gender filter, product detail pages with size and colour selection.
- Featured products carousel and a "latest collection" section on the home page.
- Sale pricing: discounted prices are shown only for products flagged as on sale.
- Cart persisted in the browser (local storage), with a per-line quantity cap.
- Guest checkout with shipping or meet-up delivery. Prices and totals are computed on the server from the database; the browser sends only product ids and choices. The shipping fee is not calculated; it is arranged manually with the seller.
- Order tracking by order id (`/track`, `/order/[id]`). The public view exposes minimal data only, never customer contact details.
- A confirmation email is sent when an order is created (only if SMTP credentials are configured). Confirmed and shipped transitions also send status emails; see below.

### Admin panel (`/admin`)

- Credentials login (Auth.js v5), forced password change on first login.
- Dashboard with order statistics, product CRUD (with extra images), brand CRUD, orders list (server-side paging, status filter), order detail with status updates and a resend-confirmation action.
- Featured products and latest collection management.
- Settings: site links/configuration entries and password change.
- Image upload to Cloudinary.

## Tech stack

- Next.js 16 (App Router), React 19, TypeScript 5
- Tailwind CSS 4, Radix UI, Framer Motion, Lucide icons, Sonner
- TanStack Query, React Hook Form, Zod 4
- PostgreSQL with Prisma 7 (`@prisma/adapter-pg`)
- Auth.js v5 beta (`next-auth@5.0.0-beta`), bcryptjs
- Cloudinary (uploads), Nodemailer with Gmail SMTP (email)
- Vitest for tests, ESLint 9, GitHub Actions for CI

## Requirements

- Node.js 20.9 or newer (CI uses Node 22)
- npm
- A PostgreSQL database
- Optional: a Cloudinary account (image uploads) and a Gmail account with an app password (order emails)

## Getting started

```bash
git clone <your-fork-url>
cd palmkicks
npm install          # .npmrc sets legacy-peer-deps=true (needed by some peer ranges)
cp .env.example .env # then fill in the values, see below
npm run db:migrate   # apply migrations to DATABASE_URL
npm run db:seed      # create admin accounts, brands, sample products, site configuration
npm run dev
```

Open http://localhost:3000 and the admin panel at http://localhost:3000/admin/login.

### Environment variables

`.env.example` is the canonical list. Never commit `.env`.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `AUTH_SECRET` | yes | Auth.js v5 secret (`openssl rand -base64 32`). `NEXTAUTH_SECRET` is still accepted as a fallback |
| `AUTH_URL` | yes in production | Public site URL. `NEXTAUTH_URL` is still accepted as a fallback. The scheme decides which session cookie name is used |
| `ADMIN_SEED_USERNAME`, `ADMIN_SEED_PASSWORD` | for seeding | First admin account created by `db:seed` |
| `ADMIN_SEED_SUPERUSER`, `ADMIN_SEED_SUPERPASSWORD` | for seeding | Second admin account created by `db:seed` |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | for uploads | Cloudinary credentials; images are stored in the `products` folder |
| `EMAIL_USER`, `EMAIL_PASS` | optional | Gmail address and app password. Without them orders are still created but no email is sent |
| `NEXT_PUBLIC_INSTAGRAM_URL` | yes | Shown to customers; used for manual payment coordination |
| `NEXT_PUBLIC_LOGO_URL` | optional | Logo used in emails (omitted when empty) |
| `NEXT_PUBLIC_ENVIRONMENT` | optional | `DEV` shows a "Development" badge in the admin UI; any other value or empty shows nothing |
| `NEXT_PUBLIC_FACEBOOK_URL`, `NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_TIKTOK_URL` | for seeding | Initial site configuration entries written by `db:seed` (editable later in admin settings) |

`NEXT_PUBLIC_*` values are embedded in the client bundle; never put secrets in them.

### Admin bootstrap and first login

The seed script creates two admin accounts from the `ADMIN_SEED_*` variables (existing usernames are skipped). Choose unique, strong values. Seeded accounts are flagged `firstTimeLogin`: until the password is changed, the admin can sign in but every privileged API call is refused (HTTP 403) except the change-password endpoint. A password change revokes all sessions issued before it.

If you ever reused credentials from this repository's git history (earlier commits contained hard-coded default admin credentials), treat them as compromised and rotate them everywhere they were used.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | `prisma generate && next build`. Does not touch the database |
| `npm start` | Production server |
| `npm run db:migrate` | `prisma migrate deploy`: applies pending migrations |
| `npm run db:seed` | Seeds admins, brands, products and configuration; exits non-zero on failure |
| `npm run lint` | ESLint |
| `npm test` | Vitest (single run); `npm run test:watch` for watch mode |
| `npx tsc --noEmit` | Type-check |

## Project structure

```
app/
  admin/                 admin pages (dashboard, products, brands, orders, featured, latest, settings, login)
  api/                   route handlers (see API table); *-service.ts files hold the database logic
  components/pages/      page-level components (Admin, Cart, Checkout, LandingPage, Order, Product, Shop, TrackOrder)
  components/shared/     shared storefront components
  shared/                shared types, Zod schemas and constants
  cart, checkout, order, product, shop, track   storefront routes
components/ui/           reusable UI primitives
lib/
  auth.ts                Auth.js config, login throttle, session verification
  require-admin.ts       server-side admin guard for API routes
  rate-limit.ts          in-memory rate limiter
  send-mail.ts           SMTP + order confirmation email
  upload-validation.ts   image validation for uploads
  money.ts, pricing.ts   centavo arithmetic and server-side pricing
  products/, brands/, orders/, settings/, checkout/   client API + TanStack Query hooks per domain
middleware.ts            redirects unauthenticated /admin page requests to the login page
prisma/                  schema.prisma, migrations/, seed.ts
tests/                   Vitest suites (api/, lib/, middleware)
.github/workflows/       ci.yml (lint, types, tests) and create-prod-pr.yml
```

## API routes

"Admin" means a valid admin session whose password has been changed (the first-login restriction applies, except where noted).

| Route | Methods | Auth |
|---|---|---|
| `/api/auth/[...nextauth]` | GET, POST | Auth.js handlers |
| `/api/products` | GET; POST | public; admin |
| `/api/products/[id]` | GET; PUT, PATCH, DELETE | public; admin |
| `/api/brands` | GET; POST | public; admin |
| `/api/brands/[id]` | GET; PUT, DELETE | public; admin |
| `/api/orders` | POST; GET | public (rate limited, idempotent); admin (paged) |
| `/api/orders/[id]` | GET; PATCH, DELETE | public minimal view for non-admins (or with `?view=public`), full view for admin; admin |
| `/api/orders/stats` | GET | admin |
| `/api/orders/confirm` | POST | admin (resends the confirmation email) |
| `/api/upload` | POST | admin |
| `/api/settings` | GET; POST | public; admin |
| `/api/settings/[id]` | PUT, DELETE | admin |
| `/api/settings/change-password` | POST | admin, allowed during first login |

The `/admin/*` pages are guarded by `middleware.ts`, but the middleware does not cover `/api`; every privileged handler calls `requireAdmin()` itself.

## Security model

- **Admin guard:** `requireAdmin()` checks the Auth.js session and, at most once per minute per session, re-verifies the admin row in the database. Deleted admins and sessions issued before the last password change are rejected. Middleware verifies the JWT and fails closed.
- **First-login password change:** accounts with `firstTimeLogin` are blocked from privileged APIs until they change the password (10 to 72 characters).
- **Login throttle:** 5 failed attempts per username per 15 minutes, with a constant-time-style dummy hash comparison for unknown users.
- **Order rate limiting:** 5 order requests per IP per 10 minutes and 3 created orders per email per hour. Replays of an already-created order are answered before limits are applied. The client IP is taken from trusted proxy headers only. If no valid IP can be resolved, the per-IP limit is skipped (rather than putting every such client in one shared bucket) and only the per-email limit applies.
- **Idempotency keys:** checkout sends an `Idempotency-Key` header; a retry with the same key returns the original order instead of creating a duplicate.
- **Server-side pricing:** totals, item names and prices come from the database, stock and variants are validated, and order totals are capped.
- **Public order view:** guests see only a minimal projection of an order, never customer contact details.
- **Uploads:** admin only, 5 MB cap checked before parsing, the file type is determined by content (JPEG, PNG or WebP), not by the declared MIME type.
- **Email:** all user-supplied values are HTML-escaped in the email body, SMTP uses TLS with certificate verification, and sends are time-bounded.
- **Public settings:** `GET /api/settings` is deliberately public (the storefront reads site links and contact info from it), so `Configurations` must hold only non-sensitive storefront settings.
- **Errors:** API errors use a consistent shape and do not leak internals.

## Orders and status

Admin `GET /api/orders` supports `q` (1–100 characters after trimming), `status`, `paymentStatus`, `from`/`to` (`YYYY-MM-DD`), and pagination. Search matches order id, customer name, email or phone case-insensitively across all matching orders. Dates use fixed Manila (UTC+8) days: `from` includes midnight and `to` includes the entire day using an exclusive next-midnight bound. Invalid dates or reversed ranges return 400.

Prisma parameterizes search values; PostgreSQL `contains` uses LIKE/ILIKE patterns, where `%` and `_` would normally be wildcards. The application escapes `%`, `_` and backslashes before calling `contains`, so these are literal search characters. Quotes remain parameter values; search does not use raw SQL. Database-level matching still needs staging verification.

Order ids look like `PK-YYYY-XXXXXXXXXX`. Statuses follow `pending`, `confirmed`, `processing`, `shipped`, `delivered`, with one-step reversals allowed. Orders can be cancelled before shipping; concurrent updates are guarded. Payment is arranged manually through Instagram.

### Status emails

After a successful transition into `confirmed` or `shipped`, a status email is scheduled with `runAfterResponse`, outside the database transaction. Shipped emails include the saved courier and tracking number. Marking paid without changing status sends nothing; marking paid and confirming sends the confirmed email. Cancelled orders send no emails, and pending jobs re-check for cancellation before sending.

`confirmedEmailAt` and `shippedEmailAt` are written only after a successful send. Failure leaves the flag unset so a later transition can retry. Back-stepping and returning to the same status does not resend a successful email. Changing the tracking number clears the shipped-email flag; the next transition into `shipped` can send the new tracking details. Sends are non-throwing and bounded to 15 seconds; email failure never rolls back an order update.

The admin order detail has explicit resend buttons for the original confirmation, confirmed email, and shipped email. `POST /api/orders/confirm` remains admin-only and accepts `{orderId, type}` (`confirmation` by default, or `confirmed`/`shipped`). Shipped resends require saved courier/tracking details. Explicit resends can repeat a previously successful email; cancelled orders are refused. The response remains `{success:true,data:{emailSent}}`.

Status email jobs are best-effort, with coalescing only within one server instance. There is no durable outbox: a crash can lose a job, and parallel instances or a failure to record a successful delivery can produce duplicates. Verify SMTP and concurrency on staging; use a durable delivery queue if stronger guarantees are needed.

## Database

Models (`prisma/schema.prisma`): `Brand`, `Product`, `ProductImage`, `Order`, `OrderItem`, `Admin`, `Configurations`.

- `Brand`, `Product`, `ProductImage`, `OrderItem` use UUID ids; `Order` uses the custom `PK-...` id; `Configurations` uses cuid ids.
- Deleting a product cascades to its `ProductImage` rows. Deleting an order cascades to its `OrderItem` rows. `Product` to `Brand` is restricting (a brand with products cannot be deleted). `OrderItem.productId` is nullable and keeps a name/price/image snapshot.
- Money is stored as `Decimal(10,2)` and calculated in centavos in code.

### Product variant stock

The product-variants migration seeds each existing size × colour combination with **1 pair** when the legacy product is in stock, otherwise **0**. This is an assumption, not an inventory count: enter the real counts before accepting orders against the migrated inventory. Products keep all configured sizes and colours; `inStock` is derived from whether any variant has stock. New products and new combinations default to zero unless `variantStock` supplies a count. Removing a stocked size or colour requires setting its stock to zero in a separate update first.

Checkout sums duplicate size/colour lines and decrements stock with a conditional `updateMany` (`stock >= quantity`) inside the order transaction. Checkout, cancellation and admin stock edits lock the same product rows; multiple products are locked in id order. Cancellation restores remaining variants once, guarded by `restockedAt`; legacy orders never restore stock. The stateful mocked tests exercise these rules and rollback, but cannot prove PostgreSQL isolation: verify concurrent checkout/cancellation/admin edits on a staging database before deployment.

## Testing and CI

```bash
npm test             # Vitest: authorization matrix, orders, uploads, email, rate limiting, pricing, ...
npx tsc --noEmit
npm run lint
```

Tests mock the database, email and Cloudinary; no external services are needed. `.github/workflows/ci.yml` runs `npm ci`, `npx prisma generate`, lint, type-check and tests on every push and pull request (Node 22, no database, no secrets).

## Deployment

The build and the database lifecycle are deliberately separate:

1. Provision PostgreSQL and set the environment variables above on the host.
2. Run `npm run db:migrate` against the production database as a release or deploy step, not inside the build.
3. Run `npm run db:seed` once to create the admin accounts (set the `ADMIN_SEED_*` variables for that run).
4. Build with `npm run build` and start with `npm start`.

On Vercel, set the build command to `npm run build` (the default `next build` skips `prisma generate`) and run migrations from CI or a one-off command. Deployments on other platforms have not been tested.

The hand-written migrations `20261127120000_order_idempotency_key`, `20261127130000_admin_password_changed_at` and `20261127140000_add_indexes` have never been applied against a real database in this branch. Run `npx prisma migrate diff` and `npm run db:migrate` against a staging database first.

## Known limitations

- The order rate limiter and the login throttle are in memory: limits are per server instance and reset on restart or cold start. A multi-instance or serverless deployment needs a shared store (for example Redis or Upstash).
- An idempotency key is not bound to the request body: reusing a key with different content returns the original order.
- No payment integration: payment and shipping fees are coordinated manually through Instagram.
- The admin password policy is length-based only (10 to 72 characters).
- The per-username login lockout (5 failed attempts per 15 minutes) can be triggered by anyone who knows an admin username, locking that admin out for the window. The throttle is best-effort and in memory: flooding it with many usernames can evict existing counters.
- Order ids created before this remediation (`PK-YYYY-` plus 5 characters from `Math.random`) remain guessable through the public order endpoint, which exposes only the customer's first name, the city or meetup location, and the items. New ids have 10 random Crockford base32 characters.
- The database migrations are hand-written and must be tested on a staging database before production (see above).

## Known issues (dependencies)

`npm audit` (run 2026-11-28) reports 7 high-severity advisories, 0 critical, 0 moderate, 0 low. All fixes need a major-version change that has not been adopted. Whether any of them is reachable from this app has not been verified.

| Package | Direct | Installed | Advisories | Suggested fix |
| --- | --- | --- | --- | --- |
| `nodemailer` | yes | 7.0.13 | 20 advisories affecting versions up to 10.1.3, including SMTP command and header injection (CRLF), addressparser recipient/domain mis-parsing, `disableFileAccess`/`disableUrlAccess` bypasses, TLS certificate validation in OAuth2 token fetch, and several quadratic-time denial-of-service issues | `nodemailer` 10.6.1 (major) |
| `next-cloudinary` | yes | 6.19.3 | via `@cloudinary-util/url-loader` | `next-cloudinary` 7.1.1 (major) |
| `@cloudinary-util/url-loader` | no | 5.10.4 | via its nested `zod` | `next-cloudinary` 7.1.1 |
| `zod` (nested 3.25.76 under `@cloudinary-util/url-loader`) | no | 3.25.76 | GHSA-mrhx-c7xc-m3w5: memory exhaustion validating oversized constrained collections (`<4.6.6`). The app's own `zod` is 4.6.7 and not affected. | `next-cloudinary` 7.1.1 |
| `prisma` | yes (dev) | 7.10.1 | via `@prisma/config` | npm suggests `prisma` 6.12.0 (a downgrade) |
| `@prisma/config` | no | 7.10.1 | via `effect` | as above |
| `effect` | no | 3.20.0 | GHSA-7589-6fvf-x4pw: ReDoS in `Schema.TemplateLiteral` compiled regex (`<=3.22.0`) | as above |

`prisma`, `@prisma/client` and `@prisma/adapter-pg` are kept on the same version (7.10.1). Upgrade them together, and re-run the tests and `next build` afterwards.

## License

MIT, see [LICENSE](LICENSE). Replace the `<your name>` placeholder in the license file.
