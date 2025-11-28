# Deployment runbook

Use this procedure for an existing PalmKicks shop moving to variant inventory and the separate payment/order lifecycle. These are operator instructions; the commands have not been executed against a database during implementation. The five new hand-written migrations are listed in the [README](../README.md#deployment). Staging migration execution, SQL behavior and PostgreSQL concurrency remain unverified until this procedure is completed.

## 1. Pre-flight on production data

Take a restorable database backup, verify restoration on staging, and record the current application revision and migration history. Use read-only queries on production first. Set `DATABASE_URL` through the operator's secret manager; do not paste credentials into this document or commit environment files.

Check PostgreSQL and UUID support:

```sql
SHOW server_version;
SELECT current_setting('server_version_num')::integer AS server_version_num;
SELECT to_regprocedure('gen_random_uuid()') AS uuid_function;
```

Prefer PostgreSQL 13+. If the function is absent on an older supported installation, have the database operator enable `pgcrypto` (`CREATE EXTENSION IF NOT EXISTS pgcrypto;`) and verify the function is visible to the migration role. Do not assume the deployment role has extension privileges. The lifecycle migration adds an enum value without an explicit transaction wrapper; preserve that behavior in the migration runner.

Find SQL nulls, JSON nulls and non-array size/colour values:

```sql
SELECT "id", "sizes", "colors" FROM "products"
WHERE jsonb_typeof("sizes") IS DISTINCT FROM 'array'
   OR jsonb_typeof("colors") IS DISTINCT FROM 'array';
```

Find non-string elements, blank strings and leading/trailing whitespace without invoking array expansion on scalar JSON:

```sql
SELECT p."id", lists.field, entries.elem
FROM "products" p
CROSS JOIN LATERAL (VALUES ('sizes', p."sizes"), ('colors', p."colors")) AS lists(field, value)
CROSS JOIN LATERAL jsonb_array_elements(
  CASE WHEN jsonb_typeof(lists.value) = 'array' THEN lists.value ELSE '[]'::jsonb END
) AS entries(elem)
WHERE jsonb_typeof(entries.elem) IS DISTINCT FROM 'string'
   OR (entries.elem #>> '{}') = ''
   OR (entries.elem #>> '{}') ~ '(^[[:space:]])|([[:space:]]$)';
```

Also identify products that will have no combinations:

```sql
SELECT "id" FROM "products"
WHERE "sizes" = '[]'::jsonb OR "colors" = '[]'::jsonb;
```

Review and correct unexpected data through an approved data cleanup before cutover. The migration ignores non-array values and non-string elements, keeps distinct strings, and does not trim strings. A list with no string elements also yields no variants. Confirm the intended size/colour combinations and obtain actual counts: the backfill's stock of 1 for legacy in-stock combinations is only a placeholder, and 0 is used otherwise. Empty lists become sold out.

Before the lifecycle migration, reconcile historical orders against payment records. It marks **every non-pending order paid**, with `paidAt = updatedAt`, and leaves pending orders unpaid. The new revenue metric sums paid, non-cancelled orders. Agree on corrections if the old status did not imply payment; do not silently accept the assumption.

## 2. Staging dry run

Restore a representative production snapshot into an isolated staging database. Use staging-only credentials, an email sink/test mailbox and Cloudinary configuration; prevent real customer email delivery. Point `DATABASE_URL` at staging and verify the target before executing any write command.

Install from the lockfile (`npm ci --legacy-peer-deps`), generate the client (`npx prisma generate`), and run:

```bash
npm run db:migrate
npx prisma migrate status
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code
npm test
npx tsc --noEmit
npm run lint
npm run build
```

The diff command reads the configured database and compares it with the schema: expect exit 0 for no schema difference, 2 for differences, or 1 for an error. Investigate differences before proceeding; do not apply generated SQL blindly. Prisma's schema diff does not verify data backfills or every database-only constraint, so inspect those separately (including the stock `CHECK (stock >= 0)`). Do not run `migrate dev`, reset the database or edit an already-applied migration to make staging pass.

Verify all five migrations are applied in order, payment timestamps/backfilled counts match the agreed assumption, existing orders have non-null `restockedAt`, variants are unique by product/size/colour with non-negative stock, and `products.inStock` agrees with positive variant stock. Include fixtures containing JSON null elements, scalars and duplicate strings in the dry run; migration must skip invalid elements without failing. Record runtime and lock impact for the production window.

## 3. Staging acceptance tests

- Set one variant to stock 1. Send two simultaneous checkouts with distinct idempotency keys: exactly one creates an order, the other receives an insufficient-stock response, and stock ends at 0. Replay the successful key and confirm the identical public order is returned without another decrement or email.
- Race cancellation of a new-code order against another checkout on the same pair. Confirm product locks serialize stock changes, cancellation restores stock only once, and a repeated cancel/replay never adds another pair. Cancel a legacy order and confirm it restores nothing. Removed products/variants are intentionally skipped during restock; verify and reconcile these manually if needed.
- Open an admin stock form, purchase an untouched cell, then save a different dirty cell. Confirm the sale remains deducted. Race an intentional edit of the same cell against checkout: lock ordering must serialize the operations; the edited cell is an absolute stock count, so reconcile its intended final value. Test two-product carts in reversed item order for deadlocks.
- Search orders for literal `%`, `_` and `'`, combined with status, payment, pagination and Manila dates. Confirm matching and count use the same filters, wildcards do not widen the results, midnight boundaries agree with displayed dates, and a reversed range gets a safe 400 message.
- With a staging mailbox, verify original confirmation, confirmed and shipped emails, their HTML/text parts and courier/tracking content. Check successful delivery flags, failed-send retry, explicit resends and rejection of early-status/cancelled resends. Back-step before a queued job runs and confirm it is skipped. Changing tracking on an already-shipped order requires an explicit resend.

SMTP is best-effort with no durable outbox; in-flight coalescing is per process. A crash can lose a queued email, and multiple instances or failed delivery-flag writes can duplicate email. Do not treat the mocked unit tests as proof of staging SMTP delivery or database isolation.

## 4. Production cutover

1. Announce maintenance and pause checkout/order writes at the deployment edge. Stop old application writers and background jobs, drain in-flight requests, and record the final old-code write boundary as a **UTC cutover timestamp**. Keep new checkout disabled until all steps and stock reconciliation are finished. Preserve a backup and the last working application artifact.
2. Verify the production target, then apply the release migrations with `npm run db:migrate`. Check migration status and backfills as rehearsed. Do not run the sample product seed on an existing production shop.
3. Deploy the matching application/client build and verify health with checkout still paused. Keep the old release from accepting traffic: it does not decrement variants and must not continue writing orders under the new inventory model.
4. Run this safety patch after deployment and before reopening checkout. Replace `<cutover timestamp>` with the recorded UTC old-writer boundary (`YYYY-MM-DD HH:MM:SS.fff` for these UTC `TIMESTAMP` columns). It covers orders created by old code between the lifecycle migration and the final old-code stop; those orders never decremented variant stock. Check the affected count and confirm there were no new-code orders before the boundary.

```sql
UPDATE orders SET "restockedAt" = now()
WHERE "restockedAt" IS NULL AND "createdAt" < '<cutover timestamp>';
```

The boundary must be later than the last old-code order and no later than the first new-code order; account for timestamp precision and drain all writers. If those populations overlap or the boundary is uncertain, keep maintenance on and reconcile the affected order IDs explicitly before applying a broader patch. Marking a genuine new-code order already restocked would suppress its legitimate cancellation restock.

5. Enter verified real variant counts in the admin stock grid before enabling checkout. Check sold-out/low-stock displays, admin login/password-change flow and order search. Reopen checkout only after inventory, payment assumptions and the safety patch are verified. If migration or verification fails, keep checkout paused; assess database compatibility and restore the rehearsed backup if needed instead of blindly running old code against changed inventory.

## 5. Post-deploy checks

- Reconcile variant counts after the first sales and cancellations. Zero-filled/placeholder backfill counts must not become the shop's source of truth. Review skipped restocks for removed combinations manually.
- Confirm the historical paid backfill against actual records and correct misclassified payment states through reviewed data changes/admin controls. Verify dashboard revenue is paid and not cancelled.
- Check safe timeout/stock responses, rate-limit behavior and idempotent retries under the deployed proxy. Memory-based limits and email coalescing are per instance; verify the host setup and plan a shared store/outbox if stronger guarantees are needed.
- Check test-mailbox smoke results before enabling real SMTP; monitor send failures and delivery flags. Use the explicit resend actions for missed emails after verifying the current order status and saved tracking details.
- Rotate any reused historical seeded admin credentials noted in the README, change first-login passwords and verify old sessions are revoked. Rotate any other credentials identified as exposed in the original audit, through the host's secret manager; never put their values in deployment notes.
- Record the deployed commit, migration status, cutover boundary, patch count and acceptance results. No production credentials belong in this record.
