"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  Clock, 
  DollarSign, 
  Target, 
  Zap, 
  ArrowLeft, 
  Users, 
  Briefcase,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ChevronRight,
  Brain
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/format';

interface ProjectMetric {
  id: string;
  title: string;
  clientName: string;
  hours: number;
  revenue: number;
  hourlyRate: number;
  status: string;
  efficiency: number; // 0-100
}

const ProjectROI = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<ProjectMetric[]>([]);

  useEffect(() => {
    if (session) fetchROIData();
  }, [session]);

  const fetchROIData = async () => {
    setLoading(true);
    try {
      const [ticketsRes, invoicesRes] = await Promise.all([
        supabase.from('tickets').select('*'),
        supabase.from('invoices').select('*')
      ]);

      const tickets = ticketsRes.data || [];
      const invoices = invoicesRes.data || [];

      // Group revenue by ticket (if linked) or by client
      const projectMetrics: ProjectMetric[] = tickets.map(ticket => {
        const hours = ticket.actual_hours || 0;
        
        // Find revenue linked to this ticket or client
        // For now, we'll attribute client revenue proportionally to tickets if not directly linked
        const clientInvoices = invoices.filter(inv => inv.client_id === ticket.client_id && inv.status === 'Paid');
        const totalClientRevenue = clientInvoices.reduce((s, inv) => s + inv.total_amount, 0);
        const clientTickets = tickets.filter(t => t.client_id === ticket.client_id);
        const totalClientHours = clientTickets.reduce((s, t) => s + (t.actual_hours || 0), 0);
        
        const revenueShare = totalClientHours > 0 
          ? (hours / totalClientHours) * totalClientRevenue 
          : 0;

        const hourlyRate = hours > 0 ? revenueShare / hours : 0;
        
        // Efficiency: How close was actual to estimated?
        let efficiency = 100;
        if (ticket.estimated_hours > 0) {
          efficiency = Math.max(0, 100 - ((Math.abs(hours - ticket.estimated_hours) / ticket.estimated_hours) * 100));
        }

        return {
          id: ticket.id,
          title: ticket.title,
          clientName: ticket.client_display_name,
          hours,
          revenue: revenueShare,
          hourlyRate,
          status: ticket.status,
          efficiency
        };
      });

      setMetrics(projectMetrics.sort((a, b) => b.hourlyRate - a.hourlyRate));
    } catch (error) {
      console.error("ROI Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const globalStats = useMemo(() => {
    if (metrics.length === 0) return null;
    const totalRevenue = metrics.reduce((s, m) => s + m.revenue, 0);
    const totalHours = metrics.reduce((s, m) => s + m.hours, 0);
    const avgRate = totalHours > 0 ? totalRevenue / totalHours : 0;
    const avgEfficiency = metrics.reduce((s, m) => s + m.efficiency, 0) / metrics.length;

    return { totalRevenue, totalHours, avgRate, avgEfficiency };
  }, [metrics]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
              <div className="p-2.5 bg-emerald-600 rounded-2xl text-white shadow-lg shadow-emerald-200">
                <TrendingUp className="w-7 h-7" />
              </div>
              Project ROI Engine
            </h1>
            <p className="text-muted-foreground mt-1">Analyzing the financial efficiency of your time investment.</p>
          </div>
        </div>
      </header>

      {globalStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
          <Card className="border-0 shadow-xl bg-primary text-white overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
            <CardContent className="p-6 relative">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Avg. Effective Rate</p>
              <p className="text-3xl font-black">{formatCurrency(globalStats.avgRate)}<span className="text-sm opacity-60">/h</span></p>
              <p className="text-xs opacity-70 mt-2">Across all logged projects</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-xl bg-emerald-600 text-white overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
            <CardContent className="p-6 relative">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Total Attributed Revenue</p>
              <p className="text-3xl font-black">{formatCurrency(globalStats.totalRevenue)}</p>
              <p className="text-xs opacity-70 mt-2">From {metrics.length} projects</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-xl bg-indigo-600 text-white overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
            <CardContent className="p-6 relative">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Estimation Accuracy</p>
              <p className="text-3xl font-black">{Math.round(globalStats.avgEfficiency)}%</p>
              <p className="text-xs opacity-70 mt-2">Actual vs. Estimated hours</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-xl bg-amber-500 text-white overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
            <CardContent className="p-6 relative">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Total Time Investment</p>
              <p className="text-3xl font-black">{globalStats.totalHours.toFixed(1)}h</p>
              <p className="text-xs opacity-70 mt-2">Billable hours logged</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-0 shadow-2xl overflow-hidden">
            <CardHeader className="border-b bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-black">Profitability Matrix</CardTitle>
                  <CardDescription>Which projects are generating the highest return?</CardDescription>
                </div>
                <Badge variant="outline" className="rounded-lg font-bold">Top ROI First</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {metrics.map((m) => (
                  <div key={m.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:bg-muted/30 transition-colors group">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-lg truncate group-hover:text-primary transition-colors">{m.title}</h3>
                        <Badge className={cn(
                          "text-[9px] font-black uppercase rounded-md",
                          m.hourlyRate > (globalStats?.avgRate || 0) ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
                        )}>
                          {m.hourlyRate > (globalStats?.avgRate || 0) ? 'High Yield' : 'Standard'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                        <Users className="w-3.5 h-3.5" /> {m.clientName}
                      </p>
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-tighter">
                          <Clock className="w-3.5 h-3.5" /> {m.hours.toFixed(1)}h
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-tighter">
                          <DollarSign className="w-3.5 h-3.5" /> {formatCurrency(m.revenue)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-8 shrink-0">
                      <div className="text-right space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Effective Rate</p>
                        <p className={cn(
                          "text-2xl font-black tabular-nums",
                          m.hourlyRate > (globalStats?.avgRate || 0) ? "text-emerald-600" : "text-foreground"
                        )}>
                          {formatCurrency(m.hourlyRate)}<span className="text-xs">/h</span>
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" asChild className="rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link to={`/tickets/${m.id}`}><ChevronRight className="w-5 h-5" /></Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          {/* Efficiency Insights */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                Efficiency Audit
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {metrics.filter(m => m.efficiency < 70).length > 0 && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-2">
                  <div className="flex items-center gap-2 text-rose-400 font-black uppercase tracking-widest text-[10px]">
                    <AlertTriangle className="w-4 h-4" /> Under-Estimated
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    You have <span className="text-white font-bold">{metrics.filter(m => m.efficiency < 70).length} projects</span> where actual time exceeded estimates by 30%+. Consider increasing your quotes for these types of tasks.
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Top Performers</p>
                {metrics.slice(0, 3).map((m, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-xs font-black">{i + 1}</div>
                      <span className="text-sm font-bold truncate max-w-[120px]">{m.title}</span>
                    </div>
                    <span className="text-sm font-black text-emerald-400">{formatCurrency(m.hourlyRate)}/h</span>
                  </div>
                ))}
              </div>

              <Button variant="secondary" className="w-full rounded-xl font-black gap-2 shadow-lg" asChild>
                <Link to="/invoices">Review Service Tiers</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Proactive Tip */}
          <Card className="border-0 shadow-xl bg-indigo-50 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900 rounded-lg text-indigo-600 dark:text-indigo-400">
                  <Brain className="w-4 h-4" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">AI Recommendation</span>
              </div>
              <p className="text-sm font-medium leading-relaxed text-indigo-900 dark:text-indigo-100">
                Based on your ROI data, <span className="font-black">{metrics[0]?.clientName}</span> is your most profitable client. You should prioritize their tickets to maximize your effective hourly yield.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProjectROI;