# Settings Repository Migration Guide

This document provides step-by-step instructions for migrating from the old `PrismaSettingsRepository` to the new refactored settings repositories.

## Overview

The `PrismaSettingsRepository` (905 lines) has been refactored into 8 specialized repositories plus a main facade repository. This migration is **backward compatible** and requires minimal changes to existing code.

## Migration Status

- **Status**: COMPLETED
- **Backward Compatibility**: YES (100%)
- **Breaking Changes**: NONE
- **Required Code Changes**: Minimal (module providers only)

## What Changed

### Before
```
prisma-settings.repository.ts (905 lines)
```

### After
```
settings/
├── business-settings.repository.ts (45 lines)
├── outlet-settings.repository.ts (94 lines)
├── modifier-group.repository.ts (86 lines)
├── loyalty-settings.repository.ts (168 lines)
├── tax-configuration.repository.ts (168 lines)
├── receipt-template.repository.ts (198 lines)
├── operating-hours.repository.ts (134 lines)
├── payment-method.repository.ts (292 lines)
├── settings.repository.ts (246 lines) <- Main facade
└── index.ts (16 lines)
```

## Step-by-Step Migration

### Step 1: Update Module Imports

**File**: `src/modules/settings/settings.module.ts`

**Before**:
```typescript
import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { REPOSITORY_TOKENS } from '../../infrastructure/repositories/repository.tokens';
import { PrismaSettingsRepository } from '../../infrastructure/repositories/prisma-settings.repository';

@Module({
  controllers: [SettingsController],
  providers: [
    { provide: REPOSITORY_TOKENS.SETTINGS, useClass: PrismaSettingsRepository }
  ],
})
export class SettingsModule {}
```

**After**:
```typescript
import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { REPOSITORY_TOKENS } from '../../infrastructure/repositories/repository.tokens';
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
  controllers: [SettingsController],
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
    // Main facade repository
    {
      provide: REPOSITORY_TOKENS.SETTINGS,
      useClass: SettingsRepository,
    },
  ],
})
export class SettingsModule {}
```

### Step 2: No Changes Required in Services/Controllers

**Good news**: All existing code using `@Inject(REPOSITORY_TOKENS.SETTINGS)` works without any changes!

```typescript
// This code STILL WORKS - no changes needed
constructor(
  @Inject(REPOSITORY_TOKENS.SETTINGS)
  private readonly settingsRepo: ISettingsRepository,
) {}

// All existing method calls work exactly the same
const business = await this.settingsRepo.findBusiness(businessId);
const outlets = await this.settingsRepo.findOutlets(businessId);
const taxConfig = await this.settingsRepo.getTaxConfig(outletId);
```

### Step 3: Verify Build

Run the build to ensure everything compiles:

```bash
cd packages/backend
npm run build
```

Expected output: Build should succeed with no errors.

### Step 4: Run Tests

```bash
npm run test
```

All existing tests should pass without modifications.

### Step 5: (Optional) Deprecate Old File

Once migration is verified, you can optionally deprecate the old file:

```typescript
// prisma-settings.repository.ts
/**
 * @deprecated Use the new settings/ directory repositories instead.
 * This file will be removed in a future version.
 * See: src/infrastructure/repositories/settings/
 */
@Injectable()
export class PrismaSettingsRepository implements ISettingsRepository {
  // ... existing code
}
```

## Verification Checklist

- [ ] Module imports updated to use new repositories
- [ ] All specialized repositories added to providers array
- [ ] TypeScript compilation passes (`npm run build`)
- [ ] ESLint passes (`npm run lint`)
- [ ] Unit tests pass (`npm run test`)
- [ ] E2E tests pass (`npm run test:e2e`)
- [ ] Application starts successfully (`npm run dev`)
- [ ] All settings endpoints work correctly

## Rollback Plan

If you need to rollback for any reason:

1. Revert `settings.module.ts` to use `PrismaSettingsRepository`
2. The old file is still present and functional
3. No data changes were made (repository pattern unchanged)

## Advanced Usage (Optional)

### Using Specialized Repositories Directly

If you need to use a specialized repository directly (for testing, optimization, etc.):

```typescript
import { TaxConfigurationRepository } from '../../infrastructure/repositories/settings';

@Injectable()
export class TaxService {
  constructor(
    // Direct injection of specialized repository
    private readonly taxRepo: TaxConfigurationRepository,
  ) {}

  async calculateTax(outletId: string, amount: number) {
    const config = await this.taxRepo.getTaxConfig(outletId);
    // ... tax calculation logic
  }
}
```

**Note**: In most cases, you should still use the main facade repository through `REPOSITORY_TOKENS.SETTINGS`.

## Benefits After Migration

### 1. Better Code Organization
- Each repository handles one specific domain
- Easy to locate and modify specific functionality
- Clear separation of concerns

### 2. Improved Maintainability
- Smaller files (45-292 lines vs 905 lines)
- Easier to understand and modify
- Less risk of merge conflicts

### 3. Better Testability
- Each repository can be tested independently
- Smaller test files, focused on specific functionality
- Easier to mock dependencies

### 4. Better Documentation
- Each repository is well-documented
- Clear JSDoc comments for all methods
- README with usage examples

### 5. Future Extensibility
- Easy to add new specialized repositories
- No impact on existing code when adding features
- Better support for plugin architecture

## Common Issues & Solutions

### Issue 1: "Cannot find module 'settings'"

**Solution**: Make sure you're importing from the correct path:
```typescript
// Correct
import { SettingsRepository } from '../../infrastructure/repositories/settings';

// Incorrect
import { SettingsRepository } from '../../infrastructure/repositories/settings/settings.repository';
```

### Issue 2: Dependency injection fails

**Solution**: Ensure all specialized repositories are registered in module providers:
```typescript
providers: [
  BusinessSettingsRepository,  // Don't forget these!
  OutletSettingsRepository,
  // ... all 8 specialized repositories
  { provide: REPOSITORY_TOKENS.SETTINGS, useClass: SettingsRepository },
],
```

### Issue 3: TypeScript compilation errors

**Solution**: Run `npm install` to ensure all dependencies are installed, then rebuild:
```bash
npm install
npm run build
```

## Performance Considerations

### No Performance Impact
The refactoring uses the **Facade Pattern** with simple delegation:
- No additional database queries
- No additional processing overhead
- Same Prisma queries as before
- Method calls are direct (no loops or conditionals)

### Memory Usage
Slightly higher memory usage due to 8 additional class instances, but negligible:
- Old: 1 repository instance
- New: 9 repository instances (1 facade + 8 specialized)
- Impact: ~8 additional small objects in memory (< 1KB total)

## Testing the Migration

### Manual Testing Steps

1. **Test Business Settings**
   ```bash
   curl http://localhost:3001/api/v1/settings/business
   ```

2. **Test Outlets**
   ```bash
   curl http://localhost:3001/api/v1/settings/outlets
   ```

3. **Test Tax Configuration**
   ```bash
   curl http://localhost:3001/api/v1/settings/outlets/{id}/tax-config
   ```

4. **Test Payment Methods**
   ```bash
   curl http://localhost:3001/api/v1/settings/payment-methods
   ```

5. **Test Operating Hours**
   ```bash
   curl http://localhost:3001/api/v1/settings/outlets/{id}/operating-hours
   ```

### Automated Testing

```bash
# Run all tests
npm run test

# Run specific test suite
npm run test -- settings

# Run with coverage
npm run test:cov
```

## Support

If you encounter any issues during migration:

1. Check this migration guide
2. Check the main README in `settings/README.md`
3. Review the JSDoc comments in each repository
4. Verify all providers are registered in the module

## Timeline

- **Refactoring Date**: 2026-02-06
- **Migration Deadline**: None (backward compatible)
- **Deprecation Date**: TBD (will be announced)
- **Removal Date**: TBD (will be announced)

## Related Documentation

- [Settings Repositories README](./README.md) - Detailed documentation
- [Repository Patterns](../../../docs/architecture/repository-pattern.md) - Architecture guide
- [Testing Guide](../../../docs/testing/repository-testing.md) - Testing patterns
