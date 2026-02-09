-- CreateEnum
CREATE TYPE "PricingRuleType" AS ENUM ('time_based', 'quantity_based', 'customer_segment', 'inventory_based', 'bundle', 'dynamic_surge');

-- CreateEnum
CREATE TYPE "PricingRuleStatus" AS ENUM ('active', 'inactive', 'scheduled', 'expired');

-- CreateTable
CREATE TABLE "pricing_rules" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "PricingRuleType" NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" "PricingRuleStatus" NOT NULL DEFAULT 'active',
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_until" TIMESTAMP(3),
    "conditions" JSONB NOT NULL,
    "discount_type" TEXT NOT NULL,
    "discount_value" DECIMAL(10,2) NOT NULL,
    "min_quantity" INTEGER,
    "max_quantity" INTEGER,
    "applicable_days" INTEGER[],
    "time_from" TEXT,
    "time_until" TEXT,
    "customer_segments" TEXT[],
    "product_ids" TEXT[],
    "category_ids" TEXT[],
    "exclude_product_ids" TEXT[],
    "is_combinable" BOOLEAN NOT NULL DEFAULT false,
    "max_applications_per_transaction" INTEGER,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pricing_rules_business_id_idx" ON "pricing_rules"("business_id");

-- CreateIndex
CREATE INDEX "pricing_rules_type_idx" ON "pricing_rules"("type");

-- CreateIndex
CREATE INDEX "pricing_rules_status_idx" ON "pricing_rules"("status");

-- CreateIndex
CREATE INDEX "pricing_rules_valid_from_valid_until_idx" ON "pricing_rules"("valid_from", "valid_until");

-- CreateIndex
CREATE INDEX "pricing_rules_priority_idx" ON "pricing_rules"("priority" DESC);

-- AddForeignKey
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
