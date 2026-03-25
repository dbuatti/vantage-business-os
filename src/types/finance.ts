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

export interface Transaction {
  id?: string;
  week: number;
  month_code: string;
  month_name: string;
  transaction_date: string;
  account_identifier: string;
  description: string;
  credit: number | null;
  debit: number | null;
  account_label: string;
  category_1: string;
  category_2: string;
  is_work: boolean;
  is_reviewed?: boolean; // Added to track if user has confirmed the status
  amount: number;
  notes: string;
  mmm_yyyy: string;
  invoice_id?: string; // Link to an invoice
}