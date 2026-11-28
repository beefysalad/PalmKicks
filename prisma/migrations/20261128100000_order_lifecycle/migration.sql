-- Older PostgreSQL versions require ALTER TYPE ADD VALUE outside a transaction
-- block. Keep this migration free of explicit BEGIN/COMMIT; a deployment runner
-- that wraps migrations must split this statement out for those versions.
-- No statement below uses the newly added 'cancelled' value before it commits.
ALTER TYPE "OrderStatus" ADD VALUE 'cancelled';

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('unpaid', 'paid', 'refunded');

-- AlterTable
ALTER TABLE "orders"
ADD COLUMN "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'unpaid',
ADD COLUMN "paymentMethod" TEXT,
ADD COLUMN "paymentRef" TEXT,
ADD COLUMN "paidAt" TIMESTAMP(3),
ADD COLUMN "adminNote" TEXT,
ADD COLUMN "courier" TEXT,
ADD COLUMN "trackingNumber" TEXT,
ADD COLUMN "shippedAt" TIMESTAMP(3),
ADD COLUMN "cancelledAt" TIMESTAMP(3),
ADD COLUMN "restockedAt" TIMESTAMP(3),
ADD COLUMN "confirmedEmailAt" TIMESTAMP(3),
ADD COLUMN "shippedEmailAt" TIMESTAMP(3);

-- Preserve the former non-pending revenue assumption for historical orders.
-- Confirm that these orders were paid before applying this migration.
UPDATE "orders" SET "paymentStatus" = 'paid', "paidAt" = "updatedAt"
WHERE "status" <> 'pending';

-- Legacy orders never decremented variant stock: do not restock them on cancel.
UPDATE "orders" SET "restockedAt" = now();

-- CreateIndex
CREATE INDEX "orders_paymentStatus_idx" ON "orders"("paymentStatus");
CREATE INDEX "orders_customerEmail_idx" ON "orders"("customerEmail");
CREATE INDEX "orders_createdAt_idx" ON "orders"("createdAt");
