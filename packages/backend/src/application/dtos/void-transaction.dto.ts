import { IsString, IsNotEmpty, IsUUID, MaxLength } from 'class-validator';

export class VoidTransactionDto {
  @IsUUID()
  transactionId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
