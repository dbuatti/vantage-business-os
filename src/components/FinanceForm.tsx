"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FinanceEntry, AccountType } from '@/types/finance';
import { format, startOfMonth } from 'date-fns';
import { PlusCircle } from 'lucide-react';
import { showSuccess } from '@/utils/toast';

interface FinanceFormProps {
  onAddEntry: (entry: FinanceEntry) => void;
}

const FinanceForm = ({ onAddEntry }: FinanceFormProps) => {
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

  return (
    <Card className="w-full bg-white/50 backdrop-blur-sm border-indigo-100 shadow-xl">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-indigo-900 flex items-center gap-2">
          <PlusCircle className="w-5 h-5" />
          Log Weekly Entry
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input 
              id="date" 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)}
              required
            />
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

          <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white w-full">
            Add Entry
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default FinanceForm;