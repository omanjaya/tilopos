-- CreateEnum
CREATE TYPE "subscription_status" AS ENUM ('active', 'trial', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "invoice_status" AS ENUM ('pending', 'paid', 'failed', 'expired');

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "plan" "subscription_plan" NOT NULL,
    "status" "subscription_status" NOT NULL DEFAULT 'active',
    "billing_cycle" VARCHAR(20) NOT NULL DEFAULT 'monthly',
    "start_date" TIMESTAMPTZ NOT NULL,
    "end_date" TIMESTAMPTZ NOT NULL,
    "trial_ends_at" TIMESTAMPTZ,
    "cancelled_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "subscription_id" UUID,
    "invoice_number" VARCHAR(50) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "status" "invoice_status" NOT NULL DEFAULT 'pending',
    "due_date" TIMESTAMPTZ NOT NULL,
    "paid_at" TIMESTAMPTZ,
    "payment_method" VARCHAR(50),
    "payment_ref" VARCHAR(255),
    "payment_url" VARCHAR(500),
    "provider" VARCHAR(20),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- AlterEnum: Migrate subscription_plan from (basic, standard, premium, enterprise) to (free, premium)
-- First, convert existing data: basic/standard/enterprise -> map to appropriate values
ALTER TABLE "businesses" ALTER COLUMN "subscription_plan" DROP DEFAULT;

-- Map old values to new: basic -> free, standard -> free, enterprise -> premium, premium stays premium
UPDATE "businesses" SET "subscription_plan" = 'premium' WHERE "subscription_plan" = 'enterprise';
UPDATE "businesses" SET "subscription_plan" = 'basic' WHERE "subscription_plan" = 'standard';

-- Now alter the enum
CREATE TYPE "subscription_plan_new" AS ENUM ('free', 'premium');

-- Convert 'basic' to 'free' during type change
ALTER TABLE "businesses" ALTER COLUMN "subscription_plan"
    TYPE "subscription_plan_new"
    USING (CASE
        WHEN "subscription_plan"::text = 'basic' THEN 'free'::text
        WHEN "subscription_plan"::text = 'standard' THEN 'free'::text
        ELSE "subscription_plan"::text
    END)::"subscription_plan_new";

-- Also convert the subscriptions table
ALTER TABLE "subscriptions" ALTER COLUMN "plan"
    TYPE "subscription_plan_new"
    USING ("plan"::text::"subscription_plan_new");

-- Swap enum types
ALTER TYPE "subscription_plan" RENAME TO "subscription_plan_old";
ALTER TYPE "subscription_plan_new" RENAME TO "subscription_plan";
DROP TYPE "subscription_plan_old";

-- Set new default
ALTER TABLE "businesses" ALTER COLUMN "subscription_plan" SET DEFAULT 'free';

-- CreateIndex
CREATE INDEX "idx_subscriptions_business" ON "subscriptions"("business_id");
CREATE INDEX "idx_subscriptions_status" ON "subscriptions"("status");
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");
CREATE INDEX "idx_invoices_business" ON "invoices"("business_id");
CREATE INDEX "idx_invoices_status" ON "invoices"("status");
CREATE INDEX "idx_invoices_number" ON "invoices"("invoice_number");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_business_id_fkey"
    FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invoices" ADD CONSTRAINT "invoices_business_id_fkey"
    FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscription_id_fkey"
    FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
