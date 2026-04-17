"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  FileSpreadsheet, 
  Download, 
  Calendar, 
  CheckCircle2, 
  Loader2, 
  ArrowRight,
  ShieldCheck,
  Info,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import { format, startOfYear, endOfYear, parseISO, isWithinInterval } from 'date-fns';
import { showError, showSuccess } from '@/utils/toast';
import { generateExcel, prepareAccountantData } from '@/utils/excelExport';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

const ExportCenter = () => {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [reportType, setReportType] = useState<'fy' | 'cy'>('fy');
  
  const [data, setData] = useState<{ transactions: any[], invoices: any[], settings: any }>({ 
    transactions: [], 
    invoices: [],
    settings: null
  });

  const reportInterval = useMemo(() => {
    const year = parseInt(selectedYear);
    if (reportType === 'cy') {
      return { start: new Date(year, 0, 1), end: new Date(year, 11, 31, 23, 59, 59) };
    } else {
      return { start: new Date(year - 1, 6, 1), end: new Date(year, 5, 30, 23, 59, 59) };
    }
  }, [selectedYear, reportType]);

  const periodLabel = useMemo(() => {
    if (reportType === 'cy') return `Calendar Year ${selectedYear}`;
    return `Financial Year ${parseInt(selectedYear) - 1}-${selectedYear}`;
  }, [selectedYear, reportType]);

  useEffect(() => {
    if (session) fetchAllData();
  }, [session, reportInterval]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const startDateStr = format(reportInterval.start, 'yyyy-MM-dd');
      const endDateStr = format(reportInterval.end, 'yyyy-MM-dd');

      // Fetch transactions with pagination to ensure we get everything in the range
      let allTransactions: any[] = [];
      let from = 0;
      const step = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: txns, error: txnsError } = await supabase
          .from('finance_transactions')
          .select('*')
          .gte('transaction_date', startDateStr)
          .lte('transaction_date', endDateStr)
          .order('transaction_date', { ascending: false })
          .range(from, from + step - 1);

        if (txnsError) throw txnsError;
        
        if (txns && txns.length > 0) {
          allTransactions = [...allTransactions, ...txns];
          if (txns.length < step) hasMore = false;
          else from += step;
        } else {
          hasMore = false;
        }
      }

      // Fetch invoices for the same range
      const { data: invoices, error: invsError } = await supabase
        .from('invoices')
        .select('*')
        .gte('invoice_date', startDateStr)
        .lte('invoice_date', endDateStr)
        .order('invoice_date', { ascending: false });

      if (invsError) throw invsError;

      // Fetch settings
      const { data: settings, error: settingsError } = await supabase
        .from('settings')
        .select('*')
        .eq('owner_user_id', session?.user.id)
        .single();

      setData({
        transactions: allTransactions,
        invoices: invoices || [],
        settings: settings || null
      });
    } catch (error: any) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const checklist = useMemo(() => {
    const workTxns = data.transactions.filter(t => t.is_work);
    const missingNotes = workTxns.filter(t => !t.notes && Math.abs(t.amount) > 50 && (t.category_1 || '').toLowerCase() !== 'phone');
    const missingCategories = workTxns.filter(t => !t.category_1);

    return {
      hasTransactions: data.transactions.length > 0,
      workIdentified: workTxns.length > 0,
      allNotes: missingNotes.length === 0,
      allCategories: missingCategories.length === 0,
      missingNotesCount: missingNotes.length,
      missingCategoriesCount: missingCategories.length
    };
  }, [data.transactions]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const exportPayload = prepareAccountantData(
        data.transactions, 
        data.invoices, 
        periodLabel, 
        data.settings,
        reportInterval
      );
      generateExcel(exportPayload);
      showSuccess(`Excel report generated for ${periodLabel}`);
    } catch (error: any) {
      showError('Failed to generate Excel file');
    } finally {
      setExporting(false);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i + 1).toString());

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-8">
      <header className="space-y-2 animate-fade-in">
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
          <div className="p-2.5 bg-emerald-600 rounded-2xl text-white shadow-lg shadow-emerald-200">
            <FileSpreadsheet className="w-7 h-7" />
          </div>
          Export Center
        </h1>
        <p className="text-muted-foreground">Generate professional Excel workbooks for your accountant.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <Card className="border-0 shadow-xl overflow-hidden">
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle className="text-lg">Report Configuration</CardTitle>
              <CardDescription>Select the period you want to export.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Report Type</label>
                  <div className="flex p-1 bg-muted rounded-xl">
                    <Button 
                      variant={reportType === 'fy' ? 'secondary' : 'ghost'} 
                      className="flex-1 rounded-lg font-bold"
                      onClick={() => setReportType('fy')}
                    >
                      Financial Year
                    </Button>
                    <Button 
                      variant={reportType === 'cy' ? 'secondary' : 'ghost'} 
                      className="flex-1 rounded-lg font-bold"
                      onClick={() => setReportType('cy')}
                    >
                      Calendar Year
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Year Ending</label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="h-12 rounded-xl font-bold text-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map(y => <SelectItem key={y} value={y} className="font-bold">{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-emerald-900">{periodLabel}</p>
                    <p className="text-xs text-emerald-700 opacity-80">
                      {format(reportInterval.start, 'MMM dd, yyyy')} — {format(reportInterval.end, 'MMM dd, yyyy')}
                    </p>
                  </div>
                </div>
                <Badge className="bg-emerald-600 text-white border-0">
                  {data.transactions.length} Items Found
                </Badge>
              </div>

              <Button 
                onClick={handleExport} 
                disabled={exporting || data.transactions.length === 0}
                className="w-full h-16 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xl shadow-xl shadow-emerald-200 gap-3 transition-all active:scale-[0.98]"
              >
                {exporting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Download className="w-6 h-6" />}
                Download Excel Workbook
              </Button>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="border-0 shadow-lg bg-blue-50 border-l-4 border-blue-500">
              <CardContent className="p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-black uppercase text-blue-900">What's included?</p>
                  <p className="text-xs text-blue-800 leading-relaxed">
                    Summary P&L, Monthly Matrix, Category Totals, and Invoice History.
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg bg-amber-50 border-l-4 border-amber-500">
              <CardContent className="p-4 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-black uppercase text-amber-900">Accountant Ready</p>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Formatted for easy import into Xero, MYOB, or QuickBooks.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="border-0 shadow-xl bg-slate-900 text-white overflow-hidden">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-widest opacity-70">Export Checklist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-5 h-5 rounded-full border flex items-center justify-center", checklist.workIdentified ? "bg-emerald-500 border-emerald-500" : "border-white/20")}>
                      {checklist.workIdentified && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                    <span className="font-medium">Work items identified</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-5 h-5 rounded-full border flex items-center justify-center", (checklist.allNotes || !checklist.hasTransactions) ? "bg-emerald-500 border-emerald-500" : "bg-amber-500 border-amber-500")}>
                      {(checklist.allNotes || !checklist.hasTransactions) ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                    </div>
                    <span className="font-medium">Notes for large items</span>
                  </div>
                  {!checklist.allNotes && checklist.hasTransactions && (
                    <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-400">
                      {checklist.missingNotesCount} missing
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-5 h-5 rounded-full border flex items-center justify-center", (checklist.allCategories || !checklist.hasTransactions) ? "bg-emerald-500 border-emerald-500" : "bg-amber-500 border-amber-500")}>
                      {(checklist.allCategories || !checklist.hasTransactions) ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                    </div>
                    <span className="font-medium">Categories assigned</span>
                  </div>
                  {!checklist.allCategories && checklist.hasTransactions && (
                    <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-400">
                      {checklist.missingCategoriesCount} missing
                    </Badge>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-white/10">
                <Button variant="secondary" asChild className="w-full rounded-xl font-bold gap-2">
                  <Link to="/accountant-report">
                    Review & Fix Data <ChevronRight className="w-4 h-4" />
                  </Link>
                </Button>
                <p className="text-[10px] text-slate-400 mt-3 text-center leading-relaxed">
                  Accountants require categories and notes (for items {'>'}$50) to maximize your tax deductions.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ExportCenter;