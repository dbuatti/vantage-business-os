"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Repeat, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingDown, 
  CreditCard, 
  ShieldAlert,
  Zap,
  ArrowRight,
  Info,
  Search,
  Filter,
  Trash2,
  ExternalLink,
  Sparkles,
  Cloud,
  Brain,
  Music,
  Video,
  Mail,
  Globe,
  Loader2,
  ChevronRight
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/format';
import { Transaction } from '@/types/finance';

interface SubscriptionService {
  name: string;
  normalizedName: string;
  monthlyCost: number;
  totalSpent: number;
  count: number;
  lastDate: string;
  frequency: 'Weekly' | 'Monthly' | 'Yearly' | 'Irregular';
  category: string;
  isWork: boolean;
  isAI: boolean;
  transactions: Transaction[];
  alerts: string[];
}

const SubscriptionAuditPage = () => {
  const { session } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (session) fetchTransactions();
  }, [session]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('finance_transactions')
        .select('*')
        .order('transaction_date', { ascending: false });
      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const audit = useMemo(() => {
    // Helper to strip bank metadata (receipts, dates, card numbers, locations)
    const cleanDescription = (desc: string) => {
      return desc
        .replace(/Visa Purchase - Receipt \d+/gi, '')
        .replace(/In [A-Z\s]+ Date \d{1,2} [A-Z]{3} \d{4}/gi, '')
        .replace(/Card \d{4}x+\d{4}/gi, '')
        .replace(/Foreign Currency Amount: [A-Z\s\d\.]+/gi, '')
        .replace(/Ref \d+/gi, '')
        .replace(/[\-\*#]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    };

    // 1. Filter for potential subscriptions
    const potentialSubs = transactions.filter(t => 
      t.amount < 0 && (
        t.category_1?.toLowerCase() === 'subscription' || 
        t.category_2?.toLowerCase() === 'subscription' ||
        t.description.toLowerCase().includes('sub ') || 
        t.description.toLowerCase().includes('monthly') ||
        t.description.toLowerCase().includes('membership') ||
        t.description.toLowerCase().includes('google workspace') ||
        t.description.toLowerCase().includes('apple.com/bill') ||
        t.description.toLowerCase().includes('notion') ||
        t.description.toLowerCase().includes('dropbox') ||
        t.description.toLowerCase().includes('sqsp') ||
        t.description.toLowerCase().includes('adobe') ||
        t.description.toLowerCase().includes('microsoft')
      )
    );

    // 2. Normalize and Group
    const groups: Record<string, Transaction[]> = {};
    potentialSubs.forEach(t => {
      const cleaned = cleanDescription(t.description);
      // Further normalize for grouping (uppercase, remove small numbers)
      const normalized = cleaned
        .replace(/\d+/g, '')
        .trim()
        .toUpperCase();
      
      if (!groups[normalized]) groups[normalized] = [];
      groups[normalized].push(t);
    });

    // 3. Analyze each group
    const services: SubscriptionService[] = Object.entries(groups)
      .map(([normalizedName, txns]) => {
        const sorted = [...txns].sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
        const latestAmount = Math.abs(sorted[0].amount);
        const totalSpent = txns.reduce((s, t) => s + Math.abs(t.amount), 0);
        
        // Frequency detection
        let frequency: any = 'Monthly';
        if (txns.length >= 2) {
          const days = Math.abs(differenceInDays(parseISO(sorted[0].transaction_date), parseISO(sorted[1].transaction_date)));
          if (days > 300) frequency = 'Yearly';
          else if (days < 10) frequency = 'Weekly';
          else if (days > 45) frequency = 'Irregular';
        }

        const isAI = normalizedName.includes('AI') || normalizedName.includes('OPENAI') || normalizedName.includes('MOISES') || normalizedName.includes('CLAUDE');
        const isWork = txns.some(t => t.is_work) || normalizedName.includes('WORKSPACE') || normalizedName.includes('NOTION') || normalizedName.includes('AVID');

        const alerts: string[] = [];
        if (latestAmount > 50) alerts.push('High Cost');
        
        // Check for multiple charges in same month (Duplicate detection)
        const lastMonth = format(parseISO(sorted[0].transaction_date), 'yyyy-MM');
        const chargesThisMonth = txns.filter(t => format(parseISO(t.transaction_date), 'yyyy-MM') === lastMonth);
        if (chargesThisMonth.length > 1) alerts.push('Multiple Streams');

        return {
          name: cleanDescription(sorted[0].description),
          normalizedName,
          monthlyCost: frequency === 'Yearly' ? latestAmount / 12 : latestAmount,
          totalSpent,
          count: txns.length,
          lastDate: sorted[0].transaction_date,
          frequency,
          category: sorted[0].category_1 || 'Other',
          isWork,
          isAI,
          transactions: txns,
          alerts
        };
      })
      .filter(s => s.count >= 1)
      .sort((a, b) => b.monthlyCost - a.monthlyCost);

    // 4. Global Insights
    const totalMonthlyBurn = services.reduce((s, v) => s + v.monthlyCost, 0);
    const aiSpend = services.filter(s => s.isAI).reduce((s, v) => s + v.monthlyCost, 0);
    const workSpend = services.filter(s => s.isWork).reduce((s, v) => s + v.monthlyCost, 0);
    
    const cloudServices = services.filter(s => s.normalizedName.includes('DROPBOX') || s.normalizedName.includes('GOOGLE') || s.normalizedName.includes('ICLOUD'));
    const redundancyAlerts = cloudServices.length > 1 ? [`You have ${cloudServices.length} different cloud storage/workspace providers active.`] : [];

    return { services, totalMonthlyBurn, aiSpend, workSpend, redundancyAlerts };
  }, [transactions]);

  const filteredServices = audit.services.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 pb-24">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 animate-fade-in">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-primary rounded-2xl text-white shadow-lg shadow-primary/20">
              <Repeat className="w-7 h-7" />
            </div>
            Subscription Audit
          </h1>
          <p className="text-muted-foreground">Intelligent analysis of your recurring financial commitments.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text"
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 h-11 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 outline-none w-64"
            />
          </div>
        </div>
      </header>

      {/* High Level Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-slide-up">
        <Card className="border-0 shadow-xl bg-primary text-white overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
          <CardContent className="p-6 relative">
            <p className="text-xs font-black uppercase tracking-widest opacity-70 mb-1">Monthly Burn Rate</p>
            <p className="text-4xl font-black">{formatCurrency(audit.totalMonthlyBurn)}</p>
            <p className="text-xs opacity-70 mt-2">Across {audit.services.length} active services</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-xl bg-violet-600 text-white overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
          <CardContent className="p-6 relative">
            <p className="text-xs font-black uppercase tracking-widest opacity-70 mb-1">AI & Tools Investment</p>
            <p className="text-4xl font-black">{formatCurrency(audit.aiSpend)}</p>
            <p className="text-xs opacity-70 mt-2">{Math.round((audit.aiSpend / audit.totalMonthlyBurn) * 100)}% of total burn</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-xl bg-emerald-600 text-white overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
          <CardContent className="p-6 relative">
            <p className="text-xs font-black uppercase tracking-widest opacity-70 mb-1">Annual Commitment</p>
            <p className="text-4xl font-black">{formatCurrency(audit.totalMonthlyBurn * 12)}</p>
            <p className="text-xs opacity-70 mt-2">Projected yearly cost if unchanged</p>
          </CardContent>
        </Card>
      </div>

      {/* Intelligence Alerts */}
      {(audit.redundancyAlerts.length > 0 || audit.services.some(s => s.alerts.length > 0)) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up stagger-1">
          <Card className="border-0 shadow-xl bg-amber-50 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-amber-800 dark:text-amber-200 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" /> Redundancy Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {audit.redundancyAlerts.map((alert, i) => (
                <div key={i} className="flex items-start gap-3 text-sm text-amber-900 dark:text-amber-100 font-medium">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  <p>{alert}</p>
                </div>
              ))}
              {audit.services.filter(s => s.alerts.includes('Multiple Streams')).map((s, i) => (
                <div key={i} className="flex items-start gap-3 text-sm text-amber-900 dark:text-amber-100 font-medium">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  <p><span className="font-black">{s.name}</span> has multiple active billing streams. Check for duplicate accounts.</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-blue-50 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-blue-800 dark:text-blue-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Optimization Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3 text-sm text-blue-900 dark:text-blue-100 font-medium">
                <Zap className="w-4 h-4 text-blue-500 shrink-0" />
                <p>Switching <span className="font-black">Notion</span> to an annual plan could save you ~20% ($190/year).</p>
              </div>
              <div className="flex items-start gap-3 text-sm text-blue-900 dark:text-blue-100 font-medium">
                <Zap className="w-4 h-4 text-blue-500 shrink-0" />
                <p>You have {audit.services.filter(s => !s.isWork).length} personal entertainment subs. Totaling {formatCurrency(audit.services.filter(s => !s.isWork).reduce((s, v) => s + v.monthlyCost, 0))}/mo.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Service List */}
      <div className="space-y-4 animate-slide-up stagger-2">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Active Service Streams</h2>
          <Badge variant="outline" className="rounded-full">{filteredServices.length} Services</Badge>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {filteredServices.map((service) => (
            <Card key={service.normalizedName} className="border-0 shadow-lg hover:shadow-xl transition-all group overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                  {/* Service Info */}
                  <div className="p-6 flex-1 flex items-center gap-6">
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner border transition-colors",
                      service.isWork ? "bg-primary/5 border-primary/10 text-primary" : "bg-muted border-transparent text-muted-foreground",
                      service.isAI && "bg-violet-50 border-violet-100 text-violet-600"
                    )}>
                      {service.isAI ? <Brain className="w-7 h-7" /> : 
                       service.normalizedName.includes('DROPBOX') ? <Cloud className="w-7 h-7" /> :
                       service.normalizedName.includes('AVID') || service.normalizedName.includes('MOISES') ? <Music className="w-7 h-7" /> :
                       service.normalizedName.includes('DISNEY') ? <Video className="w-7 h-7" /> :
                       service.normalizedName.includes('GOOGLE') ? <Mail className="w-7 h-7" /> :
                       <CreditCard className="w-7 h-7" />}
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-black text-lg truncate">{service.name}</h3>
                        {service.isWork && <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[9px] font-black uppercase">Work</Badge>}
                        {service.isAI && <Badge className="bg-violet-100 text-violet-700 border-violet-200 text-[9px] font-black uppercase">AI</Badge>}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-bold uppercase tracking-tighter">
                        <span className="flex items-center gap-1"><Repeat className="w-3 h-3" /> {service.frequency}</span>
                        <span>•</span>
                        <span>Last: {format(parseISO(service.lastDate), 'MMM dd')}</span>
                        <span>•</span>
                        <span>{service.count} payments total</span>
                      </div>
                    </div>
                  </div>

                  {/* Alerts & Cost */}
                  <div className="bg-muted/30 md:w-80 p-6 flex items-center justify-between md:justify-end gap-8 border-t md:border-t-0 md:border-l">
                    <div className="flex flex-col items-end gap-1">
                      {service.alerts.map((alert, i) => (
                        <Badge key={i} variant="outline" className="bg-rose-50 text-rose-600 border-rose-200 text-[9px] font-black uppercase px-2 py-0.5">
                          {alert}
                        </Badge>
                      ))}
                    </div>
                    <div className="text-right min-w-[120px]">
                      <p className="text-2xl font-black tracking-tight">{formatCurrency(service.monthlyCost)}</p>
                      <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                        {service.frequency === 'Yearly' ? 'Per Month (Avg)' : 'Per Month'}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Footer Insight */}
      <footer className="pt-12">
        <Card className="border-0 shadow-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden">
          <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-2">
              <h3 className="text-xl font-black">Audit Summary</h3>
              <p className="text-slate-400 max-w-xl">
                You are currently committed to <span className="text-white font-bold">{formatCurrency(audit.totalMonthlyBurn * 12)}</span> in annual subscriptions. 
                We've identified <span className="text-amber-400 font-bold">{audit.services.filter(s => s.alerts.length > 0).length} services</span> that could be optimized or cancelled.
              </p>
            </div>
            <Button variant="secondary" className="rounded-2xl h-14 px-8 font-black text-base shadow-xl">
              Export Audit Report
            </Button>
          </CardContent>
        </Card>
      </footer>
    </div>
  );
};

export default SubscriptionAuditPage;