"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Clock, 
  TrendingUp, 
  Users, 
  Briefcase, 
  Zap, 
  Target, 
  BarChart3, 
  PieChart,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Timer,
  DollarSign,
  ChevronRight,
  Calendar
} from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { cn } from '@/lib/utils';
import TimeLogChart from '@/components/TimeLogChart';
import { showError } from '@/utils/toast';

const Productivity = () => {
  const { session } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) fetchData();
  }, [session]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ticketsRes, invoicesRes] = await Promise.all([
        supabase.from('tickets').select('*'),
        supabase.from('invoices').select('*')
      ]);
      setTickets(ticketsRes.data || []);
      setInvoices(invoicesRes.data || []);
    } catch (error: any) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const totalHours = tickets.reduce((s, t) => s + (t.actual_hours || 0), 0);
    const totalEstimated = tickets.reduce((s, t) => s + (t.estimated_hours || 0), 0);
    const resolvedCount = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;
    
    // Client breakdown
    const clientHours: Record<string, { name: string, hours: number, invoiced: number }> = {};
    tickets.forEach(t => {
      if (!clientHours[t.client_id]) {
        clientHours[t.client_id] = { name: t.client_display_name, hours: 0, invoiced: 0 };
      }
      clientHours[t.client_id].hours += (t.actual_hours || 0);
    });

    invoices.forEach(inv => {
      if (clientHours[inv.client_id]) {
        clientHours[inv.client_id].invoiced += inv.total_amount;
      }
    });

    const topClients = Object.values(clientHours)
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 5);

    // Category breakdown
    const categoryHours: Record<string, number> = {};
    tickets.forEach(t => {
      const cat = t.category || 'Other';
      categoryHours[cat] = (categoryHours[cat] || 0) + (t.actual_hours || 0);
    });

    // Weekly chart data
    const start = startOfWeek(new Date());
    const end = endOfWeek(new Date());
    const days = eachDayOfInterval({ start, end });
    const weeklyData = days.map(day => ({
      day: format(day, 'EEE'),
      hours: tickets
        .filter(t => format(new Date(t.updated_at), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd'))
        .reduce((s, t) => s + (t.actual_hours || 0), 0) // This is a simplification
    }));

    return { totalHours, totalEstimated, resolvedCount, topClients, categoryHours, weeklyData };
  }, [tickets, invoices]);

  if (loading) return null;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      <header>
        <h1 className="text-3xl font-black tracking-tight">Productivity Dashboard</h1>
        <p className="text-muted-foreground">Analyze your time investment and client efficiency.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg bg-primary text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium opacity-80">Total Logged Hours</p>
              <Timer className="w-5 h-5 opacity-50" />
            </div>
            <p className="text-3xl font-black">{stats.totalHours.toFixed(1)}h</p>
            <p className="text-xs opacity-70 mt-1">Across {tickets.length} tickets</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-emerald-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium opacity-80">Resolution Rate</p>
              <CheckCircle2 className="w-5 h-5 opacity-50" />
            </div>
            <p className="text-3xl font-black">{Math.round((stats.resolvedCount / (tickets.length || 1)) * 100)}%</p>
            <p className="text-xs opacity-70 mt-1">{stats.resolvedCount} tickets completed</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-amber-500 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium opacity-80">Avg. Hourly Yield</p>
              <DollarSign className="w-5 h-5 opacity-50" />
            </div>
            <p className="text-3xl font-black">
              ${stats.totalHours > 0 ? (invoices.reduce((s, i) => s + i.total_amount, 0) / stats.totalHours).toFixed(0) : '0'}
            </p>
            <p className="text-xs opacity-70 mt-1">Revenue per logged hour</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-indigo-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium opacity-80">Estimation Accuracy</p>
              <Target className="w-5 h-5 opacity-50" />
            </div>
            <p className="text-3xl font-black">
              {stats.totalEstimated > 0 ? Math.round((stats.totalHours / stats.totalEstimated) * 100) : '0'}%
            </p>
            <p className="text-xs opacity-70 mt-1">Actual vs. Estimated hours</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <TimeLogChart data={stats.weeklyData} />

          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Client Efficiency
              </CardTitle>
              <CardDescription>Comparing time spent vs. revenue generated per client.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {stats.topClients.map((client) => {
                  const yield_ = client.hours > 0 ? client.invoiced / client.hours : 0;
                  return (
                    <div key={client.name} className="p-6 flex items-center justify-between hover:bg-muted/30 transition-colors">
                      <div className="space-y-1 flex-1">
                        <p className="font-bold text-lg">{client.name}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {client.hours.toFixed(1)}h</span>
                          <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" /> ${client.invoiced.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-black text-primary">${yield_.toFixed(0)}<span className="text-xs font-bold text-muted-foreground">/h</span></p>
                        <Badge variant="outline" className={cn(
                          "text-[10px] rounded-lg uppercase font-bold",
                          yield_ > 150 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-muted text-muted-foreground"
                        )}>
                          {yield_ > 150 ? 'High Yield' : 'Standard'}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <PieChart className="w-5 h-5 text-primary" />
                Time Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(stats.categoryHours).map(([cat, hours]) => (
                <div key={cat} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold capitalize">{cat}</span>
                    <span className="text-muted-foreground font-medium">{hours.toFixed(1)}h</span>
                  </div>
                  <Progress value={(hours / (stats.totalHours || 1)) * 100} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-primary to-indigo-700 text-white overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
            <CardContent className="p-6 relative space-y-4">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                <span className="text-xs font-black uppercase tracking-widest opacity-80">Productivity Tip</span>
              </div>
              <p className="text-sm font-medium leading-relaxed">
                {stats.topClients[0]?.name} is your most time-intensive client. Ensure your service tier reflects the {stats.topClients[0]?.hours.toFixed(0)} hours spent this month.
              </p>
              <Button variant="secondary" className="w-full rounded-xl font-bold gap-2 shadow-lg" asChild>
                <a href={`mailto:${session?.user.email}`}>Review Service Tiers</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Productivity;