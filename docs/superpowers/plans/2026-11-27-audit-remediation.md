# PalmKicks Audit Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the Critical/High/Medium findings from the repo audit so PalmKicks is safe to deploy and presentable to an employer, with tests proving each fix.

**Architecture:** One server-side `requireAdmin()` guard applied inside every privileged route handler (middleware is only navigation assist). Order creation moves to a service that loads products from the DB, recomputes money with integer centavos, runs in one transaction, and sends the confirmation email server-side. Vitest is added; route handlers are tested by calling the exported `GET/POST/...` functions with mocked `@/lib/auth` and mocked Prisma.

**Tech Stack:** Next.js 16, React 19, Prisma 7 (+`@prisma/adapter-pg`), NextAuth v5 beta, Zod 4, Nodemailer, Cloudinary, Vitest (new).

**Spec:** `docs/superpowers/plans/audit-report.md` (finding IDs F01–F33 below refer to it).

## Global Constraints

- Work on a new branch `fix/audit-remediation` off `main`. Commit after each task. Never push.
- Commit messages end with: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`
- Public reads stay public: `GET /api/products`, `/api/products/[id]`, `/api/brands`, `/api/brands/[id]`, `GET /api/settings`. Guest checkout (`POST /api/orders`) stays public.
- All API responses use `{ success: boolean, data?: T, error?: string }`. 5xx responses never include `error.message`; they return a fixed string.
- Never print or commit secret values. No real DB writes or real emails in tests (mock `@/lib/prisma`, `@/lib/send-mail`, `cloudinary`).
- Money: never use JS floats for authoritative totals; compute in integer centavos (`Math.round(Number(price) * 100)`), store via Prisma Decimal string.
- Tasks 2–5 and 8–9 touch disjoint files after Task 1 and may run in parallel worktrees; Task 6 depends on 2 and 3; Task 10 runs last.

## Review Focus

- Expired/forged session cookie hitting an `/api` mutation → 401, never reaches the service.
- Order POST with a `productId` that does not exist, is `inStock:false`, or a `size`/`color` not in the product's arrays → 400, nothing written.
- Order POST with `price`/`total` tampered → stored values equal DB-derived values.
- Same `Idempotency-Key` sent twice in parallel → exactly one order, same response.
- Upload with string field, 0-byte file, 20 MB file, or `text/html` renamed `.png` → 400/401 before Cloudinary is called.
- Confirmation email with `<script>`/`"` in customer name and item name → escaped in HTML.

---

### Task 1: Test harness, branch, `requireAdmin`

**Files:**
- Create: `vitest.config.ts`, `lib/require-admin.ts`, `lib/api-response.ts`, `tests/lib/require-admin.test.ts`
- Modify: `package.json` (scripts `test`, `test:watch`; devDeps `vitest`, `@vitest/coverage-v8`), `tsconfig.json` only if the `@/` alias needs mapping in Vitest (use `resolve.alias` in `vitest.config.ts`)

**Interfaces:**
- Produces: `requireAdmin(): Promise<NextResponse | null>` — returns `null` when `auth()` yields `session.user.id`, else a 401 `NextResponse.json({success:false,error:"Unauthorized"},{status:401})`. `apiError(status: number, message: string): NextResponse` and `apiOk<T>(data: T, status?: number): NextResponse` in `lib/api-response.ts`.

- [ ] **Step 1:** `git checkout -b fix/audit-remediation`; `npm i -D vitest @vitest/coverage-v8`; add scripts `"test": "vitest run"`, `"test:watch": "vitest"`.
- [ ] **Step 2: Write failing test** `tests/lib/require-admin.test.ts`: with `vi.mock("@/lib/auth")`, `auth()` → `null` ⇒ result status 401; `auth()` → `{user:{}}` ⇒ 401; `auth()` → `{user:{id:"a1"}}` ⇒ `null`.
- [ ] **Step 3:** Run `npx vitest run tests/lib/require-admin.test.ts` → FAIL (module missing).
- [ ] **Step 4:** Implement `lib/require-admin.ts` and `lib/api-response.ts` per Interfaces; add `vitest.config.ts` (node env, alias `@` → repo root, include `tests/**/*.test.ts`).
- [ ] **Step 5:** Run `npm test` → PASS. Commit `chore: add vitest and requireAdmin guard`.

### Task 2: Protect all privileged routes (F01, F09)

**Files:**
- Modify: `app/api/brands/route.ts` (POST), `app/api/brands/[id]/route.ts` (PUT, DELETE), `app/api/products/route.ts` (POST), `app/api/products/[id]/route.ts` (PUT, PATCH, DELETE), `app/api/orders/[id]/route.ts` (DELETE, PATCH), `app/api/settings/route.ts` (POST), `app/api/settings/[id]/route.ts` (PUT, DELETE), `app/api/upload/route.ts` (POST), `app/api/orders/route.ts` (GET), `middleware.ts`
- Test: `tests/api/authz-matrix.test.ts`

**Interfaces:**
- Consumes: `requireAdmin()` from Task 1.

- [ ] **Step 1: Write failing test** `authz-matrix.test.ts`: mock `@/lib/auth` so `auth()` → `null`; mock all `*-service` modules and `@/lib/prisma` with `vi.fn()`. For every `[routeModule, exportName]` pair in a table covering the exports listed under Modify, call the handler with a minimal `NextRequest` and a `{ params: Promise.resolve({ id: "x" }) }` context; assert `status === 401` and that no mocked service fn was called.
- [ ] **Step 2:** Run → FAIL for every row.
- [ ] **Step 3:** In each listed handler, first statement: `const denied = await requireAdmin(); if (denied) return denied;`. `GET /api/orders` becomes admin-only. Do not change public GETs.
- [ ] **Step 4:** `middleware.ts`: replace cookie-existence check with `getToken({ req, secret: process.env.AUTH_SECRET, secureCookie, salt })` from `next-auth/jwt` (salt = the actual cookie name used by Auth.js v5: `authjs.session-token` or `__Secure-authjs.session-token`); redirect to `/admin/login` when token is null. Keep matcher `/admin/:path*`. Add a comment that API routes enforce auth themselves.
- [ ] **Step 5:** Run `npm test` → PASS; `npx tsc --noEmit` clean. Commit `fix(security): require admin session on privileged API routes`.

### Task 3: Order privacy (F02)

**Files:**
- Modify: `app/api/orders/[id]/route.ts` (GET), `app/api/orders/orders-service.ts` (add `getPublicOrderById`), `app/shared/types/` (add `PublicOrder` type if orders types live there), the confirmation page component `app/components/pages/Order/OrderConfirmation.tsx` and `lib/orders/api.ts`/`hooks.ts` only as needed to consume the reduced shape
- Test: `tests/api/orders-privacy.test.ts`

**Interfaces:**
- Produces: `getPublicOrderById(id: string): Promise<PublicOrder | null>` where `PublicOrder = { id; status; total; createdAt; deliveryMethod fields (meetupLocation|shippingCity); items: {name,price,image,size,color,quantity}[]; customerFirstName: string }` — no email, phone, street address, last name.
- Admin GET (session present) still returns the full `Order` via `getOrderById`.

- [ ] **Step 1: Write failing tests:** anonymous `GET /api/orders/PK-2026-X` returns body whose JSON string contains none of the mocked order's email, phone, `shippingAddress`; with admin session returns full record; unknown id → 404.
- [ ] **Step 2:** Run → FAIL. **Step 3:** implement per Interfaces; the handler branches on `await auth()`. **Step 4:** fix the confirmation page to render from `PublicOrder`; run `npm test`, `npx tsc --noEmit`, `npm run lint`. Commit `fix(security): stop exposing customer PII on public order endpoint`.

### Task 4: Upload hardening (F07)

**Files:**
- Modify: `app/api/upload/route.ts`
- Create: `lib/upload-validation.ts`
- Test: `tests/lib/upload-validation.test.ts`, `tests/api/upload.test.ts`

**Interfaces:**
- Produces: `validateImageFile(file: unknown): Promise<{ ok: true; buffer: Buffer; mime: "image/jpeg"|"image/png"|"image/webp" } | { ok: false; status: 400|413|415; error: string }>` — rejects non-`File`, size 0 or > 5 MB (413), and magic-byte mismatch (JPEG `FF D8 FF`, PNG `89 50 4E 47`, WebP `RIFF....WEBP`) regardless of client-declared type (415).

- [ ] **Step 1: Write failing tests** for each rejection case above plus a valid tiny PNG; route test: no session → 401 and `cloudinary.uploader.upload` (mocked) not called; invalid file → 4xx and not called; valid → called once with data URI built from the *sniffed* mime.
- [ ] **Step 2:** Run → FAIL. **Step 3:** implement; route order is `requireAdmin` → env check → `validateImageFile` → upload. Use `upload_stream` or keep data URI (≤5 MB) — implementer's choice. Return `apiError(500, "Failed to upload file")` on failure. Commit `fix(security): authorize and validate image uploads`.

### Task 5: Email hardening (F05, F06, F08, F20)

**Files:**
- Modify: `lib/send-mail.ts` (remove `rejectUnauthorized: false`), `lib/orders/order-confirmation-template.ts`, `app/api/orders/confirm/route.ts`, `lib/checkout/checkout.ts`
- Create: `lib/escape-html.ts`
- Test: `tests/lib/escape-html.test.ts`, `tests/lib/order-template.test.ts`, `tests/api/confirm.test.ts`

**Interfaces:**
- Produces: `escapeHtml(value: string): string` (escapes `& < > " '`). `sendOrderConfirmation(order: Order): Promise<{ sent: boolean }>` exported from `lib/send-mail.ts`; never throws (logs and returns `{sent:false}`).
- `/api/orders/confirm` becomes admin-only resend: `POST {orderId}` → `requireAdmin`, loads the order from DB, calls `sendOrderConfirmation`, returns `{success:true,data:{emailSent:boolean}}` with the same nesting `checkout.ts` reads.

- [ ] **Step 1: Write failing tests:** `escapeHtml("<script>\"x\"</script>")` has no `<`/`"`; `buildOrderConfirmationEmail` with `customer.name="<img onerror=1>"` and item name `"a\"b"` output contains neither raw string; confirm route with no session → 401 and `sendMail` not called; `send-mail.ts` source/transport options contain no `rejectUnauthorized: false` (assert via mocking `nodemailer.createTransport` and inspecting its argument).
- [ ] **Step 2:** Run → FAIL. **Step 3:** implement; wrap every interpolation in the template with `escapeHtml`. **Step 4:** in `lib/checkout/checkout.ts` delete the follow-up browser call to `/api/orders/confirm` (email is now sent by Task 6's order service) and remove unused `axios` import; leave a `// email sent server-side in addOrder` note only if the file still needs context. Commit `fix(security): escape email HTML, verify SMTP TLS, lock confirm route`.

### Task 6: Authoritative order creation (F03, F04, F11, F15, F18, F19)

**Files:**
- Modify: `app/shared/zod/order-zod.ts`, `app/api/orders/orders-service.ts`, `app/api/orders/route.ts` (POST), `prisma/schema.prisma` (`Order.idempotencyKey String? @unique`), `lib/checkout/checkout.ts` and the checkout form to send `Idempotency-Key` (a `crypto.randomUUID()` generated once per checkout attempt and kept in a ref), `lib/orders/orders.ts` (remove deprecated `generateOrderId`)
- Create: new Prisma migration via `npx prisma migrate dev --create-only --name order_idempotency_key` (do not apply to any shared DB)
- Test: `tests/api/orders-create.test.ts`, `tests/lib/money.test.ts`
- Create: `lib/money.ts`

**Interfaces:**
- Consumes: `sendOrderConfirmation` (Task 5), `PublicOrder`/`getPublicOrderById` (Task 3).
- Produces: `toCentavos(value: number | string | {toString():string}): number`, `fromCentavos(c: number): string` (`"1234.50"`); `generateOrderId(): string` → `PK-<YYYY>-<10 chars from crypto.randomBytes, Crockford base32>`; `addOrder(data: CreateOrderInput, idempotencyKey?: string): Promise<Order>` where `CreateOrderInput` has **no** `price`, `name`, `image`, `total` — items are `{productId, size, color, quantity}`.
- `orderSchema` changes: items `{productId: string, size: string(1..20), color: string(1..50), quantity: int 1..10}`, max 20 items; remove `total`; `deliveryMethod: "shipping"|"meetup"` discriminated union — shipping requires `shippingAddress`, `shippingCity`, `shippingZipCode` (each ≤200); meetup requires `meetupLocation`; `customerName` ≤100.

- [ ] **Step 1: Write failing tests** (mock prisma `$transaction`, `product.findMany`, `order.create`, `order.findUnique`): (a) body with `price:1,total:1` extras → stored item price and order total equal DB price × qty (use `discountPrice` when `sale`); (b) unknown productId → 400; (c) `inStock:false` → 400; (d) size not in `product.sizes` → 400; (e) shipping without address → 400; (f) quantity 11 → 400; (g) two calls with the same key → one `order.create`, second returns the existing order; (h) P2002 on `id` retries with a new id up to 3 times; (i) `toCentavos("19.99")===1999`, `toCentavos(0.1+0.2)===30`; (j) `sendOrderConfirmation` called once after create and a rejection from it still yields 201.
- [ ] **Step 2:** Run → FAIL. **Step 3:** implement `addOrder` inside `prisma.$transaction`: load products by ids, validate, compute totals in centavos, create order+items with snapshots from DB, catch unique-key conflict on `idempotencyKey` by returning the existing order. **Step 4:** route POST reads `Idempotency-Key` header, maps a thrown `OrderValidationError` to 400, other errors to fixed 500. **Step 5:** update checkout client; run `npm test`, `npx tsc --noEmit`, `npm run lint`. Commit `fix(orders): compute prices server-side, validate stock, idempotent checkout`.

### Task 7: Password and session lifecycle (F14)

**Files:**
- Modify: `app/shared/zod/settings-zod.ts`, `app/api/settings/settings-service.ts`, `lib/auth.ts`, `prisma/schema.prisma` (`Admin.passwordChangedAt DateTime @default(now())`) + migration
- Test: `tests/api/change-password.test.ts`, `tests/lib/auth-callbacks.test.ts`

**Interfaces:**
- Produces: `newPassword` schema: min 10, max 72 chars, must differ from current. `jwt` callback stores `passwordChangedAt` (ms) at sign-in; on later calls re-reads the admin row and returns `null`-equivalent invalid token (clear `token.id`) when DB `passwordChangedAt` is newer; `session` callback yields no user when `token.id` missing. `changePassword` sets `passwordChangedAt = new Date()` and `firstTimeLogin = false`.
- Also in `authorize`, throttle: in-memory `Map<username,{count,resetAt}>` limiting 5 failures / 15 min (document that production should use a shared store).

- [ ] **Step 1: Write failing tests:** 1-char and 9-char passwords rejected; wrong current password → 400/401; old JWT (issued before `passwordChangedAt`) → session callback returns no `user.id`; 6th failed login in window returns null without calling bcrypt.
- [ ] **Step 2:** Run → FAIL. **Step 3:** implement. Commit `fix(security): password policy, session revocation, login throttle`.

### Task 8: Validation, transactions, errors (F16, F17, F21, F23, F24-partial)

**Files:**
- Modify: `app/api/products/[id]/route.ts`, `app/api/products/route.ts`, `app/api/products/products-service.ts`, `app/api/settings/[id]/route.ts`, `app/api/settings/route.ts`, `app/api/brands/[id]/route.ts`, `app/api/orders/[id]/route.ts` (PATCH), `app/api/orders/orders-service.ts` (`updateOrderStatus`), `app/components/pages/Admin/Orders/OrderDetails/index.tsx`
- Create: `lib/api-errors.ts`; extend `app/shared/zod/` product and settings schemas
- Test: `tests/api/products-validation.test.ts`, `tests/lib/api-errors.test.ts`, `tests/api/order-status.test.ts`

**Interfaces:**
- Produces: `handleRouteError(error: unknown, fallback: string): NextResponse` — `ZodError`→400 with first issue message; Prisma `P2025`→404; `P2002`→409; `P2003`→409 ("in use"); anything else → 500 with `fallback` only (no `error.message`). Replace every `error.message`/`message.includes` leak found at `settings/route.ts:43` and `brands/[id]/route.ts:57`.
- `updateOrderStatus(id, {status})` rejects invalid transitions (only forward: pending→confirmed→processing→shipped→delivered, one step or cancel not supported) with `OrderTransitionError` → 409.

- [ ] **Step 1: Write failing tests:** negative price → 400; `featured: "false"` stays false; PUT on settings validates against schema; `updateProduct` with a mocked `productImage.createMany` rejection leaves `deleteMany` not committed (assert both calls happen inside one `$transaction` callback); every handler's 500 body equals the fixed fallback and does not contain a thrown message like `"db password leaked"`; status shipped→pending → 409.
- [ ] **Step 2:** Run → FAIL. **Step 3:** implement; fix `OrderDetails` to initialise the select from loaded data via `useEffect`/derived value. Commit `fix: validate product/config input, transactional image writes, safe errors`.

### Task 9: Schema indexes and pagination (F22, F24)

**Files:**
- Modify: `prisma/schema.prisma` (indexes: `Product @@index([brandId])`, `@@index([featured])`, `@@index([latest])`; `ProductImage @@index([productId])`; `Order @@index([status, createdAt])`; `OrderItem @@index([orderId])`, `@@index([productId])`), `app/api/orders/route.ts` + `orders-service.ts` `getOrders(filters)` accept `page`/`pageSize` (default 1/20, max 100) returning `{items,total,page,pageSize}`; admin orders list hook/component; new migration `--create-only`
- Test: `tests/api/orders-pagination.test.ts`

- [ ] **Step 1: Write failing test:** `GET /api/orders?page=2&pageSize=5` as admin calls `prisma.order.findMany` with `skip:5, take:5` and `count`; `pageSize=1000` clamps to 100. **Step 2:** run → FAIL. **Step 3:** implement and wire the admin orders UI to the paged shape. Verify the migration SQL by reading it; do not apply it. Commit `perf: add indexes and paginate orders`.

### Task 10: Deployment, env, docs, CI (F10, F12, F13, F26, F27, README)

**Files:**
- Modify: `package.json` (`build` → `prisma generate && next build`; add `db:migrate` → `prisma migrate deploy`; keep `db:seed`), `prisma/seed.ts` (`process.exitCode = 1` in catch; `await prisma.$disconnect()`), `.gitignore` (add `!.env.example`), `README.md`, dependencies via `npm audit` review
- Create: `.env.example`, `.github/workflows/ci.yml`, `LICENSE` (MIT, copyright holder: leave `<your name>` placeholder and flag it in the report)
- Test: none new; gates are `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`

- [ ] **Step 1:** `.env.example` with: `DATABASE_URL`, `AUTH_SECRET` (comment `openssl rand -base64 32`), `AUTH_URL`, `ADMIN_SEED_USERNAME`, `ADMIN_SEED_PASSWORD`, `ADMIN_SEED_SUPERUSER`, `ADMIN_SEED_SUPERPASSWORD`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `EMAIL_USER`, `EMAIL_PASS`, `NEXT_PUBLIC_INSTAGRAM_URL`, `NEXT_PUBLIC_LOGO_URL`, `NEXT_PUBLIC_ENVIRONMENT`; all values empty/placeholder.
- [ ] **Step 2:** Fix `package.json` scripts and seed exit code as listed.
- [ ] **Step 3:** Rewrite README to correct every row in the "README corrections" table of `audit-report.md` (Cloudinary not local storage, real paths, real routes/APIs, no default-credentials section, env section matches `.env.example`, Auth.js v5 names, test/CI commands, manual-payment note, status-transition and email-behaviour notes, clone URL placeholder replaced with a clearly-marked `<your-fork-url>`).
- [ ] **Step 4:** `npm audit fix` (no `--force`); then for remaining critical/high direct deps, upgrade one at a time (`next`, `next-auth`, `axios`, `nodemailer`, `cloudinary`, `zod`) running `npm test`, `npx tsc --noEmit`, `npm run build` after each; record any that cannot be upgraded safely in the README "Known issues" section.
- [ ] **Step 5:** `.github/workflows/ci.yml`: on PR/push — `npm ci`, `npx prisma generate`, `npm run lint`, `npx tsc --noEmit`, `npm test`. No DB, no secrets.
- [ ] **Step 6:** Note in the final report (do not fix in code): rotate any credentials that matched the historical `ADMIN_USERNAME`/`ADMIN_PASSWORD` literals in git history (F13). Commit `chore: separate build from migrate/seed, add env example, CI, README`.

---

## Self-Review

- **Coverage:** F01/F09→T2; F02→T3; F03/F04/F11/F15/F18/F19→T6; F05/F06/F08/F20→T5; F07→T4; F10/F12/F13/F26/F27/README→T10; F14→T7; F16/F17/F21/F23→T8; F22/F24→T9. Deliberately deferred (Low/polish, listed in report): F25 cart validation, F28 pagination hook, F29–F33, `any`/duplicate-type cleanup.
- **Types:** `requireAdmin` (T1) used by T2/T4/T5/T8; `sendOrderConfirmation` (T5) consumed by T6; `PublicOrder` (T3) consumed by T6/T3; `handleRouteError` (T8) used only in T8 files.
- **Known risk:** T6 changes the order request shape; the checkout form and any code reading `item.price`/`total` from the POST body must change in the same task or the app breaks.
