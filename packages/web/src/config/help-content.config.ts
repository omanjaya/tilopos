/**
 * Help content configuration for forms and pages
 * Provides contextual help text and tooltips for various UI elements
 */

export interface FieldHelp {
  field: string;
  label: string;
  help: string;
  title?: string;
  variant?: 'info' | 'warning' | 'tip' | 'help';
}

export interface PageHelp {
  page: string;
  title: string;
  description: string;
  tips: string[];
  commonIssues: Array<{
    problem: string;
    solution: string;
  }>;
  fields?: Record<string, FieldHelp>;
}

export const helpContent: Record<string, PageHelp> = {
  // Products Page
  products: {
    page: 'products',
    title: 'Products Help',
    description: 'Manage your product catalog, pricing, and inventory.',
    tips: [
      'Use product variants to manage different sizes, colors, or flavors of the same product.',
      'Set up modifier groups for items that can be customized (e.g., extra toppings, cooking preferences).',
      'Enable stock tracking to get low stock alerts and maintain optimal inventory levels.',
      'Use categories to organize products for easier navigation on the POS.',
    ],
    commonIssues: [
      {
        problem: 'Product not showing in POS',
        solution: 'Check if the product is active and assigned to the correct outlet. Verify the category is also active.',
      },
      {
        problem: 'Price is incorrect',
        solution: 'Check if there are active promotions or discounts applied to the product.',
      },
      {
        problem: 'Stock not updating',
        solution: 'Ensure stock tracking is enabled for the product and check inventory settings.',
      },
    ],
    fields: {
      name: {
        field: 'name',
        label: 'Product Name',
        help: 'Enter a clear, descriptive name for your product. This will appear on receipts and reports.',
        variant: 'info',
      },
      sku: {
        field: 'sku',
        label: 'SKU',
        help: 'Stock Keeping Unit - a unique identifier for inventory tracking. Use alphanumeric characters and hyphens.',
        variant: 'tip',
      },
      price: {
        field: 'price',
        label: 'Price',
        help: 'Set the default selling price. You can create multiple price variants for different sizes or options.',
        variant: 'info',
      },
      cost: {
        field: 'cost',
        label: 'Cost',
        help: 'The cost price helps calculate profit margins. This is only visible to admins, not customers.',
        variant: 'tip',
      },
      stock: {
        field: 'stock',
        label: 'Stock',
        help: 'Enable stock tracking to monitor inventory levels and receive low stock alerts.',
        variant: 'warning',
      },
      category: {
        field: 'category',
        label: 'Category',
        help: 'Organize products into categories for easier navigation on the POS terminal.',
        variant: 'info',
      },
    },
  },

  // Customers Page
  customers: {
    page: 'customers',
    title: 'Customers Help',
    description: 'Manage customer information and loyalty programs.',
    tips: [
      'Collect customer phone numbers to identify them quickly at the POS.',
      'Use customer segments to target specific groups with promotions.',
      'Enable loyalty points to reward repeat customers.',
      'Track customer purchase history to personalize service.',
    ],
    commonIssues: [
      {
        problem: 'Customer not found',
        solution: 'Check if the customer is registered in your outlet. Customers can be shared across outlets.',
      },
      {
        problem: 'Loyalty points not updating',
        solution: 'Verify that the loyalty program is active and the earning rules are configured correctly.',
      },
    ],
    fields: {
      name: {
        field: 'name',
        label: 'Customer Name',
        help: 'Enter the customer\'s full name for identification and receipts.',
        variant: 'info',
      },
      phone: {
        field: 'phone',
        label: 'Phone Number',
        help: 'Used to identify customers at the POS and send notifications. Format: 08xx-xxxx-xxxx',
        variant: 'tip',
      },
      email: {
        field: 'email',
        label: 'Email',
        help: 'Optional: Used for sending receipts and promotional emails.',
        variant: 'info',
      },
      address: {
        field: 'address',
        label: 'Address',
        help: 'Delivery address for online orders or home delivery services.',
        variant: 'info',
      },
    },
  },

  // Employees Page
  employees: {
    page: 'employees',
    title: 'Employees Help',
    description: 'Manage staff accounts, roles, and permissions.',
    tips: [
      'Each employee needs a unique 6-digit PIN for POS access.',
      'Set appropriate roles to control access to sensitive features.',
      'Use shift tracking to monitor employee working hours.',
      'Regularly review audit logs to track employee actions.',
    ],
    commonIssues: [
      {
        problem: 'Employee cannot login',
        solution: 'Check if the employee account is active and assigned to the correct outlet.',
      },
      {
        problem: 'Access denied to features',
        solution: 'Review the employee\'s role and permissions settings.',
      },
    ],
    fields: {
      name: {
        field: 'name',
        label: 'Employee Name',
        help: 'Full name for identification and reports.',
        variant: 'info',
      },
      email: {
        field: 'email',
        label: 'Email',
        help: 'Used for account login and notifications. Must be unique.',
        variant: 'warning',
      },
      pin: {
        field: 'pin',
        label: 'PIN',
        help: '6-digit numeric code for POS access. Choose a secure code that\'s easy to remember.',
        variant: 'warning',
      },
      role: {
        field: 'role',
        label: 'Role',
        help: 'Determines the employee\'s access level and permissions.',
        variant: 'info',
      },
      outlet: {
        field: 'outlet',
        label: 'Outlet Assignment',
        help: 'Assign the employee to a specific outlet. Unassigned employees can access all outlets.',
        variant: 'tip',
      },
    },
  },

  // Orders Page
  orders: {
    page: 'orders',
    title: 'Orders Help',
    description: 'Manage dine-in orders, table assignments, and order status.',
    tips: [
      'Use table numbers to organize dine-in orders efficiently.',
      'Update order status to keep kitchen staff informed.',
      'Merge tables for large groups or split bills for separate payments.',
      'Use the hold feature to temporarily pause an order.',
    ],
    commonIssues: [
      {
        problem: 'Order not visible in KDS',
        solution: 'Check if the order is confirmed and assigned to a kitchen station.',
      },
      {
        problem: 'Cannot modify order',
        solution: 'Orders that are already being prepared cannot be modified. Void and create a new order.',
      },
    ],
    fields: {
      table: {
        field: 'table',
        label: 'Table Number',
        help: 'Assign a table number for dine-in orders. This helps staff locate customers.',
        variant: 'info',
      },
      guestCount: {
        field: 'guestCount',
        label: 'Guest Count',
        help: 'Number of guests dining. Useful for capacity planning and service.',
        variant: 'tip',
      },
      notes: {
        field: 'notes',
        label: 'Order Notes',
        help: 'Special instructions for the kitchen or serving staff (e.g., allergies, preferences).',
        variant: 'warning',
      },
    },
  },

  // POS Terminal
  pos: {
    page: 'pos',
    title: 'POS Terminal Help',
    description: 'Quick guide for processing transactions at the Point of Sale.',
    tips: [
      'Search products by name, SKU, or scan barcode.',
      'Use function keys for quick actions: F1=Search, F2=Hold, F3=Discount, F9=Pay.',
      'Press ⌘K (Mac) or Ctrl+K (Windows) to open the command palette.',
      'Double-click a product to edit quantity or price before adding to cart.',
    ],
    commonIssues: [
      {
        problem: 'Product not found',
        solution: 'Check spelling, verify the product is active, or try scanning the barcode.',
      },
      {
        problem: 'Payment failed',
        solution: 'Check if the payment gateway is connected and try a different payment method.',
      },
    ],
    fields: {
      search: {
        field: 'search',
        label: 'Product Search',
        help: 'Type to search products by name, SKU, or barcode. Use arrow keys to navigate.',
        variant: 'tip',
      },
      customer: {
        field: 'customer',
        label: 'Customer',
        help: 'Attach a customer to earn loyalty points and track purchase history.',
        variant: 'info',
      },
      discount: {
        field: 'discount',
        label: 'Discount',
        help: 'Apply a percentage or fixed amount discount. Manager approval may be required.',
        variant: 'warning',
      },
      notes: {
        field: 'notes',
        label: 'Order Notes',
        help: 'Add special instructions for this order (visible on kitchen display).',
        variant: 'info',
      },
    },
  },

  // Settings
  settings: {
    page: 'settings',
    title: 'Settings Help',
    description: 'Configure your business settings, outlets, and system preferences.',
    tips: [
      'Set up your business details to appear correctly on receipts and reports.',
      'Configure tax rates according to your local regulations.',
      'Customize receipt templates with your branding and contact information.',
      'Set operating hours to track business performance accurately.',
    ],
    commonIssues: [
      {
        problem: 'Tax calculation incorrect',
        solution: 'Verify tax rates are set correctly for each outlet and product category.',
      },
      {
        problem: 'Receipt not printing',
        solution: 'Check printer connection and receipt template settings.',
      },
    ],
    fields: {
      businessName: {
        field: 'businessName',
        label: 'Business Name',
        help: 'Your business name will appear on receipts, invoices, and reports.',
        variant: 'info',
      },
      taxRate: {
        field: 'taxRate',
        label: 'Tax Rate',
        help: 'Set the default tax rate as a percentage (e.g., 11 for 11%). Check local tax regulations.',
        variant: 'warning',
      },
      currency: {
        field: 'currency',
        label: 'Currency',
        help: 'Choose your preferred currency display format: dot (Rp 100.000) or comma (Rp 100,000).',
        variant: 'info',
      },
      receiptHeader: {
        field: 'receiptHeader',
        label: 'Receipt Header',
        help: 'Custom text that appears at the top of receipts, such as your business tagline.',
        variant: 'tip',
      },
    },
  },
};

/**
 * Get help content for a specific page
 */
export function getPageHelp(pageKey: string): PageHelp | undefined {
  return helpContent[pageKey];
}

/**
 * Get field help for a specific page and field
 */
export function getFieldHelp(pageKey: string, fieldKey: string): FieldHelp | undefined {
  const pageHelp = helpContent[pageKey];
  return pageHelp?.fields?.[fieldKey];
}

/**
 * Get all tips for a specific page
 */
export function getPageTips(pageKey: string): string[] {
  return helpContent[pageKey]?.tips || [];
}

/**
 * Get common issues for a specific page
 */
export function getCommonIssues(pageKey: string): Array<{ problem: string; solution: string }> {
  return helpContent[pageKey]?.commonIssues || [];
}
