"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Calendar,
  Wand2,
  Bug,
  LayoutGrid,
  PieChart,
  ChevronRight,
  ShieldCheck,
  Lock,
  ClipboardCheck,
  ListChecks,
  Repeat,
  CreditCard,
  Copy,
  Check,
  Share2
} from 'lucide-react';
import { format, isWithinInterval, parseISO, isValid, differenceInDays } from 'date-fns';
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

interface CategoryGroup {
  category_name: string;
  group_name: string;
}

interface SubscriptionGroup {
  name: string;
  normalizedName: string;
  transactions: Transaction[];
  avgAmount: number;
  frequency: string;
  monthlyCost: number;
  annualCost: number;
  lastDate: string;
}

const AccountantPortal = () => {
  const { token } = useParams();
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDebug, setShowDebug] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [reportType, setReportType] = useState<'fy' | 'cy'>('fy');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  
  const [settings, setSettings] = useState({
    business_percents: { rent: 25, bills: 25, phone: 50, fuel: 40 },
    deduction_keywords: {
      rent: ['rent', 'lease', 'storage'],
      bills: ['bill', 'electricity', 'water', 'gas', 'power', 'rates'],
      phone: ['phone', 'mobile', 'internet', 'telstra', 'optus', 'vodafone', 'nbn'],
      fuel: ['fuel', 'petrol', 'gas station', 'shell', 'caltex', '7-eleven', 'ampol', 'bp', 'toll', 'myki', 'parking']
    }
  });

  const isPublic = !!token;

  useEffect(() => {
    if (!isPublic && !authLoading && !session) {
      navigate('/login');
    } else {
      fetchData();
    }
  }, [session, authLoading, navigate, token]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (isPublic) {
        const { data, error } = await supabase.functions.invoke('get-portal-data', {
          body: { token }
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);

        setTransactions(data.transactions);
        setCategoryGroups(data.categoryGroups);
        setProfile(data.profile);
        if (data.accountantSettings) {
          setSettings({
            business_percents: data.accountantSettings.business_percents,
            deduction_keywords: data.accountantSettings.deduction_keywords
          });
        }
      } else {
        let allData: Transaction[] = [];
        let from = 0;
        const step = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from('finance_transactions')
            .select('*')
            .order('transaction_date', { ascending: false })
            .range(from, from + step - 1);
          if (error) throw error;
          if (data && data.length > 0) {
            allData = [...allData, ...data];
            if (data.length < step) hasMore = false;
            else from += step;
          } else { hasMore = false; }
        }
        setTransactions(allData);

        const { data: groupsData } = await supabase.from('category_groups').select('category_name, group_name');
        setCategoryGroups(groupsData || []);

        const { data: settingsData } = await supabase
          .from('accountant_settings')
          .select('*')
          .eq('owner_user_id', session?.user.id)
          .maybeSingle();
        
        if (settingsData) setSettings({
          business_percents: settingsData.business_percents,
          deduction_keywords: settingsData.deduction_keywords
        });

        const { data: profileData } = await supabase
          .from('settings')
          .select('company_name, company_email, company_abn, accountant_share_token')
          .eq('owner_user_id', session?.user.id)
          .single();
        setProfile(profileData);
      }
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
      if (!isValid(date)) return false;
      const inInterval = isWithinInterval(date, reportInterval);
      const matchesSearch = !searchQuery || 
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.category_1 || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.notes || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      return inInterval && matchesSearch;
    });
  }, [transactions, reportInterval, searchQuery]);

  const workTransactions = useMemo(() => {
    return filteredTransactions.filter(t => t.is_work);
  }, [filteredTransactions]);

  const businessIncome = useMemo(() => {
    return workTransactions.filter(t => t.amount > 0);
  }, [workTransactions]);

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
      if (buckets.rent.keywords.some(k => desc.includes(k) || cat.includes(k))) buckets.rent.items.push(t);
      else if (buckets.bills.keywords.some(k => desc.includes(k) || cat.includes(k))) buckets.bills.items.push(t);
      else if (buckets.phone.keywords.some(k => desc.includes(k) || cat.includes(k))) buckets.phone.items.push(t);
      else if (buckets.fuel.keywords.some(k => desc.includes(k) || cat.includes(k))) buckets.fuel.items.push(t);
      else if (t.is_work) buckets.other.items.push(t);
    });

    return buckets;
  }, [filteredTransactions, settings]);

  const groupedWorkData = useMemo(() => {
    const groups: Record<string, { 
      income: number; 
      expenses: number; 
      transactions: Transaction[];
      categories: Record<string, { income: number; expenses: number; count: number }>
    }> = {};
    
    const catToGroup: Record<string, string> = {};
    categoryGroups.forEach(cg => { catToGroup[cg.category_name] = cg.group_name; });

    workTransactions.forEach(t => {
      const groupName = catToGroup[t.category_1] || 'Unmapped / Other';
      if (!groups[groupName]) {
        groups[groupName] = { income: 0, expenses: 0, transactions: [], categories: {} };
      }
      
      const group = groups[groupName];
      group.transactions.push(t);
      
      const catName = t.category_1 || 'Uncategorized';
      if (!group.categories[catName]) {
        group.categories[catName] = { income: 0, expenses: 0, count: 0 };
      }
      
      const cat = group.categories[catName];
      cat.count++;
      
      if (t.amount > 0) {
        group.income += t.amount;
        cat.income += t.amount;
      } else {
        group.expenses += Math.abs(t.amount);
        cat.expenses += Math.abs(t.amount);
      }
    });

    return Object.entries(groups).sort((a, b) => (b[1].income + b[1].expenses) - (a[1].income + a[1].expenses));
  }, [workTransactions, categoryGroups]);

  const subscriptionData = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    
    filteredTransactions.filter(t => t.amount < 0).forEach(t => {
      const normalized = t.description.toLowerCase()
        .replace(/\d+/g, '')
        .replace(/receipt/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (normalized.length < 3) return;
      if (!groups[normalized]) groups[normalized] = [];
      groups[normalized].push(t);
    });

    const result: SubscriptionGroup[] = Object.entries(groups)
      .filter(([, txns]) => txns.length >= 2)
      .map(([normalizedName, txns]) => {
        const sorted = [...txns].sort((a, b) => parseISO(a.transaction_date).getTime() - parseISO(b.transaction_date).getTime());
        const amounts = sorted.map(t => Math.abs(t.amount));
        const avgAmount = amounts.reduce((s, a) => s + a, 0) / amounts.length;
        
        let frequency = 'Irregular';
        if (sorted.length >= 2) {
          const gaps = [];
          for (let i = 1; i < sorted.length; i++) {
            gaps.push(differenceInDays(parseISO(sorted[i].transaction_date), parseISO(sorted[i-1].transaction_date)));
          }
          const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
          
          if (avgGap >= 25 && avgGap <= 35) frequency = 'Monthly';
          else if (avgGap >= 5 && avgGap <= 9) frequency = 'Weekly';
          else if (avgGap >= 12 && avgGap <= 16) frequency = 'Bi-weekly';
          else if (avgGap >= 80 && avgGap <= 100) frequency = 'Quarterly';
          else if (avgGap >= 350 && avgGap <= 380) frequency = 'Yearly';
        }

        let monthlyCost = 0;
        if (frequency === 'Monthly') monthlyCost = avgAmount;
        else if (frequency === 'Weekly') monthlyCost = avgAmount * 4.33;
        else if (frequency === 'Bi-weekly') monthlyCost = avgAmount * 2.16;
        else if (frequency === 'Quarterly') monthlyCost = avgAmount / 3;
        else if (frequency === 'Yearly') monthlyCost = avgAmount / 12;
        else monthlyCost = (avgAmount * sorted.length) / 12;

        return {
          name: sorted[sorted.length - 1].description,
          normalizedName,
          transactions: sorted.reverse(),
          avgAmount,
          frequency,
          monthlyCost,
          annualCost: monthlyCost * 12,
          lastDate: sorted[0].transaction_date
        };
      })
      .sort((a, b) => b.monthlyCost - a.monthlyCost);

    return result;
  }, [filteredTransactions]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(val));
  };

  const copyToClipboard = (text: string, id: string) => {
    const cleanText = text.replace(/[$,]/g, '');
    navigator.clipboard.writeText(cleanText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    showSuccess('Amount copied');
  };

  const copyShareLink = () => {
    if (!profile?.accountant_share_token) return;
    const url = `${window.location.origin}/portal/${profile.accountant_share_token}`;
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
    showSuccess('Share link copied');
  };

  const exportCSV = () => {
    if (workTransactions.length === 0) return;
    const headers = ['Date', 'Description', 'Category', 'Amount', 'Notes', 'Account'];
    const rows = workTransactions.map(t => [
      t.transaction_date, t.description, t.category_1, t.amount.toString(), t.notes || '', t.account_label
    ]);
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Tax_Report_${profile?.company_name || 'Business'}_${selectedYear}.csv`;
    link.click();
    showSuccess('CSV Exported');
  };

  const totalIncome = businessIncome.reduce((s, t) => s + t.amount, 0);
  const totalDeductions = Object.values(deductionBuckets).reduce((s, b) => {
    const bucketTotal = b.items.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    return s + (bucketTotal * (b.percent / 100));
  }, 0);

  const totalMonthlySubs = subscriptionData.reduce((s, sub) => s + sub.monthlyCost, 0);

  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i + 1).toString());

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className={cn("min-h-screen bg-background pb-20 print:bg-white print:pb-0", isPublic && "pt-8")}>
      <div className="max-w-6xl mx-auto p-4 sm:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 print:hidden">
          <div className="flex items-center gap-4">
            {!isPublic && (
              <Button variant="ghost" size="icon" asChild className="rounded-xl">
                <Link to="/"><ArrowLeft className="w-5 h-5" /></Link>
              </Button>
            )}
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
                  <Calculator className="w-8 h-8 text-primary" />
                  Accountant Portal
                </h1>
                {isPublic && (
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200 rounded-full px-3 py-1 gap-1.5">
                    <Lock className="w-3 h-3" /> Read-Only Access
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground">
                {profile?.company_name || 'Business'} · Tax Report for {profile?.company_abn || 'ABN Not Set'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isPublic && (
              <>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowDebug(!showDebug)} 
                  className={cn("rounded-xl gap-2", showDebug && "bg-primary/10 text-primary")}
                >
                  <Bug className="w-4 h-4" /> Debug
                </Button>
                <Button variant="outline" asChild className="rounded-xl gap-2">
                  <Link to="/settings?tab=accountant"><SettingsIcon className="w-4 h-4" /> Configure</Link>
                </Button>
              </>
            )}
            <Button variant="outline" onClick={exportCSV} className="rounded-xl gap-2">
              <Download className="w-4 h-4" /> Export CSV
            </Button>
            <Button variant="outline" onClick={() => window.print()} className="rounded-xl gap-2">
              <Printer className="w-4 h-4" /> Print Report
            </Button>
          </div>
        </div>

        {/* Share Link Quick Access (Only for owner) */}
        {!isPublic && profile?.accountant_share_token && (
          <Card className="border-0 shadow-lg bg-primary/5 border-primary/10 print:hidden">
            <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold">Share Access</p>
                  <p className="text-xs text-muted-foreground">Send this secret link to your accountant for read-only access.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={copyShareLink}
                  className="rounded-xl gap-2 flex-1 sm:flex-none bg-background"
                >
                  {linkCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {linkCopied ? 'Copied' : 'Copy Link'}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  asChild
                  className="rounded-xl gap-2 flex-1 sm:flex-none bg-background"
                >
                  <a href={`/portal/${profile.accountant_share_token}`} target="_blank" rel="noreferrer">
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open Portal
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Public Welcome Card */}
        {isPublic && (
          <Card className="border-0 shadow-xl bg-gradient-to-br from-primary to-purple-700 text-white overflow-hidden relative print:hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
            <CardContent className="p-8 relative">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <h2 className="text-2xl font-black">Welcome, Accountant</h2>
                  <p className="text-white/80 max-w-xl">
                    This portal provides a consolidated view of {profile?.company_name}'s business finances. 
                    You can review income, categorized deductions, and download reports for tax preparation.
                  </p>
                </div>
                <div className="p-4 bg-white/20 rounded-3xl backdrop-blur-md">
                  <ShieldCheck className="w-10 h-10" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Controls & Search */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
          <Card className="lg:col-span-2 border-0 shadow-lg">
            <CardContent className="p-6 space-y-4">
              <div className="flex flex-wrap items-end gap-6">
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
                <div className="flex-1 relative">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Search Transactions</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search merchant, category, notes..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 rounded-xl h-10"
                    />
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  Period: <span className="font-bold text-foreground">{format(reportInterval.start, 'MMM dd, yyyy')}</span> to <span className="font-bold text-foreground">{format(reportInterval.end, 'MMM dd, yyyy')}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Showing <span className="font-bold text-foreground">{filteredTransactions.length}</span> transactions
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <ClipboardCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Tax Checklist
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <div className={cn("w-4 h-4 rounded border flex items-center justify-center", businessIncome.length > 0 ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white")}>
                  {businessIncome.length > 0 && <CheckCircle2 className="w-3 h-3" />}
                </div>
                <span className={businessIncome.length > 0 ? "line-through opacity-50" : ""}>Income Categorized</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className={cn("w-4 h-4 rounded border flex items-center justify-center", totalDeductions > 0 ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white")}>
                  {totalDeductions > 0 && <CheckCircle2 className="w-3 h-3" />}
                </div>
                <span className={totalDeductions > 0 ? "line-through opacity-50" : ""}>Deductions Mapped</span>
              </div>
            </CardContent>
          </Card>
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

        {/* Main Content Tabs */}
        <Tabs defaultValue="summary" className="space-y-8">
          <TabsList className="bg-muted/50 p-1 rounded-xl h-auto gap-1 print:hidden">
            <TabsTrigger value="summary" className="rounded-lg gap-2 py-2 px-4">
              <LayoutGrid className="w-4 h-4" /> Tax Summary
            </TabsTrigger>
            <TabsTrigger value="totals" className="rounded-lg gap-2 py-2 px-4">
              <ListChecks className="w-4 h-4" /> Totals Only
            </TabsTrigger>
            <TabsTrigger value="groups" className="rounded-lg gap-2 py-2 px-4">
              <PieChart className="w-4 h-4" /> Detailed View
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="rounded-lg gap-2 py-2 px-4">
              <Repeat className="w-4 h-4" /> Subscriptions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-8 animate-fade-in">
            {/* Empty State Helper */}
            {filteredTransactions.length > 0 && workTransactions.length === 0 && (
              <Card className="border-2 border-dashed p-12 text-center space-y-6 bg-amber-50/30">
                <div className="w-20 h-20 bg-amber-100 rounded-3xl flex items-center justify-center mx-auto text-amber-600">
                  <Wand2 className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black">Categorization Required</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    We found {filteredTransactions.length} transactions in this period, but none are showing up here because they aren't marked as Work yet.
                  </p>
                </div>
                {!isPublic && (
                  <div className="flex flex-col sm:flex-row justify-center gap-3">
                    <Button asChild size="lg" className="rounded-2xl gap-2 bg-amber-600 hover:bg-amber-700">
                      <Link to="/transactions"><Wand2 className="w-5 h-5" /> Run Work Wizard</Link>
                    </Button>
                  </div>
                )}
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
                          <TableRow key={t.id} className="hover:bg-muted/20 group">
                            <TableCell className="text-xs font-medium">{format(parseISO(t.transaction_date), 'MMM dd, yyyy')}</TableCell>
                            <TableCell className="text-sm font-bold">
                              <div className="flex items-center gap-2">
                                {t.description}
                                {Math.abs(t.amount) > 500 && (
                                  <Badge variant="outline" className="text-[8px] h-4 bg-rose-50 text-rose-600 border-rose-200">High Value</Badge>
                                )}
                              </div>
                            </TableCell>
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
          </TabsContent>

          <TabsContent value="totals" className="space-y-6 animate-fade-in">
            <Card className="border-0 shadow-xl overflow-hidden">
              <CardHeader className="bg-muted/30 border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ListChecks className="w-5 h-5 text-primary" />
                  Financial Totals by Category
                </CardTitle>
                <CardDescription>Consolidated totals for each business category group. Click amounts to copy.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="pl-6">Group / Category</TableHead>
                      <TableHead className="text-right">Income</TableHead>
                      <TableHead className="text-right">Expenses</TableHead>
                      <TableHead className="text-right pr-6">Net Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedWorkData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                          No work transactions found for this period.
                        </TableCell>
                      </TableRow>
                    ) : (
                      groupedWorkData.map(([groupName, data]) => (
                        <React.Fragment key={groupName}>
                          <TableRow className="bg-muted/20 hover:bg-muted/20">
                            <TableCell className="pl-6 font-black uppercase tracking-wider text-xs text-primary">
                              {groupName}
                            </TableCell>
                            <TableCell className="text-right">
                              {data.income > 0 ? (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 font-bold text-emerald-600 hover:bg-emerald-50 gap-2"
                                  onClick={() => copyToClipboard(data.income.toString(), `${groupName}-inc`)}
                                >
                                  {formatCurrency(data.income)}
                                  {copiedId === `${groupName}-inc` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100" />}
                                </Button>
                              ) : '—'}
                            </TableCell>
                            <TableCell className="text-right">
                              {data.expenses > 0 ? (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 font-bold text-rose-600 hover:bg-rose-50 gap-2"
                                  onClick={() => copyToClipboard(data.expenses.toString(), `${groupName}-exp`)}
                                >
                                  {formatCurrency(data.expenses)}
                                  {copiedId === `${groupName}-exp` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100" />}
                                </Button>
                              ) : '—'}
                            </TableCell>
                            <TableCell className={cn("text-right font-black pr-6", (data.income - data.expenses) >= 0 ? "text-emerald-700" : "text-rose-700")}>
                              {formatCurrency(data.income - data.expenses)}
                            </TableCell>
                          </TableRow>
                          {Object.entries(data.categories)
                            .sort((a, b) => (b[1].income + b[1].expenses) - (a[1].income + a[1].expenses))
                            .map(([catName, catData]) => (
                              <TableRow key={catName} className="hover:bg-muted/5 border-b last:border-0 group">
                                <TableCell className="pl-10 text-sm font-medium">
                                  {catName}
                                  <span className="ml-2 text-[10px] text-muted-foreground font-normal">({catData.count} txns)</span>
                                </TableCell>
                                <TableCell className="text-right">
                                  {catData.income > 0 ? (
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-7 text-xs text-emerald-600/80 hover:bg-emerald-50 gap-1.5"
                                      onClick={() => copyToClipboard(catData.income.toString(), `${catName}-inc`)}
                                    >
                                      {formatCurrency(catData.income)}
                                      {copiedId === `${catName}-inc` ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100" />}
                                    </Button>
                                  ) : '—'}
                                </TableCell>
                                <TableCell className="text-right">
                                  {catData.expenses > 0 ? (
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-7 text-xs text-rose-600/80 hover:bg-rose-50 gap-1.5"
                                      onClick={() => copyToClipboard(catData.expenses.toString(), `${catName}-exp`)}
                                    >
                                      {formatCurrency(catData.expenses)}
                                      {copiedId === `${catName}-exp` ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100" />}
                                    </Button>
                                  ) : '—'}
                                </TableCell>
                                <TableCell className={cn("text-right text-sm font-bold pr-6 tabular-nums", (catData.income - catData.expenses) >= 0 ? "text-emerald-600" : "text-rose-600")}>
                                  {formatCurrency(catData.income - catData.expenses)}
                                </TableCell>
                              </TableRow>
                            ))}
                        </React.Fragment>
                      ))
                    )}
                    {groupedWorkData.length > 0 && (
                      <TableRow className="bg-primary text-white hover:bg-primary">
                        <TableCell className="pl-6 font-black uppercase">Grand Total</TableCell>
                        <TableCell className="text-right font-black">{formatCurrency(totalIncome)}</TableCell>
                        <TableCell className="text-right font-black">{formatCurrency(workTransactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0))}</TableCell>
                        <TableCell className="text-right font-black pr-6">
                          {formatCurrency(totalIncome - workTransactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0))}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="groups" className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 gap-6">
              {groupedWorkData.length === 0 ? (
                <Card className="border-2 border-dashed p-12 text-center text-muted-foreground">
                  <PieChart className="w-12 h-12 mx-auto opacity-20 mb-4" />
                  <p className="font-bold text-lg text-foreground">No grouped data found</p>
                  <p>Ensure your categories are mapped to groups in the Transactions page.</p>
                </Card>
              ) : (
                groupedWorkData.map(([groupName, data]) => (
                  <Card key={groupName} className="border-0 shadow-lg overflow-hidden">
                    <CardHeader className="bg-muted/30 border-b">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            <LayoutGrid className="w-5 h-5" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{groupName}</CardTitle>
                            <CardDescription>{data.transactions.length} transactions in this group</CardDescription>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-4">
                            {data.income > 0 && (
                              <div>
                                <p className="text-[10px] font-bold uppercase text-muted-foreground">Income</p>
                                <p className="text-lg font-black text-emerald-600">{formatCurrency(data.income)}</p>
                              </div>
                            )}
                            {data.expenses > 0 && (
                              <div>
                                <p className="text-[10px] font-bold uppercase text-muted-foreground">Expenses</p>
                                <p className="text-lg font-black text-rose-600">{formatCurrency(data.expenses)}</p>
                              </div>
                            )}
                            <div className="pl-4 border-l">
                              <p className="text-[10px] font-bold uppercase text-muted-foreground">Net</p>
                              <p className={cn("text-lg font-black", (data.income - data.expenses) >= 0 ? "text-emerald-600" : "text-rose-600")}>
                                {formatCurrency(data.income - data.expenses)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/10">
                            <TableHead className="w-32">Date</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.transactions.map((t) => (
                            <TableRow key={t.id} className="hover:bg-muted/10 group">
                              <TableCell className="text-xs font-medium">{format(parseISO(t.transaction_date), 'MMM dd, yyyy')}</TableCell>
                              <TableCell className="text-sm font-medium">
                                <div className="flex items-center gap-2">
                                  {t.description}
                                  {Math.abs(t.amount) > 500 && (
                                    <Badge variant="outline" className="text-[8px] h-4 bg-rose-50 text-rose-600 border-rose-200">High Value</Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell><Badge variant="outline" className="text-[10px] rounded-lg">{t.category_1}</Badge></TableCell>
                              <TableCell className={cn("text-right font-bold tabular-nums", t.amount > 0 ? "text-emerald-600" : "text-rose-600")}>
                                {formatCurrency(t.amount)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="subscriptions" className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-0 shadow-xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-white/20 rounded-2xl">
                      <Repeat className="w-6 h-6" />
                    </div>
                    <Badge className="bg-white/20 text-white border-0">Monthly Impact</Badge>
                  </div>
                  <p className="text-sm font-medium opacity-80">Total Subscription Spend</p>
                  <p className="text-4xl font-black">{formatCurrency(totalMonthlySubs)}<span className="text-lg font-normal opacity-60">/mo</span></p>
                  <p className="text-xs opacity-70 mt-2">Estimated {formatCurrency(totalMonthlySubs * 12)} per year</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Info className="w-4 h-4 text-primary" />
                    Accountant Note
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    This view automatically identifies recurring payments. These are often fixed business costs (SaaS, utilities, insurance) that can be treated as regular operational expenses.
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-0 shadow-xl overflow-hidden">
              <CardHeader className="bg-muted/30 border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  Detected Recurring Payments
                </CardTitle>
                <CardDescription>Merchant breakdown with frequency and cost analysis.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="pl-6">Merchant / Service</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead className="text-right">Avg. Amount</TableHead>
                      <TableHead className="text-right">Monthly Cost</TableHead>
                      <TableHead className="text-right pr-6">Annual Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptionData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                          No recurring patterns detected in this period.
                        </TableCell>
                      </TableRow>
                    ) : (
                      subscriptionData.map((sub) => (
                        <TableRow key={sub.normalizedName} className="hover:bg-muted/5">
                          <TableCell className="pl-6">
                            <div className="space-y-0.5">
                              <p className="font-bold text-sm">{sub.name}</p>
                              <p className="text-[10px] text-muted-foreground uppercase font-medium">Last seen: {format(parseISO(sub.lastDate), 'MMM dd, yyyy')}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="rounded-lg text-[10px] font-bold uppercase">
                              {sub.frequency}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums">
                            {formatCurrency(sub.avgAmount)}
                          </TableCell>
                          <TableCell className="text-right font-bold text-primary tabular-nums">
                            {formatCurrency(sub.monthlyCost)}
                          </TableCell>
                          <TableCell className="text-right font-black pr-6 tabular-nums">
                            {formatCurrency(sub.annualCost)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AccountantPortal;