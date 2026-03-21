/*
  Warnings:

  - The `status` column on the `pricing_rules` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Made the column `credit_limit` on table `customers` required. This step will fail if there are existing NULL values in that column.
  - Made the column `credit_balance` on table `customers` required. This step will fail if there are existing NULL values in that column.
  - Made the column `outlet_type` on table `outlets` required. This step will fail if there are existing NULL values in that column.
  - Changed the type of `type` on the `pricing_rules` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "attendance_status" AS ENUM ('present', 'absent', 'late');

-- CreateEnum
CREATE TYPE "saga_status" AS ENUM ('pending', 'running', 'completed', 'compensating', 'compensated', 'failed');

-- CreateEnum
CREATE TYPE "pricing_rule_type" AS ENUM ('time_based', 'quantity_based', 'customer_segment', 'inventory_based', 'bundle', 'dynamic_surge');

-- CreateEnum
CREATE TYPE "pricing_rule_status" AS ENUM ('active', 'inactive', 'scheduled', 'expired');

-- AlterEnum
ALTER TYPE "notification_type" ADD VALUE 'birthday';

-- AlterEnum
ALTER TYPE "transaction_status" ADD VALUE 'partially_refunded';

-- DropForeignKey
ALTER TABLE "credit_payments" DROP CONSTRAINT "fk_cp_credit_sale";

-- DropForeignKey
ALTER TABLE "credit_payments" DROP CONSTRAINT "fk_cp_received_by";

-- DropForeignKey
ALTER TABLE "credit_sales" DROP CONSTRAINT "fk_cs_created_by";

-- DropForeignKey
ALTER TABLE "credit_sales" DROP CONSTRAINT "fk_cs_customer";

-- DropForeignKey
ALTER TABLE "credit_sales" DROP CONSTRAINT "fk_cs_outlet";

-- DropForeignKey
ALTER TABLE "credit_sales" DROP CONSTRAINT "fk_cs_transaction";

-- DropIndex
DROP INDEX "pricing_rules_priority_idx";

-- AlterTable
ALTER TABLE "credit_payments" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "credit_sales" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "customers" ALTER COLUMN "credit_limit" SET NOT NULL,
ALTER COLUMN "credit_balance" SET NOT NULL;

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "auth_provider" VARCHAR(20) NOT NULL DEFAULT 'local',
ADD COLUMN     "google_id" VARCHAR(255),
ADD COLUMN     "last_login_at" TIMESTAMPTZ,
ADD COLUMN     "last_login_ip" VARCHAR(45),
ADD COLUMN     "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mfa_secret" VARCHAR(500),
ADD COLUMN     "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "preferences" JSONB,
ADD COLUMN     "profile_photo_url" VARCHAR(500);

-- AlterTable
ALTER TABLE "outlet_features" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "outlet_products" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "outlets" ALTER COLUMN "outlet_type" SET NOT NULL;

-- AlterTable
ALTER TABLE "pricing_rules" ALTER COLUMN "id" DROP DEFAULT,
DROP COLUMN "type",
ADD COLUMN     "type" "pricing_rule_type" NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "pricing_rule_status" NOT NULL DEFAULT 'active';

-- AlterTable
ALTER TABLE "self_order_sessions" ADD COLUMN     "payment_at" TIMESTAMPTZ,
ADD COLUMN     "payment_method" VARCHAR(50),
ADD COLUMN     "payment_ref" VARCHAR(255),
ADD COLUMN     "payment_status" VARCHAR(50);

-- AlterTable
ALTER TABLE "transaction_items" ADD COLUMN     "bundle_id" UUID;

-- DropEnum
DROP TYPE "PricingRuleStatus";

-- DropEnum
DROP TYPE "PricingRuleType";

-- CreateTable
CREATE TABLE "employee_schedules" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "outlet_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "start_time" VARCHAR(5) NOT NULL,
    "end_time" VARCHAR(5) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_attendances" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "outlet_id" UUID NOT NULL,
    "clock_in_time" TIMESTAMPTZ NOT NULL,
    "clock_out_time" TIMESTAMPTZ,
    "hours_worked" DECIMAL(5,2),
    "status" "attendance_status" NOT NULL DEFAULT 'present',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saga_states" (
    "id" UUID NOT NULL,
    "saga_id" VARCHAR(255) NOT NULL,
    "saga_name" VARCHAR(255) NOT NULL,
    "status" "saga_status" NOT NULL DEFAULT 'pending',
    "context" JSONB NOT NULL,
    "current_step" INTEGER DEFAULT 0,
    "completed_steps" JSONB,
    "failed_step" VARCHAR(255),
    "error" VARCHAR(1000),
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,
    "last_retry_at" TIMESTAMPTZ,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "business_id" UUID,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "saga_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_templates" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "config" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_versions" (
    "id" UUID NOT NULL,
    "version" VARCHAR(50) NOT NULL,
    "platform" VARCHAR(50) NOT NULL,
    "release_notes" TEXT,
    "download_url" VARCHAR(1000),
    "min_required" VARCHAR(50),
    "force_update" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bundle_packages" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "image_url" VARCHAR(500),
    "price" DECIMAL(15,2) NOT NULL,
    "cost_price" DECIMAL(15,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bundle_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bundle_package_items" (
    "id" UUID NOT NULL,
    "bundle_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "variant_id" UUID,
    "quantity" DECIMAL(10,3) NOT NULL DEFAULT 1,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bundle_package_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bundle_package_outlets" (
    "id" UUID NOT NULL,
    "bundle_id" UUID NOT NULL,
    "outlet_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bundle_package_outlets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_schedule_employee" ON "employee_schedules"("employee_id");

-- CreateIndex
CREATE INDEX "idx_schedule_outlet_date" ON "employee_schedules"("outlet_id", "date");

-- CreateIndex
CREATE INDEX "idx_attendance_employee" ON "employee_attendances"("employee_id");

-- CreateIndex
CREATE INDEX "idx_attendance_outlet_date" ON "employee_attendances"("outlet_id", "clock_in_time");

-- CreateIndex
CREATE UNIQUE INDEX "saga_states_saga_id_key" ON "saga_states"("saga_id");

-- CreateIndex
CREATE INDEX "idx_saga_states_name" ON "saga_states"("saga_name");

-- CreateIndex
CREATE INDEX "idx_saga_states_status" ON "saga_states"("status");

-- CreateIndex
CREATE INDEX "idx_saga_states_business" ON "saga_states"("business_id");

-- CreateIndex
CREATE INDEX "idx_saga_states_started_at" ON "saga_states"("started_at");

-- CreateIndex
CREATE INDEX "idx_report_templates_business" ON "report_templates"("business_id");

-- CreateIndex
CREATE INDEX "idx_app_versions_platform" ON "app_versions"("platform");

-- CreateIndex
CREATE UNIQUE INDEX "uq_app_version_platform" ON "app_versions"("version", "platform");

-- CreateIndex
CREATE INDEX "idx_bundle_packages_business" ON "bundle_packages"("business_id");

-- CreateIndex
CREATE INDEX "idx_bundle_packages_business_active" ON "bundle_packages"("business_id", "is_active");

-- CreateIndex
CREATE INDEX "idx_bundle_items_bundle" ON "bundle_package_items"("bundle_id");

-- CreateIndex
CREATE INDEX "idx_bundle_outlets_outlet" ON "bundle_package_outlets"("outlet_id");

-- CreateIndex
CREATE UNIQUE INDEX "bundle_package_outlets_bundle_id_outlet_id_key" ON "bundle_package_outlets"("bundle_id", "outlet_id");

-- CreateIndex
CREATE INDEX "idx_pricing_rules_type" ON "pricing_rules"("type");

-- CreateIndex
CREATE INDEX "idx_pricing_rules_status" ON "pricing_rules"("status");

-- CreateIndex
CREATE INDEX "idx_pricing_rules_priority" ON "pricing_rules"("priority");

-- AddForeignKey
ALTER TABLE "employee_schedules" ADD CONSTRAINT "employee_schedules_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_schedules" ADD CONSTRAINT "employee_schedules_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_attendances" ADD CONSTRAINT "employee_attendances_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_attendances" ADD CONSTRAINT "employee_attendances_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_items" ADD CONSTRAINT "transaction_items_bundle_id_fkey" FOREIGN KEY ("bundle_id") REFERENCES "bundle_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_templates" ADD CONSTRAINT "report_templates_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_sales" ADD CONSTRAINT "credit_sales_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_sales" ADD CONSTRAINT "credit_sales_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_sales" ADD CONSTRAINT "credit_sales_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_sales" ADD CONSTRAINT "credit_sales_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_payments" ADD CONSTRAINT "credit_payments_credit_sale_id_fkey" FOREIGN KEY ("credit_sale_id") REFERENCES "credit_sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_payments" ADD CONSTRAINT "credit_payments_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundle_packages" ADD CONSTRAINT "bundle_packages_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundle_package_items" ADD CONSTRAINT "bundle_package_items_bundle_id_fkey" FOREIGN KEY ("bundle_id") REFERENCES "bundle_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundle_package_items" ADD CONSTRAINT "bundle_package_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundle_package_items" ADD CONSTRAINT "bundle_package_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundle_package_outlets" ADD CONSTRAINT "bundle_package_outlets_bundle_id_fkey" FOREIGN KEY ("bundle_id") REFERENCES "bundle_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bundle_package_outlets" ADD CONSTRAINT "bundle_package_outlets_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "idx_outlet_features_outlet_enabled" RENAME TO "outlet_features_outlet_id_is_enabled_idx";

-- RenameIndex
ALTER INDEX "idx_outlet_products_outlet" RENAME TO "outlet_products_outlet_id_idx";

-- RenameIndex
ALTER INDEX "idx_outlet_products_product" RENAME TO "outlet_products_product_id_idx";

-- RenameIndex (type/status/priority indexes are recreated above after column drop+add)
ALTER INDEX "pricing_rules_business_id_idx" RENAME TO "idx_pricing_rules_business";

-- RenameIndex
ALTER INDEX "pricing_rules_valid_from_valid_until_idx" RENAME TO "idx_pricing_rules_validity";
