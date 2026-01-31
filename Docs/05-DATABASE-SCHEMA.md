# Database Schema - TiloPOS

> **Version:** 1.0  
> **Last Updated:** January 2026

---

## 1. Entity Relationship Diagram

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                           CORE ENTITIES                                         │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────┐         ┌─────────────┐         ┌─────────────┐              │
│  │   Business  │ 1────n  │   Outlet    │ 1────n  │   Employee  │              │
│  └─────────────┘         └─────────────┘         └─────────────┘              │
│                                │                        │                       │
│                                │                        │                       │
│                         ┌──────┴──────┐          ┌──────┴──────┐               │
│                         │             │          │             │               │
│                         ▼             ▼          ▼             ▼               │
│                  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐              │
│                  │   Product   │ │ Transaction │ │    Shift    │              │
│                  └─────────────┘ └─────────────┘ └─────────────┘              │
│                         │              │                                        │
│                ┌────────┴────────┐     │                                        │
│                ▼                 ▼     ▼                                        │
│         ┌─────────────┐   ┌─────────────┐                                      │
│         │   Variant   │   │ Trans_Item  │                                      │
│         └─────────────┘   └─────────────┘                                      │
│                                                                                 │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Tables

### 2.1 Business & Multi-tenant

```sql
-- Business (Tenant)
CREATE TABLE businesses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    legal_name      VARCHAR(255),
    tax_id          VARCHAR(50),          -- NPWP
    phone           VARCHAR(20),
    email           VARCHAR(255),
    address         TEXT,
    logo_url        VARCHAR(500),
    subscription_plan VARCHAR(50) DEFAULT 'basic',
    subscription_expires_at TIMESTAMPTZ,
    settings        JSONB DEFAULT '{}',
    status          VARCHAR(20) DEFAULT 'active',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Outlet
CREATE TABLE outlets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id     UUID NOT NULL REFERENCES businesses(id),
    name            VARCHAR(255) NOT NULL,
    code            VARCHAR(20) UNIQUE,
    address         TEXT,
    phone           VARCHAR(20),
    email           VARCHAR(255),
    timezone        VARCHAR(50) DEFAULT 'Asia/Jakarta',
    tax_rate        DECIMAL(5,2) DEFAULT 11.00,
    service_charge  DECIMAL(5,2) DEFAULT 0,
    receipt_header  TEXT,
    receipt_footer  TEXT,
    settings        JSONB DEFAULT '{}',
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_outlets_business ON outlets(business_id);
```

### 2.2 Products & Inventory

```sql
-- Category
CREATE TABLE categories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id     UUID NOT NULL REFERENCES businesses(id),
    parent_id       UUID REFERENCES categories(id),
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    image_url       VARCHAR(500),
    sort_order      INTEGER DEFAULT 0,
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_categories_business ON categories(business_id);

-- Product
CREATE TABLE products (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id     UUID NOT NULL REFERENCES businesses(id),
    category_id     UUID REFERENCES categories(id),
    sku             VARCHAR(100),
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    image_url       VARCHAR(500),
    base_price      DECIMAL(15,2) NOT NULL,
    cost_price      DECIMAL(15,2),
    has_variants    BOOLEAN DEFAULT false,
    track_stock     BOOLEAN DEFAULT true,
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(business_id, sku)
);
CREATE INDEX idx_products_business ON products(business_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_sku ON products(sku);

-- Product Variant
CREATE TABLE product_variants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku             VARCHAR(100),
    name            VARCHAR(255) NOT NULL,
    price           DECIMAL(15,2) NOT NULL,
    cost_price      DECIMAL(15,2),
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_variants_product ON product_variants(product_id);

-- Stock per Outlet
CREATE TABLE stock_levels (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id       UUID NOT NULL REFERENCES outlets(id),
    product_id      UUID REFERENCES products(id) ON DELETE CASCADE,
    variant_id      UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    quantity        DECIMAL(15,3) NOT NULL DEFAULT 0,
    low_stock_alert INTEGER DEFAULT 10,
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(outlet_id, product_id, variant_id)
);
CREATE INDEX idx_stock_outlet ON stock_levels(outlet_id);

-- Stock Movements
CREATE TABLE stock_movements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id       UUID NOT NULL REFERENCES outlets(id),
    product_id      UUID REFERENCES products(id),
    variant_id      UUID REFERENCES product_variants(id),
    movement_type   VARCHAR(50) NOT NULL, -- 'sale', 'purchase', 'adjustment', 'transfer_in', 'transfer_out'
    quantity        DECIMAL(15,3) NOT NULL,
    reference_id    UUID,
    reference_type  VARCHAR(50),
    notes           TEXT,
    created_by      UUID REFERENCES employees(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_stock_movements_outlet ON stock_movements(outlet_id);
CREATE INDEX idx_stock_movements_date ON stock_movements(created_at);
```

### 2.3 Transactions

```sql
-- Transaction
CREATE TABLE transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id       UUID NOT NULL REFERENCES outlets(id),
    employee_id     UUID REFERENCES employees(id),
    customer_id     UUID REFERENCES customers(id),
    shift_id        UUID REFERENCES shifts(id),
    receipt_number  VARCHAR(50) UNIQUE NOT NULL,
    transaction_type VARCHAR(20) DEFAULT 'sale', -- 'sale', 'refund'
    order_type      VARCHAR(20) DEFAULT 'dine_in', -- 'dine_in', 'takeaway', 'delivery'
    table_id        UUID REFERENCES tables(id),
    subtotal        DECIMAL(15,2) NOT NULL,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    tax_amount      DECIMAL(15,2) DEFAULT 0,
    service_charge  DECIMAL(15,2) DEFAULT 0,
    grand_total     DECIMAL(15,2) NOT NULL,
    notes           TEXT,
    status          VARCHAR(20) DEFAULT 'completed',
    voided_at       TIMESTAMPTZ,
    voided_by       UUID REFERENCES employees(id),
    void_reason     TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_transactions_outlet ON transactions(outlet_id);
CREATE INDEX idx_transactions_date ON transactions(created_at);
CREATE INDEX idx_transactions_receipt ON transactions(receipt_number);

-- Transaction Items
CREATE TABLE transaction_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id  UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    product_id      UUID REFERENCES products(id),
    variant_id      UUID REFERENCES product_variants(id),
    product_name    VARCHAR(255) NOT NULL,
    variant_name    VARCHAR(255),
    quantity        DECIMAL(10,3) NOT NULL,
    unit_price      DECIMAL(15,2) NOT NULL,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    subtotal        DECIMAL(15,2) NOT NULL,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_trans_items_transaction ON transaction_items(transaction_id);

-- Payments
CREATE TABLE payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id  UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    payment_method  VARCHAR(50) NOT NULL, -- 'cash', 'card', 'gopay', 'ovo', 'qris', etc.
    amount          DECIMAL(15,2) NOT NULL,
    reference_number VARCHAR(100),
    status          VARCHAR(20) DEFAULT 'completed',
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_payments_transaction ON payments(transaction_id);
```

### 2.4 Employees & Shifts

```sql
-- Employee
CREATE TABLE employees (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id     UUID NOT NULL REFERENCES businesses(id),
    outlet_id       UUID REFERENCES outlets(id),
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255),
    phone           VARCHAR(20),
    pin             VARCHAR(10),
    role            VARCHAR(50) NOT NULL, -- 'owner', 'manager', 'cashier', 'kitchen'
    permissions     JSONB DEFAULT '[]',
    hourly_rate     DECIMAL(10,2),
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_employees_business ON employees(business_id);
CREATE INDEX idx_employees_outlet ON employees(outlet_id);

-- Shift
CREATE TABLE shifts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id       UUID NOT NULL REFERENCES outlets(id),
    employee_id     UUID NOT NULL REFERENCES employees(id),
    started_at      TIMESTAMPTZ NOT NULL,
    ended_at        TIMESTAMPTZ,
    opening_cash    DECIMAL(15,2) DEFAULT 0,
    closing_cash    DECIMAL(15,2),
    expected_cash   DECIMAL(15,2),
    cash_difference DECIMAL(15,2),
    notes           TEXT,
    status          VARCHAR(20) DEFAULT 'open',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_shifts_outlet ON shifts(outlet_id);
CREATE INDEX idx_shifts_employee ON shifts(employee_id);
```

### 2.5 Customers & Loyalty

```sql
-- Customer
CREATE TABLE customers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id     UUID NOT NULL REFERENCES businesses(id),
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255),
    phone           VARCHAR(20),
    address         TEXT,
    date_of_birth   DATE,
    customer_type   VARCHAR(20) DEFAULT 'individual',
    loyalty_points  INTEGER DEFAULT 0,
    loyalty_tier    VARCHAR(20) DEFAULT 'regular',
    total_spent     DECIMAL(15,2) DEFAULT 0,
    visit_count     INTEGER DEFAULT 0,
    last_visit_at   TIMESTAMPTZ,
    notes           TEXT,
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_customers_business ON customers(business_id);
CREATE INDEX idx_customers_phone ON customers(phone);
```

### 2.6 Tables (F&B)

```sql
-- Table
CREATE TABLE tables (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id       UUID NOT NULL REFERENCES outlets(id),
    name            VARCHAR(50) NOT NULL,
    capacity        INTEGER DEFAULT 4,
    section         VARCHAR(50),
    position_x      INTEGER,
    position_y      INTEGER,
    status          VARCHAR(20) DEFAULT 'available',
    current_order_id UUID,
    occupied_at     TIMESTAMPTZ,
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_tables_outlet ON tables(outlet_id);
```

### 2.7 Orders & KDS

```sql
-- Order
CREATE TABLE orders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id       UUID NOT NULL REFERENCES outlets(id),
    order_number    VARCHAR(20) NOT NULL,
    order_type      VARCHAR(20) DEFAULT 'dine_in',
    table_id        UUID REFERENCES tables(id),
    customer_id     UUID REFERENCES customers(id),
    status          VARCHAR(20) DEFAULT 'pending',
    priority        INTEGER DEFAULT 0,
    notes           TEXT,
    estimated_time  INTEGER,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_orders_outlet ON orders(outlet_id);
CREATE INDEX idx_orders_status ON orders(status);

-- Order Item
CREATE TABLE order_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id      UUID REFERENCES products(id),
    variant_id      UUID REFERENCES product_variants(id),
    product_name    VARCHAR(255) NOT NULL,
    quantity        INTEGER NOT NULL,
    station         VARCHAR(50),
    status          VARCHAR(20) DEFAULT 'pending',
    notes           TEXT,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_status ON order_items(status);
```

### 2.8 Modifiers & Add-ons

```sql
-- Modifier Group (e.g., "Topping", "Size", "Sugar Level")
CREATE TABLE modifier_groups (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id     UUID NOT NULL REFERENCES businesses(id),
    name            VARCHAR(255) NOT NULL,
    selection_type  VARCHAR(20) DEFAULT 'single', -- 'single', 'multiple'
    min_selection   INTEGER DEFAULT 0,
    max_selection   INTEGER,
    is_required     BOOLEAN DEFAULT false,
    sort_order      INTEGER DEFAULT 0,
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_modifier_groups_business ON modifier_groups(business_id);

-- Modifier Item (e.g., "Extra Cheese +5K", "Large +10K")
CREATE TABLE modifiers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    modifier_group_id UUID NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    price           DECIMAL(15,2) DEFAULT 0,
    sort_order      INTEGER DEFAULT 0,
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_modifiers_group ON modifiers(modifier_group_id);

-- Product-ModifierGroup association
CREATE TABLE product_modifier_groups (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    modifier_group_id UUID NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
    sort_order      INTEGER DEFAULT 0,
    UNIQUE(product_id, modifier_group_id)
);

-- Transaction Item Modifiers (selected modifiers per cart/transaction item)
CREATE TABLE transaction_item_modifiers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_item_id UUID NOT NULL REFERENCES transaction_items(id) ON DELETE CASCADE,
    modifier_id     UUID NOT NULL REFERENCES modifiers(id),
    modifier_name   VARCHAR(255) NOT NULL,
    price           DECIMAL(15,2) DEFAULT 0,
    quantity        INTEGER DEFAULT 1,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_trans_item_mods ON transaction_item_modifiers(transaction_item_id);
```

### 2.9 Ingredients & Recipe Management

```sql
-- Ingredient (raw material)
CREATE TABLE ingredients (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id     UUID NOT NULL REFERENCES businesses(id),
    name            VARCHAR(255) NOT NULL,
    sku             VARCHAR(100),
    unit            VARCHAR(50) NOT NULL, -- 'gram', 'ml', 'pcs', 'kg', 'liter'
    cost_per_unit   DECIMAL(15,4) DEFAULT 0,
    image_url       VARCHAR(500),
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(business_id, sku)
);
CREATE INDEX idx_ingredients_business ON ingredients(business_id);

-- Ingredient Stock per Outlet
CREATE TABLE ingredient_stock_levels (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id       UUID NOT NULL REFERENCES outlets(id),
    ingredient_id   UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    quantity        DECIMAL(15,4) NOT NULL DEFAULT 0,
    low_stock_alert DECIMAL(15,4) DEFAULT 0,
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(outlet_id, ingredient_id)
);
CREATE INDEX idx_ing_stock_outlet ON ingredient_stock_levels(outlet_id);

-- Recipe (product -> ingredients mapping)
CREATE TABLE recipes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id      UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_recipes_product ON recipes(product_id);

-- Recipe Items (ingredients per recipe)
CREATE TABLE recipe_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id       UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    ingredient_id   UUID NOT NULL REFERENCES ingredients(id),
    quantity        DECIMAL(15,4) NOT NULL,
    unit            VARCHAR(50) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_recipe_items_recipe ON recipe_items(recipe_id);

-- Ingredient Stock Movements
CREATE TABLE ingredient_stock_movements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id       UUID NOT NULL REFERENCES outlets(id),
    ingredient_id   UUID NOT NULL REFERENCES ingredients(id),
    movement_type   VARCHAR(50) NOT NULL, -- 'purchase', 'usage', 'adjustment', 'waste', 'transfer_in', 'transfer_out'
    quantity        DECIMAL(15,4) NOT NULL,
    reference_id    UUID,
    reference_type  VARCHAR(50),
    notes           TEXT,
    created_by      UUID REFERENCES employees(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_ing_movements_outlet ON ingredient_stock_movements(outlet_id);
CREATE INDEX idx_ing_movements_date ON ingredient_stock_movements(created_at);
```

### 2.10 Suppliers

```sql
-- Supplier
CREATE TABLE suppliers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id     UUID NOT NULL REFERENCES businesses(id),
    name            VARCHAR(255) NOT NULL,
    contact_person  VARCHAR(255),
    phone           VARCHAR(20),
    email           VARCHAR(255),
    address         TEXT,
    notes           TEXT,
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_suppliers_business ON suppliers(business_id);

-- Purchase Order
CREATE TABLE purchase_orders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id       UUID NOT NULL REFERENCES outlets(id),
    supplier_id     UUID NOT NULL REFERENCES suppliers(id),
    po_number       VARCHAR(50) UNIQUE NOT NULL,
    status          VARCHAR(20) DEFAULT 'draft', -- 'draft', 'ordered', 'partial', 'received', 'cancelled'
    total_amount    DECIMAL(15,2) DEFAULT 0,
    notes           TEXT,
    ordered_at      TIMESTAMPTZ,
    received_at     TIMESTAMPTZ,
    created_by      UUID REFERENCES employees(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_po_outlet ON purchase_orders(outlet_id);
CREATE INDEX idx_po_supplier ON purchase_orders(supplier_id);

-- Purchase Order Items
CREATE TABLE purchase_order_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id      UUID REFERENCES products(id),
    variant_id      UUID REFERENCES product_variants(id),
    ingredient_id   UUID REFERENCES ingredients(id),
    item_name       VARCHAR(255) NOT NULL,
    quantity_ordered DECIMAL(15,3) NOT NULL,
    quantity_received DECIMAL(15,3) DEFAULT 0,
    unit_cost       DECIMAL(15,4) NOT NULL,
    subtotal        DECIMAL(15,2) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_po_items_po ON purchase_order_items(purchase_order_id);
```

### 2.11 Stock Transfers

```sql
-- Stock Transfer (inter-outlet)
CREATE TABLE stock_transfers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id     UUID NOT NULL REFERENCES businesses(id),
    transfer_number VARCHAR(50) UNIQUE NOT NULL,
    source_outlet_id UUID NOT NULL REFERENCES outlets(id),
    destination_outlet_id UUID NOT NULL REFERENCES outlets(id),
    status          VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'in_transit', 'received', 'rejected', 'cancelled'
    notes           TEXT,
    requested_by    UUID REFERENCES employees(id),
    approved_by     UUID REFERENCES employees(id),
    received_by     UUID REFERENCES employees(id),
    requested_at    TIMESTAMPTZ DEFAULT NOW(),
    approved_at     TIMESTAMPTZ,
    shipped_at      TIMESTAMPTZ,
    received_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_transfers_business ON stock_transfers(business_id);
CREATE INDEX idx_transfers_source ON stock_transfers(source_outlet_id);
CREATE INDEX idx_transfers_dest ON stock_transfers(destination_outlet_id);
CREATE INDEX idx_transfers_status ON stock_transfers(status);

-- Stock Transfer Items
CREATE TABLE stock_transfer_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id     UUID NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
    product_id      UUID REFERENCES products(id),
    variant_id      UUID REFERENCES product_variants(id),
    ingredient_id   UUID REFERENCES ingredients(id),
    item_name       VARCHAR(255) NOT NULL,
    quantity_sent   DECIMAL(15,3) NOT NULL,
    quantity_received DECIMAL(15,3),
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_transfer_items ON stock_transfer_items(transfer_id);
```

### 2.12 Loyalty Transactions

```sql
-- Loyalty Transactions (point history)
CREATE TABLE loyalty_transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id     UUID NOT NULL REFERENCES customers(id),
    transaction_id  UUID REFERENCES transactions(id),
    type            VARCHAR(20) NOT NULL, -- 'earned', 'redeemed', 'adjusted', 'expired'
    points          INTEGER NOT NULL,
    balance_after   INTEGER NOT NULL,
    description     TEXT,
    expires_at      TIMESTAMPTZ,
    created_by      UUID REFERENCES employees(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_loyalty_tx_customer ON loyalty_transactions(customer_id);
CREATE INDEX idx_loyalty_tx_date ON loyalty_transactions(created_at);

-- Loyalty Tier Configuration
CREATE TABLE loyalty_tiers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id     UUID NOT NULL REFERENCES businesses(id),
    name            VARCHAR(50) NOT NULL, -- 'regular', 'silver', 'gold', 'platinum'
    min_points      INTEGER DEFAULT 0,
    min_spent       DECIMAL(15,2) DEFAULT 0,
    point_multiplier DECIMAL(5,2) DEFAULT 1.00,
    benefits        JSONB DEFAULT '{}',
    sort_order      INTEGER DEFAULT 0,
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_loyalty_tiers_business ON loyalty_tiers(business_id);

-- Loyalty Program Configuration
CREATE TABLE loyalty_programs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id     UUID NOT NULL REFERENCES businesses(id),
    name            VARCHAR(255) NOT NULL,
    points_per_amount DECIMAL(10,2) DEFAULT 1, -- points earned per Rp X
    amount_per_point DECIMAL(15,2) DEFAULT 1000, -- Rp per 1 point
    redemption_rate DECIMAL(10,2) DEFAULT 50, -- Rp value per 1 point redeemed
    point_expiry_days INTEGER, -- days until points expire, null = no expiry
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_loyalty_prog_business ON loyalty_programs(business_id);
```

### 2.13 Audit Logs

```sql
-- Audit Log
CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id     UUID NOT NULL REFERENCES businesses(id),
    outlet_id       UUID REFERENCES outlets(id),
    employee_id     UUID REFERENCES employees(id),
    action          VARCHAR(100) NOT NULL, -- 'transaction.void', 'refund.create', 'discount.apply', 'stock.adjust', 'employee.login'
    entity_type     VARCHAR(50) NOT NULL, -- 'transaction', 'product', 'employee', 'stock', 'customer'
    entity_id       UUID,
    old_value       JSONB,
    new_value       JSONB,
    ip_address      VARCHAR(45),
    device_id       UUID REFERENCES devices(id),
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_audit_business ON audit_logs(business_id);
CREATE INDEX idx_audit_employee ON audit_logs(employee_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_date ON audit_logs(created_at);
CREATE INDEX idx_audit_action ON audit_logs(action);
```

### 2.14 Payment Settlements

```sql
-- Payment Settlement (reconciliation with payment providers)
CREATE TABLE payment_settlements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id       UUID NOT NULL REFERENCES outlets(id),
    payment_method  VARCHAR(50) NOT NULL, -- 'gopay', 'ovo', 'qris', 'card', etc.
    settlement_date DATE NOT NULL,
    total_transactions INTEGER DEFAULT 0,
    gross_amount    DECIMAL(15,2) NOT NULL,
    fee_amount      DECIMAL(15,2) DEFAULT 0,
    net_amount      DECIMAL(15,2) NOT NULL,
    status          VARCHAR(20) DEFAULT 'pending', -- 'pending', 'settled', 'disputed'
    reference_number VARCHAR(100),
    settled_at      TIMESTAMPTZ,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_settlement_outlet ON payment_settlements(outlet_id);
CREATE INDEX idx_settlement_date ON payment_settlements(settlement_date);
CREATE INDEX idx_settlement_method ON payment_settlements(payment_method);
```

### 2.15 Online Orders (Marketplace Integration)

```sql
-- Online Order (GoFood, GrabFood, ShopeeFood)
CREATE TABLE online_orders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id       UUID NOT NULL REFERENCES outlets(id),
    platform        VARCHAR(50) NOT NULL, -- 'gofood', 'grabfood', 'shopeefood'
    platform_order_id VARCHAR(100) NOT NULL,
    transaction_id  UUID REFERENCES transactions(id),
    order_type      VARCHAR(20) DEFAULT 'delivery', -- 'delivery', 'pickup'
    customer_name   VARCHAR(255),
    customer_phone  VARCHAR(20),
    delivery_address TEXT,
    items           JSONB NOT NULL,
    subtotal        DECIMAL(15,2) NOT NULL,
    delivery_fee    DECIMAL(15,2) DEFAULT 0,
    platform_fee    DECIMAL(15,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    grand_total     DECIMAL(15,2) NOT NULL,
    status          VARCHAR(20) DEFAULT 'received', -- 'received', 'accepted', 'preparing', 'ready', 'picked_up', 'completed', 'cancelled'
    driver_name     VARCHAR(255),
    driver_phone    VARCHAR(20),
    notes           TEXT,
    estimated_delivery TIMESTAMPTZ,
    accepted_at     TIMESTAMPTZ,
    ready_at        TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    cancelled_at    TIMESTAMPTZ,
    cancel_reason   TEXT,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_online_orders_outlet ON online_orders(outlet_id);
CREATE INDEX idx_online_orders_platform ON online_orders(platform, platform_order_id);
CREATE INDEX idx_online_orders_status ON online_orders(status);
CREATE INDEX idx_online_orders_date ON online_orders(created_at);
```

### 2.16 Devices

```sql
-- Device Registration
CREATE TABLE devices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id     UUID NOT NULL REFERENCES businesses(id),
    outlet_id       UUID REFERENCES outlets(id),
    device_name     VARCHAR(255) NOT NULL,
    device_type     VARCHAR(50) NOT NULL, -- 'tablet', 'phone', 'desktop', 'kds_display'
    platform        VARCHAR(50), -- 'android', 'ios', 'windows', 'web'
    device_identifier VARCHAR(255) UNIQUE, -- hardware fingerprint
    app_version     VARCHAR(20),
    last_sync_at    TIMESTAMPTZ,
    last_active_at  TIMESTAMPTZ,
    is_active       BOOLEAN DEFAULT true,
    registered_at   TIMESTAMPTZ DEFAULT NOW(),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_devices_business ON devices(business_id);
CREATE INDEX idx_devices_outlet ON devices(outlet_id);
```

### 2.17 Notifications

```sql
-- Notification Settings (per outlet/employee)
CREATE TABLE notification_settings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id     UUID NOT NULL REFERENCES businesses(id),
    outlet_id       UUID REFERENCES outlets(id),
    employee_id     UUID REFERENCES employees(id),
    notification_type VARCHAR(50) NOT NULL, -- 'low_stock', 'large_transaction', 'refund', 'online_order', 'shift_reminder', 'system_error'
    channel         VARCHAR(20) NOT NULL, -- 'push', 'email', 'sms', 'whatsapp'
    is_enabled      BOOLEAN DEFAULT true,
    threshold       JSONB DEFAULT '{}', -- e.g., {"amount": 1000000} for large_transaction
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(business_id, outlet_id, employee_id, notification_type, channel)
);
CREATE INDEX idx_notif_settings_business ON notification_settings(business_id);

-- Notification Log
CREATE TABLE notification_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id     UUID NOT NULL REFERENCES businesses(id),
    outlet_id       UUID REFERENCES outlets(id),
    recipient_id    UUID REFERENCES employees(id),
    notification_type VARCHAR(50) NOT NULL,
    channel         VARCHAR(20) NOT NULL,
    title           VARCHAR(255) NOT NULL,
    body            TEXT,
    status          VARCHAR(20) DEFAULT 'sent', -- 'sent', 'delivered', 'read', 'failed'
    metadata        JSONB DEFAULT '{}',
    sent_at         TIMESTAMPTZ DEFAULT NOW(),
    read_at         TIMESTAMPTZ
);
CREATE INDEX idx_notif_logs_recipient ON notification_logs(recipient_id);
CREATE INDEX idx_notif_logs_date ON notification_logs(sent_at);
```

### 2.18 Self-Order (Customer Self-Ordering)

```sql
-- Self-Order Session (QR code based)
CREATE TABLE self_order_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id       UUID NOT NULL REFERENCES outlets(id),
    table_id        UUID REFERENCES tables(id),
    session_code    VARCHAR(50) UNIQUE NOT NULL, -- QR code value
    status          VARCHAR(20) DEFAULT 'active', -- 'active', 'submitted', 'paid', 'expired'
    customer_name   VARCHAR(255),
    language        VARCHAR(10) DEFAULT 'id', -- 'id', 'en'
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_self_order_outlet ON self_order_sessions(outlet_id);
CREATE INDEX idx_self_order_code ON self_order_sessions(session_code);

-- Self-Order Cart Items
CREATE TABLE self_order_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID NOT NULL REFERENCES self_order_sessions(id) ON DELETE CASCADE,
    product_id      UUID NOT NULL REFERENCES products(id),
    variant_id      UUID REFERENCES product_variants(id),
    quantity        INTEGER NOT NULL DEFAULT 1,
    modifiers       JSONB DEFAULT '[]', -- selected modifier IDs with prices
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_self_order_items_session ON self_order_items(session_id);
```

### 2.19 Online Store

```sql
-- Online Store Configuration
CREATE TABLE online_stores (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id     UUID NOT NULL REFERENCES businesses(id),
    store_name      VARCHAR(255) NOT NULL,
    slug            VARCHAR(100) UNIQUE NOT NULL,
    domain          VARCHAR(255),
    description     TEXT,
    logo_url        VARCHAR(500),
    banner_url      VARCHAR(500),
    theme_settings  JSONB DEFAULT '{}',
    shipping_methods JSONB DEFAULT '[]',
    payment_methods JSONB DEFAULT '[]',
    social_links    JSONB DEFAULT '{}', -- {"instagram": "...", "facebook": "..."}
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_online_stores_business ON online_stores(business_id);
CREATE INDEX idx_online_stores_slug ON online_stores(slug);

-- Online Store Orders
CREATE TABLE store_orders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES online_stores(id),
    outlet_id       UUID NOT NULL REFERENCES outlets(id),
    order_number    VARCHAR(50) UNIQUE NOT NULL,
    customer_name   VARCHAR(255) NOT NULL,
    customer_email  VARCHAR(255),
    customer_phone  VARCHAR(20) NOT NULL,
    shipping_address TEXT,
    shipping_method VARCHAR(50),
    shipping_cost   DECIMAL(15,2) DEFAULT 0,
    subtotal        DECIMAL(15,2) NOT NULL,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    grand_total     DECIMAL(15,2) NOT NULL,
    payment_method  VARCHAR(50),
    payment_status  VARCHAR(20) DEFAULT 'pending', -- 'pending', 'paid', 'failed', 'refunded'
    order_status    VARCHAR(20) DEFAULT 'pending', -- 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'
    tracking_number VARCHAR(100),
    notes           TEXT,
    paid_at         TIMESTAMPTZ,
    shipped_at      TIMESTAMPTZ,
    delivered_at    TIMESTAMPTZ,
    cancelled_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_store_orders_store ON store_orders(store_id);
CREATE INDEX idx_store_orders_status ON store_orders(order_status);
CREATE INDEX idx_store_orders_date ON store_orders(created_at);

-- Store Order Items
CREATE TABLE store_order_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_order_id  UUID NOT NULL REFERENCES store_orders(id) ON DELETE CASCADE,
    product_id      UUID REFERENCES products(id),
    variant_id      UUID REFERENCES product_variants(id),
    product_name    VARCHAR(255) NOT NULL,
    variant_name    VARCHAR(255),
    quantity        INTEGER NOT NULL,
    unit_price      DECIMAL(15,2) NOT NULL,
    subtotal        DECIMAL(15,2) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_store_order_items ON store_order_items(store_order_id);
```

### 2.20 Waiting List

```sql
-- Waiting List (F&B table waitlist)
CREATE TABLE waiting_list (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id       UUID NOT NULL REFERENCES outlets(id),
    customer_name   VARCHAR(255) NOT NULL,
    customer_phone  VARCHAR(20),
    party_size      INTEGER NOT NULL DEFAULT 1,
    preferred_section VARCHAR(50),
    table_id        UUID REFERENCES tables(id),
    status          VARCHAR(20) DEFAULT 'waiting', -- 'waiting', 'notified', 'seated', 'cancelled', 'no_show'
    estimated_wait  INTEGER, -- minutes
    notes           TEXT,
    queued_at       TIMESTAMPTZ DEFAULT NOW(),
    notified_at     TIMESTAMPTZ,
    seated_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_waitlist_outlet ON waiting_list(outlet_id);
CREATE INDEX idx_waitlist_status ON waiting_list(status);
```

---

## 3. Promotions & Discounts

```sql
-- Promotion
CREATE TABLE promotions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id     UUID NOT NULL REFERENCES businesses(id),
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    discount_type   VARCHAR(20) NOT NULL, -- 'percentage', 'fixed', 'bogo'
    discount_value  DECIMAL(15,2) NOT NULL,
    min_purchase    DECIMAL(15,2),
    max_discount    DECIMAL(15,2),
    valid_from      TIMESTAMPTZ NOT NULL,
    valid_until     TIMESTAMPTZ NOT NULL,
    usage_limit     INTEGER,
    used_count      INTEGER DEFAULT 0,
    applicable_to   JSONB DEFAULT '{}',
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_promotions_business ON promotions(business_id);
CREATE INDEX idx_promotions_dates ON promotions(valid_from, valid_until);

-- Voucher
CREATE TABLE vouchers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id     UUID NOT NULL REFERENCES businesses(id),
    code            VARCHAR(50) UNIQUE NOT NULL,
    promotion_id    UUID REFERENCES promotions(id),
    initial_value   DECIMAL(15,2),
    remaining_value DECIMAL(15,2),
    expires_at      TIMESTAMPTZ,
    used_at         TIMESTAMPTZ,
    used_by         UUID REFERENCES customers(id),
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_vouchers_code ON vouchers(code);
```

---

## 4. Indexes & Performance

```sql
-- Composite indexes for common queries
CREATE INDEX idx_transactions_outlet_date ON transactions(outlet_id, created_at DESC);
CREATE INDEX idx_products_business_active ON products(business_id, is_active);
CREATE INDEX idx_stock_outlet_product ON stock_levels(outlet_id, product_id);
CREATE INDEX idx_online_orders_outlet_date ON online_orders(outlet_id, created_at DESC);
CREATE INDEX idx_audit_business_date ON audit_logs(business_id, created_at DESC);
CREATE INDEX idx_loyalty_tx_customer_date ON loyalty_transactions(customer_id, created_at DESC);
CREATE INDEX idx_settlement_outlet_date ON payment_settlements(outlet_id, settlement_date DESC);
CREATE INDEX idx_ing_stock_outlet_ing ON ingredient_stock_levels(outlet_id, ingredient_id);

-- Partial indexes
CREATE INDEX idx_transactions_pending ON transactions(outlet_id, status) WHERE status = 'pending';
CREATE INDEX idx_orders_active ON orders(outlet_id, status) WHERE status NOT IN ('completed', 'cancelled');
CREATE INDEX idx_transfers_pending ON stock_transfers(business_id, status) WHERE status IN ('pending', 'approved', 'in_transit');
CREATE INDEX idx_online_orders_active ON online_orders(outlet_id, status) WHERE status NOT IN ('completed', 'cancelled');
CREATE INDEX idx_waitlist_active ON waiting_list(outlet_id, status) WHERE status = 'waiting';
CREATE INDEX idx_self_order_active ON self_order_sessions(outlet_id, status) WHERE status = 'active';
```

---

> **Next:** [06-UI-UX-DESIGN.md](./06-UI-UX-DESIGN.md)
