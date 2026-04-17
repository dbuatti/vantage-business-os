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
  Info
} from 'lucide-react';
import { format, startOfYear, endOfYear, parseISO, isWithinInterval } from 'date-fns';
import { showError, showSuccess } from '@/utils/toast';
import { generateExcel, prepareAccountantData } from '@/utils/excelExport';
import { cn } from '@/lib/utils';

const ExportCenter = () => {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [reportType, setReportType] = useState<'fy' | 'cy'>('fy');
  
  const [data, setData] = useState<{ transactions: any[], invoices: any[] }>({ transactions: [], invoices: [] });

  useEffect(() => {
    if (session) fetchAllData();
  }, [session]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Fetch all transactions and invoices to filter locally for any year
      const [txnsRes, invsRes] = await Promise.all([
        supabase.from('finance_transactions').select('*').order('transaction_date', { ascending: false }),
        supabase.from('invoices').select('*').order('invoice_date', { ascending: false })
      ]);

      setData({
        transactions: txnsRes.data || [],
        invoices: invsRes.data || []
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

  const periodLabel = useMemo(() => {
    if (reportType === 'cy') return `Calendar Year ${selectedYear}`;
    return `Financial Year ${parseInt(selectedYear) - 1}-${selectedYear}`;
  }, [selectedYear, reportType]);

  const filteredData = useMemo(() => {
    const txns = data.transactions.filter(t => {
      const date = parseISO(t.transaction_date);
      return isWithinInterval(date, reportInterval);
    });
    const invs = data.invoices.filter(i => {
      const date = parseISO(i.invoice_date);
      return isWithinInterval(date, reportInterval);
    });
    return { txns, invs };
  }, [data, reportInterval]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const exportPayload = prepareAccountantData(filteredData.txns, filteredData.invs, periodLabel);
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
                  {filteredData.txns.length} Items Found
                </Badge>
              </div>

              <Button 
                onClick={handleExport} 
                disabled={exporting || filteredData.txns.length === 0}
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
                    Summary P&L, Category Totals, Detailed Transaction Log, and Invoice History.
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
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <div className={cn("w-5 h-5 rounded-full border flex items-center justify-center", filteredData.txns.filter(t => t.is_work).length > 0 ? "bg-emerald-500 border-emerald-500" : "border-white/20")}>
                  {filteredData.txns.filter(t => t.is_work).length > 0 && <CheckCircle2 className="w-3.5 h-3.5" />}
                </div>
                <span className="font-medium">Work items identified</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className={cn("w-5 h-5 rounded-full border flex items-center justify-center", filteredData.txns.filter(t => t.is_work && !t.notes).length === 0 ? "bg-emerald-500 border-emerald-500" : "border-white/20")}>
                  {filteredData.txns.filter(t => t.is_work && !t.notes).length === 0 && <CheckCircle2 className="w-3.5 h-3.5" />}
                </div>
                <span className="font-medium">All work items have notes</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className={cn("w-5 h-5 rounded-full border flex items-center justify-center", filteredData.txns.filter(t => t.is_work && !t.category_1).length === 0 ? "bg-emerald-500 border-emerald-500" : "border-white/20")}>
                  {filteredData.txns.filter(t => t.is_work && !t.category_1).length === 0 && <CheckCircle2 className="w-3.5 h-3.5" />}
                </div>
                <span className="font-medium">Categories assigned</span>
              </div>

              <div className="pt-4 border-t border-white/10">
                <Button variant="link" asChild className="text-emerald-400 p-0 h-auto font-bold hover:text-emerald-300">
                  <a href="/accountant-report" className="flex items-center gap-2">
                    Review data before export <ArrowRight className="w-4 h-4" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ExportCenter;