-- CreateEnum
CREATE TYPE "batch_lot_status" AS ENUM ('active', 'depleted', 'expired', 'recalled');

-- AlterTable: Add barcode to product variants
ALTER TABLE "product_variants" ADD COLUMN "barcode" VARCHAR(100);

-- AlterTable: Add barcode and sell_unit to products
ALTER TABLE "products" ADD COLUMN "barcode" VARCHAR(100),
ADD COLUMN "sell_unit" VARCHAR(30);

-- CreateTable: price_tiers
CREATE TABLE "price_tiers" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "tier_name" VARCHAR(100) NOT NULL,
    "min_quantity" INTEGER NOT NULL,
    "max_quantity" INTEGER,
    "price" DECIMAL(15,2) NOT NULL,
    "discount_percent" DECIMAL(5,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "price_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable: unit_conversions
CREATE TABLE "unit_conversions" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "from_unit" VARCHAR(30) NOT NULL,
    "from_unit_label" VARCHAR(50) NOT NULL,
    "to_unit" VARCHAR(30) NOT NULL,
    "to_unit_label" VARCHAR(50) NOT NULL,
    "conversion_factor" DECIMAL(15,4) NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "unit_conversions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: batch_lots
CREATE TABLE "batch_lots" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "outlet_id" UUID NOT NULL,
    "batch_number" VARCHAR(100) NOT NULL,
    "quantity" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "cost_price" DECIMAL(15,2),
    "manufactured_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ,
    "received_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "batch_lot_status" NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "batch_lots_pkey" PRIMARY KEY ("id")
);

-- Indexes: price_tiers
CREATE INDEX "idx_price_tiers_product" ON "price_tiers"("product_id", "is_active");
CREATE INDEX "idx_price_tiers_qty" ON "price_tiers"("product_id", "min_quantity");

-- Indexes: unit_conversions
CREATE INDEX "idx_unit_conversions_product" ON "unit_conversions"("product_id");
CREATE UNIQUE INDEX "uq_unit_conversion_product" ON "unit_conversions"("product_id", "from_unit", "to_unit");

-- Indexes: batch_lots
CREATE INDEX "idx_batch_lots_product_outlet" ON "batch_lots"("product_id", "outlet_id");
CREATE INDEX "idx_batch_lots_expiry" ON "batch_lots"("expires_at");
CREATE INDEX "idx_batch_lots_status" ON "batch_lots"("status");
CREATE UNIQUE INDEX "uq_batch_lot" ON "batch_lots"("product_id", "outlet_id", "batch_number");

-- Indexes: products barcode
CREATE INDEX "idx_products_barcode" ON "products"("barcode");
CREATE UNIQUE INDEX "uq_products_business_barcode" ON "products"("business_id", "barcode");

-- Foreign Keys
ALTER TABLE "price_tiers" ADD CONSTRAINT "price_tiers_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "unit_conversions" ADD CONSTRAINT "unit_conversions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "batch_lots" ADD CONSTRAINT "batch_lots_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "batch_lots" ADD CONSTRAINT "batch_lots_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
