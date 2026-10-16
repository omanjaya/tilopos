import { IsUUID, IsString, ValidateNested, IsBoolean, IsOptional, Matches } from 'class-validator';
import { Type } from 'class-transformer';

class ApplyTemplateSectionsDto {
  @IsBoolean()
  @IsOptional()
  categories?: boolean;

  @IsBoolean()
  @IsOptional()
  products?: boolean;

  @IsBoolean()
  @IsOptional()
  modifiers?: boolean;

  @IsBoolean()
  @IsOptional()
  tables?: boolean;

  /** Units are applied through each product's sellUnit; accepted for compatibility. */
  @IsBoolean()
  @IsOptional()
  units?: boolean;
}

export class ApplyTemplateDto {
  @IsUUID()
  outletId!: string;

  @IsString()
  @Matches(/^[a-z][a-z0-9_]{0,49}$/, { message: 'typeCode must be a business type code' })
  typeCode!: string;

  @ValidateNested()
  @Type(() => ApplyTemplateSectionsDto)
  sections!: ApplyTemplateSectionsDto;
}
