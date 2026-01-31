import { IsString, IsArray, ArrayMinSize, IsNotEmpty } from 'class-validator';

export class MergeBillDto {
  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  transactionIds!: string[];

  @IsString()
  @IsNotEmpty()
  paymentMethod!: string;
}
