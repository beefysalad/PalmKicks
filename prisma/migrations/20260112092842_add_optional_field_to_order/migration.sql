-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "meetupLocation" TEXT,
ALTER COLUMN "shippingAddress" DROP NOT NULL,
ALTER COLUMN "shippingCity" DROP NOT NULL,
ALTER COLUMN "shippingZipCode" DROP NOT NULL;
