-- Audit 2026-09 follow-ups (R2):
--   * loyalty_transaction_type 'reversed' (void reversals, TransactionEventListener)
--   * stock_transfers.template_id -> transfer_templates (usage counts by column, not notes)
--   * transaction_items.refund_of_item_id -> transaction_items (refund line -> sold line)
--   * transactions.rounding_amount (cash rounding persisted)
--   * one active table name per outlet, one open attendance per employee (partial uniques)

-- ---------------------------------------------------------------------------
-- 0. Pre-checks: refuse to run on data that violates the new unique indexes
-- ---------------------------------------------------------------------------
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM (
    SELECT 1 FROM tables WHERE is_active GROUP BY outlet_id, name HAVING count(*) > 1) d;
  IF n > 0 THEN
    RAISE EXCEPTION 'audit_2026_09_followups: % (outlet_id, name) groups of active tables are duplicated; rename or deactivate the extra tables before creating uq_table_outlet_name_active (SELECT outlet_id, name, count(*) FROM tables WHERE is_active GROUP BY 1, 2 HAVING count(*) > 1)', n;
  END IF;

  SELECT count(*) INTO n FROM (
    SELECT 1 FROM employee_attendances WHERE clock_out_time IS NULL GROUP BY employee_id HAVING count(*) > 1) d;
  IF n > 0 THEN
    RAISE EXCEPTION 'audit_2026_09_followups: % employee(s) have more than one open attendance; set clock_out_time on the stale rows before creating uq_attendance_open_per_employee (SELECT employee_id, count(*) FROM employee_attendances WHERE clock_out_time IS NULL GROUP BY 1 HAVING count(*) > 1)', n;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1. Prisma-managed changes (generated with `prisma migrate diff`)
-- ---------------------------------------------------------------------------

-- AlterEnum
ALTER TYPE "loyalty_transaction_type" ADD VALUE 'reversed';

-- AlterTable
ALTER TABLE "stock_transfers" ADD COLUMN     "template_id" UUID;

-- AlterTable
ALTER TABLE "transaction_items" ADD COLUMN     "refund_of_item_id" UUID;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "rounding_amount" DECIMAL(15,2) NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "idx_transfers_template" ON "stock_transfers"("template_id");

-- CreateIndex
CREATE INDEX "idx_trans_items_refund_of" ON "transaction_items"("refund_of_item_id");

-- AddForeignKey
ALTER TABLE "transaction_items" ADD CONSTRAINT "transaction_items_refund_of_item_id_fkey" FOREIGN KEY ("refund_of_item_id") REFERENCES "transaction_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "transfer_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 2. Constraints Prisma cannot express (raw SQL; ignored by `prisma migrate diff`)
-- ---------------------------------------------------------------------------

-- Table: one ACTIVE table per (outlet, name); deactivated tables may keep the name.
CREATE UNIQUE INDEX "uq_table_outlet_name_active"
  ON "tables"("outlet_id", "name") WHERE "is_active";

-- EmployeeAttendance: at most one open attendance per employee (closes the clock-in race).
CREATE UNIQUE INDEX "uq_attendance_open_per_employee"
  ON "employee_attendances"("employee_id") WHERE "clock_out_time" IS NULL;

-- ---------------------------------------------------------------------------
-- 3. Backfills
-- ---------------------------------------------------------------------------

-- Refund lines: take the sold line id from the legacy note "refund:<itemId>|reason:..."
-- (only when that line belongs to the sale the refund points at).
UPDATE "transaction_items" ri
   SET "refund_of_item_id" = si."id"
  FROM "transactions" r, "transaction_items" si
 WHERE ri."transaction_id" = r."id"
   AND r."transaction_type" = 'refund'
   AND ri."refund_of_item_id" IS NULL
   AND ri."notes" ~ '^refund:[0-9a-fA-F-]{36}'
   AND si."id" = substring(ri."notes" from '^refund:([0-9a-fA-F-]{36})')::uuid
   AND si."transaction_id" = r."refund_of_id";

-- Transfers: link to the template named in a legacy "Template: <name>" note when exactly
-- one template of the same business has that name.
UPDATE "stock_transfers" st
   SET "template_id" = m."template_id"
  FROM (
    SELECT st2."id" AS "transfer_id", min(t."id"::text)::uuid AS "template_id"
      FROM "stock_transfers" st2
      JOIN "transfer_templates" t
        ON t."business_id" = st2."business_id"
       AND st2."notes" IS NOT NULL
       AND POSITION(('Template: ' || t."name") IN st2."notes") > 0
     WHERE st2."template_id" IS NULL
     GROUP BY st2."id"
    HAVING count(*) = 1
  ) m
 WHERE st."id" = m."transfer_id";
