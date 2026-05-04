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

interface TrackerAIInsightsProps {
  transactions: any[];
  categoryGroups: any[];
  budgets: any[];
  year: number;
}

const TrackerAIInsights = ({ transactions, categoryGroups, budgets, year }: TrackerAIInsightsProps) => {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<any>(null);

  const getInsights = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('financial-insights', {
        body: {
          transactions: transactions.slice(0, 300),
          categoryGroups,
          budgets,
          period: year.toString()
        }
      });

      if (error) throw error;
      setInsights(data);
    } catch (error: any) {
      showError('Failed to get AI advice. Please try again in a minute.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-0 shadow-2xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white overflow-hidden relative group">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
      
      {!insights ? (
        <CardContent className="p-8 relative flex flex-col items-center text-center space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-500">
            <Brain className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-black tracking-tight">AI Financial Coach</h3>
            <p className="text-white/70 max-w-md mx-auto">
              I'll analyze your {transactions.length} transactions against your {budgets.length} budget targets to help you stay on track.
            </p>
          </div>
          <Button 
            onClick={getInsights} 
            disabled={loading}
            className="rounded-2xl h-14 px-8 bg-white text-primary hover:bg-white/90 font-black text-lg shadow-2xl shadow-black/20 gap-3"
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
                <h3 className="text-xl font-black tracking-tight">Coach Analysis</h3>
                <p className="text-xs font-bold uppercase tracking-widest opacity-70">Real-time Strategy</p>
              </div>
            </div>
            <Badge className={cn(
              "rounded-full px-4 py-1 font-black uppercase tracking-widest text-[10px]",
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
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Trajectory Warnings</p>
              <div className="space-y-3">
                {insights.predictions?.map((p: any, i: number) => (
                  <div key={i} className="p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-start gap-3">
                    <div className={cn(
                      "p-1.5 rounded-lg shrink-0",
                      p.severity === 'high' ? "bg-rose-400/20 text-rose-300" : "bg-amber-400/20 text-amber-300"
                    )}>
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-tighter">{p.category}</p>
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
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Tactical Adjustments</p>
              <div className="space-y-3">
                {insights.tacticalAdvice?.map((a: any, i: number) => (
                  <div key={i} className="p-4 rounded-2xl bg-black/20 border border-white/5 flex items-start gap-3">
                    <div className="p-1.5 bg-emerald-400/20 text-emerald-300 rounded-lg shrink-0">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{a.title}</p>
                      <p className="text-xs opacity-70 mt-0.5">{a.advice}</p>
                      {a.impact && <p className="text-[10px] font-black text-emerald-300 uppercase mt-2">Impact: {a.impact}</p>}
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