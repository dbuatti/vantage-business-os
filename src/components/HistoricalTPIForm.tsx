
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { History, Save, Info } from "lucide-react";
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { showSuccess, showError } from '@/utils/toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface HistoricalTPIFormProps {
  onUpdate: () => void;
}

export const HistoricalTPIForm: React.FC<HistoricalTPIFormProps> = ({ onUpdate }) => {
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<{ year: number; amount: string }[]>([]);

  useEffect(() => {
    if (session) {
      fetchHistory();
    }
  }, [session]);

  const fetchHistory = async () => {
    const currentYear = new Date().getFullYear();
    const years = [currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4];
    
    const { data, error } = await supabase
      .from('tax_averaging_history')
      .select('*')
      .in('year', years)
      .order('year', { ascending: false });

    if (error) {
      showError('Failed to fetch historical data');
      return;
    }

    const historyMap = new Map(data?.map(h => [h.year, h.amount.toString()]));
    setHistory(years.map(year => ({
      year,
      amount: historyMap.get(year) || '0'
    })));
  };

  const handleSave = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const updates = history.map(h => ({
        user_id: session.user.id,
        year: h.year,
        amount: parseFloat(h.amount) || 0
      }));

      const { error } = await supabase
        .from('tax_averaging_history')
        .upsert(updates, { onConflict: 'user_id,year' });

      if (error) throw error;
      
      showSuccess('Historical TPI updated');
      onUpdate();
    } catch (error: any) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-white/50 backdrop-blur-sm border-indigo-100 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
            <History className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg">Historical Professional Income</CardTitle>
            <CardDescription>Enter your Taxable Professional Income (TPI) for the last 4 years.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {history.map((h, i) => (
            <div key={h.year} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">FY {h.year}-{h.year + 1}</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-slate-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">Include income from performing, composing, or other special professional activities, minus related expenses.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                <Input 
                  type="number" 
                  value={h.amount}
                  onChange={(e) => {
                    const newHistory = [...history];
                    newHistory[i].amount = e.target.value;
                    setHistory(newHistory);
                  }}
                  className="pl-7 bg-white border-indigo-50 focus:ring-indigo-500 font-bold"
                />
              </div>
            </div>
          ))}
        </div>
        <Button 
          onClick={handleSave} 
          disabled={loading} 
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-12 font-bold gap-2"
        >
          <Save className="h-4 w-4" />
          {loading ? 'Saving...' : 'Save Historical Data'}
        </Button>
      </CardContent>
    </Card>
  );
};
