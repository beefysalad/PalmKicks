CREATE TABLE "product_variants" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "stock" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "product_variants_stock_check" CHECK (stock >= 0)
);

CREATE UNIQUE INDEX "product_variants_productId_size_color_key"
    ON "product_variants"("productId", "size", "color");
CREATE INDEX "product_variants_productId_idx" ON "product_variants"("productId");
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Assumption: each existing in-stock size/colour combination starts with one
-- pair; out-of-stock combinations start at zero. Admins must enter real counts.
-- DISTINCT handles duplicate values in legacy JSON arrays without duplicate rows.
-- Ignore JSON nulls and other non-string elements instead of inserting SQL NULL.
INSERT INTO "product_variants" ("id", "productId", "size", "color", "stock", "updatedAt")
SELECT gen_random_uuid()::text, p."id", sizes.size, colors.color,
       CASE WHEN p."inStock" THEN 1 ELSE 0 END, CURRENT_TIMESTAMP
FROM "products" p
-- CASE also protects the set-returning functions regardless of planner ordering.
CROSS JOIN LATERAL (SELECT DISTINCT elem #>> '{}' AS size FROM jsonb_array_elements(
    CASE WHEN jsonb_typeof(p."sizes") = 'array' THEN p."sizes" ELSE '[]'::jsonb END
) AS entries(elem) WHERE jsonb_typeof(elem) = 'string') sizes
CROSS JOIN LATERAL (SELECT DISTINCT elem #>> '{}' AS color FROM jsonb_array_elements(
    CASE WHEN jsonb_typeof(p."colors") = 'array' THEN p."colors" ELSE '[]'::jsonb END
) AS entries(elem) WHERE jsonb_typeof(elem) = 'string') colors
WHERE jsonb_typeof(p."sizes") = 'array' AND jsonb_typeof(p."colors") = 'array';

-- Products with an empty size or colour list have no purchasable combinations.
UPDATE "products" p SET "inStock" = EXISTS (
    SELECT 1 FROM "product_variants" v WHERE v."productId" = p."id" AND v."stock" > 0
);
