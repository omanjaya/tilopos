# Clean Code Practices - TiloPOS

> **Version:** 1.0  
> **Last Updated:** January 2026

---

## 1. Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| **Classes** | PascalCase | `TransactionService`, `ProductRepository` |
| **Interfaces** | PascalCase with 'I' prefix | `ITransactionRepository` |
| **Functions** | camelCase, verb-first | `createTransaction`, `calculateDiscount` |
| **Variables** | camelCase | `totalAmount`, `customerName` |
| **Constants** | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| **Database Tables** | snake_case, plural | `transactions`, `product_variants` |
| **API Endpoints** | kebab-case | `/api/v1/transactions` |

### Boolean Naming
```typescript
const isActive = product.status === 'active';
const hasDiscount = discounts.length > 0;
const canRefund = transaction.isRefundable();
```

---

## 2. Function Design Principles

### Single Responsibility
```typescript
// GOOD - Each step is single responsibility
async process(input: CreateTransactionInput): Promise<Transaction> {
  const validatedInput = await this.validator.validate(input);
  const calculatedTotal = this.calculator.calculate(validatedInput);
  const transaction = await this.repository.save(calculatedTotal);
  await this.publishTransactionCreatedEvent(transaction);
  return transaction;
}
```

### Maximum 3-4 Parameters
```typescript
// Use object parameter for complex inputs
interface CreateProductInput {
  name: string;
  sku: string;
  price: number;
  category: string;
  description?: string;
}

function createProduct(input: CreateProductInput): Product { }
```

---

## 3. Error Handling

### Custom Error Classes
```typescript
export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly code: string;
}

export class EntityNotFoundError extends AppError {
  readonly statusCode = 404;
  readonly code = 'ENTITY_NOT_FOUND';
  
  constructor(entity: string, id: string) {
    super(`${entity} with id ${id} not found`);
  }
}

export class InsufficientStockError extends AppError {
  readonly statusCode = 400;
  readonly code = 'INSUFFICIENT_STOCK';
}
```

---

## 4. Type Safety

### Strict TypeScript
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

### Discriminated Unions
```typescript
type PaymentState =
  | { status: 'pending' }
  | { status: 'completed'; transactionId: string; receiptUrl: string }
  | { status: 'failed'; error: PaymentError };
```

---

## 5. Testing Standards

### Test Naming
```typescript
describe('TransactionService', () => {
  it('should create transaction with valid input', async () => { });
  it('should throw InsufficientStockError when stock is low', async () => { });
});
```

### Arrange-Act-Assert
```typescript
it('should calculate correct total', async () => {
  // Arrange
  const items = [createMockItem({ price: 10000, quantity: 2 })];
  
  // Act
  const result = calculateTotal(items);
  
  // Assert
  expect(result.total).toBe(20000);
});
```

---

## 6. Code Review Checklist

- [ ] Follows naming conventions
- [ ] No `any` types
- [ ] Functions under 30 lines
- [ ] Proper error handling
- [ ] Unit tests written
- [ ] No magic numbers
- [ ] No console.log

---

> **Next:** [04-SHARED-COMPONENTS.md](./04-SHARED-COMPONENTS.md)
