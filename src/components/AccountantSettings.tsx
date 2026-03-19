"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calculator, Percent, Tags, Save, Plus, X, Loader2 } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';

const AccountantSettings = () => {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    business_percents: { rent: 25, bills: 25, phone: 50, fuel: 40 },
    deduction_keywords: {
      rent: ['rent', 'lease', 'storage'],
      bills: ['bill', 'electricity', 'water', 'gas', 'power', 'rates'],
      phone: ['phone', 'mobile', 'internet', 'telstra', 'optus', 'vodafone', 'nbn'],
      fuel: ['fuel', 'petrol', 'gas station', 'shell', 'caltex', '7-eleven', 'ampol', 'bp', 'toll', 'myki', 'parking']
    }
  });

  const [newKeyword, setNewKeyword] = useState<Record<string, string>>({
    rent: '', bills: '', phone: '', fuel: ''
  });

  useEffect(() => {
    if (session) fetchSettings();
  }, [session]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('accountant_settings')
        .select('*')
        .eq('owner_user_id', session?.user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      if (data) setSettings({
        business_percents: data.business_percents,
        deduction_keywords: data.deduction_keywords
      });
    } catch (error: any) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!session) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('accountant_settings')
        .upsert({
          owner_user_id: session.user.id,
          ...settings,
          updated_at: new Date().toISOString()
        });
      if (error) throw error;
      showSuccess('Accountant settings saved');
    } catch (error: any) {
      showError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const updatePercent = (key: string, val: string) => {
    setSettings(prev => ({
      ...prev,
      business_percents: { ...prev.business_percents, [key]: parseInt(val) || 0 }
    }));
  };

  const addKeyword = (category: string) => {
    const word = newKeyword[category].trim().toLowerCase();
    if (!word) return;
    
    setSettings(prev => ({
      ...prev,
      deduction_keywords: {
        ...prev.deduction_keywords,
        [category]: [...(prev.deduction_keywords as any)[category], word]
      }
    }));
    setNewKeyword(prev => ({ ...prev, [category]: '' }));
  };

  const removeKeyword = (category: string, word: string) => {
    setSettings(prev => ({
      ...prev,
      deduction_keywords: {
        ...prev.deduction_keywords,
        [category]: (prev.deduction_keywords as any)[category].filter((w: string) => w !== word)
      }
    }));
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Accountant Configuration</h2>
          <p className="text-muted-foreground">Define how your tax deductions are calculated and identified.</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="rounded-xl gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Configuration
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Business Use Percentages */}
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Percent className="w-5 h-5 text-primary" />
              <CardTitle>Business Use Percentages</CardTitle>
            </div>
            <CardDescription>The default percentage of mixed-use expenses to claim as business deductions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.entries(settings.business_percents).map(([key, val]) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <Label className="capitalize font-bold text-sm">{key}</Label>
                <div className="flex items-center gap-2 w-32">
                  <Input 
                    type="number" 
                    value={val} 
                    onChange={(e) => updatePercent(key, e.target.value)}
                    className="rounded-xl text-right font-bold"
                  />
                  <span className="font-bold text-muted-foreground">%</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Deduction Keywords */}
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Tags className="w-5 h-5 text-primary" />
              <CardTitle>Deduction Keywords</CardTitle>
            </div>
            <CardDescription>Keywords used to automatically sort transactions into deduction buckets.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {Object.entries(settings.deduction_keywords).map(([category, words]) => (
              <div key={category} className="space-y-3">
                <Label className="capitalize font-bold text-xs uppercase tracking-widest text-muted-foreground">{category} Keywords</Label>
                <div className="flex flex-wrap gap-1.5">
                  {(words as string[]).map(word => (
                    <Badge key={word} variant="secondary" className="rounded-lg pl-2 pr-1 py-1 gap-1 bg-primary/5 text-primary border-primary/10">
                      {word}
                      <button onClick={() => removeKeyword(category, word)} className="hover:text-rose-500 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input 
                    placeholder={`Add ${category} keyword...`}
                    value={newKeyword[category]}
                    onChange={(e) => setNewKeyword(prev => ({ ...prev, [category]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && addKeyword(category)}
                    className="h-9 rounded-xl text-sm"
                  />
                  <Button variant="outline" size="sm" onClick={() => addKeyword(category)} className="rounded-xl h-9">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AccountantSettings;