# Admin e-commerce basics — design

Date: 2026-11-28 · Status: awaiting owner approval · Repo: PalmKicks (Next.js 16, Prisma 7, NextAuth v5)

## Intent and why

PalmKicks is a small sneaker shop. Customers check out on the site, then pay by hand over Instagram (GCash / bank transfer / cash on meetup). A review of the admin side (see `docs/superpowers/plans/audit-report.md` for the security audit; the admin review findings are summarised here) showed it lacks the basics a shop owner needs to run orders safely, and that the data model cannot represent them:

- stock is a single `inStock` boolean, so two buyers can order the last pair of a size;
- the only way to cancel an order is a hard delete, which erases history and revenue;
- nothing records whether an order was paid, how, or any admin note;
- no courier / tracking number, and the public tracking page shows status only;
- no emails when an order is confirmed or shipped (the resend-confirmation API exists but has no button);
- order search only filters the page you are on.

The owner wants these fixed first ("missing basics"), then the admin UI cleanup later (separate project, not in this design).

## Goals

1. **Order lifecycle:** a `cancelled` status; cancel replaces delete as the normal action; one-step rollback of a mistaken status change; revenue/stats stay correct.
2. **Payment and notes:** `paymentStatus` (unpaid / paid / refunded), `paidAt`, `paymentMethod`, `paymentRef`, free-text `adminNote`; a "Mark paid" action.
3. **Shipping:** `courier`, `trackingNumber`, `shippedAt`, shown on the public tracking page once shipped.
4. **Real stock per size and colour** with atomic decrement at checkout and restock on cancel; low-stock / sold-out indicators in admin; sold-out sizes/colours cannot be bought.
5. **Emails:** confirmation already exists; add "order confirmed" (payment received) and "order shipped" (with tracking) emails, and a "Resend confirmation" button wired to the existing `POST /api/orders/confirm`.
6. **Order search:** server-side `q` (id, customer name, email, phone — case-insensitive contains), `from`/`to` date range, status filter, all kept in the URL.

## Non-goals

Roles/permissions, coupon engine, customer database/CRM, returns/RMA workflow, payment gateway or automatic reconciliation, audit-log table, CSV export, product draft/archive, image reordering, the admin UI cleanup refactors (shared ProductForm, dialog primitives, etc.), per-product SEO fields.

## Anti-goals (a failure even if it "works")

- Any order or payment history lost by a normal admin action.
- Overselling possible under concurrent checkouts.
- A stock count that can go negative or drift from orders (cancel must restock exactly once).
- Weakening anything from the security remediation: every admin route stays behind `requireAdmin()`, public order views stay PII-free, idempotent checkout and rate limits keep working, no `error.message` leaks, the filesystem-generated authz matrix test keeps passing (new routes must be classified in it).

## Constraints

- Existing stack and patterns: Prisma 7 with `@prisma/adapter-pg`, Zod 4, TanStack Query, shadcn-style UI under `components/ui`, API envelope `{ success, data?, error? }`, `handleRouteError` / `parseJsonBody` helpers, hand-written migrations (no database is available in the sandbox: write SQL migrations by hand in `prisma/migrations/<timestamp>_<name>/migration.sql`, run `npx prisma generate`, never apply them).
- Gates that must stay green at the end of every phase: `npm test`, `npx tsc --noEmit`, `npm run lint` (0 errors), `npx next build` with dummy env.
- Never read, print or commit `.env`. No real DB/email/network in tests.
- Commit messages must not carry a Claude/Co-Authored-By trailer (repo hook).
- Install flag: `--legacy-peer-deps` (set in `.npmrc`).

## Approaches considered

Stock model (the only choice with real trade-offs; everything else follows existing patterns):

| | A. Stock per size | B. Stock per size × colour (chosen) | C. Counts inside the existing JSON arrays |
|---|---|---|---|
| Accuracy | Colourways of one shoe share a count — wrong for this catalog (products have several colours) | Exact | Exact |
| Safe concurrent decrement | yes (row update) | yes (row update) | **no** — read-modify-write of a JSON blob |
| Admin UX | one number per size | grid of numbers (sizes × colours) | same grid |
| Migration cost | medium | medium (backfill from the JSON arrays) | low |

The owner delegated the choice; B was picked on accuracy and concurrency grounds.

## Design

### Data model (additive migrations)

- `enum OrderStatus` gains `cancelled`.
- `enum PaymentStatus { unpaid paid refunded }`.
- `Order` gains: `paymentStatus PaymentStatus @default(unpaid)`, `paymentMethod String?`, `paymentRef String?`, `paidAt DateTime?`, `adminNote String?` (max 2000 chars in Zod), `courier String?`, `trackingNumber String?`, `shippedAt DateTime?`, `cancelledAt DateTime?`, `restockedAt DateTime?` (guards exactly-once restock). Indexes: `@@index([paymentStatus])`, `@@index([customerEmail])`, `@@index([createdAt])`.
- New model `ProductVariant { id, productId (cascade), size String, color String, stock Int, createdAt, updatedAt, @@unique([productId, size, color]), @@index([productId]), @@map("product_variants") }` with a DB `CHECK (stock >= 0)` in the hand-written migration.
- `Product.sizes` / `Product.colors` (JSON) and `Product.inStock` stay as **derived, denormalised display fields** written by product create/update from the variants (`sizes` = distinct sizes with stock > 0 or all sizes, in the existing order; decision below). `inStock` = any variant has stock > 0. This keeps the storefront and `lib/checkout/reprice.ts` working unchanged.
- Backfill migration: for every existing product create one variant per (size × colour) from its JSON arrays; initial stock = **1** where the product `inStock` is true, **0** otherwise (my call — the owner then edits real counts in the admin; document this in the README and in the migration comment).

### Order lifecycle

Statuses: `pending → confirmed → processing → shipped → delivered`, plus `cancelled`.
Allowed transitions (server-enforced, optimistic `expectedStatus` as today): one step forward; one step back (not out of `cancelled`, not into `pending` from `confirmed` once `paymentStatus=paid` unless the admin first marks the payment refunded/unpaid — keep it simple: allow back-step, the UI confirms); `cancel` from `pending | confirmed | processing` (not once `shipped`). `cancelled` is terminal.
Cancel runs in one transaction: set status/`cancelledAt`, increment each item's variant stock by its quantity if `restockedAt` is null, set `restockedAt`. A second cancel is a no-op conflict (409).
Delete (hard) stays admin-only but is only allowed for `cancelled` orders (keeps history safe; test orders can be cancelled then deleted). The UI makes **Cancel** the primary destructive action.
Payment: `PATCH` payload can set `paymentStatus`, `paymentMethod` (enum-ish list: gcash, bank_transfer, cash_on_meetup, other), `paymentRef`, `adminNote`; "Mark paid" sets `paid` + `paidAt` and (optionally, one checkbox default on) moves `pending → confirmed` in the same transaction. Marking `refunded` is only allowed from `paid`.
Stats: revenue = sum of `total` where `paymentStatus = paid` and `status != cancelled` (changed from "non-pending"; my call — it matches the shop's real workflow). Add counts for `cancelled`, `unpaid` and a low-stock list (variants with stock ≤ 2, constant `LOW_STOCK_THRESHOLD = 2`).
Shipping: moving to `shipped` requires `courier` and `trackingNumber` in the same request (validated), sets `shippedAt`. Public `PublicOrder` view gains `courier`, `trackingNumber`, `shippedAt`, `paymentStatus` only — **no** `adminNote`, `paymentRef`, email or phone.

### Stock

- Checkout (`addOrderWithResult`) keeps its transaction; for each line it runs `updateMany({ where: { productId, size, color, stock: { gte: qty } }, data: { stock: { decrement: qty } } })` and fails the whole order with `OrderValidationError` ("Only N left in size X / colour Y") when a row updates 0. Quantities for the same variant across lines are summed first. Unknown variant → 400 as today.
- After the decrement, `Product.inStock` is recomputed in the same transaction.
- Admin product form: sizes and colours inputs stay (comma-separated lists); below them a stock grid (rows = sizes, columns = colours) of number inputs, with the per-product low/sold-out badges in the products list. Create/update validate `stock` as integers 0..9999 and write variants in the existing product transaction (upsert changed cells, delete removed combinations only if no order references them — order items snapshot size/colour as text, so deleting a variant is always safe). Row lock `FOR UPDATE` on the product remains.
- Storefront: sold-out sizes/colours are disabled in the product page; `reprice` treats a zero-stock variant as unavailable; the server is the authority.

### Emails

New templates beside `lib/orders/order-confirmation-template.ts`, all using `escapeHtml` and the non-throwing, time-bounded `sendMail` path, sent through `runAfterResponse` (once per transition): "Payment received / order confirmed" when `paymentStatus` becomes `paid` or status becomes `confirmed` (once, tracked by a nullable `confirmedEmailAt DateTime?` on Order), "Order shipped" (courier + tracking) when status becomes `shipped` (tracked by `shippedEmailAt`). Cancelled orders send no email in this phase (non-goal; admin contacts the customer). Admin order detail gets a "Resend confirmation" button calling the existing admin-only `POST /api/orders/confirm` (response shape `{success, data:{emailSent}}`).

### Order search

`GET /api/orders` accepts `q` (≤100 chars; matches `id`, `customerName`, `customerEmail`, `customerPhone` with Prisma `contains` + `mode: "insensitive"`), `from`/`to` (ISO dates, inclusive day bounds in the server's timezone — document), `status`, `paymentStatus`, plus existing `page`/`pageSize`. The `OrdersList` UI keeps filter state in the URL (`useSearchParams`) with a debounced search input and removes the client-side page-local filter. Indexes above support it.

### Admin UI surface

Order detail gains: status control with cancel + back-step, payment card (status, method, reference, mark-paid, notes), shipping card (courier, tracking), resend-confirmation. Orders list gains a payment badge and the new filters. Dashboard gains unpaid / cancelled counts and the low-stock list. Products list shows stock badges; product form gets the stock grid. Follow existing component patterns; no new UI framework; use existing `components/ui` primitives and add shadcn `select`/`textarea`/`alert-dialog` only where a phase needs them.

## Delivery shape

Four phases, each independently shippable, in this order because stock depends on cancel/restock and emails depend on payment/shipping fields:

1. **Order lifecycle** — cancelled status, transitions, payment fields, notes, shipping fields, revenue/stats change, public view fields, admin order detail UI, tests.
2. **Stock** — `ProductVariant`, backfill migration, atomic decrement, restock on cancel, admin grid, storefront sold-out handling, low-stock indicators, tests (concurrency with a mocked transaction, restock exactly once).
3. **Emails** — status emails + resend button, tests.
4. **Search** — server-side search/date filters, URL state UI, tests.

Implementation is handed to Codex phase by phase (one phase per Codex task, narrow brief each); every phase is reviewed (Claude reviewer, Codex re-check on the riskiest ones) before the next starts.

## Resolved decisions (override anything above that reads differently)

Settled after the builder check; all are my calls unless stated.

**Variants and the storefront**
- `Product.sizes` and `Product.colors` keep **all** values (the admin source of truth for the grid; sold-out values are not removed). `Product.inStock` = any variant stock > 0.
- The public product payload (`GET /api/products`, `/api/products/[id]`) gains `variants: { size, color, stock }[]`. `stock` is exposed as a number (the shop is small; stock levels are not sensitive). The storefront disables a size/colour combination with stock 0, and `lib/checkout/reprice.ts` + the `CurrentProduct` type are updated to check availability of the exact (size, colour) variant, not the two lists independently. The statement "storefront works unchanged" is withdrawn.
- Product update: if the PATCH/PUT carries `sizes`/`colors` without a `stock` grid, existing variant stock is kept for surviving combinations and new combinations get stock 0. Removing a size/colour that still has stock > 0 is **rejected** with a 409/400 ("remove stock first") so stock is never silently discarded; removing a combination with stock 0 deletes the variant (safe: order items snapshot size/colour as text). The earlier "only if no order references them" wording is withdrawn.
- Backfill stays 1 per existing in-stock variant, 0 otherwise.

**Order lifecycle details**
- Back-step is allowed one step at a time between `confirmed → pending`, `processing → confirmed`, `shipped → processing`, `delivered → shipped`; never out of `cancelled`. Back-stepping from `shipped` clears nothing (courier/tracking/shippedAt are kept as data) but re-shipping requires courier and tracking again to be confirmed in the request, and **does not** re-send the shipped email unless the tracking number changed. Back-stepping never changes `paymentStatus`; the UI shows a confirm dialog.
- Email flags: `confirmedEmailAt`/`shippedEmailAt` are set only **after a successful send**; if a send fails the flag stays null and the next forward transition (or the admin's Resend button, which now covers confirmation and shipping emails via a `type` field `"confirmation" | "confirmed" | "shipped"`, default `"confirmation"`) can retry. Emails are sent only on the transition into `confirmed` (status), and into `shipped`. "Mark paid" without moving the status sends no email; marking paid with the default checkbox moves `pending → confirmed` and therefore sends the confirmed email.
- Cancelling a paid order does **not** auto-change `paymentStatus`; the admin marks it `refunded` (allowed from `paid` for any status). Revenue excludes cancelled orders regardless, and a `refunded` order is not revenue.
- `cancelled` stays **out of** `ORDER_STATUS_FLOW` (the forward chain) and gets its own handling; the shared status type/badge components must include it, and the public tracking page renders a "Cancelled" state.
- Existing-order backfill in the migration: orders with `status != 'pending'` get `paymentStatus = 'paid'`, `paidAt = updatedAt` so historical revenue is preserved; every pre-existing order gets `restockedAt = now()` so cancelling an old order never restocks stock that was never decremented. (Owner should confirm the paid backfill matches reality; it can be edited in the migration SQL before deploy.)

**Smaller**
- Date filters (`from`/`to`) use a fixed `Asia/Manila` (UTC+8) day boundary, not the server timezone (supersedes "server timezone").
- Stats: one route, `GET /api/orders/stats`, extended with `cancelled`, `unpaid` and `lowStock` (variants ≤ threshold with product name); no new route. Any new route is still classified in the authz matrix test.
- Tests: the checkout concurrency test uses a stateful in-memory fake of the Prisma transaction (the same style as the existing order-create tests) that emulates conditional `updateMany` (`stock >= qty`), so over-selling shows up as a failure; it cannot prove database isolation, so the README notes the conditional update is the guarantee and recommends a staging test.
- Commit trailers: the repo owner's setup rejects Claude co-author trailers (a Claude Code plugin hook blocks them), so commits carry none.

## Left to the builder

Exact column/enum naming within the conventions above, Zod message wording, component layout and styling, test file organisation, migration SQL details for the backfill (use `jsonb_array_elements_text` over the existing JSON columns; verify by reading, since it cannot be run here), the debounce interval, and the exact default sizes of badges/cards.

## My calls the owner should check

1. Initial stock = 1 per existing in-stock variant (0 if the product is out of stock).
2. Revenue = paid and not cancelled (was: every non-pending order).
3. Back-step allowed one step; cancel only before `shipped`; hard delete only for cancelled orders.
4. Low-stock threshold 2, hard-coded constant.
5. No email on cancellation in this round.
6. Date filters use the server timezone.
