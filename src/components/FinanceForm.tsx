"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FinanceEntry, AccountType } from '@/types/finance';
import { format, startOfMonth, subDays } from 'date-fns';
import { PlusCircle, Copy } from 'lucide-react';
import { showSuccess } from '@/utils/toast';

interface FinanceFormProps {
  onAddEntry: (entry: FinanceEntry) => void;
  lastEntry?: FinanceEntry;
}

const FinanceForm = ({ onAddEntry, lastEntry }: FinanceFormProps) => {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [account, setAccount] = useState<AccountType>('Savings');
  const [amount, setAmount] = useState('');
  const [creditWas, setCreditWas] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const entryDate = new Date(date);
    const monthYear = format(startOfMonth(entryDate), 'MM/yyyy');

    const newEntry: FinanceEntry = {
      id: crypto.randomUUID(),
      date,
      amount: parseFloat(amount) || 0,
      account,
      monthYear,
      ...(account === 'Credit' && { creditWas: parseFloat(creditWas) || 0 })
    };

    onAddEntry(newEntry);
    setAmount('');
    setCreditWas('');
    showSuccess(`${account} entry added for ${date}`);
  };

  const handleCopyLast = () => {
    if (!lastEntry) return;
    setAccount(lastEntry.account);
    setAmount(lastEntry.amount.toString());
    if (lastEntry.creditWas !== undefined) {
      setCreditWas(lastEntry.creditWas.toString());
    }
    showSuccess('Copied values from last entry');
  };

  const quickDates = [
    { label: 'Today', days: 0 },
    { label: 'Yesterday', days: 1 },
    { label: '2 days ago', days: 2 },
    { label: 'Last week', days: 7 },
  ];

  return (
    <Card className="w-full bg-white/50 backdrop-blur-sm border-indigo-100 shadow-xl">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-indigo-900 flex items-center gap-2">
          <PlusCircle className="w-5 h-5" />
          Log Weekly Entry
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input 
                id="date" 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                required
              />
              <div className="flex flex-wrap gap-1">
                {quickDates.map(({ label, days }) => (
                  <Button
                    key={days}
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs px-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
                    onClick={() => setDate(format(subDays(new Date(), days), 'yyyy-MM-dd'))}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="account">Account</Label>
              <Select value={account} onValueChange={(val) => setAccount(val as AccountType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Savings">Savings</SelectItem>
                  <SelectItem value="Credit">Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {account === 'Credit' && (
              <div className="space-y-2">
                <Label htmlFor="creditWas">Credit Was ($)</Label>
                <Input 
                  id="creditWas" 
                  type="number" 
                  step="0.01"
                  placeholder="-262.00"
                  value={creditWas} 
                  onChange={(e) => setCreditWas(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="amount">Amount ($)</Label>
              <Input 
                id="amount" 
                type="number" 
                step="0.01"
                placeholder="12970.67"
                value={amount} 
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white flex-1">
              <PlusCircle className="w-4 h-4 mr-2" />
              Add Entry
            </Button>
            {lastEntry && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCopyLast}
                className="border-indigo-100 hover:bg-indigo-50 text-indigo-600"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Last
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default FinanceForm;