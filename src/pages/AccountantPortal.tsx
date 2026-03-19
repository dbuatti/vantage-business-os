"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  TrendingUp,
  TrendingDown,
  Loader2,
  Settings as SettingsIcon,
  Database,
  Bug,
  LayoutGrid,
  PieChart,
  ShieldCheck,
  Lock,
  ClipboardCheck,
  ListChecks,
  Repeat,
  Copy,
  Check,
  Share2,
  Wifi,
  Droplets,
  Flame,
  ChevronRight
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { showError, showSuccess } from '@/utils/toast';

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

interface CategoryGroup {
  category_name: string;
  group_name: string;
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
    deduction_keywords: {
      rent: ['rent', 'lease', 'storage'],
      bills: ['bill', 'electricity', 'water', 'gas', 'power', 'rates', 'utilities'],
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

  const reportIntervalStrings = useMemo(() => {
    const year = parseInt(selectedYear);
    if (reportType === 'cy') {
      return { start: `${year}-01-01`, end: `${year}-12-31` };
    } else {
      return { start: `${year - 1}-07-01`, end: `${year}-06-30` };
    }
  }, [selectedYear, reportType]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const dateStr = t.transaction_date;
      if (!dateStr) return false;
      if (t.category_1 === 'Account') return false;
      const inInterval = dateStr >= reportIntervalStrings.start && dateStr <= reportIntervalStrings.end;
      const matchesSearch = !searchQuery || 
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.category_1 || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.notes || '').toLowerCase().includes(searchQuery.toLowerCase());
      return inInterval && matchesSearch;
    });
  }, [transactions, reportIntervalStrings, searchQuery]);

  const workTransactions = useMemo(() => {
    return filteredTransactions.filter(t => t.is_work);
  }, [filteredTransactions]);

  const businessIncome = useMemo(() => {
    return workTransactions.filter(t => t.amount > 0);
  }, [workTransactions]);

  const businessExpenses = useMemo(() => {
    return workTransactions.filter(t => t.amount < 0);
  }, [workTransactions]);

  const expenseGroups = useMemo(() => {
    const buckets = {
      rent: { label: 'Rent & Home Office', icon: Home, color: 'text-blue-600', bg: 'bg-blue-50', text: 'text-blue-900', keywords: settings.deduction_keywords.rent, items: [] as Transaction[] },
      bills: { label: 'Utilities & Bills', icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50', text: 'text-amber-900', keywords: settings.deduction_keywords.bills, items: [] as Transaction[] },
      phone: { label: 'Phone & Internet', icon: Phone, color: 'text-purple-600', bg: 'bg-purple-50', text: 'text-purple-900', keywords: settings.deduction_keywords.phone, items: [] as Transaction[] },
      fuel: { label: 'Fuel & Transport', icon: Fuel, color: 'text-orange-600', bg: 'bg-orange-50', text: 'text-orange-900', keywords: settings.deduction_keywords.fuel, items: [] as Transaction[] },
      other: { label: 'Direct Work Expenses', icon: Briefcase, color: 'text-emerald-600', bg: 'bg-emerald-50', text: 'text-emerald-900', keywords: [], items: [] as Transaction[] }
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

  const subscriptionGroups = useMemo(() => {
    const groups: Record<string, { total: number, items: Transaction[] }> = {};
    // Only include subscriptions that are explicitly marked as work
    workTransactions.filter(t => t.category_1 === 'Subscription').forEach(t => {
      const subCat = t.category_2 || 'Other Subscriptions';
      if (!groups[subCat]) groups[subCat] = { total: 0, items: [] };
      groups[subCat].total += Math.abs(t.amount);
      groups[subCat].items.push(t);
    });
    return Object.entries(groups).sort((a, b) => b[1].total - a[1].total);
  }, [workTransactions]);

  const fixedCostsData = useMemo(() => {
    const groups: Record<string, { total: number, items: Transaction[], icon: any, color: string, bg: string }> = {};
    
    filteredTransactions.forEach(t => {
      if (t.amount > 0) return;
      const desc = t.description.toLowerCase();
      const cat = (t.category_1 || '').toLowerCase();
      const subCat = (t.category_2 || '').toLowerCase();
      
      let groupKey = '';
      let icon = Info;
      let color = 'text-gray-600';
      let bg = 'bg-gray-50';

      if (settings.deduction_keywords.rent.some(k => desc.includes(k) || cat.includes(k))) {
        groupKey = 'Rent & Home Office';
        icon = Home;
        color = 'text-blue-600';
        bg = 'bg-blue-50';
      } else if (settings.deduction_keywords.bills.some(k => desc.includes(k) || cat.includes(k))) {
        if (desc.includes('internet') || subCat.includes('internet') || cat.includes('internet')) {
          groupKey = 'Utilities: Internet';
          icon = Wifi;
          color = 'text-indigo-600';
          bg = 'bg-indigo-50';
        } else if (desc.includes('electricity') || subCat.includes('electricity') || desc.includes('power') || subCat.includes('power')) {
          groupKey = 'Utilities: Electricity';
          icon = Zap;
          color = 'text-amber-600';
          bg = 'bg-amber-50';
        } else if (desc.includes('gas') || subCat.includes('gas')) {
          groupKey = 'Utilities: Gas';
          icon = Flame;
          color = 'text-orange-600';
          bg = 'bg-orange-50';
        } else if (desc.includes('water') || subCat.includes('water')) {
          groupKey = 'Utilities: Water';
          icon = Droplets;
          color = 'text-cyan-600';
          bg = 'bg-cyan-50';
        } else {
          groupKey = t.category_1 === 'Utilities' && t.category_2 ? `Utilities: ${t.category_2}` : 'Utilities & Bills';
          icon = Zap;
          color = 'text-amber-600';
          bg = 'bg-amber-50';
        }
      } else if (settings.deduction_keywords.phone.some(k => desc.includes(k) || cat.includes(k))) {
        groupKey = 'Phone & Internet';
        icon = Phone;
        color = 'text-purple-600';
        bg = 'bg-purple-50';
      } else if (settings.deduction_keywords.fuel.some(k => desc.includes(k) || cat.includes(k))) {
        groupKey = 'Fuel & Transport';
        icon = Fuel;
        color = 'text-rose-600';
        bg = 'bg-rose-50';
      }

      if (groupKey) {
        if (!groups[groupKey]) groups[groupKey] = { total: 0, items: [], icon, color, bg };
        groups[groupKey].total += Math.abs(t.amount);
        groups[groupKey].items.push(t);
      }
    });

    return Object.entries(groups).sort((a, b) => b[1].total - a[1].total);
  }, [filteredTransactions, settings]);

  const taxReadiness = useMemo(() => {
    if (workTransactions.length === 0) return 0;
    const withNotes = workTransactions.filter(t => t.notes).length;
    const withCategory = workTransactions.filter(t => t.category_1).length;
    return Math.round(((withNotes / workTransactions.length) * 50) + ((withCategory / workTransactions.length) * 50));
  }, [workTransactions]);

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

  const copyAllTotals = () => {
    const text = groupedWorkData.map(([group, data]) => {
      return `${group}: Income ${formatCurrency(data.income)}, Expenses ${formatCurrency(data.expenses)}`;
    }).join('\n');
    navigator.clipboard.writeText(text);
    showSuccess('All totals copied to clipboard');
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
  const totalExpenses = businessExpenses.reduce((s, t) => s + Math.abs(t.amount), 0);

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

        {/* Debug Dashboard */}
        {showDebug && (
          <Card className="border-2 border-primary/20 bg-primary/5 animate-fade-in print:hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <Bug className="w-4 h-4" /> Data Pipeline Debugger
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-xl bg-background border">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">1. Total Loaded</p>
                <p className="text-xl font-black">{transactions.length}</p>
              </div>
              <div className="p-3 rounded-xl bg-background border">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">2. In Period</p>
                <p className="text-xl font-black">{filteredTransactions.length}</p>
              </div>
              <div className="p-3 rounded-xl bg-background border">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">3. Marked as Work</p>
                <p className="text-xl font-black">{workTransactions.length}</p>
              </div>
              <div className="p-3 rounded-xl bg-background border">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">4. Drop-off Rate</p>
                <p className="text-xl font-black text-rose-600">
                  {filteredTransactions.length > 0 
                    ? Math.round((1 - (workTransactions.length / filteredTransactions.length)) * 100) 
                    : 0}%
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tax Readiness Score */}
        <Card className="border-0 shadow-xl bg-gradient-to-r from-primary/5 to-background print:hidden">
          <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="relative w-24 h-24">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                  <circle 
                    cx="50" cy="50" r="45" fill="none" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth="8" 
                    strokeLinecap="round"
                    strokeDasharray={`${(taxReadiness / 100) * 283} 283`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-black">{taxReadiness}%</span>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-black">Tax Readiness Score</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  {taxReadiness === 100 
                    ? "Your data is perfectly prepared for your accountant." 
                    : "Complete missing notes and categories to reach 100% readiness."}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              <div className="text-center">
                <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Work Items</p>
                <Badge variant="secondary" className="rounded-lg">{workTransactions.length}</Badge>
              </div>
              <div className="text-center">
                <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Missing Notes</p>
                <Badge variant="outline" className="rounded-lg text-rose-600 border-rose-200">{workTransactions.filter(t => !t.notes).length}</Badge>
              </div>
              <div className="text-center">
                <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Unmapped</p>
                <Badge variant="outline" className="rounded-lg text-amber-600 border-amber-200">{workTransactions.filter(t => !t.category_1).length}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

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
                <Button variant="outline" size="sm" onClick={copyShareLink} className="rounded-xl gap-2 flex-1 sm:flex-none bg-background">
                  {linkCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {linkCopied ? 'Copied' : 'Copy Link'}
                </Button>
                <Button variant="outline" size="sm" asChild className="rounded-xl gap-2 flex-1 sm:flex-none bg-background">
                  <a href={`/portal/${profile.accountant_share_token}`} target="_blank" rel="noreferrer">
                    <ExternalLink className="w-3.5 h-3.5" /> Open Portal
                  </a>
                </Button>
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
                  Period: <span className="font-bold text-foreground">{format(parseISO(reportIntervalStrings.start), 'MMM dd, yyyy')}</span> to <span className="font-bold text-foreground">{format(parseISO(reportIntervalStrings.end), 'MMM dd, yyyy')}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Found <span className="font-bold text-foreground">{filteredTransactions.length}</span> transactions
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
                <div className={cn("w-4 h-4 rounded border flex items-center justify-center", businessExpenses.length > 0 ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white")}>
                  {businessExpenses.length > 0 && <CheckCircle2 className="w-3 h-3" />}
                </div>
                <span className={businessExpenses.length > 0 ? "line-through opacity-50" : ""}>Expenses Categorized</span>
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
              <p className="text-xs opacity-70 mt-1">{businessIncome.length} work transactions</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-xl bg-rose-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium opacity-80">Business Expenses</p>
                <TrendingDown className="w-5 h-5 opacity-50" />
              </div>
              <p className="text-3xl font-black">{formatCurrency(totalExpenses)}</p>
              <p className="text-xs opacity-70 mt-1">{businessExpenses.length} work transactions</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-xl bg-primary text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium opacity-80">Net Position</p>
                <Calculator className="w-5 h-5 opacity-50" />
              </div>
              <p className="text-3xl font-black">{formatCurrency(totalIncome - totalExpenses)}</p>
              <p className="text-xs opacity-70 mt-1">Raw income minus expenses</p>
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
            <TabsTrigger value="fixed-costs" className="rounded-lg gap-2 py-2 px-4">
              <Home className="w-4 h-4" /> Fixed & Mixed
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="rounded-lg gap-2 py-2 px-4">
              <Repeat className="w-4 h-4" /> Subscriptions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-8 animate-fade-in">
            {/* Empty State Helper */}
            {filteredTransactions.length === 0 ? (
              <Card className="border-2 border-dashed p-12 text-center space-y-6 bg-muted/10">
                <div className="w-20 h-20 bg-muted rounded-3xl flex items-center justify-center mx-auto text-muted-foreground">
                  <Database className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black">No Transactions Found</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    We couldn't find any transactions for the period starting {format(parseISO(reportIntervalStrings.start), 'MMM dd, yyyy')}.
                  </p>
                </div>
              </Card>
            ) : workTransactions.length === 0 && (
              <Card className="border-2 border-dashed p-12 text-center space-y-6 bg-amber-50/30">
                <div className="w-20 h-20 bg-amber-100 rounded-3xl flex items-center justify-center mx-auto text-amber-600">
                  <Calculator className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black">Categorization Required</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    We found {filteredTransactions.length} transactions in this period, but none are showing up here because they aren't marked as Work yet.
                  </p>
                </div>
              </Card>
            )}

            {/* Income Section */}
            {businessIncome.length > 0 && (
              <Card className="border-0 shadow-xl overflow-hidden">
                <CardHeader className="bg-emerald-50 dark:bg-emerald-950/30 border-b">
                  <CardTitle className="text-xl text-emerald-900 dark:text-emerald-100">Business Income</CardTitle>
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

            {/* Expense Groups */}
            {Object.entries(expenseGroups).map(([key, bucket]) => {
              if (bucket.items.length === 0) return null;
              const rawTotal = bucket.items.reduce((s, t) => s + Math.abs(t.amount), 0);

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
                            Total: <span className="font-bold">{formatCurrency(rawTotal)}</span>
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
                          <TableHead className="w-1/4">Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bucket.items.map((t) => (
                          <TableRow key={t.id} className="hover:bg-muted/20 group">
                            <TableCell className="text-xs font-medium">{format(parseISO(t.transaction_date), 'MMM dd, yyyy')}</TableCell>
                            <TableCell className="text-sm font-bold">{t.description}</TableCell>
                            <TableCell><Badge variant="outline" className="text-[10px] rounded-lg bg-white dark:bg-card">{t.category_1}</Badge></TableCell>
                            <TableCell className="text-right font-black text-rose-600">{formatCurrency(t.amount)}</TableCell>
                            <TableCell className="text-xs text-muted-foreground italic">{t.notes || '—'}</TableCell>
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
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={copyAllTotals} className="rounded-xl gap-2">
                <Copy className="w-4 h-4" /> Copy All Totals
              </Button>
            </div>
            <Card className="border-0 shadow-xl overflow-hidden">
              <CardHeader className="bg-muted/30 border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ListChecks className="w-5 h-5 text-primary" />
                  Financial Totals by Category
                </CardTitle>
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
                    {groupedWorkData.map(([groupName, data]) => (
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
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fixed-costs" className="space-y-8 animate-fade-in">
            {/* Redesigned Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {fixedCostsData.map(([groupName, data]) => (
                <Card key={groupName} className="border-0 shadow-lg hover:shadow-xl transition-all group overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className={cn("p-3 rounded-2xl shadow-sm", data.bg, data.color)}>
                        <data.icon className="w-6 h-6" />
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => copyToClipboard(data.total.toString(), `${groupName}-fixed`)}
                      >
                        {copiedId === `${groupName}-fixed` ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                      </Button>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{groupName}</p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-black text-rose-600">{formatCurrency(data.total)}</p>
                        <span className="text-[10px] font-bold text-muted-foreground">{data.items.length} items</span>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t flex items-center justify-between text-[10px] font-bold uppercase tracking-tighter text-muted-foreground">
                      <span>Mixed-use deduction</span>
                      <ChevronRight className="w-3 h-3" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Detailed Lists */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-[1px] flex-1 bg-muted" />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Detailed Breakdown</p>
                <div className="h-[1px] flex-1 bg-muted" />
              </div>
              
              {fixedCostsData.map(([groupName, data]) => (
                <Card key={groupName} className="border-0 shadow-lg overflow-hidden">
                  <CardHeader className="bg-muted/10 border-b py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn("p-1.5 rounded-lg", data.bg, data.color)}>
                          <data.icon className="w-4 h-4" />
                        </div>
                        <CardTitle className="text-sm font-black uppercase tracking-wider">{groupName}</CardTitle>
                      </div>
                      <Badge variant="secondary" className="rounded-lg font-bold">{data.items.length} transactions</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/5">
                          <TableHead className="w-32 text-[10px] uppercase font-black">Date</TableHead>
                          <TableHead className="text-[10px] uppercase font-black">Description</TableHead>
                          <TableHead className="text-right pr-6 text-[10px] uppercase font-black">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.items.map((t) => (
                          <TableRow key={t.id} className="hover:bg-muted/20">
                            <TableCell className="text-xs font-medium">{format(parseISO(t.transaction_date), 'MMM dd, yyyy')}</TableCell>
                            <TableCell className="text-xs font-bold">{t.description}</TableCell>
                            <TableCell className="text-right pr-6 text-xs font-black tabular-nums text-rose-600">{formatCurrency(t.amount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="subscriptions" className="space-y-6 animate-fade-in">
            <Card className="border-0 shadow-xl overflow-hidden">
              <CardHeader className="bg-muted/30 border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-primary" />
                  Subscription Category Summary
                </CardTitle>
                <CardDescription>Total spend grouped by secondary category.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="pl-6">Category</TableHead>
                      <TableHead className="text-right pr-6">Total Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptionGroups.map(([catName, data]) => (
                      <TableRow key={catName}>
                        <TableCell className="pl-6 font-bold">{catName}</TableCell>
                        <TableCell className="text-right pr-6 font-black text-primary">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 font-bold text-primary hover:bg-primary/5 gap-2"
                            onClick={() => copyToClipboard(data.total.toString(), `${catName}-sub`)}
                          >
                            {formatCurrency(data.total)}
                            {copiedId === `${catName}-sub` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="space-y-6">
              {subscriptionGroups.map(([catName, data]) => (
                <Card key={catName} className="border-0 shadow-lg overflow-hidden">
                  <CardHeader className="bg-muted/10 border-b py-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary">{catName}</CardTitle>
                      <Badge variant="outline" className="rounded-lg">{data.items.length} transactions</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/5">
                          <TableHead className="w-32 text-[10px] uppercase font-bold">Date</TableHead>
                          <TableHead className="text-[10px] uppercase font-bold">Merchant</TableHead>
                          <TableHead className="text-right pr-6 text-[10px] uppercase font-bold">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.items.map((t) => (
                          <TableRow key={t.id}>
                            <TableCell className="text-xs">{format(parseISO(t.transaction_date), 'MMM dd, yyyy')}</TableCell>
                            <TableCell className="text-xs font-medium">{t.description}</TableCell>
                            <TableCell className="text-right pr-6 text-xs font-bold tabular-nums">{formatCurrency(t.amount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AccountantPortal;