# Transfer Templates Migration

## Overview
This migration adds support for Transfer Templates - reusable patterns for common transfer scenarios.

## What's New
- **Transfer Templates**: Save frequently used transfer patterns
- **Template Items**: Store default quantities for each product
- **Usage Tracking**: Track how often templates are used
- **Quick Apply**: Apply templates with one click when creating transfers

## Database Changes

### New Tables
1. **transfer_templates**
   - Stores template metadata (name, description, source/destination outlets)
   - Tracks creation/update timestamps and creator
   - Enforces different source/destination outlets

2. **transfer_template_items**
   - Stores items included in each template
   - Links to products/variants/ingredients
   - Stores default quantities

### Indexes
- `idx_transfer_templates_business_id` - Query templates by business
- `idx_transfer_templates_source_outlet` - Query by source outlet
- `idx_transfer_templates_dest_outlet` - Query by destination outlet
- `idx_transfer_template_items_template_id` - Fast template item lookup
- `idx_transfer_template_items_product_id` - Product reference lookup

## How to Apply Migration

### Method 1: Using psql (Recommended)
```bash
cd packages/backend
psql -U your_username -d your_database -f prisma/migrations/add_transfer_templates.sql
```

### Method 2: Using Prisma Studio
1. Copy the SQL from `add_transfer_templates.sql`
2. Open Prisma Studio: `npm run db:studio`
3. Execute the SQL in the query panel

### Method 3: Manual (if needed)
```bash
# Connect to your PostgreSQL database
psql -U your_username -d your_database

# Paste the SQL from add_transfer_templates.sql
# Then commit the transaction
```

## Verification

After applying the migration, verify the tables exist:

```sql
-- Check if tables were created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('transfer_templates', 'transfer_template_items');

-- Check indexes
SELECT indexname FROM pg_indexes
WHERE tablename IN ('transfer_templates', 'transfer_template_items');
```

## Rollback (if needed)

To rollback this migration:

```sql
DROP TABLE IF EXISTS transfer_template_items CASCADE;
DROP TABLE IF EXISTS transfer_templates CASCADE;
```

## API Endpoints

### Created Endpoints
- `GET /api/v1/transfer-templates` - List all templates
- `GET /api/v1/transfer-templates/:id` - Get single template
- `POST /api/v1/transfer-templates` - Create template
- `PUT /api/v1/transfer-templates/:id` - Update template
- `DELETE /api/v1/transfer-templates/:id` - Delete template

### Permissions
- **View**: All authenticated users
- **Create/Edit**: Manager, Owner, Inventory roles
- **Delete**: Manager, Owner roles

## Usage Example

### 1. Create a Template
```typescript
POST /api/v1/transfer-templates
{
  "name": "Weekly Restock from Warehouse",
  "description": "Standard weekly restock items",
  "sourceOutletId": "uuid-of-warehouse",
  "destinationOutletId": "uuid-of-store",
  "items": [
    {
      "productId": "uuid-of-product-1",
      "itemName": "Product Name 1",
      "defaultQuantity": 50
    },
    {
      "productId": "uuid-of-product-2",
      "itemName": "Product Name 2",
      "defaultQuantity": 30
    }
  ]
}
```

### 2. Use Template
- Open Transfer Templates modal
- Click "Gunakan" on desired template
- Template data auto-fills the transfer form
- Adjust quantities if needed
- Submit transfer

## Frontend Changes

### New Components
- `TransferTemplatesModal` - Template management UI
- `TransferTemplateFormModal` - Create/edit template form

### New Features
- Templates button in transfers page header
- Template list with usage statistics
- Quick apply templates to transfers
- Edit/delete template functionality

## Notes

- Templates are business-scoped (multi-tenant safe)
- Templates can only be created for different source/destination outlets
- Template items reference products but store item names for historical accuracy
- If a product is deleted, the template remains valid (using stored name)
- Usage count is calculated from transfer notes containing "Template: [name]"

## Support

If you encounter issues:
1. Check PostgreSQL logs: `tail -f /var/log/postgresql/postgresql-*.log`
2. Verify database permissions
3. Ensure UUID extension is enabled: `CREATE EXTENSION IF NOT EXISTS "pgcrypto";`
