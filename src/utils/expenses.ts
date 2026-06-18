export interface ExpenseBreakdownItem {
  items: { description: string; amount: number; date: string; category_1: string }[];
  total: number;
}

export interface ExpenseBreakdown {
  bigHits: ExpenseBreakdownItem;
  subscriptions: ExpenseBreakdownItem;
  dailyLife: ExpenseBreakdownItem;
  smallStuff: ExpenseBreakdownItem;
}

export function computeExpenseBreakdown(transactions: { amount: number; description: string; transaction_date: string; category_1: string; category_2: string }[]): ExpenseBreakdown {
  const bigHits: ExpenseBreakdownItem['items'] = [];
  const subscriptions: ExpenseBreakdownItem['items'] = [];
  const dailyLife: ExpenseBreakdownItem['items'] = [];
  const smallStuff: ExpenseBreakdownItem['items'] = [];

  transactions
    .filter(t => t.amount < 0)
    .forEach(t => {
      const item = {
        description: t.description,
        amount: Math.abs(t.amount),
        date: t.transaction_date,
        category_1: t.category_1,
      };

      const isSubscription = t.category_1?.toLowerCase() === 'subscription' || t.category_2?.toLowerCase() === 'subscription';
      const absAmount = Math.abs(t.amount);

      if (isSubscription) {
        subscriptions.push(item);
      } else if (absAmount >= 100) {
        bigHits.push(item);
      } else if (absAmount < 20) {
        smallStuff.push(item);
      } else {
        dailyLife.push(item);
      }
    });

  return {
    bigHits: { items: bigHits, total: bigHits.reduce((s, i) => s + i.amount, 0) },
    subscriptions: { items: subscriptions, total: subscriptions.reduce((s, i) => s + i.amount, 0) },
    dailyLife: { items: dailyLife, total: dailyLife.reduce((s, i) => s + i.amount, 0) },
    smallStuff: { items: smallStuff, total: smallStuff.reduce((s, i) => s + i.amount, 0) },
  };
}
