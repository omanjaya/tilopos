# Settings Repositories

This directory contains refactored settings repositories, split by domain responsibility for better maintainability and single responsibility principle.

## Overview

The original `PrismaSettingsRepository` (905 lines) has been refactored into 8 specialized repositories, each handling a specific aspect of settings management. A main `SettingsRepository` acts as a facade that delegates to these specialized repositories while maintaining the original interface.

## Architecture

```
SettingsRepository (Facade)
├── BusinessSettingsRepository     - Business CRUD operations
├── OutletSettingsRepository       - Outlet CRUD operations
├── ModifierGroupRepository        - Modifier groups management
├── LoyaltySettingsRepository      - Loyalty programs & tiers
├── TaxConfigurationRepository     - Tax configuration (business & outlet)
├── ReceiptTemplateRepository      - Receipt templates & formatting
├── OperatingHoursRepository       - Operating hours & schedules
└── PaymentMethodRepository        - Payment methods configuration
```

## Repository Breakdown

### 1. BusinessSettingsRepository (47 lines)
**Responsibility**: Business entity CRUD operations

**Methods**:
- `findBusiness(businessId)` - Find business by ID
- `updateBusiness(businessId, data)` - Update business information

**Data Managed**:
- Business name, phone, email, address
- Business-level settings JSON

---

### 2. OutletSettingsRepository (96 lines)
**Responsibility**: Outlet entity CRUD operations

**Methods**:
- `findOutlets(businessId)` - Find all outlets for a business
- `findOutletById(id)` - Find specific outlet
- `createOutlet(data)` - Create new outlet
- `updateOutlet(id, data)` - Update outlet information
- `deleteOutlet(id)` - Soft delete outlet

**Data Managed**:
- Outlet name, code, address, phone
- Tax rate and service charge (outlet-level)
- Outlet settings JSON

**Note**: Handles Decimal to number conversion for `taxRate` and `serviceCharge`

---

### 3. ModifierGroupRepository (87 lines)
**Responsibility**: Product modifier groups management

**Methods**:
- `findModifierGroups(businessId)` - Find all modifier groups
- `createModifierGroup(data)` - Create modifier group with modifiers
- `updateModifierGroup(id, data)` - Update modifier group
- `deleteModifierGroup(id)` - Soft delete modifier group

**Data Managed**:
- Modifier group name, selection type
- Min/max selection, required flag
- Associated modifiers

**Note**: Uses `createdAt` as `updatedAt` since schema lacks updatedAt field

---

### 4. LoyaltySettingsRepository (169 lines)
**Responsibility**: Loyalty programs and tier management

**Methods**:
- `findLoyaltyProgram(businessId)` - Find loyalty program
- `createLoyaltyProgram(data)` - Create loyalty program
- `updateLoyaltyProgram(businessId, data)` - Update loyalty program
- `findLoyaltyTiers(businessId)` - Find all loyalty tiers
- `createLoyaltyTier(data)` - Create loyalty tier
- `updateLoyaltyTier(id, data)` - Update loyalty tier
- `deleteLoyaltyTier(id)` - Soft delete tier

**Data Managed**:
- Program: name, points, redemption, expiry
- Tiers: name, min points/spent, multiplier, benefits, sort order

**Note**: Handles Decimal conversion for financial fields

---

### 5. TaxConfigurationRepository (164 lines)
**Responsibility**: Tax and service charge configuration

**Methods**:
**Outlet-level**:
- `getTaxConfig(outletId)` - Get outlet tax config
- `updateTaxConfig(outletId, data)` - Update outlet tax config

**Business-level**:
- `getBusinessTaxConfig(businessId)` - Get business tax config
- `updateBusinessTaxConfig(businessId, data)` - Update business tax config

**Data Managed**:
- Outlet: taxRate, serviceCharge, taxInclusive, taxName, taxNumber
- Business: taxEnabled, taxRate, taxName, taxInclusive, serviceChargeEnabled, serviceChargeRate

**Note**: Supports both legacy (outlet settings JSON) and new format (business settings JSON)

---

### 6. ReceiptTemplateRepository (188 lines)
**Responsibility**: Receipt template and formatting configuration

**Methods**:
**Legacy format**:
- `getReceiptTemplate(outletId)` - Get receipt template
- `updateReceiptTemplate(outletId, data)` - Update receipt template

**New format**:
- `getOutletReceiptTemplate(outletId)` - Get outlet receipt template
- `updateOutletReceiptTemplate(outletId, data)` - Update outlet receipt template

**Data Managed**:
- Header, footer text
- Logo, QR code, tax details display flags
- Paper size (58mm/80mm), font size
- Custom messages, address/phone display

**Note**: Maintains backward compatibility with legacy format

---

### 7. OperatingHoursRepository (132 lines)
**Responsibility**: Store operating hours and schedules

**Methods**:
**Legacy format**:
- `getOperatingHours(outletId)` - Get operating hours
- `updateOperatingHours(outletId, data)` - Update operating hours

**New format**:
- `getOutletOperatingHours(outletId)` - Get outlet operating hours
- `updateOutletOperatingHours(outletId, data)` - Update outlet operating hours

**Data Managed**:
- Day of week (0-6)
- Open/close times (HH:mm format)
- Break times (legacy)
- isClosed flag (new format)

**Default**: Mon-Sat 08:00-22:00, Sunday closed

---

### 8. PaymentMethodRepository (236 lines)
**Responsibility**: Payment method configuration and CRUD

**Methods**:
**Legacy format**:
- `getPaymentMethods(businessId)` - Get payment methods config
- `updatePaymentMethods(businessId, data)` - Update payment methods

**New CRUD API**:
- `getBusinessPaymentMethods(businessId)` - Get all payment methods
- `createBusinessPaymentMethod(businessId, data)` - Create payment method
- `updateBusinessPaymentMethod(businessId, id, data)` - Update payment method
- `deleteBusinessPaymentMethod(businessId, id)` - Soft delete payment method

**Data Managed**:
- Payment method name, type, status
- Processing fees (percentage or fixed)
- Min/max amounts, sort order
- Method-specific settings

**Default Methods**: Cash, QRIS, Card, GoPay, OVO, DANA, ShopeePay, Bank Transfer

---

### 9. SettingsRepository (241 lines)
**Responsibility**: Facade that delegates to specialized repositories

This is the main repository that implements `ISettingsRepository` interface and maintains backward compatibility. It simply delegates all method calls to the appropriate specialized repository.

**Pattern**: Facade / Delegation Pattern

**Benefits**:
- Single entry point for settings operations
- Maintains existing API contract
- Zero breaking changes for existing code
- Easy to add new specialized repositories

---

## File Sizes Comparison

| Repository | Lines | Reduction |
|------------|-------|-----------|
| **Original PrismaSettingsRepository** | **905** | **-** |
| BusinessSettingsRepository | 47 | -94.8% |
| OutletSettingsRepository | 96 | -89.4% |
| ModifierGroupRepository | 87 | -90.4% |
| LoyaltySettingsRepository | 169 | -81.3% |
| TaxConfigurationRepository | 164 | -81.9% |
| ReceiptTemplateRepository | 188 | -79.2% |
| OperatingHoursRepository | 132 | -85.4% |
| PaymentMethodRepository | 236 | -73.9% |
| SettingsRepository (Facade) | 241 | -73.4% |
| **Total (all new files)** | **1,360** | **+50.3%** |
| **Average per file** | **151** | **-83.3%** |

**Notes**:
- While total lines increased by 50%, this is due to:
  - Better documentation (JSDoc comments)
  - Clearer separation of concerns
  - Improved maintainability
- Each individual file is 73-95% smaller than the original
- Average file size: 151 lines (target was < 200)

---

## Migration Guide

### Before (Old Pattern)
```typescript
import { PrismaSettingsRepository } from '../../infrastructure/repositories/prisma-settings.repository';

@Module({
  providers: [
    { provide: REPOSITORY_TOKENS.SETTINGS, useClass: PrismaSettingsRepository }
  ],
})
```

### After (New Pattern)
```typescript
import {
  SettingsRepository,
  BusinessSettingsRepository,
  OutletSettingsRepository,
  ModifierGroupRepository,
  LoyaltySettingsRepository,
  TaxConfigurationRepository,
  ReceiptTemplateRepository,
  OperatingHoursRepository,
  PaymentMethodRepository,
} from '../../infrastructure/repositories/settings';

@Module({
  providers: [
    // Specialized repositories
    BusinessSettingsRepository,
    OutletSettingsRepository,
    ModifierGroupRepository,
    LoyaltySettingsRepository,
    TaxConfigurationRepository,
    ReceiptTemplateRepository,
    OperatingHoursRepository,
    PaymentMethodRepository,
    // Main facade
    { provide: REPOSITORY_TOKENS.SETTINGS, useClass: SettingsRepository },
  ],
})
```

**Note**: Existing code using `@Inject(REPOSITORY_TOKENS.SETTINGS)` requires NO changes.

---

## Usage Examples

### Business Settings
```typescript
// Inject the main repository
constructor(
  @Inject(REPOSITORY_TOKENS.SETTINGS)
  private readonly settingsRepo: ISettingsRepository,
) {}

// Use as before - no changes needed
const business = await this.settingsRepo.findBusiness(businessId);
await this.settingsRepo.updateBusiness(businessId, { name: 'New Name' });
```

### Outlet Settings
```typescript
const outlets = await this.settingsRepo.findOutlets(businessId);
const outlet = await this.settingsRepo.createOutlet({
  businessId,
  name: 'Main Branch',
  taxRate: 11,
  serviceCharge: 5,
});
```

### Tax Configuration
```typescript
// Outlet tax config
const taxConfig = await this.settingsRepo.getTaxConfig(outletId);
await this.settingsRepo.updateTaxConfig(outletId, {
  taxRate: 11,
  taxInclusive: false,
  taxName: 'PPN',
});

// Business tax config
const businessTax = await this.settingsRepo.getBusinessTaxConfig(businessId);
await this.settingsRepo.updateBusinessTaxConfig(businessId, {
  taxEnabled: true,
  taxRate: 11,
});
```

### Payment Methods
```typescript
// Legacy format
const methods = await this.settingsRepo.getPaymentMethods(businessId);

// New CRUD API
const businessMethods = await this.settingsRepo.getBusinessPaymentMethods(businessId);
const newMethod = await this.settingsRepo.createBusinessPaymentMethod(businessId, {
  name: 'LinkAja',
  type: 'ewallet',
  processingFee: 1.5,
});
```

---

## Design Principles

### 1. Single Responsibility Principle
Each repository handles ONE specific domain of settings:
- Business → BusinessSettingsRepository
- Outlets → OutletSettingsRepository
- Tax → TaxConfigurationRepository
- etc.

### 2. Facade Pattern
`SettingsRepository` acts as a facade that:
- Maintains the original `ISettingsRepository` interface
- Delegates to specialized repositories
- Ensures zero breaking changes

### 3. Dependency Injection
All specialized repositories are:
- Decorated with `@Injectable()`
- Injected into `SettingsRepository` via constructor
- Registered in the module providers

### 4. Backward Compatibility
- Legacy API methods preserved (e.g., `getOperatingHours`)
- New API methods added (e.g., `getOutletOperatingHours`)
- Both formats supported during migration

---

## Testing Strategy

### Unit Tests
Each repository should have its own test file:
```
settings/
├── business-settings.repository.spec.ts
├── outlet-settings.repository.spec.ts
├── modifier-group.repository.spec.ts
├── loyalty-settings.repository.spec.ts
├── tax-configuration.repository.spec.ts
├── receipt-template.repository.spec.ts
├── operating-hours.repository.spec.ts
├── payment-method.repository.spec.ts
└── settings.repository.spec.ts
```

### Test Coverage
- Mock PrismaService for unit tests
- Test each method independently
- Test error cases (NotFoundException)
- Test Decimal to number conversion
- Test default values
- Test soft deletes

---

## Future Improvements

### 1. Extract Shared Utilities
Some repositories have similar patterns that could be extracted:
- Decimal conversion helper
- Settings JSON merger
- Default value generator

### 2. Add Validation
Consider adding validation layer:
- Tax rate: 0-100%
- Operating hours: valid time format
- Payment fee: non-negative

### 3. Add Caching
For frequently accessed settings:
- Tax configuration
- Payment methods
- Operating hours

### 4. Add Audit Logging
Track changes to critical settings:
- Tax configuration changes
- Payment method updates
- Business information updates

### 5. Type Safety Improvements
- Replace `Record<string, unknown>` with proper types
- Create DTOs for settings JSON structures
- Add Zod schemas for runtime validation

---

## Maintenance Notes

### Adding New Settings
1. Create new specialized repository in `settings/` directory
2. Add repository to `SettingsRepository` constructor
3. Delegate methods in `SettingsRepository`
4. Register in module providers
5. Export from `index.ts`
6. Update documentation

### Modifying Existing Settings
1. Update the specialized repository
2. No changes needed in `SettingsRepository` (delegation)
3. Update tests
4. Update documentation

### Deprecating Old Formats
1. Mark legacy methods as `@deprecated` in JSDoc
2. Add migration guide to README
3. Keep backward compatibility for 2-3 versions
4. Remove after deprecation period

---

## Related Files

- **Interface**: `/domain/interfaces/repositories/settings.repository.ts`
- **Module**: `/modules/settings/settings.module.ts`
- **Controller**: `/modules/settings/settings.controller.ts`
- **Original**: `/infrastructure/repositories/prisma-settings.repository.ts` (deprecated)

---

## Contributors

Refactored from original `PrismaSettingsRepository` to improve:
- Code organization
- Maintainability
- Testability
- Single Responsibility Principle adherence

**Refactoring Date**: 2026-02-06
**Refactoring Type**: Repository Split
**Pattern**: Facade + Specialized Repositories
