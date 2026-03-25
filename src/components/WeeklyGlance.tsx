"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp,
  Loader2,
  Plus,
  History
} from 'lucide-react';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  addWeeks, 
  subWeeks, 
  isSameWeek,
  parseISO
} from 'date-fns';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/format';
import { Transaction } from '@/types/finance';
import { Link } from 'react-router-dom';

const WeeklyGlance = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  useEffect(() => {
    fetchWeeklyTransactions();
  }, [currentDate]);

  const fetchWeeklyTransactions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('finance_transactions')
        .select('*')
        .gte('transaction_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('transaction_date', format(weekEnd, 'yyyy-MM-dd'))
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error("Error fetching weekly transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const income = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const expenses = transactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
    return { income, expenses, net: income - expenses };
  }, [transactions]);

  const navigateWeek = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'prev') setCurrentDate(subWeeks(currentDate, 1));
    else if (direction === 'next') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(new Date());
  };

  const isToday = isSameWeek(currentDate, new Date(), { weekStartsOn: 1 });

  return (
    <Card className="border-0 shadow-2xl bg-card overflow-hidden animate-slide-up">
      <CardHeader className="pb-4 border-b bg-muted/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-xl font-black tracking-tight">Weekly Glance</CardTitle>
              <CardDescription className="text-xs font-bold uppercase tracking-wider">
                {format(weekStart, 'MMM dd')} — {format(weekEnd, 'MMM dd, yyyy')}
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigateWeek('today')}
              className={cn("rounded-xl h-9 px-4 font-bold", isToday && "bg-primary/5 border-primary/20 text-primary")}
            >
              This Week
            </Button>
            <div className="flex items-center bg-muted rounded-xl p-1">
              <Button variant="ghost" size="icon" onClick={() => navigateWeek('prev')} className="h-7 w-7 rounded-lg">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => navigateWeek('next')} className="h-7 w-7 rounded-lg">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Weekly Stats Bar */}
        <div className="grid grid-cols-3 border-b divide-x">
          <div className="p-4 text-center">
            <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Income</p>
            <p className="text-lg font-black text-emerald-600">{formatCurrency(stats.income)}</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Expenses</p>
            <p className="text-lg font-black text-rose-600">{formatCurrency(-stats.expenses)}</p>
          </div>
          <div className={cn("p-4 text-center", stats.net >= 0 ? "bg-emerald-50/30" : "bg-rose-50/30")}>
            <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Net</p>
            <p className={cn("text-lg font-black", stats.net >= 0 ? "text-emerald-700" : "text-rose-700")}>
              {formatCurrency(stats.net)}
            </p>
          </div>
        </div>

        {/* Transaction List */}
        <div className="divide-y max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center text-muted-foreground gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm font-bold uppercase tracking-widest">Syncing Week...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-12 text-center space-y-4">
              <div className="w-16 h-16 bg-muted rounded-3xl flex items-center justify-center mx-auto opacity-50">
                <History className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-bold text-muted-foreground">No activity this week</p>
                <p className="text-xs text-muted-foreground/60">Transactions you log will appear here.</p>
              </div>
              <Button variant="outline" size="sm" asChild className="rounded-xl">
                <Link to="/transactions">Go to History</Link>
              </Button>
            </div>
          ) : (
            transactions.map((t) => (
              <div key={t.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors group">
                <div className="flex items-center gap-4 min-w-0">
                  <div className={cn(
                    "w-2 h-2 rounded-full shrink-0",
                    t.amount > 0 ? "bg-emerald-500" : "bg-rose-500"
                  )} />
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{t.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter">
                        {format(parseISO(t.transaction_date), 'EEE, MMM dd')}
                      </span>
                      <Badge variant="outline" className="text-[8px] h-4 px-1.5 rounded-md uppercase font-black border-primary/10 bg-primary/5 text-primary">
                        {t.category_1}
                      </Badge>
                      {t.is_work && (
                        <Badge className="text-[8px] h-4 px-1.5 rounded-md uppercase font-black bg-amber-100 text-amber-700 border-amber-200">Work</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className={cn(
                    "text-sm font-black tabular-nums",
                    t.amount > 0 ? "text-emerald-600" : "text-rose-600"
                  )}>
                    {formatCurrency(t.amount)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-3 bg-muted/10 border-t flex justify-center">
          <Button variant="ghost" size="sm" asChild className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary">
            <Link to="/transactions">View Full History <ArrowUpRight className="w-3 h-3 ml-1" /></Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeeklyGlance;