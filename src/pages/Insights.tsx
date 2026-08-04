"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { useSettings } from '@/components/SettingsProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  Lightbulb,
  Target,
  Zap,
  ArrowRight,
  RefreshCw,
  Loader2,
  Brain,
  Rocket,
  Shield,
  Clock,
  DollarSign,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Star,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { showError, showSuccess } from '@/utils/toast';
import { formatCurrency } from '@/utils/format';
import SubscriptionAudit from '@/components/SubscriptionAudit';

interface Insight {
  title: string;
  advice?: string;
  description?: string;
  type: 'opportunity' | 'warning' | 'success' | 'tip';
  impact: 'high' | 'medium' | 'low';
  actionable?: string;
}

interface SuggestedBudget {
  category: string;
  suggestedMonthly: number;
  reasoning: string;
}

interface AIInsights {
  headline?: string;
  summary?: string;
  score?: number;
  scoreLabel?: string;
  status?: string;
  insights?: Insight[];
  predictions?: Record<string, unknown>[];
  tacticalAdvice?: Record<string, unknown>[];
  quickWins?: string[];
  suggestedBudgets?: SuggestedBudget[];
  coachingNote?: string;
}

const Insights = () => {
  const { session, loading: authLoading } = useAuth();
  const { selectedYear } = useSettings();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Record<string, unknown>[]>([]);
  const [categoryGroups, setCategoryGroups] = useState<Record<string, unknown>[]>([]);
  const [budgets, setBudgets] = useState<Record<string, unknown>[]>([]);
  const [priorYearCategoryTotals, setPriorYearCategoryTotals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);

  const loadCachedInsights = useCallback(() => {
    const cached = localStorage.getItem(`ai-insights-${selectedYear}`);
    const cachedTime = localStorage.getItem(`ai-insights-time-${selectedYear}`);
    if (cached && cachedTime) {
      const age = Date.now() - new Date(cachedTime).getTime();
      if (age < 30 * 60 * 1000) {
        try {
          setInsights(JSON.parse(cached));
          setLastGenerated(new Date(cachedTime));
        } catch (e) {
          setInsights(null);
        }
      } else {
        setInsights(null);
        setLastGenerated(null);
      }
    } else {
      setInsights(null);
      setLastGenerated(null);
    }
  }, [selectedYear]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let allData: Record<string, unknown>[] = [];
      let from = 0;
      const step = 1000;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('finance_transactions')
          .select('*')
          .order('transaction_date', { ascending: false });

        if (selectedYear !== 'All') {
          query = query.gte('transaction_date', `${selectedYear}-01-01`).lte('transaction_date', `${selectedYear}-12-31`);
        }

        const { data, error } = await query.range(from, from + step - 1);
        
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

      const { data: groups } = await supabase.from('category_groups').select('*');
      setCategoryGroups(groups || []);

      const year = parseInt(selectedYear === 'All' ? new Date().getFullYear().toString() : selectedYear);

      const { data: budgetRows } = await supabase.from('budgets').select('*').eq('year', year);
      setBudgets(budgetRows || []);

      // Lightweight prior-year category summary (category + amount only, not full rows) so the
      // AI can compare this period against last year without a heavy payload.
      const priorYear = year - 1;
      const { data: priorYearRows } = await supabase
        .from('finance_transactions')
        .select('category_1, amount')
        .gte('transaction_date', `${priorYear}-01-01`)
        .lte('transaction_date', `${priorYear}-12-31`)
        .lt('amount', 0)
        .neq('category_1', 'Account');

      const priorTotals: Record<string, number> = {};
      (priorYearRows || []).forEach((t: { category_1: string | null; amount: number }) => {
        const cat = t.category_1 || 'Uncategorized';
        priorTotals[cat] = (priorTotals[cat] || 0) + Math.abs(t.amount);
      });
      setPriorYearCategoryTotals(priorTotals);
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    if (!authLoading && !session) {
      navigate('/login');
    } else if (session) {
      fetchData();
      loadCachedInsights();
    }
  }, [session, authLoading, navigate, selectedYear, fetchData, loadCachedInsights]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => t.category_1?.toLowerCase() !== 'account');
  }, [transactions]);

  const summaryStats = useMemo(() => {
    const income = filteredTransactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const expenses = filteredTransactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
    return { totalIncome: income, totalExpenses: expenses, net: income - expenses };
  }, [filteredTransactions]);

  const generateInsights = async () => {
    if (filteredTransactions.length < 5) {
      showError('Need at least 5 transactions to generate insights');
      return;
    }

    setGenerating(true);
    setRateLimitError(null);
    try {
      const { data, error } = await supabase.functions.invoke('financial-insights', {
        body: {
          transactions: filteredTransactions.slice(0, 300),
          categoryGroups,
          budgets,
          summaryStats,
          period: selectedYear,
          priorYearCategoryTotals
        }
      });

      if (error) {
        const err = error as { status?: number; context?: { status?: number } };
        const status = err.status || err.context?.status;
        if (status === 429) {
          setRateLimitError('The AI is currently busy. Please wait about 60 seconds and try again.');
          return;
        }
        throw error;
      }

      if (data?.error === 'RATE_LIMIT_EXCEEDED') {
        setRateLimitError(data.message);
        return;
      }

      setInsights(data);
      setLastGenerated(new Date());
      localStorage.setItem(`ai-insights-${selectedYear}`, JSON.stringify(data));
      localStorage.setItem(`ai-insights-time-${selectedYear}`, new Date().toISOString());
      showSuccess('Insights generated successfully!');
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : 'Failed to generate insights');
    } finally {
      setGenerating(false);
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'opportunity': return <Rocket className="w-5 h-5" />;
      case 'warning': return <AlertTriangle className="w-5 h-5" />;
      case 'success': return <CheckCircle2 className="w-5 h-5" />;
      case 'tip': return <Lightbulb className="w-5 h-5" />;
      default: return <Sparkles className="w-5 h-5" />;
    }
  };

  const getInsightColors = (type: string) => {
    switch (type) {
      case 'opportunity': return { bg: 'bg-info-bg', border: 'border-info-border', icon: 'text-info', badge: 'bg-info text-info-foreground' };
      case 'warning': return { bg: 'bg-warning-bg', border: 'border-warning-border', icon: 'text-warning', badge: 'bg-warning text-warning-foreground' };
      case 'success': return { bg: 'bg-profit-bg', border: 'border-profit-border', icon: 'text-profit', badge: 'bg-profit text-profit-foreground' };
      case 'tip': return { bg: 'bg-ai-bg', border: 'border-ai-border', icon: 'text-ai', badge: 'bg-ai text-ai-foreground' };
      default: return { bg: 'bg-muted/30', border: 'border-muted', icon: 'text-muted-foreground', badge: 'bg-muted text-muted-foreground' };
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return { color: 'text-profit', ring: 'stroke-profit', badge: 'bg-profit-bg text-profit' };
    if (score >= 60) return { color: 'text-info', ring: 'stroke-info', badge: 'bg-info-bg text-info' };
    if (score >= 40) return { color: 'text-warning', ring: 'stroke-warning', badge: 'bg-warning-bg text-warning' };
    return { color: 'text-danger', ring: 'stroke-danger', badge: 'bg-danger-bg text-danger' };
  };

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const displayScore = insights?.score || 0;
  const displayHeadline = insights?.headline || insights?.summary || "Financial Analysis Ready";

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-primary to-purple-600 rounded-2xl text-white shadow-lg shadow-primary/25">
              <Brain className="w-7 h-7" />
            </div>
            AI Insights — {selectedYear}
          </h1>
          <p className="text-muted-foreground mt-1">Smart analysis of your finances for the selected period.</p>
        </div>
        <Button 
          onClick={generateInsights} 
          disabled={generating || filteredTransactions.length < 5}
          className="rounded-xl gap-2 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-lg shadow-primary/25"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {insights ? 'Refresh Insights' : 'Generate Insights'}
        </Button>
      </div>

      {rateLimitError && (
        <Card className="border-warning-border bg-warning-bg">
          <CardContent className="p-6 flex items-center gap-4">
            <Clock className="w-6 h-6 text-warning" />
            <div className="flex-1">
              <p className="font-bold text-warning">AI is taking a breather</p>
              <p className="text-sm text-warning">{rateLimitError}</p>
            </div>
            <Button variant="outline" size="sm" onClick={generateInsights} className="rounded-xl border-warning-border text-warning hover:bg-warning-bg">Try Again</Button>
          </CardContent>
        </Card>
      )}

      {!insights && filteredTransactions.length >= 5 && (
        <Card className="border-0 shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-br from-primary/10 via-purple-500/5 to-background p-12 text-center space-y-6">
            <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white shadow-2xl shadow-primary/30">
              <Sparkles className="w-12 h-12" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black">Unlock Your Financial Intelligence</h2>
              <p className="text-muted-foreground max-w-md mx-auto">Our AI will analyze your {filteredTransactions.length} transactions in {selectedYear} to find patterns and opportunities.</p>
            </div>
            <Button onClick={generateInsights} disabled={generating} size="lg" className="rounded-2xl gap-2 bg-gradient-to-r from-primary to-purple-600 h-14 px-8 text-base">
              {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              Generate AI Insights
            </Button>
          </div>
        </Card>
      )}

      {insights && (
        <div className="space-y-8 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="border-0 shadow-2xl overflow-hidden lg:col-span-1">
              <CardContent className="p-8 text-center">
                <div className="relative w-40 h-40 mx-auto mb-4">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
                    <circle cx="60" cy="60" r="52" fill="none" className={getScoreColor(displayScore).ring} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(displayScore / 100) * 327} 327`} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={cn("text-4xl font-black", getScoreColor(displayScore).color)}>{displayScore || '—'}</span>
                    <span className="text-xs text-muted-foreground font-medium">/ 100</span>
                  </div>
                </div>
                <Badge className={cn("rounded-full px-4 py-1 text-sm font-bold", getScoreColor(displayScore).badge)}>{insights.scoreLabel || insights.status || 'Analyzed'}</Badge>
                <p className="text-sm text-muted-foreground mt-3">Financial Health Score</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-2xl overflow-hidden lg:col-span-2">
              <div className="bg-gradient-to-br from-primary to-purple-700 text-white p-8 h-full flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 opacity-80" />
                    <span className="text-sm font-bold uppercase tracking-widest opacity-80">AI Summary</span>
                  </div>
                  <p className="text-2xl font-black leading-tight">{displayHeadline}</p>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-white/20">
                  <div><p className="text-xs opacity-70">Income</p><p className="text-xl font-bold">{formatCurrency(summaryStats.totalIncome)}</p></div>
                  <div><p className="text-xs opacity-70">Expenses</p><p className="text-xl font-bold">{formatCurrency(summaryStats.totalExpenses)}</p></div>
                  <div><p className="text-xs opacity-70">Net</p><p className={cn("text-xl font-bold", summaryStats.net >= 0 ? "text-emerald-300" : "text-rose-300")}>{formatCurrency(summaryStats.net)}</p></div>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-6">
              <div className="grid grid-cols-1 gap-4">
                {/* Render insights if they exist */}
                {insights.insights?.map((insight, i) => {
                  const colors = getInsightColors(insight.type);
                  return (
                    <Card key={i} className={cn("border-0 shadow-lg overflow-hidden transition-all hover:shadow-xl", colors.border)}>
                      <div className={cn("h-1", insight.type === 'opportunity' ? 'bg-blue-500' : insight.type === 'warning' ? 'bg-amber-500' : insight.type === 'success' ? 'bg-emerald-500' : 'bg-violet-500')} />
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-center gap-2.5">
                          <div className={cn("p-2 rounded-xl", colors.bg)}><div className={colors.icon}>{getInsightIcon(insight.type)}</div></div>
                          <div>
                            <h3 className="font-bold text-sm">{insight.title}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="outline" className={cn("text-[9px] rounded-md", colors.badge)}>{insight.type}</Badge>
                              <Badge variant="outline" className="text-[9px] rounded-md">{insight.impact} impact</Badge>
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{insight.description || insight.advice}</p>
                        {(insight.actionable || insight.advice) && (
                          <div className={cn("p-3 rounded-xl text-sm", colors.bg)}>
                            <div className="flex items-start gap-2">
                              <Zap className={cn("w-4 h-4 shrink-0 mt-0.5", colors.icon)} />
                              <p className="font-medium">{insight.actionable || insight.advice}</p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}

                {/* Render predictions if insights don't exist */}
                {!insights.insights && insights.predictions?.map((p, i) => (
                  <Card key={i} className="border-0 shadow-lg overflow-hidden border-warning-border">
                    <div className="h-1 bg-warning" />
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-warning-bg text-warning"><AlertTriangle className="w-5 h-5" /></div>
                        <div>
                          <h3 className="font-bold text-sm">{p.category}</h3>
                          <Badge variant="outline" className="text-[9px] rounded-md bg-warning-bg text-warning">{p.severity} severity</Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{p.prediction}</p>
                    </CardContent>
                  </Card>
                ))}

                {/* Render tactical advice if insights don't exist */}
                {!insights.insights && insights.tacticalAdvice?.map((a, i) => (
                  <Card key={i} className="border-0 shadow-lg overflow-hidden border-info-border">
                    <div className="h-1 bg-info" />
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-info-bg text-info"><Zap className="w-5 h-5" /></div>
                        <h3 className="font-bold text-sm">{a.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{a.advice}</p>
                      <div className="p-3 rounded-xl text-sm bg-info-bg text-info font-bold">
                        Impact: {a.impact}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 space-y-8">
              <SubscriptionAudit transactions={filteredTransactions} />

              {(insights.suggestedBudgets?.length || 0) > 0 && (
                <Card className="border-0 shadow-xl overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Target className="w-4 h-4" /> Suggested Budgets
                    </CardTitle>
                    <CardDescription>Grounded in this period's spend{Object.keys(priorYearCategoryTotals).length > 0 ? ' and last year’s trend' : ''}.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {insights.suggestedBudgets?.map((b, i) => (
                      <div key={i} className="p-3 rounded-xl bg-muted/40 border">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm">{b.category}</span>
                          <span className="font-black text-sm">{formatCurrency(b.suggestedMonthly)}/mo</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{b.reasoning}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {(insights.quickWins?.length || 0) > 0 && (
                <Card className="border-0 shadow-xl bg-gradient-to-br from-primary to-indigo-700 text-white overflow-hidden relative">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
                  <CardContent className="p-6 relative space-y-4">
                    <div className="flex items-center gap-2">
                      <Star className="w-5 h-5" />
                      <span className="text-xs font-black uppercase tracking-widest opacity-80">Quick Wins</span>
                    </div>
                    <div className="space-y-3">
                      {insights.quickWins?.map((win, i) => (
                        <div key={i} className="flex items-start gap-3 text-sm font-medium">
                          <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0 text-[10px]">{i + 1}</div>
                          <p>{win}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {insights.coachingNote && (
                <Card className="border-0 shadow-xl bg-slate-900 text-white overflow-hidden">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <Brain className="w-5 h-5 text-primary" />
                      <span className="text-xs font-black uppercase tracking-widest opacity-70">Coach's Note</span>
                    </div>
                    <p className="text-sm italic leading-relaxed opacity-90">"{insights.coachingNote}"</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Insights;