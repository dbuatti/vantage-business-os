"use client";

import React from 'react';
import BudgetTracker from './BudgetTracker';
import SavingsGoals from './SavingsGoals';
import RecurringTransactions from './RecurringTransactions';
import { Transaction } from '@/types/finance';

interface TransactionPlanningTabProps {
  transactions: Transaction[];
}

const TransactionPlanningTab = ({ transactions }: TransactionPlanningTabProps) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BudgetTracker transactions={transactions} />
        <SavingsGoals transactions={transactions} />
      </div>
      <RecurringTransactions transactions={transactions} />
    </div>
  );
};

export default TransactionPlanningTab;