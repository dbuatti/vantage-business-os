"use client";

import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  Clock, 
  DollarSign, 
  ArrowRight,
  CheckCircle2,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { formatCurrency } from '@/utils/format';

interface Alert {
  id: string;
  title: string;
  description: string;
  type: 'warning' | 'opportunity' | 'success' | 'info';
  actionLabel?: string;
  actionUrl?: string;
  icon: any;
}

interface SmartAlertsProps {
  transactions: any[];
  invoices: any[];
  clients: any[];
}

const SmartAlerts = ({ transactions, invoices, clients }: SmartAlertsProps) => {
  const alerts = useMemo(() => {
    const list: Alert[] = [];

    // 1. Overdue Invoices Alert
    const overdue = invoices.filter(inv => inv.status === 'Overdue' || (inv.status === 'Sent' && new Date(inv.due_date) < new Date()));
    if (overdue.length > 0) {
      const totalOverdue = overdue.reduce((s, inv) => s + inv.total_amount, 0);
      list.push({
        id: 'overdue-invoices',
        title: `${overdue.length} Overdue Invoices`,
        description: `You have ${formatCurrency(totalOverdue)} waiting to be collected.`,
        type: 'warning',
        actionLabel: 'Send Reminders',
        actionUrl: '/invoices',
        icon: ShieldAlert
      });
    }

    // 2. High Burn Alert
    const expenses = transactions.filter(t => t.amount < 0);
    const recentExpenses = expenses.slice(0, 10);
    const avgExpense = expenses.reduce((s, t) => s + Math.abs(t.amount), 0) / (expenses.length || 1);
    const spike = recentExpenses.find(t => Math.abs(t.amount) > avgExpense * 3);
    if (spike) {
      list.push({
        id: 'expense-spike',
        title: 'Expense Spike Detected',
        description: `A charge of ${formatCurrency(Math.abs(spike.amount))} from ${spike.description} is significantly higher than your average.`,
        type: 'info',
        actionLabel: 'View Details',
        actionUrl: '/transactions',
        icon: TrendingDown
      });
    }

    // 3. Tax Readiness Opportunity
    const workTxns = transactions.filter(t => t.is_work);
    const missingNotes = workTxns.filter(t => !t.notes).length;
    if (missingNotes > 5) {
      list.push({
        id: 'tax-readiness',
        title: 'Boost Tax Readiness',
        description: `You have ${missingNotes} work transactions missing notes. Adding them now saves hours at tax time.`,
        type: 'opportunity',
        actionLabel: 'Fix Now',
        actionUrl: '/accountant-report',
        icon: Zap
      });
    }

    // 4. Subscription Opportunity
    const subs = transactions.filter(t => t.category_1 === 'Subscription');
    if (subs.length > 10) {
      list.push({
        id: 'sub-audit',
        title: 'Subscription Bloat?',
        description: `You're currently paying for ${subs.length} different services. Time for a quick audit?`,
        type: 'opportunity',
        actionLabel: 'Audit Services',
        actionUrl: '/subscriptions',
        icon: Sparkles
      });
    }

    return list.slice(0, 3); // Only show top 3
  }, [transactions, invoices, clients]);

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-2 px-2">
        <Zap className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Proactive Alerts</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {alerts.map((alert) => (
          <Card key={alert.id} className={cn(
            "border-0 shadow-lg overflow-hidden group hover:shadow-xl transition-all",
            alert.type === 'warning' ? "bg-rose-50 border-l-4 border-rose-500" :
            alert.type === 'opportunity' ? "bg-emerald-50 border-l-4 border-emerald-500" :
            "bg-blue-50 border-l-4 border-blue-500"
          )}>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h3 className={cn(
                    "font-black text-sm uppercase tracking-tight",
                    alert.type === 'warning' ? "text-rose-700" :
                    alert.type === 'opportunity' ? "text-emerald-700" :
                    "text-blue-700"
                  )}>{alert.title}</h3>
                  <p className="text-xs font-medium text-muted-foreground leading-relaxed">{alert.description}</p>
                </div>
                <div className={cn(
                  "p-2 rounded-xl shrink-0",
                  alert.type === 'warning' ? "bg-rose-100 text-rose-600" :
                  alert.type === 'opportunity' ? "bg-emerald-100 text-emerald-600" :
                  "bg-blue-100 text-blue-600"
                )}>
                  <alert.icon className="w-4 h-4" />
                </div>
              </div>
              
              {alert.actionLabel && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  asChild 
                  className={cn(
                    "w-full rounded-xl h-9 text-xs font-bold gap-2 group-hover:bg-white/50 transition-colors",
                    alert.type === 'warning' ? "text-rose-700 hover:text-rose-800" :
                    alert.type === 'opportunity' ? "text-emerald-700 hover:text-emerald-800" :
                    "text-blue-700 hover:text-blue-800"
                  )}
                >
                  <Link to={alert.actionUrl || '#'}>
                    {alert.actionLabel} <ArrowRight className="w-3 h-3" />
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SmartAlerts;