-- Add new TransactionStatus values
ALTER TYPE "transaction_status" ADD VALUE IF NOT EXISTS 'credit';
ALTER TYPE "transaction_status" ADD VALUE IF NOT EXISTS 'partially_paid';

-- Add credit fields to customers
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "credit_limit" DECIMAL(15,2) DEFAULT 0;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "credit_balance" DECIMAL(15,2) DEFAULT 0;

-- Credit Sales (BON/Piutang) table
CREATE TABLE IF NOT EXISTS "credit_sales" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "transaction_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "outlet_id" UUID NOT NULL,
    "total_amount" DECIMAL(15,2) NOT NULL,
    "paid_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "outstanding_amount" DECIMAL(15,2) NOT NULL,
    "due_date" DATE,
    "status" VARCHAR(20) NOT NULL DEFAULT 'outstanding',
    "notes" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "credit_sales_pkey" PRIMARY KEY ("id")
);

-- Credit Payments table
CREATE TABLE IF NOT EXISTS "credit_payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "credit_sale_id" UUID NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "payment_method" "payment_method" NOT NULL DEFAULT 'cash',
    "reference_number" VARCHAR(100),
    "notes" TEXT,
    "received_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "credit_payments_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_credit_sales_customer" ON "credit_sales"("customer_id");
CREATE INDEX IF NOT EXISTS "idx_credit_sales_outlet" ON "credit_sales"("outlet_id");
CREATE INDEX IF NOT EXISTS "idx_credit_sales_status" ON "credit_sales"("status");
CREATE INDEX IF NOT EXISTS "idx_credit_sales_transaction" ON "credit_sales"("transaction_id");
CREATE INDEX IF NOT EXISTS "idx_credit_payments_credit_sale" ON "credit_payments"("credit_sale_id");

-- Foreign keys
ALTER TABLE "credit_sales" ADD CONSTRAINT "fk_cs_transaction" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE RESTRICT;
ALTER TABLE "credit_sales" ADD CONSTRAINT "fk_cs_customer" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT;
ALTER TABLE "credit_sales" ADD CONSTRAINT "fk_cs_outlet" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE CASCADE;
ALTER TABLE "credit_sales" ADD CONSTRAINT "fk_cs_created_by" FOREIGN KEY ("created_by") REFERENCES "employees"("id") ON DELETE SET NULL;
ALTER TABLE "credit_payments" ADD CONSTRAINT "fk_cp_credit_sale" FOREIGN KEY ("credit_sale_id") REFERENCES "credit_sales"("id") ON DELETE CASCADE;
ALTER TABLE "credit_payments" ADD CONSTRAINT "fk_cp_received_by" FOREIGN KEY ("received_by") REFERENCES "employees"("id") ON DELETE SET NULL;
