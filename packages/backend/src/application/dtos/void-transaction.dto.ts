import { IsString, IsNotEmpty } from 'class-validator';

export class VoidTransactionDto {
  @IsString()
  @IsNotEmpty()
  transactionId!: string;

  @IsString()
  @IsNotEmpty()
  reason!: string;
}
