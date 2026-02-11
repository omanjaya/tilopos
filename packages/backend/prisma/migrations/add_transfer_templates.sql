-- Migration: Add Transfer Templates Tables
-- Created: 2026-02-11
-- Description: Add tables for storing transfer templates and their items

-- Create transfer_templates table
CREATE TABLE IF NOT EXISTS transfer_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  source_outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  destination_outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT check_different_outlets CHECK (source_outlet_id != destination_outlet_id)
);

-- Create transfer_template_items table
CREATE TABLE IF NOT EXISTS transfer_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES transfer_templates(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE SET NULL,
  item_name VARCHAR(255) NOT NULL,
  default_quantity DECIMAL(10, 2) NOT NULL CHECK (default_quantity > 0),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transfer_templates_business_id ON transfer_templates(business_id);
CREATE INDEX IF NOT EXISTS idx_transfer_templates_source_outlet ON transfer_templates(source_outlet_id);
CREATE INDEX IF NOT EXISTS idx_transfer_templates_dest_outlet ON transfer_templates(destination_outlet_id);
CREATE INDEX IF NOT EXISTS idx_transfer_template_items_template_id ON transfer_template_items(template_id);
CREATE INDEX IF NOT EXISTS idx_transfer_template_items_product_id ON transfer_template_items(product_id);

-- Add comments
COMMENT ON TABLE transfer_templates IS 'Stores reusable transfer templates for common transfer patterns';
COMMENT ON TABLE transfer_template_items IS 'Stores the items included in each transfer template';

COMMENT ON COLUMN transfer_templates.name IS 'Template name (e.g., "Weekly Restock from Warehouse")';
COMMENT ON COLUMN transfer_templates.description IS 'Optional description of the template purpose';
COMMENT ON COLUMN transfer_template_items.default_quantity IS 'Default quantity to transfer for this item';
