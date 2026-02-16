import * as fs from 'fs';
import * as path from 'path';

/**
 * Auth data for a single role, populated during Suite 0.
 */
export interface RoleAuth {
  accessToken: string;
  employeeId: string;
  employeeName: string;
  role: string;
  businessId: string;
  outletId: string | null;
}

/**
 * Shared mutable context that persists across all test suites.
 * Uses a temp JSON file to share state between Jest test files
 * (each file gets its own module scope even with maxWorkers: 1).
 */
export interface TestContext {
  auth: {
    owner?: RoleAuth;
    manager?: RoleAuth;
    supervisor?: RoleAuth;
    cashier?: RoleAuth;
    kitchen?: RoleAuth;
    inventory?: RoleAuth;
    superAdmin?: RoleAuth;
  };
  businessId?: string;
  outletId?: string;
  created: {
    productIds: string[];
    categoryIds: string[];
    customerIds: string[];
    tableIds: string[];
    ingredientIds: string[];
    transactionIds: string[];
    orderIds: string[];
    shiftIds: string[];
    [key: string]: string[];
  };
}

const CONTEXT_FILE = path.join(__dirname, '..', '.test-context.json');

function createEmptyContext(): TestContext {
  return {
    auth: {},
    created: {
      productIds: [],
      categoryIds: [],
      customerIds: [],
      tableIds: [],
      ingredientIds: [],
      transactionIds: [],
      orderIds: [],
      shiftIds: [],
    },
  };
}

function loadContext(): TestContext {
  try {
    if (fs.existsSync(CONTEXT_FILE)) {
      const data = fs.readFileSync(CONTEXT_FILE, 'utf-8');
      return JSON.parse(data) as TestContext;
    }
  } catch {
    // Ignore parse errors, start fresh
  }
  return createEmptyContext();
}

/**
 * Save current context to disk so other test files can read it.
 * Call this after modifying testContext in any suite.
 */
export function saveContext(): void {
  fs.writeFileSync(CONTEXT_FILE, JSON.stringify(testContext, null, 2));
}

/**
 * Remove the persisted context file (call during teardown).
 */
export function cleanupContext(): void {
  try {
    if (fs.existsSync(CONTEXT_FILE)) {
      fs.unlinkSync(CONTEXT_FILE);
    }
  } catch {
    // Ignore
  }
}

// Load persisted context on module init
export const testContext: TestContext = loadContext();
