import { IsUUID, IsString, ValidateNested, IsBoolean, IsOptional } from 'class-validator';
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

  @IsBoolean()
  @IsOptional()
  units?: boolean;
}

export class ApplyTemplateDto {
  @IsUUID()
  outletId!: string;

  @IsString()
  typeCode!: string;

  @ValidateNested()
  @Type(() => ApplyTemplateSectionsDto)
  sections!: ApplyTemplateSectionsDto;
}
