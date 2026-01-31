---
name: api-endpoint-scaffold
description: "Scaffolds REST API endpoints with NestJS controllers, request/response DTOs, validation, authentication guards, and Swagger documentation. Use when creating new API routes or endpoints."
---

# API Endpoint Scaffold

## Goal
Generate a complete REST API endpoint set for a resource following MokaPOS conventions.

## Instructions

1. Determine the resource name and required operations
2. Read existing controllers in `src/modules/` for pattern reference
3. Generate controller, DTOs, and wire up to existing use cases

## Standard CRUD Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/{resource}` | List with pagination & filter |
| GET | `/api/v1/{resource}/:id` | Get by ID |
| POST | `/api/v1/{resource}` | Create |
| PATCH | `/api/v1/{resource}/:id` | Update (partial) |
| DELETE | `/api/v1/{resource}/:id` | Soft delete |

## Controller Template
```typescript
import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';

@ApiTags('{Resource}')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/{resource}')
export class {Resource}Controller {
  constructor(
    private readonly createUseCase: Create{Resource}UseCase,
    private readonly listUseCase: List{Resource}UseCase,
    private readonly getUseCase: Get{Resource}UseCase,
    private readonly updateUseCase: Update{Resource}UseCase,
    private readonly deleteUseCase: Delete{Resource}UseCase,
  ) {}

  @Post()
  @Roles('owner', 'manager')
  @ApiOperation({ summary: 'Create {resource}' })
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: Create{Resource}Dto,
  ) {
    return { data: await this.createUseCase.execute({ ...dto, businessId: user.businessId }) };
  }

  @Get()
  @Roles('owner', 'manager', 'cashier')
  @ApiOperation({ summary: 'List {resource}' })
  async list(
    @CurrentUser() user: AuthUser,
    @Query() query: Query{Resource}Dto,
  ) {
    const result = await this.listUseCase.execute({ ...query, businessId: user.businessId });
    return { data: result.items, meta: { total: result.total, page: query.page, limit: query.limit } };
  }

  @Get(':id')
  @Roles('owner', 'manager', 'cashier')
  @ApiOperation({ summary: 'Get {resource} by ID' })
  async get(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return { data: await this.getUseCase.execute({ id, businessId: user.businessId }) };
  }

  @Patch(':id')
  @Roles('owner', 'manager')
  @ApiOperation({ summary: 'Update {resource}' })
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: Update{Resource}Dto,
  ) {
    return { data: await this.updateUseCase.execute({ id, ...dto, businessId: user.businessId }) };
  }

  @Delete(':id')
  @Roles('owner', 'manager')
  @ApiOperation({ summary: 'Delete {resource}' })
  async delete(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    await this.deleteUseCase.execute({ id, businessId: user.businessId });
    return { data: { success: true } };
  }
}
```

## DTO Templates

### Create DTO
```typescript
import { IsString, IsOptional, IsNumber, IsBoolean, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class Create{Resource}Dto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
```

### Query DTO (Pagination + Filter)
```typescript
import { IsOptional, IsInt, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class Query{Resource}Dto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
```

## Response Format
```json
// Single item
{ "data": { "id": "...", "name": "..." } }

// List with pagination
{
  "data": [...],
  "meta": { "total": 100, "page": 1, "limit": 20 }
}

// Error
{
  "statusCode": 400,
  "code": "INSUFFICIENT_STOCK",
  "message": "Not enough stock for product X",
  "details": {}
}
```

## Constraints
- WAJIB `@UseGuards(JwtAuthGuard, RolesGuard)` di setiap controller
- WAJIB `businessId` dari `@CurrentUser()`, BUKAN dari request body
- WAJIB validation via class-validator decorators
- WAJIB Swagger decorators untuk API documentation
- WAJIB versioning: `/api/v1/`
- Delete = soft delete (set `isActive = false`), BUKAN hard delete
