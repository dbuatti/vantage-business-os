"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  AlertCircle
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
      const { data, error } = await supabase
        .from('finance_transactions')
        .select('*')
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
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

  // Logic to identify specific deduction buckets
  const deductionBuckets = useMemo(() => {
    const buckets = {
      rent: { label: 'Rent & Home Office', icon: Home, color: 'text-blue-600', bg: 'bg-blue-50', keywords: ['rent', 'lease', 'storage'], items: [] as Transaction[] },
      bills: { label: 'Utilities & Bills', icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50', keywords: ['bill', 'electricity', 'water', 'gas', 'power', 'rates'], items: [] as Transaction[] },
      phone: { label: 'Phone & Internet', icon: Phone, color: 'text-purple-600', bg: 'bg-purple-50', keywords: ['phone', 'mobile', 'internet', 'telstra', 'optus', 'vodafone', 'nbn'], items: [] as Transaction[] },
      fuel: { label: 'Fuel & Transport', icon: Fuel, color: 'text-orange-600', bg: 'bg-orange-50', keywords: ['fuel', 'petrol', 'gas station', 'shell', 'caltex', '7-eleven', 'ampol', 'bp', 'toll', 'myki', 'parking'], items: [] as Transaction[] },
      other: { label: 'Other Work Expenses', icon: Briefcase, color: 'text-emerald-600', bg: 'bg-emerald-50', keywords: [], items: [] as Transaction[] }
    };

    filteredTransactions.forEach(t => {
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
  }, [filteredTransactions]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(val));
  };

  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Calculator className="w-8 h-8 animate-pulse text-primary" /></div>;

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

        {/* Controls */}
        <Card className="border-0 shadow-lg print:hidden">
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

        {/* Deduction Summary Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {Object.entries(deductionBuckets).map(([key, bucket]) => {
            const total = bucket.items.reduce((s, t) => s + Math.abs(t.amount), 0);
            return (
              <Card key={key} className="border-0 shadow-xl overflow-hidden group hover:shadow-2xl transition-all">
                <div className={cn("h-1", bucket.color.replace('text', 'bg'))} />
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className={cn("p-2 rounded-xl", bucket.bg)}>
                      <bucket.icon className={cn("w-5 h-5", bucket.color)} />
                    </div>
                    <Badge variant="outline" className="rounded-lg text-[10px]">{bucket.items.length} items</Badge>
                  </div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{bucket.label}</p>
                  <p className={cn("text-2xl font-black mt-1", bucket.color)}>{formatCurrency(total)}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Detailed Breakdown Sections */}
        <div className="space-y-8">
          {Object.entries(deductionBuckets).map(([key, bucket]) => {
            if (bucket.items.length === 0) return null;
            const total = bucket.items.reduce((s, t) => s + Math.abs(t.amount), 0);

            return (
              <Card key={key} className="border-0 shadow-xl overflow-hidden break-inside-avoid">
                <CardHeader className={cn("border-b", bucket.bg)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-xl bg-white shadow-sm", bucket.color)}>
                        <bucket.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{bucket.label}</CardTitle>
                        <CardDescription>Total identified for this period: <span className="font-bold text-foreground">{formatCurrency(total)}</span></CardDescription>
                      </div>
                    </div>
                    <div className="text-right print:hidden">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground">Accountant Note</p>
                      <p className="text-xs italic">Review for business % use</p>
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
                            <Badge variant="outline" className="text-[10px] rounded-lg bg-white">
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
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Total Work Expenses</p>
                    <p className="text-3xl font-black text-primary">
                      {formatCurrency(Object.values(deductionBuckets).reduce((s, b) => s + b.items.reduce((sum, t) => sum + Math.abs(t.amount), 0), 0))}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Mixed-Use Items</p>
                    <p className="text-3xl font-black text-amber-600">
                      {deductionBuckets.rent.items.length + deductionBuckets.bills.items.length + deductionBuckets.phone.items.length + deductionBuckets.fuel.items.length}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Audit Readiness</p>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                      <span className="font-bold text-emerald-600">High</span>
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t border-primary/10">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    <strong>Note to Accountant:</strong> This report includes all transactions identified as business-related or mixed-use (Rent, Utilities, Phone, Fuel). Please apply the relevant business-use percentages as discussed during our consultation.
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