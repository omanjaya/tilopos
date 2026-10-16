import { money, toNumber, type MoneyInput } from '@shared/utils/money';

/**
 * Single definition of report profit (R8).
 *
 * - grossSales:  SUM(subtotal) of completed sales (before transaction discount, excl. tax).
 * - discounts:   SUM(discountAmount) of those sales — contra-revenue, subtracted once.
 * - refunds:     refunded net sales (ABS(subtotal) of completed refunds).
 * - netRevenue = grossSales - discounts - refunds   (tax and service charge are not revenue)
 * - expenses   = COGS only. Purchase orders buy inventory; they become expense through COGS
 *               when sold, so they are never added on top (would double count).
 * - netProfit  = netRevenue - COGS
 */
export interface ProfitInput {
  grossSales: MoneyInput;
  discounts: MoneyInput;
  refunds: MoneyInput;
  cogs: MoneyInput;
}

export interface ProfitResult {
  netRevenue: number;
  expenses: number;
  netProfit: number;
  profitMargin: number;
}

export function computeProfit(input: ProfitInput): ProfitResult {
  const netRevenue = money(input.grossSales)
    .minus(money(input.discounts))
    .minus(money(input.refunds));
  const expenses = money(input.cogs);
  const netProfit = netRevenue.minus(expenses);
  const profitMargin = netRevenue.gt(0) ? netProfit.div(netRevenue).times(100).toNumber() : 0;
  return {
    netRevenue: toNumber(netRevenue),
    expenses: toNumber(expenses),
    netProfit: toNumber(netProfit),
    profitMargin: Math.round(profitMargin * 100) / 100,
  };
}
