-- CreateEnum
CREATE TYPE "appointment_status" AS ENUM ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show');

-- CreateEnum
CREATE TYPE "work_order_status" AS ENUM ('pending', 'in_progress', 'waiting_parts', 'completed', 'delivered', 'cancelled');

-- CreateEnum
CREATE TYPE "serial_number_status" AS ENUM ('in_stock', 'sold', 'returned', 'warranty', 'defective');

-- CreateEnum
CREATE TYPE "service_item_status" AS ENUM ('received', 'processing', 'ready', 'delivered', 'cancelled');

-- CreateTable: appointments
CREATE TABLE "appointments" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "outlet_id" UUID NOT NULL,
    "customer_id" UUID,
    "employee_id" UUID,
    "service_name" VARCHAR(255) NOT NULL,
    "service_price" DECIMAL(15,2) NOT NULL,
    "start_time" TIMESTAMPTZ NOT NULL,
    "end_time" TIMESTAMPTZ NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "status" "appointment_status" NOT NULL DEFAULT 'scheduled',
    "notes" TEXT,
    "customer_name" VARCHAR(255),
    "customer_phone" VARCHAR(20),
    "cancelled_at" TIMESTAMPTZ,
    "cancel_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable: work_orders
CREATE TABLE "work_orders" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "outlet_id" UUID NOT NULL,
    "customer_id" UUID,
    "employee_id" UUID,
    "order_number" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "item_description" TEXT,
    "item_brand" VARCHAR(100),
    "item_model" VARCHAR(100),
    "item_serial" VARCHAR(100),
    "diagnosis" TEXT,
    "status" "work_order_status" NOT NULL DEFAULT 'pending',
    "priority" VARCHAR(20) NOT NULL DEFAULT 'normal',
    "estimated_cost" DECIMAL(15,2),
    "final_cost" DECIMAL(15,2),
    "estimated_date" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "delivered_at" TIMESTAMPTZ,
    "customer_name" VARCHAR(255),
    "customer_phone" VARCHAR(20),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable: work_order_items
CREATE TABLE "work_order_items" (
    "id" UUID NOT NULL,
    "work_order_id" UUID NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "type" VARCHAR(20) NOT NULL DEFAULT 'labor',
    "quantity" DECIMAL(10,3) NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(15,2) NOT NULL,
    "subtotal" DECIMAL(15,2) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "work_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable: serial_numbers
CREATE TABLE "serial_numbers" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "outlet_id" UUID NOT NULL,
    "serial_number" VARCHAR(100) NOT NULL,
    "status" "serial_number_status" NOT NULL DEFAULT 'in_stock',
    "purchase_date" TIMESTAMPTZ,
    "sold_date" TIMESTAMPTZ,
    "warranty_expiry" TIMESTAMPTZ,
    "customer_id" UUID,
    "transaction_id" UUID,
    "cost_price" DECIMAL(15,2),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "serial_numbers_pkey" PRIMARY KEY ("id")
);

-- CreateTable: service_items
CREATE TABLE "service_items" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "outlet_id" UUID NOT NULL,
    "customer_id" UUID,
    "ticket_number" VARCHAR(50) NOT NULL,
    "item_name" VARCHAR(255) NOT NULL,
    "item_description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "service_name" VARCHAR(255) NOT NULL,
    "service_price" DECIMAL(15,2) NOT NULL,
    "status" "service_item_status" NOT NULL DEFAULT 'received',
    "received_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ,
    "ready_at" TIMESTAMPTZ,
    "delivered_at" TIMESTAMPTZ,
    "estimated_ready" TIMESTAMPTZ,
    "customer_name" VARCHAR(255),
    "customer_phone" VARCHAR(20),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "service_items_pkey" PRIMARY KEY ("id")
);

-- Indexes: appointments
CREATE INDEX "idx_appointments_outlet_time" ON "appointments"("outlet_id", "start_time");
CREATE INDEX "idx_appointments_employee_time" ON "appointments"("employee_id", "start_time");
CREATE INDEX "idx_appointments_customer" ON "appointments"("customer_id");
CREATE INDEX "idx_appointments_status" ON "appointments"("status");

-- Indexes: work_orders
CREATE UNIQUE INDEX "work_orders_order_number_key" ON "work_orders"("order_number");
CREATE INDEX "idx_work_orders_outlet_status" ON "work_orders"("outlet_id", "status");
CREATE INDEX "idx_work_orders_customer" ON "work_orders"("customer_id");
CREATE INDEX "idx_work_orders_status" ON "work_orders"("status");

-- Indexes: work_order_items
CREATE INDEX "idx_work_order_items_order" ON "work_order_items"("work_order_id");

-- Indexes: serial_numbers
CREATE INDEX "idx_serial_numbers_product_outlet" ON "serial_numbers"("product_id", "outlet_id");
CREATE INDEX "idx_serial_numbers_status" ON "serial_numbers"("status");
CREATE INDEX "idx_serial_numbers_sn" ON "serial_numbers"("serial_number");
CREATE UNIQUE INDEX "uq_serial_number_business" ON "serial_numbers"("business_id", "serial_number");

-- Indexes: service_items
CREATE UNIQUE INDEX "service_items_ticket_number_key" ON "service_items"("ticket_number");
CREATE INDEX "idx_service_items_outlet_status" ON "service_items"("outlet_id", "status");
CREATE INDEX "idx_service_items_customer" ON "service_items"("customer_id");
CREATE INDEX "idx_service_items_status" ON "service_items"("status");

-- Foreign Keys: appointments
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign Keys: work_orders
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign Keys: work_order_items
ALTER TABLE "work_order_items" ADD CONSTRAINT "work_order_items_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Foreign Keys: serial_numbers
ALTER TABLE "serial_numbers" ADD CONSTRAINT "serial_numbers_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "serial_numbers" ADD CONSTRAINT "serial_numbers_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "serial_numbers" ADD CONSTRAINT "serial_numbers_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign Keys: service_items
ALTER TABLE "service_items" ADD CONSTRAINT "service_items_outlet_id_fkey" FOREIGN KEY ("outlet_id") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_items" ADD CONSTRAINT "service_items_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
