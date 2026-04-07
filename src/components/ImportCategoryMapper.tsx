"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tags, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImportCategoryMapperProps {
  unmappedCategories: string[];
  onMappingComplete: (mappings: Record<string, string>) => void;
  onCancel: () => void;
}

const INCOME_GROUPS = [
  { name: '💰 Regular Income' },
  { name: '🎵 Music Performance' },
  { name: '🎹 Music Services' },
  { name: '📋 Other Income' },
];

const EXPENSE_GROUPS = [
  { name: 'Fixed Essentials', icon: '🏠' },
  { name: 'Flexible Essentials', icon: '🛒' },
  { name: 'Sustenance', icon: '🍽️' },
  { name: 'Wellness & Growth', icon: '🌱' },
  { name: 'Lifestyle & Discretionary', icon: '🎭' },
];

const ALL_GROUPS = [...INCOME_GROUPS, ...EXPENSE_GROUPS];

const ImportCategoryMapper = ({ unmappedCategories, onMappingComplete, onCancel }: ImportCategoryMapperProps) => {
  const [mappings, setMappings] = useState<Record<string, string>>({});

  const handleSelect = (category: string, group: string) => {
    setMappings(prev => ({ ...prev, [category]: group }));
  };

  const isComplete = unmappedCategories.every(cat => !!mappings[cat]);

  return (
    <Card className="border-0 shadow-2xl bg-card animate-fade-in">
      <CardHeader className="pb-4 border-b bg-primary/5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
            <Tags className="w-6 h-6" />
          </div>
          <div>
            <CardTitle className="text-xl font-black tracking-tight">New Categories Detected</CardTitle>
            <CardDescription className="text-xs font-bold uppercase tracking-wider">
              Please map these {unmappedCategories.length} categories to your groups
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
          {unmappedCategories.map((cat) => (
            <div key={cat} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-background text-sm py-1 px-3 rounded-xl font-bold border-primary/20">
                  {cat}
                </Badge>
                <ArrowRight className="w-4 h-4 text-muted-foreground hidden sm:block" />
              </div>
              
              <div className="w-full sm:w-64">
                <Select 
                  value={mappings[cat] || ""} 
                  onValueChange={(val) => handleSelect(cat, val)}
                >
                  <SelectTrigger className="rounded-xl h-11 bg-background border-2 focus:ring-primary">
                    <SelectValue placeholder="Select Group..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <div className="px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Income</div>
                    {INCOME_GROUPS.map(g => (
                      <SelectItem key={g.name} value={g.name} className="rounded-lg font-bold">{g.name}</SelectItem>
                    ))}
                    <div className="px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-t mt-1 pt-2">Expenses</div>
                    {EXPENSE_GROUPS.map(g => (
                      <SelectItem key={g.name} value={g.name} className="rounded-lg font-bold">
                        <span className="flex items-center gap-2">
                          <span>{g.icon}</span>
                          {g.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            {isComplete ? (
              <span className="flex items-center gap-1.5 text-emerald-600">
                <CheckCircle2 className="w-4 h-4" /> All categories mapped
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-600">
                <AlertCircle className="w-4 h-4" /> {unmappedCategories.length - Object.keys(mappings).length} remaining
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button variant="ghost" onClick={onCancel} className="rounded-xl flex-1 sm:flex-none">
              Cancel Import
            </Button>
            <Button 
              onClick={() => onMappingComplete(mappings)} 
              disabled={!isComplete}
              className="rounded-xl px-8 h-11 font-bold shadow-lg shadow-primary/20 flex-1 sm:flex-none"
            >
              Continue Import
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ImportCategoryMapper;