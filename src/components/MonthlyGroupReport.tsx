"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  CalendarDays, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpRight, 
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Transaction {
  id?: string;
  transaction_date: string;
  description: string;
  amount: number;
  category_1: string;
  is_work: boolean;
  mmm_yyyy: string;
}

interface CategoryGroup {
  category_name: string;
  group_name: string;
}

interface MonthlyGroupReportProps {
  transactions: Transaction[];
  categoryGroups: CategoryGroup[];
}

const GROUPS = [
  { name: 'Fixed Essentials', color: 'bg-blue-500', lightColor: 'bg-blue-50 text-blue-700 border-blue-200', icon: '🏠' },
  { name: 'Flexible Essentials', color: 'bg-amber-500', lightColor: 'bg-amber-50 text-amber-700 border-amber-200', icon: '🛒' },
  { name: 'Sustenance', color: 'bg-emerald-500', lightColor: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: '🍽️' },
  { name: 'Wellness & Growth', color: 'bg-violet-500', lightColor: 'bg-violet-50 text-violet-700 border-violet-200', icon: '🌱' },
  { name: 'Lifestyle & Discretionary', color: 'bg-rose-500', lightColor: 'bg-rose-50 text-rose-700 border-rose-200', icon: '🎭' },
];

const MonthlyGroupReport = ({ transactions, categoryGroups }: MonthlyGroupReportProps) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  // Build category -> group lookup
  const categoryToGroup = useMemo(() => {
    const map: Record<string, string> = {};
    categoryGroups.forEach(cg => {
      map[cg.category_name] = cg.group_name;
    });
    return map;
  }, [categoryGroups]);

  // Get all available months
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    transactions.forEach(t => {
      if (t.mmm_yyyy) months.add(t.mmm_yyyy);
    });
    return Array.from(months).sort((a, b) => {
      const parseMonth = (s: string) => {
        const parts = s.split(' ');
        const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const monthIdx = monthNames.indexOf(parts[0].toLowerCase().substring(0, 3));
        return new Date(parseInt(parts[1]), monthIdx);
      };
      return parseMonth(b).getTime() - parseMonth(a).getTime();
    });
  }, [transactions]);

  // Set default month
  React.useEffect(() => {
    if (availableMonths.length > 0 && !selectedMonth) {
      setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths, selectedMonth]);

  // Filter transactions for selected month
  const monthTransactions = useMemo(() => {
    return transactions.filter(t => t.mmm_yyyy === selectedMonth);
  }, [transactions, selectedMonth]);

  // Group transactions
  const groupedData = useMemo(() => {
    const result: Record<string, {
      groupName: string;
      income: number;
      expenses: number;
      net: number;
      transactions: Transaction[];
      categories: Record<string, { income: number; expenses: number; transactions: Transaction[] }>;
    }> = {};

    // Initialize all groups
    GROUPS.forEach(g => {
      result[g.name] = {
        groupName: g.name,
        income: 0,
        expenses: 0,
        net: 0,
        transactions: [],
        categories: {}
      };
    });

    // Add "Unmapped" group
    result['Unmapped'] = {
      groupName: 'Unmapped',
      income: 0,
      expenses: 0,
      net: 0,
      transactions: [],
      categories: {}
    };

    monthTransactions.forEach(t => {
      const groupName = categoryToGroup[t.category_1] || 'Unmapped';
      const group = result[groupName];
      if (!group) return;

      group.transactions.push(t);

      if (!group.categories[t.category_1]) {
        group.categories[t.category_1] = { income: 0, expenses: 0, transactions: [] };
      }
      group.categories[t.category_1].transactions.push(t);

      if (t.amount > 0) {
        group.income += t.amount;
        group.categories[t.category_1].income += t.amount;
      } else {
        group.expenses += Math.abs(t.amount);
        group.categories[t.category_1].expenses += Math.abs(t.amount);
      }
      group.net = group.income - group.expenses;
    });

    return result;
  }, [monthTransactions, categoryToGroup]);

  const totalIncome = monthTransactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalExpenses = monthTransactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalNet = totalIncome - totalExpenses;

  const navigateMonth = (direction: number) => {
    const currentIndex = availableMonths.indexOf(selectedMonth);
    const newIndex = Math.max(0, Math.min(availableMonths.length - 1, currentIndex - direction));
    setSelectedMonth(availableMonths[newIndex]);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  const getGroupStyle = (name: string) => {
    return GROUPS.find(g => g.name === name) || { name: 'Unmapped', color: 'bg-gray-500', lightColor: 'bg-gray-50 text-gray-700 border-gray-200', icon: '❓' };
  };

  if (availableMonths.length === 0) {
    return (
      <Card className="border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            Monthly Group Report
          </CardTitle>
          <CardDescription>Import transactions and map categories to groups first</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Month Selector */}
      <Card className="border-0 shadow-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CalendarDays className="w-5 h-5 text-primary" />
                Monthly Group Report
              </CardTitle>
              <CardDescription>
                {monthTransactions.length} transactions in {selectedMonth}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => navigateMonth(1)} className="rounded-xl h-9 w-9">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-40 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableMonths.map(month => (
                    <SelectItem key={month} value={month}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)} className="rounded-xl h-9 w-9">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Month Summary */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950">
              <div className="flex items-center gap-1.5 mb-1">
                <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                <span className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">Income</span>
              </div>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(totalIncome)}</p>
            </div>
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950">
              <div className="flex items-center gap-1.5 mb-1">
                <ArrowDownRight className="w-4 h-4 text-rose-600" />
                <span className="text-xs text-rose-700 dark:text-rose-300 font-medium">Expenses</span>
              </div>
              <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">{formatCurrency(-totalExpenses)}</p>
            </div>
            <div className={cn("p-4 rounded-xl", totalNet >= 0 ? "bg-blue-50 dark:bg-blue-950" : "bg-amber-50 dark:bg-amber-950")}>
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className={cn("w-4 h-4", totalNet >= 0 ? "text-blue-600" : "text-amber-600")} />
                <span className={cn("text-xs font-medium", totalNet >= 0 ? "text-blue-700 dark:text-blue-300" : "text-amber-700 dark:text-amber-300")}>Net</span>
              </div>
              <p className={cn("text-2xl font-bold", totalNet >= 0 ? "text-blue-700 dark:text-blue-300" : "text-amber-700 dark:text-amber-300")}>{formatCurrency(totalNet)}</p>
            </div>
          </div>

          {/* Group Breakdown */}
          <div className="space-y-3">
            {GROUPS.map(group => {
              const data = groupedData[group.name];
              if (!data || data.transactions.length === 0) return null;

              const isExpanded = expandedGroup === group.name;
              const percentage = totalExpenses > 0 ? (data.expenses / totalExpenses) * 100 : 0;
              const categoryEntries = Object.entries(data.categories).sort((a, b) => (b[1].expenses + b[1].income) - (a[1].expenses + a[1].income));

              return (
                <div key={group.name} className="rounded-xl border overflow-hidden">
                  <button
                    onClick={() => setExpandedGroup(isExpanded ? null : group.name)}
                    className="w-full p-4 flex items-center gap-3 hover:bg-muted/30 transition-colors text-left"
                  >
                    <span className="text-xl">{group.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">{group.name}</span>
                        <Badge variant="outline" className="text-[10px] rounded-lg">
                          {data.transactions.length} txns
                        </Badge>
                      </div>
                      <Progress value={percentage} className="h-1.5" />
                    </div>
                    <div className="text-right shrink-0 space-y-0.5">
                      {data.income > 0 && (
                        <p className="text-xs text-emerald-600 font-medium">+{formatCurrency(data.income)}</p>
                      )}
                      {data.expenses > 0 && (
                        <p className="text-xs text-rose-600 font-medium">-{formatCurrency(data.expenses)}</p>
                      )}
                      <p className={cn("font-bold", data.net >= 0 ? "text-emerald-600" : "text-rose-600")}>
                        {formatCurrency(data.net)}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground w-12 text-right font-medium">
                      {percentage.toFixed(1)}%
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="border-t bg-muted/20 animate-fade-in">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead className="text-xs font-semibold">Category</TableHead>
                            <TableHead className="text-xs font-semibold text-right">Income</TableHead>
                            <TableHead className="text-xs font-semibold text-right">Expenses</TableHead>
                            <TableHead className="text-xs font-semibold text-right">Net</TableHead>
                            <TableHead className="text-xs font-semibold text-right">Txns</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {categoryEntries.map(([catName, catData]) => (
                            <TableRow key={catName} className="hover:bg-muted/30">
                              <TableCell className="text-sm font-medium">{catName}</TableCell>
                              <TableCell className="text-right text-sm text-emerald-600 tabular-nums">
                                {catData.income > 0 ? formatCurrency(catData.income) : '—'}
                              </TableCell>
                              <TableCell className="text-right text-sm text-rose-600 tabular-nums">
                                {catData.expenses > 0 ? formatCurrency(-catData.expenses) : '—'}
                              </TableCell>
                              <TableCell className={cn("text-right text-sm font-bold tabular-nums", (catData.income - catData.expenses) >= 0 ? "text-emerald-600" : "text-rose-600")}>
                                {formatCurrency(catData.income - catData.expenses)}
                              </TableCell>
                              <TableCell className="text-right text-xs text-muted-foreground">
                                {catData.transactions.length}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Unmapped group */}
            {groupedData['Unmapped'] && groupedData['Unmapped'].transactions.length > 0 && (
              <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">❓</span>
                    <span className="font-semibold text-sm text-amber-700">Unmapped Categories</span>
                    <Badge variant="outline" className="text-[10px] rounded-lg bg-amber-50 text-amber-700 border-amber-200">
                      {groupedData['Unmapped'].transactions.length} txns
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {Object.keys(groupedData['Unmapped'].categories).join(', ')}
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    Map these categories in the Groups tab to include them in reports
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Year Overview */}
      <YearOverview
        transactions={transactions}
        categoryGroups={categoryGroups}
        availableMonths={availableMonths}
      />
    </div>
  );
};

// Year Overview Sub-component
const YearOverview = ({ 
  transactions, 
  categoryGroups, 
  availableMonths 
}: { 
  transactions: Transaction[]; 
  categoryGroups: CategoryGroup[];
  availableMonths: string[];
}) => {
  const [selectedYear, setSelectedYear] = useState<string>('');

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    availableMonths.forEach(m => {
      const parts = m.split(' ');
      if (parts[1]) years.add(parts[1]);
    });
    return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
  }, [availableMonths]);

  React.useEffect(() => {
    if (availableYears.length > 0 && !selectedYear) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  const categoryToGroup = useMemo(() => {
    const map: Record<string, string> = {};
    categoryGroups.forEach(cg => { map[cg.category_name] = cg.group_name; });
    return map;
  }, [categoryGroups]);

  const yearData = useMemo(() => {
    const yearMonths = availableMonths.filter(m => m.endsWith(selectedYear));
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return monthNames.map((monthName, monthIdx) => {
      const monthKey = `${monthName} ${selectedYear}`;
      const monthTxns = transactions.filter(t => t.mmm_yyyy === monthKey);

      const income = monthTxns.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
      const expenses = monthTxns.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

      const groupTotals: Record<string, number> = {};
      GROUPS.forEach(g => { groupTotals[g.name] = 0; });
      monthTxns.filter(t => t.amount < 0).forEach(t => {
        const group = categoryToGroup[t.category_1] || 'Unmapped';
        groupTotals[group] = (groupTotals[group] || 0) + Math.abs(t.amount);
      });

      return {
        month: monthKey,
        shortMonth: monthName,
        income,
        expenses,
        net: income - expenses,
        count: monthTxns.length,
        groupTotals,
        hasData: monthTxns.length > 0
      };
    });
  }, [transactions, selectedYear, categoryToGroup, availableMonths]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  const yearIncome = yearData.reduce((s, m) => s + m.income, 0);
  const yearExpenses = yearData.reduce((s, m) => s + m.expenses, 0);
  const yearNet = yearIncome - yearExpenses;

  if (availableYears.length === 0) return null;

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Year Overview — {selectedYear}</CardTitle>
            <CardDescription>Monthly breakdown by category group</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => {
              const idx = availableYears.indexOf(selectedYear);
              if (idx < availableYears.length - 1) setSelectedYear(availableYears[idx + 1]);
            }} className="rounded-xl h-8 w-8">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-24 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" onClick={() => {
              const idx = availableYears.indexOf(selectedYear);
              if (idx > 0) setSelectedYear(availableYears[idx - 1]);
            }} className="rounded-xl h-8 w-8">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Year Summary */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-center">
            <p className="text-xs text-emerald-600 font-medium">Year Income</p>
            <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(yearIncome)}</p>
          </div>
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950 text-center">
            <p className="text-xs text-rose-600 font-medium">Year Expenses</p>
            <p className="text-xl font-bold text-rose-700 dark:text-rose-300">{formatCurrency(-yearExpenses)}</p>
          </div>
          <div className={cn("p-3 rounded-xl text-center", yearNet >= 0 ? "bg-blue-50 dark:bg-blue-950" : "bg-amber-50 dark:bg-amber-950")}>
            <p className={cn("text-xs font-medium", yearNet >= 0 ? "text-blue-600" : "text-amber-600")}>Year Net</p>
            <p className={cn("text-xl font-bold", yearNet >= 0 ? "text-blue-700 dark:text-blue-300" : "text-amber-700 dark:text-amber-300")}>{formatCurrency(yearNet)}</p>
          </div>
        </div>

        {/* Monthly Grid */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs font-semibold sticky left-0 bg-muted/50">Month</TableHead>
                <TableHead className="text-xs font-semibold text-right">Income</TableHead>
                <TableHead className="text-xs font-semibold text-right">Expenses</TableHead>
                <TableHead className="text-xs font-semibold text-right">Net</TableHead>
                {GROUPS.map(g => (
                  <TableHead key={g.name} className="text-xs font-semibold text-right hidden xl:table-cell">
                    <span className="flex items-center justify-end gap-1">{g.icon}</span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {yearData.map((month) => (
                <TableRow 
                  key={month.month} 
                  className={cn(
                    "hover:bg-muted/30",
                    !month.hasData && "opacity-40"
                  )}
                >
                  <TableCell className="font-medium text-sm sticky left-0 bg-background">
                    {month.shortMonth}
                  </TableCell>
                  <TableCell className="text-right text-sm text-emerald-600 tabular-nums">
                    {month.income > 0 ? formatCurrency(month.income) : '—'}
                  </TableCell>
                  <TableCell className="text-right text-sm text-rose-600 tabular-nums">
                    {month.expenses > 0 ? formatCurrency(-month.expenses) : '—'}
                  </TableCell>
                  <TableCell className={cn("text-right text-sm font-bold tabular-nums", month.net >= 0 ? "text-emerald-600" : "text-rose-600")}>
                    {month.hasData ? formatCurrency(month.net) : '—'}
                  </TableCell>
                  {GROUPS.map(g => (
                    <TableCell key={g.name} className="text-right text-xs tabular-nums text-muted-foreground hidden xl:table-cell">
                      {month.groupTotals[g.name] > 0 ? formatCurrency(-month.groupTotals[g.name]) : '—'}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {/* Year Total Row */}
              <TableRow className="bg-muted/30 font-bold">
                <TableCell className="sticky left-0 bg-muted/30">Total</TableCell>
                <TableCell className="text-right text-emerald-600">{formatCurrency(yearIncome)}</TableCell>
                <TableCell className="text-right text-rose-600">{formatCurrency(-yearExpenses)}</TableCell>
                <TableCell className={cn("text-right", yearNet >= 0 ? "text-emerald-600" : "text-rose-600")}>{formatCurrency(yearNet)}</TableCell>
                {GROUPS.map(g => {
                  const total = yearData.reduce((s, m) => s + m.groupTotals[g.name], 0);
                  return (
                    <TableCell key={g.name} className="text-right text-muted-foreground hidden xl:table-cell">
                      {total > 0 ? formatCurrency(-total) : '—'}
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default MonthlyGroupReport;