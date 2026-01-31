---
name: nestjs-module-scaffold
description: "Scaffolds a complete NestJS module with controller, service, use cases, DTOs, repository interface, and Prisma implementation. Use when creating a new feature module or backend service."
---

# NestJS Module Scaffold

## Goal
Generate a complete NestJS module following the MokaPOS Clean Architecture pattern.

## Instructions

1. Determine the module name from user request (e.g., "customers", "promotions")
2. Read `Docs/02-LAYERED-ARCHITECTURE.md` for the architecture pattern
3. Read `Docs/05-DATABASE-SCHEMA.md` for relevant database tables
4. Generate the following files:

### Module Structure
```
src/modules/{module-name}/
├── {module-name}.module.ts
├── {module-name}.controller.ts
├── {sub-feature}/
│   ├── {sub-feature}.service.ts
│   └── ...
```

### Application Layer
```
src/application/
├── use-cases/{module-name}/
│   ├── Create{Entity}UseCase.ts
│   ├── Update{Entity}UseCase.ts
│   ├── Delete{Entity}UseCase.ts
│   ├── Get{Entity}UseCase.ts
│   └── List{Entity}UseCase.ts
├── dtos/
│   ├── {Entity}DTO.ts
│   ├── Create{Entity}Input.ts
│   └── Update{Entity}Input.ts
└── mappers/
    └── {Entity}Mapper.ts
```

### Domain Layer
```
src/domain/
├── entities/{Entity}.ts
├── interfaces/repositories/I{Entity}Repository.ts
└── exceptions/{Entity}NotFoundException.ts
```

### Infrastructure Layer
```
src/infrastructure/database/repositories/
└── Prisma{Entity}Repository.ts
```

## Template: Module File
```typescript
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { {Entity}Controller } from './{module-name}.controller';
import { Create{Entity}UseCase } from '../../application/use-cases/{module-name}/Create{Entity}UseCase';
// ... other use cases

@Module({
  imports: [DatabaseModule],
  controllers: [{Entity}Controller],
  providers: [
    Create{Entity}UseCase,
    // ... other use cases
    {
      provide: 'I{Entity}Repository',
      useClass: Prisma{Entity}Repository,
    },
  ],
  exports: [],
})
export class {Entity}Module {}
```

## Template: Use Case
```typescript
import { Injectable, Inject } from '@nestjs/common';
import { I{Entity}Repository } from '../../../domain/interfaces/repositories/I{Entity}Repository';

@Injectable()
export class Create{Entity}UseCase {
  constructor(
    @Inject('I{Entity}Repository')
    private readonly repository: I{Entity}Repository,
  ) {}

  async execute(input: Create{Entity}Input): Promise<{Entity}Output> {
    // 1. Validate input
    // 2. Apply business rules
    // 3. Persist via repository
    // 4. Publish domain event
    // 5. Return output DTO
  }
}
```

## Template: Repository Interface
```typescript
export interface I{Entity}Repository {
  findById(id: string): Promise<{Entity} | null>;
  findAll(filter: {Entity}Filter): Promise<{Entity}[]>;
  save(entity: {Entity}): Promise<void>;
  update(entity: {Entity}): Promise<void>;
  delete(id: string): Promise<void>;
}
```

## Constraints
- WAJIB follow Clean Architecture — domain tidak import NestJS atau Prisma
- WAJIB multi-tenancy — semua query filter by `business_id`
- WAJIB menggunakan UUID sebagai primary key
- WAJIB buat interface di domain, implement di infrastructure
- Controller harus ada auth guard dan role guard
