"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Download, 
  Calculator, 
  Home, 
  Zap, 
  Phone, 
  Fuel, 
  Briefcase,
  Search,
  FileText,
  ExternalLink,
  Info,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Percent,
  ShieldAlert,
  Loader2,
  Settings as SettingsIcon,
  Database,
  Calendar
} from 'lucide-react';
import { format, isWithinInterval, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { showError, showSuccess } from '@/utils/toast';

interface Transaction {
  id: string;
  transaction_date: string;
  description: string;
  amount: number;
  category_1: string;
  is_work: boolean;
  notes: string;
  account_label: string;
}

const AccountantPortal = () => {
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [reportType, setReportType] = useState<'fy' | 'cy'>('fy');
  
  // Dynamic Settings from DB
  const [settings, setSettings] = useState({
    business_percents: { rent: 25, bills: 25, phone: 50, fuel: 40 },
    deduction_keywords: {
      rent: ['rent', 'lease', 'storage'],
      bills: ['bill', 'electricity', 'water', 'gas', 'power', 'rates'],
      phone: ['phone', 'mobile', 'internet', 'telstra', 'optus', 'vodafone', 'nbn'],
      fuel: ['fuel', 'petrol', 'gas station', 'shell', 'caltex', '7-eleven', 'ampol', 'bp', 'toll', 'myki', 'parking']
    }
  });

  useEffect(() => {
    if (!authLoading && !session) {
      navigate('/login');
    } else if (session) {
      fetchData();
    }
  }, [session, authLoading, navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Transactions
      const { data: txnData, error: txnError } = await supabase
        .from('finance_transactions')
        .select('*')
        .order('transaction_date', { ascending: false });

      if (txnError) throw txnError;
      setTransactions(txnData || []);

      // Fetch Accountant Settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('accountant_settings')
        .select('*')
        .eq('owner_user_id', session?.user.id)
        .single();
      
      if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;
      if (settingsData) setSettings({
        business_percents: settingsData.business_percents,
        deduction_keywords: settingsData.deduction_keywords
      });

    } catch (error: any) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

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
      return isWithinInterval(date, reportInterval);
    });
  }, [transactions, reportInterval]);

  const businessIncome = useMemo(() => {
    return filteredTransactions.filter(t => t.is_work && t.amount > 0);
  }, [filteredTransactions]);

  const deductionBuckets = useMemo(() => {
    const buckets = {
      rent: { label: 'Rent & Home Office', icon: Home, color: 'text-blue-600', bg: 'bg-blue-50', text: 'text-blue-900', keywords: settings.deduction_keywords.rent, items: [] as Transaction[], percent: settings.business_percents.rent },
      bills: { label: 'Utilities & Bills', icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50', text: 'text-amber-900', keywords: settings.deduction_keywords.bills, items: [] as Transaction[], percent: settings.business_percents.bills },
      phone: { label: 'Phone & Internet', icon: Phone, color: 'text-purple-600', bg: 'bg-purple-50', text: 'text-purple-900', keywords: settings.deduction_keywords.phone, items: [] as Transaction[], percent: settings.business_percents.phone },
      fuel: { label: 'Fuel & Transport', icon: Fuel, color: 'text-orange-600', bg: 'bg-orange-50', text: 'text-orange-900', keywords: settings.deduction_keywords.fuel, items: [] as Transaction[], percent: settings.business_percents.fuel },
      other: { label: 'Direct Work Expenses', icon: Briefcase, color: 'text-emerald-600', bg: 'bg-emerald-50', text: 'text-emerald-900', keywords: [], items: [] as Transaction[], percent: 100 }
    };

    filteredTransactions.forEach(t => {
      if (t.amount > 0) return;
      
      const desc = t.description.toLowerCase();
      const cat = (t.category_1 || '').toLowerCase();
      
      if (buckets.rent.keywords.some(k => desc.includes(k) || cat.includes(k))) {
        buckets.rent.items.push(t);
      } else if (buckets.bills.keywords.some(k => desc.includes(k) || cat.includes(k))) {
        buckets.bills.items.push(t);
      } else if (buckets.phone.keywords.some(k => desc.includes(k) || cat.includes(k))) {
        buckets.phone.items.push(t);
      } else if (buckets.fuel.keywords.some(k => desc.includes(k) || cat.includes(k))) {
        buckets.fuel.items.push(t);
      } else if (t.is_work) {
        buckets.other.items.push(t);
      }
    });

    return buckets;
  }, [filteredTransactions, settings]);

  const auditAlerts = useMemo(() => {
    const alerts = [];
    const workItems = filteredTransactions.filter(t => t.is_work || Object.values(deductionBuckets).some(b => b.items.includes(t)));
    
    const missingNotes = workItems.filter(t => !t.notes && Math.abs(t.amount) > 100);
    if (missingNotes.length > 0) {
      alerts.push({ title: `${missingNotes.length} Large items missing notes`, type: 'warning', icon: Info });
    }

    const unmapped = filteredTransactions.filter(t => !t.category_1 && Math.abs(t.amount) > 50);
    if (unmapped.length > 0) {
      alerts.push({ title: `${unmapped.length} Uncategorized transactions`, type: 'info', icon: Search });
    }

    return alerts;
  }, [filteredTransactions, deductionBuckets]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(val));
  };

  const totalIncome = businessIncome.reduce((s, t) => s + t.amount, 0);
  const totalDeductions = Object.values(deductionBuckets).reduce((s, b) => {
    const bucketTotal = b.items.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    return s + (bucketTotal * (b.percent / 100));
  }, 0);

  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background pb-20 print:bg-white print:pb-0">
      <div className="max-w-6xl mx-auto p-4 sm:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 print:hidden">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild className="rounded-xl">
              <Link to="/"><ArrowLeft className="w-5 h-5" /></Link>
            </Button>
            <div>
              <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
                <Calculator className="w-8 h-8 text-primary" />
                Accountant Portal
              </h1>
              <p className="text-muted-foreground">Consolidated business deductions and work expenses</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild className="rounded-xl gap-2">
              <Link to="/settings?tab=accountant"><SettingsIcon className="w-4 h-4" /> Configure</Link>
            </Button>
            <Button variant="outline" onClick={() => window.print()} className="rounded-xl gap-2">
              <Printer className="w-4 h-4" /> Print Report
            </Button>
            <Button className="rounded-xl gap-2">
              <Download className="w-4 h-4" /> Export for Tax
            </Button>
          </div>
        </div>

        {/* Print Header */}
        <div className="hidden print:block border-b-4 border-primary pb-6 mb-8">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-black tracking-tight text-primary uppercase">Tax Deduction Report</h1>
              <p className="text-lg font-bold mt-1">
                {reportType === 'fy' ? 'Financial Year' : 'Calendar Year'} Ending {selectedYear}
              </p>
              <p className="text-sm text-muted-foreground mt-2">Generated for: {session?.user.email}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Date Generated</p>
              <p className="font-bold">{format(new Date(), 'MMMM dd, yyyy')}</p>
            </div>
          </div>
        </div>

        {/* Audit & Controls Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
          <Card className="lg:col-span-2 border-0 shadow-lg">
            <CardContent className="p-6 flex flex-wrap items-end gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Report Period</label>
                <Select value={reportType} onValueChange={(v: any) => setReportType(v)}>
                  <SelectTrigger className="w-48 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fy">Financial Year (Jul-Jun)</SelectItem>
                    <SelectItem value="cy">Calendar Year (Jan-Dec)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Year Ending</label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-32 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex-1 text-right">
                <p className="text-sm text-muted-foreground">
                  Period: <span className="font-bold text-foreground">{format(reportInterval.start, 'MMM dd, yyyy')}</span> to <span className="font-bold text-foreground">{format(reportInterval.end, 'MMM dd, yyyy')}</span>
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Audit Readiness
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {auditAlerts.length === 0 ? (
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" /> All items look good
                </div>
              ) : (
                auditAlerts.map((alert, i) => (
                  <div key={i} className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-xs font-medium">
                    <alert.icon className="w-3.5 h-3.5" /> {alert.title}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Data Status Debugger (Helpful for user) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print:hidden">
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-muted/50 border">
            <div className="p-2 rounded-xl bg-background shadow-sm"><Database className="w-4 h-4 text-primary" /></div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Total in Database</p>
              <p className="text-lg font-black">{transactions.length} transactions</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-muted/50 border">
            <div className="p-2 rounded-xl bg-background shadow-sm"><Calendar className="w-4 h-4 text-primary" /></div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">In Selected Period</p>
              <p className="text-lg font-black">{filteredTransactions.length} transactions</p>
            </div>
          </div>
        </div>

        {/* High Level P&L Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-0 shadow-xl bg-emerald-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium opacity-80">Business Income</p>
                <TrendingUp className="w-5 h-5 opacity-50" />
              </div>
              <p className="text-3xl font-black">{formatCurrency(totalIncome)}</p>
              <p className="text-xs opacity-70 mt-1">{businessIncome.length} transactions</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-xl bg-rose-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium opacity-80">Estimated Deductions</p>
                <TrendingDown className="w-5 h-5 opacity-50" />
              </div>
              <p className="text-3xl font-black">{formatCurrency(totalDeductions)}</p>
              <p className="text-xs opacity-70 mt-1">Adjusted for business use %</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-xl bg-primary text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium opacity-80">Net Business Position</p>
                <Calculator className="w-5 h-5 opacity-50" />
              </div>
              <p className="text-3xl font-black">{formatCurrency(totalIncome - totalDeductions)}</p>
              <p className="text-xs opacity-70 mt-1">Estimated taxable profit</p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Breakdown Sections */}
        <div className="space-y-8">
          {/* Empty State Helper */}
          {filteredTransactions.length > 0 && businessIncome.length === 0 && Object.values(deductionBuckets).every(b => b.items.length === 0) && (
            <Card className="border-2 border-dashed p-12 text-center space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">No business data found in this period</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  We found {filteredTransactions.length} transactions between {format(reportInterval.start, 'MMM yyyy')} and {format(reportInterval.end, 'MMM yyyy')}, but none are marked as **Work** or match your **Deduction Keywords**.
                </p>
              </div>
              <div className="flex justify-center gap-3">
                <Button asChild variant="outline" className="rounded-xl">
                  <Link to="/transactions">Go to Transactions</Link>
                </Button>
                <Button asChild className="rounded-xl">
                  <Link to="/settings?tab=accountant">Update Keywords</Link>
                </Button>
              </div>
            </Card>
          )}

          {/* Income Section */}
          {businessIncome.length > 0 && (
            <Card className="border-0 shadow-xl overflow-hidden">
              <CardHeader className="bg-emerald-50 dark:bg-emerald-950/30 border-b">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-white dark:bg-card shadow-sm text-emerald-600">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-emerald-900 dark:text-emerald-100">Business Income</CardTitle>
                    <CardDescription className="text-emerald-800/80 dark:text-emerald-200/80">
                      Total gross income for this period: <span className="font-bold text-emerald-950 dark:text-emerald-50">{formatCurrency(totalIncome)}</span>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-32">Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {businessIncome.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="text-xs font-medium">{format(parseISO(t.transaction_date), 'MMM dd, yyyy')}</TableCell>
                        <TableCell className="text-sm font-bold">{t.description}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px] rounded-lg bg-white dark:bg-card">{t.category_1}</Badge></TableCell>
                        <TableCell className="text-right font-black text-emerald-600">{formatCurrency(t.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Deduction Buckets */}
          {Object.entries(deductionBuckets).map(([key, bucket]) => {
            if (bucket.items.length === 0) return null;
            const rawTotal = bucket.items.reduce((s, t) => s + Math.abs(t.amount), 0);
            const adjustedTotal = rawTotal * (bucket.percent / 100);

            return (
              <Card key={key} className="border-0 shadow-xl overflow-hidden break-inside-avoid">
                <CardHeader className={cn("border-b", bucket.bg, "dark:bg-muted/20")}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-xl bg-white dark:bg-card shadow-sm", bucket.color)}>
                        <bucket.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <CardTitle className={cn("text-xl", bucket.text, "dark:text-foreground")}>{bucket.label}</CardTitle>
                        <CardDescription className={cn(bucket.text, "opacity-80 dark:text-muted-foreground")}>
                          Raw Total: <span className="font-bold">{formatCurrency(rawTotal)}</span> 
                          {bucket.percent < 100 && (
                            <> · Claiming <span className="font-bold">{bucket.percent}%</span> → <span className="font-bold">{formatCurrency(adjustedTotal)}</span></>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="w-32">Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="w-1/4">Notes / Accountant Info</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bucket.items.map((t) => (
                        <TableRow key={t.id} className="hover:bg-muted/20">
                          <TableCell className="text-xs font-medium">{format(parseISO(t.transaction_date), 'MMM dd, yyyy')}</TableCell>
                          <TableCell className="text-sm font-bold">{t.description}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] rounded-lg bg-white dark:bg-card">
                              {t.category_1 || 'Uncategorized'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-black text-rose-600">{formatCurrency(t.amount)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground italic">
                            {t.notes || (Math.abs(t.amount) > 100 ? <span className="text-amber-500 flex items-center gap-1"><Info className="w-3 h-3" /> Needs description</span> : '—')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Accountant Summary Box */}
        <Card className="border-2 border-dashed border-primary/30 bg-primary/5 print:border-solid print:border-2">
          <CardContent className="p-8">
            <div className="flex items-start gap-6">
              <div className="p-4 bg-primary rounded-2xl text-white shrink-0">
                <FileText className="w-10 h-10" />
              </div>
              <div className="space-y-4 flex-1">
                <div>
                  <h3 className="text-2xl font-black tracking-tight">Accountant Summary</h3>
                  <p className="text-muted-foreground">Key figures for tax return preparation</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 pt-4">
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Total Business Income</p>
                    <p className="text-3xl font-black text-emerald-600">{formatCurrency(totalIncome)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Total Deductions</p>
                    <p className="text-3xl font-black text-rose-600">{formatCurrency(totalDeductions)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Estimated Profit</p>
                    <p className="text-3xl font-black text-primary">{formatCurrency(totalIncome - totalDeductions)}</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-primary/10">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    <strong>Note to Accountant:</strong> This report includes all transactions identified as business-related or mixed-use. Mixed-use items (Rent, Utilities, Phone, Fuel) have been estimated at the percentages shown above. Please review and adjust based on actual logbooks or home-office calculations.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AccountantPortal;