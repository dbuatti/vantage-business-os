
import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Music, Sparkles, Calculator, History, TrendingUp, Filter, Info } from "lucide-react";
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Transaction, TaxAveragingHistory } from '@/types/finance';
import { TaxAveragingCalculator } from '@/components/TaxAveragingCalculator';
import { HistoricalTPIForm } from '@/components/HistoricalTPIForm';
import TransactionTable from '@/components/TransactionTable';
import { formatCurrency } from '@/utils/format';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TaxAveraging = () => {
  const { session } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [historicalTPIs, setHistoricalTPIs] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [financialYear, setFinancialYear] = useState('2024-25');

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session, financialYear]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch transactions for the selected financial year
      // FY 2024-25 is 2024-07-01 to 2025-06-30
      const startYear = parseInt(financialYear.split('-')[0]);
      const startDate = `${startYear}-07-01`;
      const endDate = `${startYear + 1}-06-30`;

      const { data: transData, error: transError } = await supabase
        .from('finance_transactions')
        .select('*')
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate)
        .order('transaction_date', { ascending: false });

      if (transError) throw transError;
      setTransactions(transData || []);

      // Fetch historical TPIs
      const { data: histData, error: histError } = await supabase
        .from('tax_averaging_history')
        .select('*')
        .order('year', { ascending: false })
        .limit(4);

      if (histError) throw histError;
      
      // Ensure we have 4 values, even if 0
      const histValues = [0, 0, 0, 0];
      histData?.forEach((h, i) => {
        if (i < 4) histValues[i] = parseFloat(h.amount);
      });
      setHistoricalTPIs(histValues);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const musicTransactions = transactions.filter(t => t.business_stream === 'Music');
  const kinesiologyTransactions = transactions.filter(t => t.business_stream === 'Kinesiology');
  
  const musicIncome = musicTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
  const musicExpenses = Math.abs(musicTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0));
  const musicNet = musicIncome - musicExpenses;

  const kineIncome = kinesiologyTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
  const kineExpenses = Math.abs(kinesiologyTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0));
  const kineNet = kineIncome - kineExpenses;

  const totalTaxableIncome = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0) - 
                             Math.abs(transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0));

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900">Tax Averaging</h1>
            <p className="text-slate-500 font-medium mt-1">Manage business streams and ATO special professional averaging.</p>
          </div>
          <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border shadow-sm">
            <div className="flex items-center gap-2 px-3 text-slate-400">
              <Filter className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Financial Year</span>
            </div>
            <Select value={financialYear} onValueChange={setFinancialYear}>
              <SelectTrigger className="w-[140px] border-none shadow-none focus:ring-0 font-bold">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="2024-25">FY 2024-25</SelectItem>
                <SelectItem value="2025-26">FY 2025-26</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="averaging" className="space-y-8">
          <TabsList className="bg-slate-100/50 p-1 rounded-2xl border w-full md:w-auto">
            <TabsTrigger value="averaging" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
              <Calculator className="h-4 w-4" />
              <span className="font-bold">Tax Averaging</span>
            </TabsTrigger>
            <TabsTrigger value="music" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
              <Music className="h-4 w-4" />
              <span className="font-bold">Music Stream</span>
            </TabsTrigger>
            <TabsTrigger value="kinesiology" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="font-bold">Kinesiology</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="averaging" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <TaxAveragingCalculator 
                  totalTaxableIncome={totalTaxableIncome}
                  currentProfessionalIncome={musicNet}
                  historicalTPIs={historicalTPIs}
                />
                
                <Card className="border-slate-100 shadow-sm overflow-hidden">
                  <CardHeader className="bg-slate-50/50 border-b">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-indigo-600" />
                      Income Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x">
                      <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-slate-500">Music (Professional)</p>
                          <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-none">Averagable</Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Income</span>
                            <span className="font-bold text-emerald-600">{formatCurrency(musicIncome)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Expenses</span>
                            <span className="font-bold text-rose-600">-{formatCurrency(musicExpenses)}</span>
                          </div>
                          <div className="pt-2 border-t flex justify-between">
                            <span className="font-black text-slate-900">Net Professional</span>
                            <span className="font-black text-indigo-600">{formatCurrency(musicNet)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-slate-500">Kinesiology (Other)</p>
                          <Badge variant="outline" className="text-slate-400 border-slate-200">Standard</Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Income</span>
                            <span className="font-bold text-emerald-600">{formatCurrency(kineIncome)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Expenses</span>
                            <span className="font-bold text-rose-600">-{formatCurrency(kineExpenses)}</span>
                          </div>
                          <div className="pt-2 border-t flex justify-between">
                            <span className="font-black text-slate-900">Net Other</span>
                            <span className="font-black text-slate-600">{formatCurrency(kineNet)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="space-y-8">
                <HistoricalTPIForm onUpdate={fetchData} />
                
                <Card className="bg-amber-50 border-amber-100 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-amber-800 flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      ATO Rule Reminder
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-amber-700 leading-relaxed">
                      Income averaging for special professionals (performers, composers, artists) helps smooth out tax liabilities when income fluctuates significantly. 
                      <br /><br />
                      Only your <strong>Music</strong> business income qualifies for this averaging. Your <strong>Kinesiology</strong> income is treated as standard taxable income.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="music" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-indigo-50 border-indigo-100">
                <CardContent className="pt-6">
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">Music Income</p>
                  <p className="text-2xl font-black text-indigo-700">{formatCurrency(musicIncome)}</p>
                </CardContent>
              </Card>
              <Card className="bg-rose-50 border-rose-100">
                <CardContent className="pt-6">
                  <p className="text-[10px] font-black uppercase tracking-widest text-rose-400 mb-1">Music Expenses</p>
                  <p className="text-2xl font-black text-rose-700">{formatCurrency(musicExpenses)}</p>
                </CardContent>
              </Card>
              <Card className="bg-emerald-50 border-emerald-100">
                <CardContent className="pt-6">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1">Net Music Profit</p>
                  <p className="text-2xl font-black text-emerald-700">{formatCurrency(musicNet)}</p>
                </CardContent>
              </Card>
            </div>
            <Card className="border-slate-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Music Transactions</CardTitle>
                <CardDescription>All transactions tagged as 'Music' for the selected period.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <TransactionTable 
                  transactions={musicTransactions}
                  loading={loading}
                  selectedIds={new Set()}
                  onToggleSelect={() => {}}
                  onToggleSelectAll={() => {}}
                  onEdit={() => {}}
                  onDelete={() => {}}
                  expandedId={null}
                  onToggleExpand={() => {}}
                  sortField="date"
                  sortOrder="desc"
                  onSort={() => {}}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="kinesiology" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-emerald-50 border-emerald-100">
                <CardContent className="pt-6">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1">Kinesiology Income</p>
                  <p className="text-2xl font-black text-emerald-700">{formatCurrency(kineIncome)}</p>
                </CardContent>
              </Card>
              <Card className="bg-rose-50 border-rose-100">
                <CardContent className="pt-6">
                  <p className="text-[10px] font-black uppercase tracking-widest text-rose-400 mb-1">Kinesiology Expenses</p>
                  <p className="text-2xl font-black text-rose-700">{formatCurrency(kineExpenses)}</p>
                </CardContent>
              </Card>
              <Card className="bg-blue-50 border-blue-100">
                <CardContent className="pt-6">
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">Net Kinesiology Profit</p>
                  <p className="text-2xl font-black text-blue-700">{formatCurrency(kineNet)}</p>
                </CardContent>
              </Card>
            </div>
            <Card className="border-slate-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Kinesiology Transactions</CardTitle>
                <CardDescription>All transactions tagged as 'Kinesiology' for the selected period.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <TransactionTable 
                  transactions={kinesiologyTransactions}
                  loading={loading}
                  selectedIds={new Set()}
                  onToggleSelect={() => {}}
                  onToggleSelectAll={() => {}}
                  onEdit={() => {}}
                  onDelete={() => {}}
                  expandedId={null}
                  onToggleExpand={() => {}}
                  sortField="date"
                  sortOrder="desc"
                  onSort={() => {}}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default TaxAveraging;
