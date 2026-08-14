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
import { normalizeSubscriptionName } from '@/utils/subscriptions';

interface Alert {
  id: string;
  title: string;
  description: string;
  type: 'warning' | 'opportunity' | 'success' | 'info';
  actionLabel?: string;
  actionUrl?: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface InvoiceLike {
  status: string;
  due_date: string;
  total_amount: number;
}

interface SmartAlertsProps {
  transactions: Array<{ amount: number; is_work: boolean; notes?: string; category_1: string; description: string }>;
  invoices: InvoiceLike[];
  clients: Array<Record<string, unknown>>;
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
        actionUrl: '/contacts?view=invoices',
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
        actionUrl: '/finance',
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
        actionUrl: '/tax?view=report',
        icon: Zap
      });
    }

    // 4. Subscription Opportunity
    const subTxns = transactions.filter(t => t.category_1 === 'Subscription');
    const uniqueSubCount = new Set(subTxns.map(t => normalizeSubscriptionName(t.description))).size;
    if (uniqueSubCount > 10) {
      list.push({
        id: 'sub-audit',
        title: 'Subscription Bloat?',
        description: `You're currently paying for ${uniqueSubCount} different services. Time for a quick audit?`,
        type: 'opportunity',
        actionLabel: 'Audit Services',
        actionUrl: '/finance?view=subscriptions',
        icon: Sparkles
      });
    }

    return list.slice(0, 3); // Only show top 3
  }, [transactions, invoices]);

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-2 px-2">
        <Zap className="w-4 h-4 text-primary" />
        <h2 className="text-xs font-semibold text-muted-foreground">Proactive Alerts</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {alerts.map((alert) => (
          <Card key={alert.id} className={cn(
            "border-0 shadow-sm overflow-hidden group hover:shadow-sm transition-all",
            alert.type === 'warning' ? "bg-danger-bg border-l-4 border-danger" :
            alert.type === 'opportunity' ? "bg-profit-bg border-l-4 border-profit" :
            "bg-info-bg border-l-4 border-info"
          )}>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h3 className={cn(
                    "font-bold text-sm uppercase tracking-tight",
                    alert.type === 'warning' ? "text-danger" :
                    alert.type === 'opportunity' ? "text-profit" :
                    "text-info"
                  )}>{alert.title}</h3>
                  <p className="text-xs font-medium text-muted-foreground leading-relaxed">{alert.description}</p>
                </div>
                <div className={cn(
                  "p-2 rounded-xl shrink-0",
                  alert.type === 'warning' ? "bg-danger-bg text-danger" :
                  alert.type === 'opportunity' ? "bg-profit-bg text-profit" :
                  "bg-info-bg text-info"
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
                    "w-full rounded-xl h-9 text-xs font-bold gap-2 group-hover:bg-card/50 transition-colors",
                    alert.type === 'warning' ? "text-danger " :
                    alert.type === 'opportunity' ? "text-profit " :
                    "text-info "
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