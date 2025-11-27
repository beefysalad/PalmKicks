# Admin E-commerce Basics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. In this project the implementer is Codex (one task per Codex run); Claude reviews each task.

**Goal:** Give the PalmKicks admin real order lifecycle (cancel, payment, notes, tracking), per-size/colour stock, status emails and server-side order search.

**Architecture:** Additive Prisma migrations (hand-written, never applied here) extend `Order` and add `ProductVariant`. All state changes happen in service functions inside `prisma.$transaction`; routes stay thin (`requireAdmin` → `parseJsonBody` → Zod → service → `handleRouteError`). Emails go through `runAfterResponse` and the existing non-throwing `sendMail` path.

**Tech Stack:** Next.js 16, React 19, Prisma 7 + `@prisma/adapter-pg`, Zod 4, TanStack Query, Vitest, existing `components/ui`.

**Spec:** `docs/superpowers/specs/2026-11-28-admin-ecommerce-basics-design.md` (read its "Resolved decisions" section: it overrides earlier text). Security audit context: `docs/superpowers/plans/audit-report.md`.

## Global Constraints

- Branch `feat/admin-ecommerce-basics` (already created). Commit after each task. Never push. Commit messages carry **no** Claude/Co-Authored-By trailer (repo hook blocks it).
- Install flag `--legacy-peer-deps` (in `.npmrc`). Never read, print or commit `.env`. No real DB, email or network in tests. Never run `prisma migrate dev`/`deploy`: write SQL by hand in `prisma/migrations/<timestamp later than 20261127140000>_<name>/migration.sql`, update `prisma/schema.prisma`, run `npx prisma generate`.
- Gates at the end of every task: `npm test`, `npx tsc --noEmit`, `npm run lint` (0 errors), and for tasks that touch routes/pages `npx next build` with dummy env (`DATABASE_URL=postgresql://user:pass@localhost:5432/db AUTH_SECRET=ci-secret-not-real AUTH_URL=http://localhost:3000 CLOUDINARY_CLOUD_NAME=x CLOUDINARY_API_KEY=x CLOUDINARY_API_SECRET=x EMAIL_USER=x@example.com EMAIL_PASS=x`).
- API envelope `{ success, data?, error? }`; errors via `handleRouteError`/`DomainError` subclasses; 5xx never returns `error.message`; bodies via `parseJsonBody`.
- Every admin route calls `requireAdmin()` first; new routes must be classified in `tests/api/authz-matrix.test.ts` (filesystem-generated). Public order views never expose email, phone, street address, `adminNote`, `paymentRef`.
- Money in integer centavos; stock never below 0 (DB `CHECK (stock >= 0)`); cancel restocks exactly once (`restockedAt`).
- Values: `LOW_STOCK_THRESHOLD = 2`; payment methods `gcash | bank_transfer | cash_on_meetup | other`; `adminNote` ≤ 2000 chars; stock integer 0..9999; Manila day boundary = fixed `+08:00`.

## Review Focus

- Two concurrent checkouts for the last pair of one size/colour: exactly one succeeds (stateful fake of the conditional `updateMany`).
- Cancel called twice, or cancel on a pre-migration order (`restockedAt` already set): stock changes at most once / never.
- Cancel of a `shipped` or `delivered` order, or any change on a `cancelled` order → 409.
- Back-step then forward again does not double-send the confirmed/shipped email, and an email that failed to send can be retried.
- Admin removes a size/colour that still has stock → rejected, no partial write.
- Search `q` containing `%`, `_`, quotes or very long input is safe (bounded, parameterised); `from` > `to` returns 400.
- Public tracking view of a cancelled order renders "Cancelled" and exposes nothing private.

---

## Phase 1 — Order lifecycle

### Task 1: Schema, migration and shared status rules

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20261128100000_order_lifecycle/migration.sql`, `app/shared/order-lifecycle.ts`, `tests/lib/order-lifecycle.test.ts`
- Modify: `app/shared/order-status.ts`, `app/shared/types/order.ts`

**Interfaces:**
- Produces (`app/shared/order-lifecycle.ts`, pure, client-safe):
  - `type OrderStatus = "pending"|"confirmed"|"processing"|"shipped"|"delivered"|"cancelled"`; `type PaymentStatus = "unpaid"|"paid"|"refunded"`; `const PAYMENT_METHODS = ["gcash","bank_transfer","cash_on_meetup","other"] as const`.
  - `canTransition(from: OrderStatus, to: OrderStatus): boolean` — one step forward along `ORDER_STATUS_FLOW`, one step back (never out of `cancelled`), `cancelled` reachable only from `pending|confirmed|processing`; same status is NOT a transition (callers treat as no-op).
  - `canRefund(payment: PaymentStatus): boolean` (only from `paid`).
- Schema: `OrderStatus` gains `cancelled`; `enum PaymentStatus`; `Order` gains `paymentStatus @default(unpaid)`, `paymentMethod String?`, `paymentRef String?`, `paidAt DateTime?`, `adminNote String?`, `courier String?`, `trackingNumber String?`, `shippedAt DateTime?`, `cancelledAt DateTime?`, `restockedAt DateTime?`, `confirmedEmailAt DateTime?`, `shippedEmailAt DateTime?`; indexes `@@index([paymentStatus])`, `@@index([customerEmail])`, `@@index([createdAt])`.
- Migration backfill (comment it): `UPDATE orders SET "paymentStatus"='paid', "paidAt"="updatedAt" WHERE status <> 'pending'`; `UPDATE orders SET "restockedAt"=now()` (all pre-existing orders). Use `ALTER TYPE ... ADD VALUE` for the enum (note in a comment that Postgres requires it outside a transaction block on old versions; Prisma runs each migration in its own transaction — keep it as the only enum change per migration or split into two migration directories if needed).

- [ ] **Step 1: Write the failing test** `tests/lib/order-lifecycle.test.ts`: table-driven `canTransition` — allowed: pending→confirmed, confirmed→processing, processing→shipped, shipped→delivered, each one-step back, pending/confirmed/processing→cancelled; denied: pending→processing, shipped→cancelled, delivered→cancelled, cancelled→anything, pending→pending; `canRefund("paid")` true, others false.
- [ ] **Step 2:** `npx vitest run tests/lib/order-lifecycle.test.ts` → FAIL (module missing).
- [ ] **Step 3:** Implement `app/shared/order-lifecycle.ts`; keep `ORDER_STATUS_FLOW` as is in `order-status.ts` (forward chain only; `cancelled` is NOT in it); add the new types/fields to `app/shared/types/order.ts` (`Order`, `PublicOrder` gets `courier`, `trackingNumber`, `shippedAt`, `paymentStatus` only). Edit `schema.prisma`; hand-write the migration; `npx prisma generate`.
- [ ] **Step 4:** Run the test → PASS; `npx tsc --noEmit` will now fail where services map `Order`: leave those compile errors for Task 2 ONLY if you commit them together — preferred: also minimally update `mapOrder`/`orderInclude` in `app/api/orders/orders-service.ts` so `tsc` is clean (new fields pass through; `toPublicOrder` adds the four public fields).
- [ ] **Step 5:** Gates; commit `feat(orders): lifecycle schema, migration and status rules`.

### Task 2: Order service — transitions, payment, shipping, delete rule, stats

**Files:**
- Modify: `app/api/orders/orders-service.ts`, `app/shared/zod/order-zod.ts`, `app/api/orders/[id]/route.ts`, `app/api/orders/stats/route.ts` (only if the shape changes), `app/shared/types/order.ts` (`OrderStats`)
- Test: `tests/api/order-status.test.ts` (extend), `tests/api/order-admin-update.test.ts` (new)

**Interfaces:**
- Consumes: `canTransition`, `canRefund`, `PAYMENT_METHODS` (Task 1).
- Produces:
  - `updateOrderAdmin(id: string, input: AdminOrderUpdate): Promise<Order>` where `AdminOrderUpdate = { status?: OrderStatus; expectedStatus?: OrderStatus; paymentStatus?: PaymentStatus; paymentMethod?: PaymentMethod; paymentRef?: string | null; adminNote?: string | null; courier?: string | null; trackingNumber?: string | null; markPaidAndConfirm?: boolean }` — replaces `updateOrderStatus` (keep a thin `updateOrderStatus(id, {status, expectedStatus})` wrapper delegating to it so existing callers/tests keep working). One `prisma.$transaction`; optimistic guard via `updateMany({ where: { id, status: expectedStatus ?? current } })` → `OrderTransitionError`/409 on conflict.
  - Rules: `canTransition` enforced; moving to `shipped` requires non-empty `courier` and `trackingNumber` (from input or already stored) and sets `shippedAt = now` (if null); moving to `cancelled` sets `cancelledAt`; `paymentStatus: "paid"` sets `paidAt = now` (if null); `markPaidAndConfirm` = set paid and, when status is `pending`, move to `confirmed`; `paymentStatus: "refunded"` only if current is `paid` (`canRefund`) else 409; every edit on a `cancelled` order except `adminNote` is rejected 409.
  - `deleteOrderById(id)` only when status is `cancelled` (else `OrderTransitionError` 409 "Cancel the order before deleting").
  - `getOrderStats()` returns the existing fields with: `revenue` = sum of `total` where `paymentStatus='paid'` and `status<>'cancelled'` (centavos math as today), plus `byStatus` including `cancelled`, plus `unpaidOrders: number` (status not cancelled, paymentStatus `unpaid`).
- Zod (`order-zod.ts`): `adminOrderUpdateSchema` (strict; `adminNote` ≤ 2000, `paymentRef`/`courier`/`trackingNumber` ≤ 100, `paymentMethod` enum, nullable strings trimmed to null when empty) used by `PATCH /api/orders/[id]`; keep `updateOrderStatusSchema` exported for compatibility.

- [ ] **Step 1: Write the failing tests** with the existing stateful-fake style (see `tests/api/orders-create.test.ts`, `tests/api/order-status.test.ts`): cancel from pending sets `cancelledAt`; cancel from shipped → 409; cancelled order rejects status/payment edits but accepts `adminNote`; ship without courier/tracking → 400 (`OrderValidationError`); ship with them sets `shippedAt`; mark paid sets `paidAt`; `markPaidAndConfirm` on pending → status confirmed + paid; refund from unpaid → 409; stale `expectedStatus` → 409; delete non-cancelled → 409, delete cancelled OK; stats revenue ignores unpaid and cancelled orders.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement as specified; PATCH route parses `adminOrderUpdateSchema` and calls `updateOrderAdmin` (still `requireAdmin` first; DELETE keeps its guard). **Step 4:** Run tests/tsc/lint → pass. **Step 5:** Commit `feat(orders): cancel, payment, notes and tracking updates`.

### Task 3: Admin order UI and public tracking

**Files:**
- Modify: `app/components/pages/Admin/Orders/OrderDetails/index.tsx`, `app/components/pages/Admin/Orders/OrdersList/index.tsx`, `app/components/pages/Admin/Dashboard/index.tsx`, `app/components/pages/TrackOrder/Tracking.tsx`, `lib/orders/api.ts`, `lib/orders/hooks.ts`, shared status badge helpers if they exist per-file (extract to `components/ui`-style `OrderStatusBadge` only if three or more copies are touched)
- Test: `tests/lib/order-ui-helpers.test.ts` for any new pure helper; no component tests required

**Interfaces:**
- Consumes: `PATCH /api/orders/[id]` with `AdminOrderUpdate` (Task 2), `canTransition`, `OrderStats` (Task 2).
- Produces: hook `useUpdateOrder()` (replaces/extends `useUpdateOrderStatus`; on 409 refetch the detail and toast the server message, as today).

- [ ] **Step 1: Write the failing test** for pure helpers (`nextStatuses(current)` returning the allowed targets using `canTransition`, and `statusLabel/paymentLabel` maps including `cancelled`/`refunded`).
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement helpers and UI: order detail gets (a) status control listing only `nextStatuses`, with **Cancel order** as the primary destructive button (confirm dialog; Delete shown only for cancelled orders), a confirm dialog for back-steps, courier + tracking inputs required when choosing `shipped`; (b) payment card: status badge, method select, reference, **Mark paid** (checkbox "also confirm order" default on) and **Mark refunded** (only when paid); (c) admin note textarea with Save; (d) shipping card showing courier/tracking/shippedAt. Orders list shows payment + cancelled badges. Dashboard shows `unpaidOrders` and cancelled count; revenue label "Paid revenue". Tracking page renders a "Cancelled" state and shows courier + tracking when shipped. Use existing `components/ui` (add shadcn `alert-dialog`/`textarea`/`select` only if needed, vendored under `components/ui`).
- [ ] **Step 4:** Gates incl. `npx next build` with dummy env. **Step 5:** Commit `feat(admin): order cancel, payment, notes and tracking UI`.

---

## Phase 2 — Stock per size and colour

### Task 4: Variant schema, backfill and public payload

**Files:**
- Modify: `prisma/schema.prisma`, `app/api/products/products-service.ts`, `app/shared/types/product.ts`, `app/shared/zod/product-zod.ts`, `lib/checkout/reprice.ts`
- Create: `prisma/migrations/20261128110000_product_variants/migration.sql`
- Test: `tests/api/product-variants.test.ts`, `tests/lib/reprice-cart.test.ts` (extend)

**Interfaces:**
- Schema: `model ProductVariant { id String @id @default(uuid()); productId String; size String; color String; stock Int; createdAt DateTime @default(now()); updatedAt DateTime @updatedAt; product Product @relation(fields:[productId], references:[id], onDelete: Cascade); @@unique([productId,size,color]); @@index([productId]); @@map("product_variants") }`; `Product.variants ProductVariant[]`. Migration adds `CHECK (stock >= 0)` and backfills one variant per (size × colour) from the JSON arrays with `jsonb_array_elements_text` (cross join), stock `1` when `products."inStock"` else `0`; comment the assumption.
- Produces: `Product` (service + shared type) gains `variants: { size: string; color: string; stock: number }[]`; `inStock` recomputed = any variant `stock > 0` on every product write. Zod: `stock` grid on create/update: `variantStock?: { size: string; color: string; stock: number }[]` (each 0..9999 int, size/colour must be in the product's `sizes`/`colors`). Update rules (from the spec): sizes/colours without `variantStock` keep stock for surviving combinations and create new combinations at 0; removing a size/colour whose variants have stock > 0 → `DomainError` 409 "Remove stock first"; zero-stock combos are deleted. `repriceCart`: availability is by exact (size, colour) variant stock > 0 (`UnavailableReason` keeps its values; add variant lookup from `CurrentProduct.variants`).

- [ ] **Step 1: Write failing tests** with a stateful fake prisma: create product with `variantStock` writes variants and `inStock=true`; update keeping sizes keeps counts; update adding a colour creates stock-0 variants; removing a size with stock>0 → 409 and nothing written (transaction callback throws); removing a zero-stock size deletes its variants; `inStock` false when all variants 0; `repriceCart` flags a (size,colour) combo with stock 0 as `out_of_stock` even when both appear in the lists.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement within the existing `$transaction` + `FOR UPDATE` product lock; public GET payload includes `variants`. **Step 4:** Gates. **Step 5:** Commit `feat(stock): product variants with per-size per-colour stock`.

### Task 5: Atomic checkout decrement and restock on cancel

**Files:**
- Modify: `app/api/orders/orders-service.ts` (`addOrderWithResult`, `updateOrderAdmin`), `tests/api/orders-create.test.ts`, `tests/api/order-admin-update.test.ts`
- Test: `tests/api/stock-concurrency.test.ts`

**Interfaces:**
- Consumes: `ProductVariant` (Task 4), `updateOrderAdmin` (Task 2).
- Produces: inside the checkout transaction, after validating products, for each (productId,size,color) with summed quantity `q`: `tx.productVariant.updateMany({ where: { productId, size, color, stock: { gte: q } }, data: { stock: { decrement: q } } })`; `count === 0` → `OrderValidationError("Only N left in size S / colour C")` (read the current stock for the message) and the whole order rolls back; then recompute `Product.inStock` for touched products. On transition to `cancelled`: in the same transaction, if `restockedAt` is null, increment each item's variant stock (matching `productId,size,color`; skip items whose variant or product no longer exists), set `restockedAt = now()`.

- [ ] **Step 1: Write failing tests** `stock-concurrency.test.ts` with a stateful in-memory fake emulating conditional `updateMany` and serialised transactions: stock 1, two parallel orders → one 201 and one 400 and stock 0, never negative; same variant on two lines is summed (qty 1+1 against stock 1 → fails); cancel restocks once, second cancel → 409 without a second increment; cancel of an order with `restockedAt` set changes no stock; cancel when the variant row was deleted does not throw.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Gates. **Step 5:** Commit `feat(stock): atomic decrement at checkout, restock on cancel`.

### Task 6: Admin stock grid, storefront sold-out handling, low-stock

**Files:**
- Modify: `app/components/pages/Admin/Products/NewProduct/index.tsx`, `.../EditProduct/index.tsx`, `.../ProductsList/index.tsx`, `app/components/pages/Product/ProductDetail.tsx`, `app/components/pages/Admin/Dashboard/index.tsx`, `app/api/orders/stats/route.ts` + `getOrderStats` (add `lowStock`), `lib/products/*` types
- Create: `app/components/pages/Admin/Products/StockGrid.tsx` (shared by New and Edit), `lib/stock.ts` (`LOW_STOCK_THRESHOLD`, `stockState(stock: number): "out" | "low" | "ok"`, `buildGrid(sizes, colors, variants)`), `tests/lib/stock.test.ts`

**Interfaces:**
- Consumes: `variants` on product payloads and `variantStock` on writes (Task 4).
- Produces: `getOrderStats()` adds `lowStock: { productId: string; productName: string; size: string; color: string; stock: number }[]` (stock ≤ `LOW_STOCK_THRESHOLD`, sorted ascending, max 20; the query joins product name).

- [ ] **Step 1: Write failing tests** for `stockState` boundaries (0 → out, 1–2 → low, 3 → ok), `buildGrid` (missing combos default 0, ordering follows sizes/colours), and stats `lowStock` (stateful fake).
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement: `StockGrid` renders rows = sizes, cols = colours with number inputs; the product forms submit `variantStock`; products list shows "Sold out"/"Low stock" badges from variants; product page disables sold-out size/colour combinations (selected size greys out colours with 0 stock and vice versa); dashboard lists `lowStock`. **Step 4:** Gates incl. next build. **Step 5:** Commit `feat(stock): admin stock grid, sold-out storefront, low-stock dashboard`.

---

## Phase 3 — Emails

### Task 7: Status emails and resend button

**Files:**
- Modify: `lib/send-mail.ts`, `app/api/orders/orders-service.ts` (`updateOrderAdmin`), `app/api/orders/confirm/route.ts`, `app/shared/zod/order-zod.ts`, `lib/orders/api.ts`, `lib/orders/hooks.ts`, `app/components/pages/Admin/Orders/OrderDetails/index.tsx`, `README.md` (status-email behaviour)
- Create: `lib/orders/order-status-templates.ts`, `tests/lib/order-status-templates.test.ts`, extend `tests/api/confirm.test.ts`, `tests/api/order-status-emails.test.ts`

**Interfaces:**
- Produces: `buildOrderConfirmedEmail(order: Order): { subject: string; html: string; text: string }`, `buildOrderShippedEmail(order: Order): {…}` (shipped includes courier + tracking number); all interpolations through `escapeHtml`, plain-text part uses raw values. `sendOrderStatusEmail(order: Order, type: "confirmed" | "shipped"): Promise<{ sent: boolean }>` (non-throwing, time-bounded like `sendOrderConfirmation`).
- `updateOrderAdmin`: on transition into `confirmed` with `confirmedEmailAt` null, or into `shipped` with `shippedEmailAt` null (or tracking number changed), schedule via `runAfterResponse` a send; set the matching `*EmailAt` **only after a successful send** (separate small update; failure is logged, not thrown). Mark-paid without a status change sends nothing. Cancelled sends nothing.
- `POST /api/orders/confirm` body gains `type?: "confirmation" | "confirmed" | "shipped"` (default `"confirmation"`); `shipped` requires courier+tracking on the order; response unchanged `{success:true,data:{emailSent}}`; resend of `confirmed`/`shipped` also stamps the flag on success.

- [ ] **Step 1: Write failing tests:** template escaping (`<script>`, quotes in name/courier/tracking), text part unescaped; transition pending→confirmed schedules exactly one send and stamps `confirmedEmailAt` only when the mocked send returns `{sent:true}`; failed send leaves it null and the next confirm (after back-step) retries; confirmed→processing→confirmed after a successful send does not resend; ship sends one email with tracking; mark-paid-only sends none; resend route 401 without session, 400 for `shipped` on an order without tracking, success path calls the right sender.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement; add "Resend confirmation / confirmed / shipped email" actions (a small dropdown or three buttons, shipped disabled until tracking exists) to order detail. **Step 4:** Gates. **Step 5:** Commit `feat(orders): confirmed and shipped emails with resend`.

---

## Phase 4 — Search

### Task 8: Server-side order search and filters

**Files:**
- Modify: `app/api/orders/orders-service.ts` (`getOrders`), `app/api/orders/route.ts` (GET), `app/shared/types/order.ts` (`OrderFilters`), `lib/orders/api.ts`, `lib/orders/hooks.ts`, `lib/orders/order-keys.ts`
- Test: `tests/api/orders-search.test.ts`, extend `tests/api/orders-pagination.test.ts`

**Interfaces:**
- `OrderFilters` gains `q?: string` (trimmed, 1..100), `from?: string`, `to?: string` (`YYYY-MM-DD`), `paymentStatus?: PaymentStatus`. Service converts `from` → `${from}T00:00:00+08:00` and `to` → end of that Manila day (`< next day 00:00+08:00`); `from > to` → `OrderValidationError` 400; invalid date → 400; `q` → `OR` of `id`, `customerName`, `customerEmail`, `customerPhone` using `contains` with `mode: "insensitive"` (Prisma parameterises; no raw SQL), and total/ordering unchanged.

- [ ] **Step 1: Write failing tests:** `q` builds the four-field OR with insensitive mode; `from`/`to` produce the exact `createdAt` bounds for `2026-11-05` (`2026-11-05T00:00:00+08:00` inclusive to `2026-11-06T00:00:00+08:00` exclusive); `from > to` → 400; `q` of 101 chars → 400; `%`/`_`/quotes pass through as literal text; filters combine with `status` and `paymentStatus` and are applied to both `findMany` and `count`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement and parse/validate query params in the route (Zod). **Step 4:** Gates. **Step 5:** Commit `feat(orders): server-side search and date filters`.

### Task 9: Search UI with URL state

**Files:**
- Modify: `app/components/pages/Admin/Orders/OrdersList/index.tsx`, `lib/hooks/` (new `useDebouncedValue`), `app/admin/orders/page.tsx` if a Suspense boundary is needed for `useSearchParams`
- Test: `tests/lib/use-debounced-value.test.ts` (fake timers), `tests/lib/order-filters-url.test.ts` for pure `parseOrderFilters(searchParams)` / `serializeOrderFilters(filters)` in `lib/orders/filters-url.ts`

**Interfaces:**
- Produces: `parseOrderFilters(params: URLSearchParams): OrderFilters` (ignores invalid values), `serializeOrderFilters(f: OrderFilters & { page?: number }): string`, `useDebouncedValue<T>(value: T, ms: number): T`.

- [ ] **Step 1: Write failing tests** for the parse/serialize round-trip (invalid status ignored, empty values omitted, page defaults) and the debounce hook (value changes only after `ms`).
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement; replace the page-local client search with the server query (300 ms debounce), add status/payment selects and from/to date inputs, keep state in the URL (`router.replace`, page resets to 1 on filter change), remove the "on this page" wording. **Step 4:** Gates incl. next build. **Step 5:** Commit `feat(admin): order search and filters with URL state`.

---

## Self-Review

- **Spec coverage:** lifecycle/cancel/back-step/delete rule → T1–T2; payment + notes + shipping fields, public fields, stats/revenue, backfills → T1–T2; admin UI + tracking page → T3; variants, backfill, inStock derivation, update rules, public `variants`, reprice → T4; atomic decrement and exactly-once restock → T5; stock grid, sold-out storefront, low-stock → T6; emails, flags set after success, resend with `type` → T7; search/date/Manila → T8–T9. Non-goals untouched.
- **Type consistency:** `OrderStatus`/`PaymentStatus`/`PAYMENT_METHODS`/`canTransition`/`canRefund` defined once in T1 and used in T2/T3/T8; `updateOrderAdmin` defined in T2, extended in T5 (restock) and T7 (emails); `variants`/`variantStock` shapes defined in T4 and used in T5/T6; `OrderStats.lowStock` added in T6 only.
- **Order dependencies:** T5 needs T2+T4; T7 needs T2; T9 needs T8; T3 needs T2; T6 needs T4.
- **Known risks for reviewers:** hand-written enum/backfill SQL is unverifiable here (staging test required); conditional `updateMany` is the concurrency guarantee, the fake cannot prove DB isolation.
