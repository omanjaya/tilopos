import { IsString, IsIn } from 'class-validator';

export type OrderPriorityLevel = 'normal' | 'urgent' | 'vip';

export class SetOrderPriorityDto {
  @IsString()
  @IsIn(['normal', 'urgent', 'vip'])
  priority!: OrderPriorityLevel;
}
