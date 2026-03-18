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
import { Target, Plus, Pencil, Trash2, CheckCircle2, Sparkles, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Transaction {
  transaction_date: string;
  amount: number;
  account_label: string;
}

interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  color: string;
}

interface SavingsGoalsProps {
  transactions: Transaction[];
}

const COLORS = [
  'from-blue-500 to-indigo-500',
  'from-emerald-500 to-teal-500',
  'from-violet-500 to-purple-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-500',
];

const SavingsGoals = ({ transactions }: SavingsGoalsProps) => {
  const [goals, setGoals] = useState<SavingsGoal[]>(() => {
    const saved = localStorage.getItem('finance-savings-goals');
    return saved ? JSON.parse(saved) : [];
  });
  const [showDialog, setShowDialog] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [formName, setFormName] = useState('');
  const [formTarget, setFormTarget] = useState('');
  const [formCurrent, setFormCurrent] = useState('');
  const [formDeadline, setFormDeadline] = useState('');

  const currentSavings = useMemo(() => {
    const savingsTransactions = transactions.filter(t => {
      const label = t.account_label?.toLowerCase() || '';
      return label.includes('saving') || label.includes('savings');
    });
    return savingsTransactions.length > 0 ? savingsTransactions[0].amount : 0;
  }, [transactions]);

  const saveGoals = (newGoals: SavingsGoal[]) => {
    setGoals(newGoals);
    localStorage.setItem('finance-savings-goals', JSON.stringify(newGoals));
  };

  const handleSave = () => {
    if (!formName || !formTarget) return;

    const targetAmount = parseFloat(formTarget) || 0;
    const currentAmount = parseFloat(formCurrent) || 0;
    const color = COLORS[goals.length % COLORS.length];

    if (editingGoal) {
      saveGoals(goals.map(g => g.id === editingGoal.id ? {
        ...g,
        name: formName,
        targetAmount,
        currentAmount,
        deadline: formDeadline
      } : g));
    } else {
      saveGoals([...goals, {
        id: crypto.randomUUID(),
        name: formName,
        targetAmount,
        currentAmount,
        deadline: formDeadline,
        color
      }]);
    }

    setShowDialog(false);
    resetForm();
  };

  const resetForm = () => {
    setEditingGoal(null);
    setFormName('');
    setFormTarget('');
    setFormCurrent('');
    setFormDeadline('');
  };

  const handleEdit = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    setFormName(goal.name);
    setFormTarget(goal.targetAmount.toString());
    setFormCurrent(goal.currentAmount.toString());
    setFormDeadline(goal.deadline);
    setShowDialog(true);
  };

  const handleDelete = (id: string) => {
    saveGoals(goals.filter(g => g.id !== id));
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  const getDaysRemaining = (deadline: string) => {
    if (!deadline) return null;
    const diff = new Date(deadline).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="w-5 h-5 text-primary" />
              Savings Goals
            </CardTitle>
            <CardDescription>Track progress towards your financial goals</CardDescription>
          </div>
          <Dialog open={showDialog} onOpenChange={(open) => {
            setShowDialog(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-xl gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                Add Goal
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle>{editingGoal ? 'Edit Goal' : 'New Savings Goal'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Goal Name</Label>
                  <Input
                    placeholder="e.g., Emergency Fund, Vacation, New Car"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Target Amount ($)</Label>
                    <Input
                      type="number"
                      step="100"
                      placeholder="10000"
                      value={formTarget}
                      onChange={(e) => setFormTarget(e.target.value)}
                      className="rounded-xl text-lg font-semibold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Current Amount ($)</Label>
                    <Input
                      type="number"
                      step="100"
                      placeholder="2500"
                      value={formCurrent}
                      onChange={(e) => setFormCurrent(e.target.value)}
                      className="rounded-xl text-lg font-semibold"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Target Date (optional)</Label>
                  <Input
                    type="date"
                    value={formDeadline}
                    onChange={(e) => setFormDeadline(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setShowDialog(false)} className="rounded-xl">Cancel</Button>
                <Button onClick={handleSave} className="rounded-xl" disabled={!formName || !formTarget}>
                  {editingGoal ? 'Save Changes' : 'Create Goal'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {goals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="w-10 h-10 mx-auto opacity-20 mb-2" />
            <p className="font-medium">No savings goals yet</p>
            <p className="text-sm">Set a goal to start tracking your progress</p>
          </div>
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => {
              const percentage = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
              const isComplete = percentage >= 100;
              const remaining = goal.targetAmount - goal.currentAmount;
              const daysRemaining = getDaysRemaining(goal.deadline);
              const monthlyNeeded = daysRemaining && daysRemaining > 0
                ? remaining / (daysRemaining / 30)
                : null;

              return (
                <div
                  key={goal.id}
                  className={cn(
                    "group p-4 rounded-2xl border transition-all hover:shadow-md",
                    isComplete
                      ? "bg-gradient-to-br from-emerald-50 to-white border-emerald-200 dark:from-emerald-950 dark:to-card dark:border-emerald-800"
                      : "bg-gradient-to-br from-white to-muted/30 hover:from-muted/20"
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {isComplete ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <div className={cn("w-3 h-3 rounded-full bg-gradient-to-r", goal.color)} />
                      )}
                      <h3 className="font-bold">{goal.name}</h3>
                      {isComplete && (
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                          <Sparkles className="w-2.5 h-2.5 inline mr-1" />
                          Complete!
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => handleEdit(goal)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:text-rose-600" onClick={() => handleDelete(goal.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-2xl font-bold">{formatCurrency(goal.currentAmount)}</p>
                        <p className="text-xs text-muted-foreground">of {formatCurrency(goal.targetAmount)}</p>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "text-lg font-bold",
                          isComplete ? "text-emerald-600" : "text-primary"
                        )}>
                          {Math.round(percentage)}%
                        </p>
                      </div>
                    </div>

                    <Progress
                      value={percentage}
                      className={cn(
                        "h-2.5",
                        isComplete ? "[&>div]:bg-emerald-500" : `[&>div]:bg-gradient-to-r [&>div]:${goal.color}`
                      )}
                    />

                    <div className="flex items-center justify-between text-xs">
                      {!isComplete && (
                        <span className="text-muted-foreground">
                          {formatCurrency(remaining)} to go
                        </span>
                      )}
                      {daysRemaining !== null && daysRemaining > 0 && !isComplete && (
                        <span className="text-muted-foreground">
                          {daysRemaining} days left
                          {monthlyNeeded && monthlyNeeded > 0 && (
                            <span className="ml-1">· ~{formatCurrency(Math.round(monthlyNeeded))}/mo needed</span>
                          )}
                        </span>
                      )}
                      {isComplete && (
                        <span className="text-emerald-600 font-medium flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          Goal achieved!
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SavingsGoals;