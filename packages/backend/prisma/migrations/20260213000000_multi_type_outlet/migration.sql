-- Phase 1: Multi-Type Outlet Schema
-- Allows each outlet to have its own business type and feature flags

-- 1. Add outlet_type to outlets table
ALTER TABLE "outlets"
  ADD COLUMN "outlet_type" VARCHAR(30) DEFAULT 'custom',
  ADD COLUMN "outlet_type_set_at" TIMESTAMPTZ;

-- 2. Create outlet_features table (per-outlet feature flags)
CREATE TABLE "outlet_features" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "outlet_id" UUID NOT NULL,
  "feature_key" VARCHAR(50) NOT NULL,
  "is_enabled" BOOLEAN NOT NULL DEFAULT true,
  "enabled_at" TIMESTAMPTZ,
  "disabled_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "outlet_features_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "outlet_features_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "outlet_features_outlet_id_feature_key_key" ON "outlet_features"("outlet_id", "feature_key");
CREATE INDEX "idx_outlet_features_outlet_enabled" ON "outlet_features"("outlet_id", "is_enabled");

-- 3. Create outlet_products junction table (product ↔ outlet assignment)
CREATE TABLE "outlet_products" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "outlet_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INT NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "outlet_products_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "outlet_products_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "outlet_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "outlet_products_outlet_id_product_id_key" ON "outlet_products"("outlet_id", "product_id");
CREATE INDEX "idx_outlet_products_outlet" ON "outlet_products"("outlet_id");
CREATE INDEX "idx_outlet_products_product" ON "outlet_products"("product_id");

-- 4. Data migration: copy Business.business_type to all its Outlets
UPDATE "outlets" o
SET "outlet_type" = b."business_type",
    "outlet_type_set_at" = b."business_type_set_at"
FROM "businesses" b
WHERE o."business_id" = b."id";

-- 5. Data migration: copy BusinessFeature records to OutletFeature for each outlet
INSERT INTO "outlet_features" ("outlet_id", "feature_key", "is_enabled", "enabled_at", "disabled_at", "created_at", "updated_at")
SELECT o."id", bf."feature_key", bf."is_enabled", bf."enabled_at", bf."disabled_at", bf."created_at", bf."updated_at"
FROM "business_features" bf
JOIN "outlets" o ON o."business_id" = bf."business_id";

-- 6. Data migration: assign all existing products to all outlets of their business
INSERT INTO "outlet_products" ("outlet_id", "product_id", "is_active")
SELECT o."id", p."id", p."is_active"
FROM "outlets" o
JOIN "products" p ON p."business_id" = o."business_id";
