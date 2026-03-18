"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Target, Plus, Pencil, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Transaction {
  transaction_date: string;
  amount: number;
  category_1: string;
}

interface Budget {
  id: string;
  category: string;
  amount: number;
}

interface BudgetTrackerProps {
  transactions: Transaction[];
}

const BudgetTracker = ({ transactions }: BudgetTrackerProps) => {
  const [budgets, setBudgets] = useState<Budget[]>(() => {
    const saved = localStorage.getItem('finance-budgets');
    return saved ? JSON.parse(saved) : [];
  });
  const [showDialog, setShowDialog] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [formCategory, setFormCategory] = useState('');
  const [formAmount, setFormAmount] = useState('');

  const categories = useMemo(() => {
    const cats = new Set(transactions.map(t => t.category_1).filter(Boolean));
    return Array.from(cats).sort();
  }, [transactions]);

  const currentMonthSpending = useMemo(() => {
    const now = new Date();
    const currentMonth = `${now.toLocaleDateString('en-US', { month: 'short' })} ${now.getFullYear()}`;
    
    const spending: Record<string, number> = {};
    transactions
      .filter(t => {
        const tDate = new Date(t.transaction_date);
        const tMonth = `${tDate.toLocaleDateString('en-US', { month: 'short' })} ${tDate.getFullYear()}`;
        return tMonth === currentMonth && t.amount < 0;
      })
      .forEach(t => {
        const cat = t.category_1 || 'Uncategorized';
        spending[cat] = (spending[cat] || 0) + Math.abs(t.amount);
      });

    return spending;
  }, [transactions]);

  const saveBudgets = (newBudgets: Budget[]) => {
    setBudgets(newBudgets);
    localStorage.setItem('finance-budgets', JSON.stringify(newBudgets));
  };

  const handleSave = () => {
    if (!formCategory || !formAmount) return;

    const amount = parseFloat(formAmount) || 0;
    if (editingBudget) {
      saveBudgets(budgets.map(b => b.id === editingBudget.id ? { ...b, category: formCategory, amount } : b));
    } else {
      saveBudgets([...budgets, { id: crypto.randomUUID(), category: formCategory, amount }]);
    }

    setShowDialog(false);
    setEditingBudget(null);
    setFormCategory('');
    setFormAmount('');
  };

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setFormCategory(budget.category);
    setFormAmount(budget.amount.toString());
    setShowDialog(true);
  };

  const handleDelete = (id: string) => {
    saveBudgets(budgets.filter(b => b.id !== id));
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgets.reduce((s, b) => s + (currentMonthSpending[b.category] || 0), 0);

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="w-5 h-5 text-primary" />
              Budget Tracker
            </CardTitle>
            <CardDescription>Track this month's spending against your budgets</CardDescription>
          </div>
          <Dialog open={showDialog} onOpenChange={(open) => {
            setShowDialog(open);
            if (!open) {
              setEditingBudget(null);
              setFormCategory('');
              setFormAmount('');
            }
          }}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-xl gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                Add Budget
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle>{editingBudget ? 'Edit Budget' : 'Add Budget'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={formCategory} onValueChange={setFormCategory}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.filter(c => !budgets.some(b => b.category === c && b.id !== editingBudget?.id)).map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Monthly Budget ($)</Label>
                  <Input
                    type="number"
                    step="1"
                    placeholder="500"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="rounded-xl text-lg font-semibold"
                  />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setShowDialog(false)} className="rounded-xl">Cancel</Button>
                <Button onClick={handleSave} className="rounded-xl" disabled={!formCategory || !formAmount}>
                  {editingBudget ? 'Save Changes' : 'Add Budget'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {budgets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="w-10 h-10 mx-auto opacity-20 mb-2" />
            <p className="font-medium">No budgets set</p>
            <p className="text-sm">Add budgets to track your monthly spending</p>
          </div>
        ) : (
          <>
            {/* Overall Progress */}
            <div className="p-4 rounded-xl bg-muted/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Budget</span>
                <span className="text-sm text-muted-foreground">
                  {formatCurrency(totalSpent)} / {formatCurrency(totalBudget)}
                </span>
              </div>
              <Progress
                value={Math.min(100, (totalSpent / totalBudget) * 100)}
                className={cn(
                  "h-2.5",
                  totalSpent > totalBudget ? "[&>div]:bg-rose-500" : "[&>div]:bg-primary"
                )}
              />
              <div className="flex items-center justify-between mt-2">
                <span className={cn(
                  "text-xs font-medium",
                  totalBudget - totalSpent >= 0 ? "text-emerald-600" : "text-rose-600"
                )}>
                  {totalBudget - totalSpent >= 0
                    ? `${formatCurrency(totalBudget - totalSpent)} remaining`
                    : `${formatCurrency(totalSpent - totalBudget)} over budget`
                  }
                </span>
                <span className="text-xs text-muted-foreground">
                  {Math.round((totalSpent / totalBudget) * 100)}% used
                </span>
              </div>
            </div>

            {/* Individual Budgets */}
            <div className="space-y-3">
              {budgets.map((budget) => {
                const spent = currentMonthSpending[budget.category] || 0;
                const percentage = Math.min(100, (spent / budget.amount) * 100);
                const isOver = spent > budget.amount;
                const isWarning = percentage >= 80 && !isOver;
                const remaining = budget.amount - spent;

                return (
                  <div key={budget.id} className="group p-3 rounded-xl border hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {isOver ? (
                          <AlertTriangle className="w-4 h-4 text-rose-500" />
                        ) : isWarning ? (
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        )}
                        <span className="font-medium text-sm">{budget.category}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {formatCurrency(spent)} / {formatCurrency(budget.amount)}
                        </span>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-lg" onClick={() => handleEdit(budget)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-lg hover:text-rose-600" onClick={() => handleDelete(budget.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <Progress
                      value={percentage}
                      className={cn(
                        "h-1.5",
                        isOver ? "[&>div]:bg-rose-500" : isWarning ? "[&>div]:bg-amber-500" : "[&>div]:bg-emerald-500"
                      )}
                    />
                    <div className="flex items-center justify-between mt-1.5">
                      <span className={cn(
                        "text-[10px] font-medium",
                        isOver ? "text-rose-600" : "text-emerald-600"
                      )}>
                        {isOver
                          ? `$${Math.abs(remaining).toFixed(0)} over`
                          : `$${remaining.toFixed(0)} left`
                        }
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {Math.round(percentage)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default BudgetTracker;