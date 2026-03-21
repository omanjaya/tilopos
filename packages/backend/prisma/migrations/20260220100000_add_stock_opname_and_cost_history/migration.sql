-- CreateEnum
CREATE TYPE "stock_opname_status" AS ENUM ('draft', 'in_progress', 'completed', 'cancelled');

-- AlterEnum
ALTER TYPE "stock_movement_type" ADD VALUE 'opname';

-- CreateTable
CREATE TABLE "stock_opnames" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "outlet_id" UUID NOT NULL,
    "opname_number" VARCHAR(50) NOT NULL,
    "status" "stock_opname_status" NOT NULL DEFAULT 'draft',
    "notes" TEXT,
    "created_by" UUID NOT NULL,
    "approved_by" UUID,
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_opnames_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_opname_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "opname_id" UUID NOT NULL,
    "product_id" UUID,
    "variant_id" UUID,
    "system_quantity" DECIMAL(15,3) NOT NULL,
    "actual_quantity" DECIMAL(15,3),
    "difference" DECIMAL(15,3),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_opname_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_price_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID,
    "variant_id" UUID,
    "previous_cost" DECIMAL(15,4) NOT NULL,
    "new_cost" DECIMAL(15,4) NOT NULL,
    "quantity_before" DECIMAL(15,3) NOT NULL,
    "quantity_added" DECIMAL(15,3) NOT NULL,
    "unit_cost_added" DECIMAL(15,4) NOT NULL,
    "reference_id" UUID,
    "reference_type" VARCHAR(50),
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cost_price_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stock_opnames_opname_number_key" ON "stock_opnames"("opname_number");
CREATE INDEX "idx_opname_outlet" ON "stock_opnames"("outlet_id");
CREATE INDEX "idx_opname_status" ON "stock_opnames"("status");
CREATE INDEX "idx_opname_date" ON "stock_opnames"("created_at");

CREATE INDEX "idx_opname_items_opname" ON "stock_opname_items"("opname_id");

CREATE INDEX "idx_cost_history_product" ON "cost_price_history"("product_id");
CREATE INDEX "idx_cost_history_variant" ON "cost_price_history"("variant_id");
CREATE INDEX "idx_cost_history_date" ON "cost_price_history"("created_at");

-- AddForeignKey
ALTER TABLE "stock_opnames" ADD CONSTRAINT "stock_opnames_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_opnames" ADD CONSTRAINT "stock_opnames_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_opnames" ADD CONSTRAINT "stock_opnames_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "stock_opname_items" ADD CONSTRAINT "stock_opname_items_opname_id_fkey" FOREIGN KEY ("opname_id") REFERENCES "stock_opnames"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_opname_items" ADD CONSTRAINT "stock_opname_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stock_opname_items" ADD CONSTRAINT "stock_opname_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "cost_price_history" ADD CONSTRAINT "cost_price_history_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cost_price_history" ADD CONSTRAINT "cost_price_history_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
