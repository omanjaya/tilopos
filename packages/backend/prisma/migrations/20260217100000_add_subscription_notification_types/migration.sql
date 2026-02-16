-- AlterEnum
ALTER TYPE "notification_type" ADD VALUE 'subscription_trial_expiring';
ALTER TYPE "notification_type" ADD VALUE 'subscription_expired';
ALTER TYPE "notification_type" ADD VALUE 'subscription_payment_success';
ALTER TYPE "notification_type" ADD VALUE 'subscription_payment_failed';
