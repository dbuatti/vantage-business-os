"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
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

interface Insight {
  title: string;
  description: string;
  type: 'opportunity' | 'warning' | 'success' | 'tip';
  impact: 'high' | 'medium' | 'low';
  actionable: string;
}

interface TimeInvestment {
  area: string;
  advice: string;
  potentialImpact: string;
  priority: 'high' | 'medium' | 'low';
}

interface SpendingPattern {
  pattern: string;
  recommendation: string;
}

interface AIInsights {
  headline: string;
  score: number;
  scoreLabel: string;
  insights: Insight[];
  timeInvestmentAdvice: TimeInvestment[];
  spendingPatterns: SpendingPattern[];
  quickWins: string[];
}

const Insights = () => {
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categoryGroups, setCategoryGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !session) {
      navigate('/login');
    } else if (session) {
      fetchData();
      loadCachedInsights();
    }
  }, [session, authLoading, navigate]);

  const loadCachedInsights = () => {
    const cached = localStorage.getItem('ai-insights');
    const cachedTime = localStorage.getItem('ai-insights-time');
    if (cached && cachedTime) {
      const age = Date.now() - new Date(cachedTime).getTime();
      if (age < 30 * 60 * 1000) {
        setInsights(JSON.parse(cached));
        setLastGenerated(new Date(cachedTime));
      }
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      let allData: any[] = [];
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
        } else {
          hasMore = false;
        }
      }
      setTransactions(allData);

      const { data: groups } = await supabase.from('category_groups').select('*');
      setCategoryGroups(groups || []);
    } catch (error: any) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => t.category_1 !== 'Account');
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
          summaryStats
        }
      });

      if (error) {
        // Check for rate limit error from Supabase invoke
        if (error.status === 429 || (error.message && error.message.includes('429'))) {
          setRateLimitError('The AI is currently busy. Please wait about 60 seconds and try again.');
          return;
        }
        throw error;
      }

      if (data.error === 'RATE_LIMIT_EXCEEDED') {
        setRateLimitError(data.message);
        return;
      }

      if (data.error) throw new Error(data.message || data.error);

      setInsights(data);
      setLastGenerated(new Date());
      localStorage.setItem('ai-insights', JSON.stringify(data));
      localStorage.setItem('ai-insights-time', new Date().toISOString());
      showSuccess('Insights generated successfully!');
    } catch (error: any) {
      console.error('Insights error:', error);
      showError(error.message || 'Failed to generate insights');
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
      case 'opportunity': return { bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800', icon: 'text-blue-600', badge: 'bg-blue-100 text-blue-700' };
      case 'warning': return { bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800', icon: 'text-amber-600', badge: 'bg-amber-100 text-amber-700' };
      case 'success': return { bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800', icon: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' };
      case 'tip': return { bg: 'bg-violet-50 dark:bg-violet-950/30', border: 'border-violet-200 dark:border-violet-800', icon: 'text-violet-600', badge: 'bg-violet-100 text-violet-700' };
      default: return { bg: 'bg-muted/30', border: 'border-muted', icon: 'text-muted-foreground', badge: 'bg-muted text-muted-foreground' };
    }
  };

  const getPriorityColors = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800';
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800';
      case 'low': return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return { color: 'text-emerald-600', bg: 'from-emerald-500 to-teal-500', ring: 'stroke-emerald-500', badge: 'bg-emerald-100 text-emerald-700' };
    if (score >= 60) return { color: 'text-blue-600', bg: 'from-blue-500 to-indigo-500', ring: 'stroke-blue-500', badge: 'bg-blue-100 text-blue-700' };
    if (score >= 40) return { color: 'text-amber-600', bg: 'from-amber-500 to-orange-500', ring: 'stroke-amber-500', badge: 'bg-amber-100 text-amber-700' };
    return { color: 'text-rose-600', bg: 'from-rose-500 to-red-500', ring: 'stroke-rose-500', badge: 'bg-rose-100 text-rose-700' };
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-primary to-purple-600 rounded-2xl text-white shadow-lg shadow-primary/25">
              <Brain className="w-7 h-7" />
            </div>
            AI Insights
          </h1>
          <p className="text-muted-foreground mt-1">
            Smart analysis of your finances with actionable recommendations
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastGenerated && (
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              Generated {lastGenerated.toLocaleTimeString()}
            </span>
          )}
          <Button 
            onClick={generateInsights} 
            disabled={generating || filteredTransactions.length < 5}
            className="rounded-xl gap-2 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-lg shadow-primary/25"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {insights ? 'Refresh Insights' : 'Generate Insights'}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Rate Limit Error */}
      {rateLimitError && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 animate-in fade-in slide-in-from-top-4">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-2 bg-amber-100 rounded-xl text-amber-600">
              <Clock className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-amber-800 dark:text-amber-200">AI is taking a breather</p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {rateLimitError}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={generateInsights} className="rounded-xl border-amber-200 text-amber-700 hover:bg-amber-100">
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Transaction Count Warning */}
      {filteredTransactions.length < 5 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
          <CardContent className="p-6 flex items-center gap-4">
            <AlertTriangle className="w-8 h-8 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold text-amber-800 dark:text-amber-200">Not enough data</p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Import at least 5 transactions (excluding internal transfers) to unlock AI-powered insights. You currently have {filteredTransactions.length}.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Insights Yet */}
      {!insights && filteredTransactions.length >= 5 && (
        <Card className="border-0 shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-br from-primary/10 via-purple-500/5 to-background p-12 text-center space-y-6">
            <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white shadow-2xl shadow-primary/30">
              <Sparkles className="w-12 h-12" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black">Unlock Your Financial Intelligence</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Our AI will analyze your {filteredTransactions.length} transactions to find patterns, opportunities, and personalized advice on where to invest your time.
              </p>
            </div>
            <Button 
              onClick={generateInsights} 
              disabled={generating}
              size="lg"
              className="rounded-2xl gap-2 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-xl shadow-primary/25 h-14 px-8 text-base"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing your finances...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate AI Insights
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* Insights Dashboard */}
      {insights && (
        <div className="space-y-8">
          {/* Score & Headline */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Financial Health Score */}
            <Card className="border-0 shadow-2xl overflow-hidden lg:col-span-1">
              <CardContent className="p-8 text-center">
                <div className="relative w-40 h-40 mx-auto mb-4">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
                    <circle 
                      cx="60" cy="60" r="52" fill="none" 
                      className={getScoreColor(insights.score).ring}
                      strokeWidth="10" 
                      strokeLinecap="round"
                      strokeDasharray={`${(insights.score / 100) * 327} 327`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={cn("text-4xl font-black", getScoreColor(insights.score).color)}>
                      {insights.score}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">/ 100</span>
                  </div>
                </div>
                <Badge className={cn("rounded-full px-4 py-1 text-sm font-bold", getScoreColor(insights.score).badge)}>
                  {insights.scoreLabel}
                </Badge>
                <p className="text-sm text-muted-foreground mt-3">Financial Health Score</p>
              </CardContent>
            </Card>

            {/* Headline & Quick Stats */}
            <Card className="border-0 shadow-2xl overflow-hidden lg:col-span-2">
              <div className="bg-gradient-to-br from-primary to-purple-700 text-white p-8 h-full flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 opacity-80" />
                    <span className="text-sm font-bold uppercase tracking-widest opacity-80">AI Summary</span>
                  </div>
                  <p className="text-2xl font-black leading-tight">{insights.headline}</p>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-white/20">
                  <div>
                    <p className="text-xs opacity-70">Total Income</p>
                    <p className="text-xl font-bold">{formatCurrency(summaryStats.totalIncome)}</p>
                  </div>
                  <div>
                    <p className="text-xs opacity-70">Total Expenses</p>
                    <p className="text-xl font-bold">{formatCurrency(summaryStats.totalExpenses)}</p>
                  </div>
                  <div>
                    <p className="text-xs opacity-70">Net Position</p>
                    <p className={cn("text-xl font-bold", summaryStats.net >= 0 ? "text-emerald-300" : "text-rose-300")}>
                      {formatCurrency(summaryStats.net)}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Time Investment Advice */}
          <Card className="border-0 shadow-xl">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-xl">
                <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white">
                  <Target className="w-5 h-5" />
                </div>
                Where to Invest Your Time
              </CardTitle>
              <CardDescription>AI-recommended focus areas for maximum financial return</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {insights.timeInvestmentAdvice.map((item, i) => (
                <div 
                  key={i}
                  className={cn(
                    "p-5 rounded-2xl border transition-all hover:shadow-md",
                    item.priority === 'high' 
                      ? "bg-gradient-to-r from-rose-50 to-white border-rose-100 dark:from-rose-950/30 dark:to-card dark:border-rose-900" 
                      : item.priority === 'medium'
                      ? "bg-gradient-to-r from-amber-50 to-white border-amber-100 dark:from-amber-950/30 dark:to-card dark:border-amber-900"
                      : "bg-gradient-to-r from-emerald-50 to-white border-emerald-100 dark:from-emerald-950/30 dark:to-card dark:border-emerald-900"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">{item.area}</span>
                        <Badge className={cn("rounded-lg text-[10px] font-bold uppercase", getPriorityColors(item.priority))}>
                          {item.priority} priority
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.advice}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground font-medium">Potential Impact</p>
                      <p className="font-bold text-primary">{item.potentialImpact}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Detailed Insights */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-primary" />
              Detailed Insights
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insights.insights.map((insight, i) => {
                const colors = getInsightColors(insight.type);
                return (
                  <Card 
                    key={i}
                    className={cn(
                      "border-0 shadow-lg overflow-hidden transition-all hover:shadow-xl animate-slide-up opacity-0",
                      colors.border
                    )}
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <div className={cn("h-1", insight.type === 'opportunity' ? 'bg-blue-500' : insight.type === 'warning' ? 'bg-amber-500' : insight.type === 'success' ? 'bg-emerald-500' : 'bg-violet-500')} />
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className={cn("p-2 rounded-xl", colors.bg)}>
                            <div className={colors.icon}>{getInsightIcon(insight.type)}</div>
                          </div>
                          <div>
                            <h3 className="font-bold text-sm">{insight.title}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="outline" className={cn("text-[9px] rounded-md", colors.badge)}>
                                {insight.type}
                              </Badge>
                              <Badge variant="outline" className="text-[9px] rounded-md">
                                {insight.impact} impact
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{insight.description}</p>
                      <div className={cn("p-3 rounded-xl text-sm", colors.bg)}>
                        <div className="flex items-start gap-2">
                          <Zap className={cn("w-4 h-4 shrink-0 mt-0.5", colors.icon)} />
                          <p className="font-medium">{insight.actionable}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Spending Patterns */}
          {insights.spendingPatterns && insights.spendingPatterns.length > 0 && (
            <Card className="border-0 shadow-xl">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 text-white">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  Spending Patterns Detected
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {insights.spendingPatterns.map((pattern, i) => (
                  <div key={i} className="p-4 rounded-xl border bg-muted/20 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-sm font-bold text-primary">{i + 1}</span>
                      </div>
                      <div className="space-y-1.5">
                        <p className="font-medium text-sm">{pattern.pattern}</p>
                        <p className="text-sm text-muted-foreground">{pattern.recommendation}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Quick Wins */}
          {insights.quickWins && insights.quickWins.length > 0 && (
            <Card className="border-0 shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5" />
                  <span className="font-bold text-lg">Quick Wins</span>
                </div>
                <p className="text-sm text-white/80">Easy actions you can take today for immediate impact</p>
              </div>
              <CardContent className="p-6 space-y-3">
                {insights.quickWins.map((win, i) => (
                  <div 
                    key={i} 
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-muted/30 transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                    <p className="text-sm leading-relaxed flex-1">{win}</p>
                    <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default Insights;