-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "business_type" VARCHAR(30) NOT NULL DEFAULT 'custom',
ADD COLUMN     "business_type_set_at" TIMESTAMPTZ;

-- CreateTable
CREATE TABLE "business_features" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "feature_key" VARCHAR(50) NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "enabled_at" TIMESTAMPTZ,
    "disabled_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_features_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "business_features_business_id_is_enabled_idx" ON "business_features"("business_id", "is_enabled");

-- CreateIndex
CREATE UNIQUE INDEX "business_features_business_id_feature_key_key" ON "business_features"("business_id", "feature_key");

-- AddForeignKey
ALTER TABLE "business_features" ADD CONSTRAINT "business_features_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
