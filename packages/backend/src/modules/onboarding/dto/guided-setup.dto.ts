import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsBoolean,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

class BusinessProfileDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;
}

class TemplateSectionsDto {
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

  @IsBoolean()
  @IsOptional()
  units?: boolean;
}

class TemplateConfigDto {
  @ValidateNested()
  @Type(() => TemplateSectionsDto)
  sections!: TemplateSectionsDto;
}

class EmployeeDto {
  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  pin!: string;

  @IsString()
  @IsOptional()
  role?: string;
}

export class GuidedSetupDto {
  @ValidateNested()
  @Type(() => BusinessProfileDto)
  @IsOptional()
  business?: BusinessProfileDto;

  @IsString()
  @IsOptional()
  businessType?: string;

  @ValidateNested()
  @Type(() => TemplateConfigDto)
  @IsOptional()
  template?: TemplateConfigDto;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  paymentMethods?: string[];

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  taxRate?: number;

  @ValidateNested()
  @Type(() => EmployeeDto)
  @IsOptional()
  employee?: EmployeeDto;
}
