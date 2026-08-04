"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  Sparkles, 
  Loader2, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  Zap,
  ChevronRight,
  Target,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { showError } from '@/utils/toast';
import { formatCurrency } from '@/utils/format';
import { isSameMonth, parseISO } from 'date-fns';

interface Prediction {
  severity: string;
  category: string;
  prediction: string;
}

interface TacticalAdvice {
  title: string;
  advice: string;
  impact?: string;
}

interface InsightsData {
  status: string;
  summary?: string;
  headline?: string;
  predictions?: Prediction[];
  tacticalAdvice?: TacticalAdvice[];
  coachingNote?: string;
}

interface TrackerAIInsightsProps {
  transactions: Array<{ amount: number; category_1: string; transaction_date: string; description: string }>;
  categoryGroups: Array<{ category_name: string; group_name: string }>;
  budgets: Array<{ category_name: string; amount: number; month: number | null }>;
  year: number;
  focusMonth?: Date | null;
}

const TrackerAIInsights = ({ transactions, categoryGroups, budgets, year, focusMonth }: TrackerAIInsightsProps) => {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<InsightsData | null>(null);

  const monthTransactions = focusMonth
    ? transactions.filter(t => isSameMonth(parseISO(t.transaction_date), focusMonth))
    : transactions;

  const periodLabel = focusMonth
    ? `${focusMonth.toLocaleString('en-US', { month: 'long' })} ${focusMonth.getFullYear()}`
    : year.toString();

  const buildLocalInsights = (): InsightsData => {
    const spentByCat: Record<string, number> = {};
    let totalSpent = 0;
    monthTransactions.forEach(t => {
      const abs = Math.abs(t.amount);
      spentByCat[t.category_1] = (spentByCat[t.category_1] || 0) + abs;
      totalSpent += abs;
    });

    const catToGroup: Record<string, string> = {};
    categoryGroups.forEach(cg => { catToGroup[cg.category_name] = cg.group_name; });

    const isYearly = !focusMonth;
    const budgetFor = (cat: string) => {
      const b = budgets.find(x => x.category_name === cat && (x.month === 0 || x.month === null));
      if (!b) return 0;
      return isYearly ? b.amount : b.amount / 12;
    };

    const groupSpent: Record<string, number> = {};
    const groupBudget: Record<string, number> = {};
    Object.entries(spentByCat).forEach(([cat, spent]) => {
      const g = catToGroup[cat] || 'Other';
      groupSpent[g] = (groupSpent[g] || 0) + spent;
      groupBudget[g] = (groupBudget[g] || 0) + budgetFor(cat);
    });

    const totalBudget = Object.values(groupBudget).reduce((s, x) => s + x, 0);
    const percent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
    const status = totalBudget > 0
      ? percent > 100 ? 'critical' : percent >= 90 ? 'at_risk' : 'on_track'
      : 'on_track';

    const summary = totalBudget > 0
      ? `In ${periodLabel} you've spent ${formatCurrency(totalSpent)} against a budget of ${formatCurrency(totalBudget)} — that's ${Math.round(percent)}% utilized.`
      : `In ${periodLabel} you've spent ${formatCurrency(totalSpent)} across ${Object.keys(spentByCat).length} categories. Add budgets to get utilization insights.`;

    const offenders = Object.entries(spentByCat)
      .map(([cat, spent]) => {
        const budget = budgetFor(cat);
        return { cat, spent, budget, percent: budget > 0 ? (spent / budget) * 100 : 0 };
      })
      .filter(o => o.budget > 0 && o.percent > 100)
      .sort((a, b) => b.percent - a.percent)
      .slice(0, 3);

    const overGroups = Object.entries(groupBudget)
      .map(([g, budget]) => {
        const spent = groupSpent[g] || 0;
        return { g, budget, spent, percent: budget > 0 ? (spent / budget) * 100 : 0 };
      })
      .filter(o => o.budget > 0 && o.percent > 100)
      .sort((a, b) => b.percent - a.percent);

    const predictions = offenders.map(o => ({
      severity: o.percent > 150 ? 'high' : 'medium',
      category: o.cat,
      prediction: `${o.cat} is at ${Math.round(o.percent)}% of budget (${formatCurrency(o.spent)} vs ${formatCurrency(o.budget)}).`
    }));

    const tacticalAdvice: TacticalAdvice[] = [];
    overGroups.forEach(g => {
      tacticalAdvice.push({
        title: `Slow ${g.g} spending`,
        advice: `You're ${Math.round(g.percent)}% through the ${g.g} budget. Trim discretionary purchases to get back on track.`,
        impact: `${formatCurrency(g.spent - g.budget)} over budget`
      });
    });
    if (overGroups.length === 0 && totalBudget > 0) {
      tacticalAdvice.push({
        title: 'On track',
        advice: 'Your spending is within budget. Keep the current pace.',
        impact: `${Math.max(0, Math.round(100 - percent))}% budget remaining`
      });
    }

    const coachingNote = overGroups.length > 0
      ? `Focus on ${overGroups[0].g} first — it's your biggest overrun this ${isYearly ? 'year' : 'month'}.`
      : 'No groups are over budget. Consider raising your savings target.';

    return { status, summary, predictions, tacticalAdvice, coachingNote };
  };

  const getInsights = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('financial-insights', {
        body: {
          transactions: monthTransactions.slice(0, 300),
          categoryGroups,
          budgets,
          period: periodLabel
        }
      });

      if (error) throw error;
      setInsights(data);
    } catch (error: unknown) {
      setInsights(buildLocalInsights());
      showError('Live AI is unavailable — showing a local analysis instead.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-0 shadow-xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white overflow-hidden relative group">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
      
      {!insights ? (
        <CardContent className="p-8 relative flex flex-col items-center text-center space-y-6">
          <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-500">
            <Brain className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold tracking-tight">AI Financial Coach</h3>
            <p className="text-white/70 max-w-md mx-auto">
              I'll analyze your {monthTransactions.length} transactions in {periodLabel} against your {budgets.length} budget targets to help you stay on track.
            </p>
          </div>
          <Button 
            onClick={getInsights} 
            disabled={loading}
            className="rounded-2xl h-14 px-8 bg-white text-primary hover:bg-white/90 font-bold text-lg shadow-xl shadow-black/20 gap-3"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            Analyze My Progress
          </Button>
        </CardContent>
      ) : (
        <CardContent className="p-8 relative space-y-8 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                <Brain className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight">Coach Analysis</h3>
                <p className="text-xs font-bold uppercase tracking-widest opacity-70">Real-time Strategy</p>
              </div>
            </div>
            <Badge className={cn(
              "rounded-full px-4 py-1 text-xs font-semibold opacity-70",
              insights.status === 'on_track' ? "bg-emerald-400 text-emerald-950" : 
              insights.status === 'at_risk' ? "bg-amber-400 text-amber-950" : "bg-rose-400 text-rose-950"
            )}>
              {(insights.status || 'Analyzed').replace('_', ' ')}
            </Badge>
          </div>

          {(insights.summary || insights.headline) && (
            <p className="text-lg font-medium leading-relaxed border-l-4 border-white/30 pl-6 italic">
              "{insights.summary || insights.headline}"
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Predictions */}
            <div className="space-y-4">
              <p className="text-xs font-semibold opacity-70">Trajectory Warnings</p>
              <div className="space-y-3">
                {insights.predictions?.map((p: Prediction, i: number) => (
                  <div key={i} className="p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-start gap-3">
                    <div className={cn(
                      "p-1.5 rounded-lg shrink-0",
                      p.severity === 'high' ? "bg-rose-400/20 text-rose-300" : "bg-amber-400/20 text-amber-300"
                    )}>
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-tighter">{p.category}</p>
                      <p className="text-sm font-medium opacity-90">{p.prediction}</p>
                    </div>
                  </div>
                ))}
                {(!insights.predictions || insights.predictions.length === 0) && (
                  <p className="text-xs opacity-60 italic">No specific warnings detected.</p>
                )}
              </div>
            </div>

            {/* Tactical Advice */}
            <div className="space-y-4">
              <p className="text-xs font-semibold opacity-70">Tactical Adjustments</p>
              <div className="space-y-3">
                {insights.tacticalAdvice?.map((a: TacticalAdvice, i: number) => (
                  <div key={i} className="p-4 rounded-2xl bg-black/20 border border-white/5 flex items-start gap-3">
                    <div className="p-1.5 bg-emerald-400/20 text-emerald-300 rounded-lg shrink-0">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{a.title}</p>
                      <p className="text-xs opacity-70 mt-0.5">{a.advice}</p>
                      {a.impact && <p className="text-xs font-semibold text-emerald-300 opacity-70 mt-2">Impact: {a.impact}</p>}
                    </div>
                  </div>
                ))}
                {(!insights.tacticalAdvice || insights.tacticalAdvice.length === 0) && (
                  <p className="text-xs opacity-60 italic">No tactical advice at this time.</p>
                )}
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            {insights.coachingNote && <p className="text-sm font-medium opacity-80">{insights.coachingNote}</p>}
            <Button 
              variant="ghost" 
              onClick={() => setInsights(null)}
              className="text-white/60 hover:text-white hover:bg-white/10 rounded-xl text-xs font-bold"
            >
              <RefreshCw className="w-3 h-3 mr-2" /> Refresh Analysis
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default TrackerAIInsights;