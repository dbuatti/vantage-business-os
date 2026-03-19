"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowLeft, 
  Printer, 
  CheckCircle2, 
  AlertCircle, 
  Briefcase, 
  TrendingUp, 
  TrendingDown,
  Calculator,
  Search,
  Info,
  Download
} from 'lucide-react';
import { format, isWithinInterval, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { showSuccess, showError } from '@/utils/toast';

interface Transaction {
  id: string;
  transaction_date: string;
  description: string;
  amount: number;
  category_1: string;
  category_2: string;
  is_work: boolean;
  notes: string;
  account_label: string;
}

const AccountantReport = () => {
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [reportType, setReportType] = useState<'fy' | 'cy'>('fy'); // Financial Year vs Calendar Year

  useEffect(() => {
    if (!authLoading && !session) {
      navigate('/login');
    } else if (session) {
      fetchTransactions();
    }
  }, [session, authLoading, navigate]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      let allData: Transaction[] = [];
      let from = 0;
      const step = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('finance_transactions')
          .select('*')
          .order('transaction_date', { ascending: false })
          .order('id', { ascending: false }) // Deterministic sort
          .range(from, from + step - 1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          allData = [...allData, ...data];
          if (data.length < step) {
            hasMore = false;
          } else {
            from += step;
          }
        } else {
          hasMore = false;
        }
      }
      
      setTransactions(allData);
    } catch (error: any) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());
  }, []);

  const reportInterval = useMemo(() => {
    const year = parseInt(selectedYear);
    if (reportType === 'cy') {
      return {
        start: new Date(year, 0, 1),
        end: new Date(year, 11, 31)
      };
    } else {
      // Australian Financial Year: July 1st (Year-1) to June 30th (Year)
      return {
        start: new Date(year - 1, 6, 1),
        end: new Date(year, 5, 30)
      };
    }
  }, [selectedYear, reportType]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const date = parseISO(t.transaction_date);
      return isWithinInterval(date, reportInterval);
    });
  }, [transactions, reportInterval]);

  const workTransactions = useMemo(() => {
    return filteredTransactions.filter(t => t.is_work);
  }, [filteredTransactions]);

  const stats = useMemo(() => {
    const income = workTransactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const expenses = workTransactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
    
    const categoryBreakdown: Record<string, number> = {};
    workTransactions.filter(t => t.amount < 0).forEach(t => {
      const cat = t.category_1 || 'Uncategorized';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + Math.abs(t.amount);
    });

    const missingNotes = workTransactions.filter(t => !t.notes && Math.abs(t.amount) > 50).length;
    const unmapped = filteredTransactions.filter(t => !t.category_1 && Math.abs(t.amount) > 0).length;

    return { income, expenses, net: income - expenses, categoryBreakdown, missingNotes, unmapped };
  }, [workTransactions, filteredTransactions]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(val);
  };

  const exportReport = () => {
    if (workTransactions.length === 0) return;
    
    const headers = ['Date', 'Description', 'Category', 'Amount', 'Notes', 'Account'];
    const rows = workTransactions.map(t => [
      t.transaction_date,
      t.description,
      t.category_1,
      t.amount.toString(),
      t.notes || '',
      t.account_label
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Accountant_Report_${selectedYear}_${reportType.toUpperCase()}.csv`;
    link.click();
    showSuccess('Report exported successfully');
  };

  const handlePrint = () => {
    window.print();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 print:bg-white print:pb-0">
      <div className="max-w-5xl mx-auto p-4 sm:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 print:hidden">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild className="rounded-xl">
              <Link to="/transactions">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
                <Calculator className="w-8 h-8 text-primary" />
                Accountant Ready
              </h1>
              <p className="text-muted-foreground">Prepare your tax information with ease</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handlePrint} className="rounded-xl gap-2">
              <Printer className="w-4 h-4" />
              Print PDF
            </Button>
            <Button onClick={exportReport} className="rounded-xl gap-2">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Print Header (Only visible when printing) */}
        <div className="hidden print:block border-b pb-6 mb-8">
          <h1 className="text-2xl font-bold">Financial Report: {reportType === 'fy' ? `FY ${parseInt(selectedYear)-1}-${selectedYear}` : `CY ${selectedYear}`}</h1>
          <p className="text-sm text-gray-500">Generated on {format(new Date(), 'MMMM dd, yyyy')}</p>
          <p className="text-sm text-gray-500">User: {session?.user.email}</p>
        </div>

        {/* Controls */}
        <Card className="border-0 shadow-lg print:hidden">
          <CardContent className="p-6 flex flex-wrap items-end gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Report Period</label>
              <Select value={reportType} onValueChange={(v: any) => setReportType(v)}>
                <SelectTrigger className="w-48 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fy">Financial Year (Jul-Jun)</SelectItem>
                  <SelectItem value="cy">Calendar Year (Jan-Dec)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Year Ending</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-32 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 text-right">
              <p className="text-sm text-muted-foreground">
                Period: <span className="font-bold text-foreground">{format(reportInterval.start, 'MMM dd, yyyy')}</span> to <span className="font-bold text-foreground">{format(reportInterval.end, 'MMM dd, yyyy')}</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Audit Alerts */}
        {(stats.missingNotes > 0 || stats.unmapped > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:hidden">
            {stats.missingNotes > 0 && (
              <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl text-amber-800">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <div className="text-sm">
                  <p className="font-bold">{stats.missingNotes} work transactions missing notes</p>
                  <p className="opacity-80">Accountants often need descriptions for large expenses.</p>
                </div>
              </div>
            )}
            {stats.unmapped > 0 && (
              <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl text-blue-800">
                <Search className="w-5 h-5 shrink-0" />
                <div className="text-sm">
                  <p className="font-bold">{stats.unmapped} unmapped categories</p>
                  <p className="opacity-80">Ensure all transactions are categorized for accurate reporting.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Card className="border-0 shadow-lg bg-emerald-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium opacity-80">Work Income</p>
                <TrendingUp className="w-5 h-5 opacity-50" />
              </div>
              <p className="text-3xl font-black">{formatCurrency(stats.income)}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg bg-rose-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium opacity-80">Work Expenses</p>
                <TrendingDown className="w-5 h-5 opacity-50" />
              </div>
              <p className="text-3xl font-black">{formatCurrency(stats.expenses)}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg bg-primary text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium opacity-80">Net Business Position</p>
                <Briefcase className="w-5 h-5 opacity-50" />
              </div>
              <p className="text-3xl font-black">{formatCurrency(stats.net)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Expense Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-1 border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Expense Breakdown</CardTitle>
              <CardDescription>By tax category</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(stats.categoryBreakdown)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, amount]) => (
                  <div key={cat} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{cat}</span>
                      <span className="font-bold">{formatCurrency(amount)}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full" 
                        style={{ width: `${(amount / stats.expenses) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              {Object.keys(stats.categoryBreakdown).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No work expenses found for this period.</p>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Work Transactions</CardTitle>
              <CardDescription>Detailed list for your records</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="print:table-cell">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workTransactions.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="whitespace-nowrap text-xs">
                          {format(parseISO(t.transaction_date), 'MMM dd, yy')}
                        </TableCell>
                        <TableCell className="text-xs font-medium max-w-[150px] truncate">
                          {t.description}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] rounded-lg">
                            {t.category_1}
                          </Badge>
                        </TableCell>
                        <TableCell className={cn(
                          "text-right text-xs font-bold",
                          t.amount > 0 ? "text-emerald-600" : "text-rose-600"
                        )}>
                          {formatCurrency(t.amount)}
                        </TableCell>
                        <TableCell className="text-[10px] text-muted-foreground max-w-[150px]">
                          {t.notes || (Math.abs(t.amount) > 50 ? <span className="text-amber-500 flex items-center gap-1"><Info className="w-3 h-3" /> Missing</span> : '—')}
                        </TableCell>
                      </TableRow>
                    ))}
                    {workTransactions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                          No work transactions found in this period.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer Info */}
        <div className="p-6 bg-muted/30 rounded-2xl border border-dashed print:hidden">
          <h3 className="font-bold text-sm mb-2 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            Accountant Checklist
          </h3>
          <ul className="text-xs text-muted-foreground space-y-2">
            <li>• Ensure all business-related income is marked as "Work".</li>
            <li>• Check that large expenses (over $50) have descriptive notes.</li>
            <li>• Verify that your category groups match your tax return labels.</li>
            <li>• Use the "Print PDF" button to save a clean copy for your accountant.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AccountantReport;