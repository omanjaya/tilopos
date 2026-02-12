-- AlterEnum: Add new payment method values
ALTER TYPE "payment_method" ADD VALUE IF NOT EXISTS 'debit_card';
ALTER TYPE "payment_method" ADD VALUE IF NOT EXISTS 'credit_card';
ALTER TYPE "payment_method" ADD VALUE IF NOT EXISTS 'linkaja';
