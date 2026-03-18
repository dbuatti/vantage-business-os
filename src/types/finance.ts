export type AccountType = 'Savings' | 'Credit';

export interface FinanceEntry {
  id: string;
  date: string;
  creditWas?: number; // Only for Credit accounts
  amount: number;
  account: AccountType;
  monthYear: string;
}

export interface CalculatedEntry extends FinanceEntry {
  difference: number;
}