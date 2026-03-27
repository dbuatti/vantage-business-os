"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { useSettings } from '@/components/SettingsProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Download,
  Pencil,
  ExternalLink,
  Wand2,
  FileText,
  PieChart,
  ShieldAlert
} from 'lucide-react';
import { format, isWithinInterval, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { showSuccess, showError } from '@/utils/toast';
import WorkWizard from '@/components/WorkWizard';
import { Transaction } from '@/types/finance';

const AccountantReport = () => {
  const { session, loading: authLoading } = useAuth();
  const { selectedYear: globalYear } = useSettings();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>(globalYear === 'All' ? new Date().getFullYear().toString() : globalYear);
  const [reportType, setReportType] = useState<'fy' | 'cy'>('fy');
  const [showWizard, setShowWizard] = useState(false);
  const [taxRate, setTaxRate] = useState<number>(30);
  
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editForm, setEditForm] = useState({
    description: '', amount: '', category_1: '', category_2: '', is_work: false, notes: ''
  });

  useEffect(() => {
    if (globalYear !== 'All') {
      setSelectedYear(globalYear);
    }
  }, [globalYear]);

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
          .order('id', { ascending: false })
          .range(from, from + step - 1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          allData = [...allData, ...data];
          if (data.length < step) hasMore = false;
          else from += step;
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

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setEditForm({
      description: transaction.description,
      amount: transaction.amount.toString(),
      category_1: transaction.category_1 || '',
      category_2: transaction.category_2 || '',
      is_work: transaction.is_work,
      notes: transaction.notes || ''
    });
  };

  const handleSaveEdit = async () => {
    if (!editingTransaction?.id) return;
    try {
      const { error } = await supabase.from('finance_transactions').update({
        description: editForm.description,
        amount: parseFloat(editForm.amount) || 0,
        category_1: editForm.category_1,
        category_2: editForm.category_2 === 'none' ? '' : editForm.category_2,
        is_work: editForm.is_work,
        notes: editForm.notes
      }).eq('id', editingTransaction.id);
      
      if (error) throw error;
      showSuccess('Transaction updated');
      setEditingTransaction(null);
      fetchTransactions();
    } catch (error: any) {
      showError(error.message);
    }
  };

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(transactions.map(t => t.category_1).filter(Boolean));
    return Array.from(cats).sort();
  }, [transactions]);

  const subcategories = useMemo(() => {
    const subs = new Set(transactions.map(t => t.category_2).filter(Boolean));
    return Array.from(subs).sort();
  }, [transactions]);

  const reportInterval = useMemo(() => {
    const year = parseInt(selectedYear);
    if (reportType === 'cy') {
      return { start: new Date(year, 0, 1), end: new Date(year, 11, 31) };
    } else {
      return { start: new Date(year - 1, 6, 1), end: new Date(year, 5, 30) };
    }
  }, [selectedYear, reportType]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const date = parseISO(t.transaction_date);
      if (t.category_1 === 'Account') return false;
      return isWithinInterval(date, reportInterval);
    });
  }, [transactions, reportInterval]);

  const workTransactions = useMemo(() => {
    return filteredTransactions.filter(t => t.is_work);
  }, [filteredTransactions]);

  const stats = useMemo(() => {
    const income = workTransactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const expenses = workTransactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
    const net = income - expenses;
    
    const categoryBreakdown: Record<string, number> = {};
    workTransactions.filter(t => t.amount < 0).forEach(t => {
      const cat = t.category_1 || 'Uncategorized';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + Math.abs(t.amount);
    });

    const missingNotes = workTransactions.filter(t => !t.notes && Math.abs(t.amount) > 50);
    const unmapped = filteredTransactions.filter(t => !t.category_1 && Math.abs(t.amount) > 0);
    const estimatedTax = net > 0 ? net * (taxRate / 100) : 0;

    return { income, expenses, net, categoryBreakdown, missingNotes, unmapped, estimatedTax };
  }, [workTransactions, filteredTransactions, taxRate]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  const exportReport = () => {
    if (workTransactions.length === 0) return;
    const headers = ['Date', 'Description', 'Category', 'Amount', 'Notes', 'Account'];
    const rows = workTransactions.map(t => [t.transaction_date, t.description, t.category_1, t.amount.toString(), t.notes || '', t.account_label]);
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Accountant_Report_${selectedYear}_${reportType.toUpperCase()}.csv`;
    link.click();
    showSuccess('Report exported successfully');
  };

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

  return (
    <div className="min-h-screen bg-background pb-20 print:bg-white print:pb-0">
      <div className="max-w-5xl mx-auto p-4 sm:p-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 print:hidden">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild className="rounded-xl"><Link to="/transactions"><ArrowLeft className="w-5 h-5" /></Link></Button>
            <div>
              <h1 className="text-3xl font-black tracking-tight flex items-center gap-2"><Calculator className="w-8 h-8 text-primary" />Accountant Ready</h1>
              <p className="text-muted-foreground">Prepare your tax information with ease</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowWizard(true)} className="rounded-xl gap-2 bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"><Wand2 className="w-4 h-4" />Work Wizard</Button>
            <Button variant="outline" onClick={() => window.print()} className="rounded-xl gap-2"><Printer className="w-4 h-4" />Print PDF</Button>
            <Button onClick={exportReport} className="rounded-xl gap-2"><Download className="w-4 h-4" />Export CSV</Button>
          </div>
        </div>

        <div className="hidden print:block border-b-2 border-primary pb-6 mb-8">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-black tracking-tight text-primary">Financial Report</h1>
              <p className="text-lg text-muted-foreground mt-1">{reportType === 'fy' ? 'Financial Year' : 'Calendar Year'} Ending {selectedYear}</p>
              <p className="text-sm text-muted-foreground mt-4">Generated on {format(new Date(), 'MMMM dd, yyyy')}</p>
            </div>
            <div className="text-right"><p className="font-bold text-xl">{session?.user.email}</p><p className="text-muted-foreground">Business Transaction Summary</p></div>
          </div>
        </div>

        <Card className="border-0 shadow-lg print:hidden">
          <CardContent className="p-6 flex flex-wrap items-end gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Report Period</label>
              <Select value={reportType} onValueChange={(v: any) => setReportType(v)}>
                <SelectTrigger className="w-48 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="fy">Financial Year (Jul-Jun)</SelectItem><SelectItem value="cy">Calendar Year (Jan-Dec)</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Year Ending</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-32 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex-1 text-right"><p className="text-sm text-muted-foreground">Period: <span className="font-bold text-foreground">{format(reportInterval.start, 'MMM dd, yyyy')}</span> to <span className="font-bold text-foreground">{format(reportInterval.end, 'MMM dd, yyyy')}</span></p></div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-0 shadow-lg bg-emerald-600 text-white"><CardContent className="p-6"><div className="flex items-center justify-between mb-2"><p className="text-sm font-medium opacity-80">Work Income</p><TrendingUp className="w-5 h-5 opacity-50" /></div><p className="text-3xl font-black">{formatCurrency(stats.income)}</p></CardContent></Card>
          <Card className="border-0 shadow-lg bg-rose-600 text-white"><CardContent className="p-6"><div className="flex items-center justify-between mb-2"><p className="text-sm font-medium opacity-80">Work Expenses</p><TrendingDown className="w-5 h-5 opacity-50" /></div><p className="text-3xl font-black">{formatCurrency(stats.expenses)}</p></CardContent></Card>
          <Card className="border-0 shadow-lg bg-primary text-white"><CardContent className="p-6"><div className="flex items-center justify-between mb-2"><p className="text-sm font-medium opacity-80">Net Business Position</p><Briefcase className="w-5 h-5 opacity-50" /></div><p className="text-3xl font-black">{formatCurrency(stats.net)}</p></CardContent></Card>
          <Card className="border-0 shadow-lg bg-amber-500 text-white relative overflow-hidden"><div className="absolute -right-4 -bottom-4 opacity-10"><ShieldAlert className="w-24 h-24" /></div><CardContent className="p-6 relative"><div className="flex items-center justify-between mb-2"><p className="text-sm font-medium opacity-80">Est. Tax Liability</p><div className="flex items-center gap-1 bg-white/20 rounded px-1.5 py-0.5"><Input type="number" value={taxRate} onChange={(e) => setTaxRate(parseInt(e.target.value) || 0)} className="w-8 h-5 p-0 bg-transparent border-0 text-white text-xs font-bold text-center focus-visible:ring-0" /><span className="text-[10px] font-bold">%</span></div></div><p className="text-3xl font-black">{formatCurrency(stats.estimatedTax)}</p><p className="text-[10px] opacity-70 mt-1 italic">Based on {taxRate}% flat rate</p></CardContent></Card>
        </div>

        <Card className="border-0 shadow-lg overflow-hidden">
          <CardHeader className="bg-muted/30"><CardTitle className="text-lg flex items-center gap-2"><PieChart className="w-5 h-5 text-primary" />Tax Category Summary</CardTitle><CardDescription>Grouped expenses for your tax return</CardDescription></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Category</TableHead><TableHead className="text-right">Total Amount</TableHead><TableHead className="text-right">Count</TableHead><TableHead className="w-1/3">Percentage</TableHead></TableRow></TableHeader>
              <TableBody>
                {Object.entries(stats.categoryBreakdown).sort((a, b) => b[1] - a[1]).map(([cat, amount]) => (
                  <TableRow key={cat}><TableCell className="font-medium">{cat}</TableCell><TableCell className="text-right font-bold text-rose-600">{formatCurrency(-amount)}</TableCell><TableCell className="text-right text-muted-foreground">{workTransactions.filter(t => t.category_1 === cat).length}</TableCell><TableCell><div className="flex items-center gap-2"><div className="flex-1 h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary" style={{ width: `${(amount / stats.expenses) * 100}%` }} /></div><span className="text-xs text-muted-foreground w-10 text-right">{((amount / stats.expenses) * 100).toFixed(0)}%</span></div></TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <WorkWizard transactions={transactions} open={showWizard} onOpenChange={setShowWizard} onComplete={fetchTransactions} />
      </div>
    </div>
  );
};

export default AccountantReport;