"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tags, Plus, Pencil, Trash2, Wand2, Search, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';

interface CategoryGroup {
  id: string;
  category_name: string;
  group_name: string;
}

interface CategoryGroupManagerProps {
  transactions: Array<{ category_1: string; amount: number }>;
  onGroupsUpdated: () => void;
}

const INCOME_GROUPS = [
  { name: '💰 Regular Income', color: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800' },
  { name: '🎵 Music Performance', color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800' },
  { name: '🎹 Music Services', color: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800' },
  { name: '📋 Other Income', color: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800' },
];

const EXPENSE_GROUPS = [
  { name: 'Fixed Essentials', color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800', icon: '🏠' },
  { name: 'Flexible Essentials', color: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800', icon: '🛒' },
  { name: 'Sustenance', color: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800', icon: '🍽️' },
  { name: 'Wellness & Growth', color: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800', icon: '🌱' },
  { name: 'Lifestyle & Discretionary', color: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800', icon: '🎭' },
];

const ALL_GROUPS = [...INCOME_GROUPS, ...EXPENSE_GROUPS];

const CategoryGroupManager = ({ transactions, onGroupsUpdated }: CategoryGroupManagerProps) => {
  const { session } = useAuth();
  const [groups, setGroups] = useState<CategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CategoryGroup | null>(null);
  const [formCategory, setFormCategory] = useState('');
  const [formGroup, setFormGroup] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'all' | 'income' | 'expense'>('all');

  // Determine if a category is primarily income or expense
  const categoryType = useMemo(() => {
    const result: Record<string, 'income' | 'expense'> = {};
    transactions.forEach(t => {
      const cat = t.category_1;
      if (!cat) return;
      if (!result[cat]) {
        result[cat] = t.amount > 0 ? 'income' : 'expense';
      }
    });
    return result;
  }, [transactions]);

  const allCategories = useMemo(() => {
    const cats = new Set(transactions.map(t => t.category_1).filter(Boolean));
    return Array.from(cats).sort();
  }, [transactions]);

  const unmappedCategories = useMemo(() => {
    const mapped = new Set(groups.map(g => g.category_name));
    let unmapped = allCategories.filter(c => !mapped.has(c));
    if (viewMode === 'income') unmapped = unmapped.filter(c => categoryType[c] === 'income');
    if (viewMode === 'expense') unmapped = unmapped.filter(c => categoryType[c] === 'expense');
    return unmapped;
  }, [allCategories, groups, viewMode, categoryType]);

  const filteredGroups = useMemo(() => {
    let filtered = groups;
    if (viewMode === 'income') {
      filtered = groups.filter(g => INCOME_GROUPS.some(ig => ig.name === g.group_name));
    } else if (viewMode === 'expense') {
      filtered = groups.filter(g => EXPENSE_GROUPS.some(eg => eg.name === g.group_name));
    }
    if (searchQuery) {
      filtered = filtered.filter(g =>
        g.category_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.group_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return filtered;
  }, [groups, searchQuery, viewMode]);

  useEffect(() => {
    fetchGroups();
  }, [session]);

  const fetchGroups = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('category_groups')
        .select('*')
        .order('group_name');
      if (error) throw error;
      setGroups(data || []);
    } catch (error: any) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!session || !formCategory || !formGroup) return;
    try {
      // Use upsert to handle potential duplicates gracefully
      const { error } = await supabase
        .from('category_groups')
        .upsert({ 
          user_id: session.user.id, 
          category_name: formCategory, 
          group_name: formGroup 
        }, {
          onConflict: 'user_id,category_name'
        });

      if (error) throw error;
      showSuccess(editingGroup ? 'Category group updated' : 'Category group added');
      
      await fetchGroups();
      onGroupsUpdated();
      resetForm();
    } catch (error: any) {
      showError(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('category_groups').delete().eq('id', id);
      if (error) throw error;
      setGroups(prev => prev.filter(g => g.id !== id));
      showSuccess('Mapping removed');
      onGroupsUpdated();
    } catch (error: any) {
      showError(error.message);
    }
  };

  const handleAutoAssign = async () => {
    if (!session || unmappedCategories.length === 0) return;

    const rules: Record<string, string> = {
      // Income
      'salary': '💰 Regular Income',
      'teaching': '💰 Regular Income',
      'aim': '💰 Regular Income',
      'carey': '💰 Regular Income',
      'vca': '💰 Regular Income',
      'vcass': '💰 Regular Income',
      'interest': '📋 Other Income',
      'ato': '📋 Other Income',
      'donation': '📋 Other Income',
      'life like': '📋 Other Income',
      'other': '📋 Other Income',
      'gig': '🎵 Music Performance',
      'wedding': '🎵 Music Performance',
      'choir': '🎵 Music Performance',
      'audition': '🎵 Music Performance',
      'rehearsal': '🎵 Music Performance',
      'corporate': '🎵 Music Performance',
      'ministry': '🎵 Music Performance',
      'piano backing': '🎹 Music Services',
      'ameb': '🎹 Music Services',
      'exam': '🎹 Music Services',
      'arranging': '🎹 Music Services',
      'repair': '🎹 Music Services',
      // Expenses
      'bill': 'Fixed Essentials',
      'subscription': 'Fixed Essentials',
      'phone': 'Fixed Essentials',
      'rego': 'Fixed Essentials',
      'fee': 'Fixed Essentials',
      'car': 'Flexible Essentials',
      'fuel': 'Flexible Essentials',
      'myki': 'Flexible Essentials',
      'toll': 'Flexible Essentials',
      'parking': 'Flexible Essentials',
      'maintenance': 'Flexible Essentials',
      'doctor': 'Flexible Essentials',
      'dentist': 'Flexible Essentials',
      'medicine': 'Flexible Essentials',
      'health': 'Flexible Essentials',
      'home': 'Flexible Essentials',
      'it': 'Flexible Essentials',
      'fine': 'Flexible Essentials',
      'accountant': 'Flexible Essentials',
      'printing': 'Flexible Essentials',
      'coffee': 'Sustenance',
      'meal': 'Sustenance',
      'grocer': 'Sustenance',
      'groc': 'Sustenance',
      'take out': 'Sustenance',
      'treat': 'Sustenance',
      'drink': 'Sustenance',
      'indulgence': 'Sustenance',
      'food': 'Sustenance',
      'wellbeing': 'Wellness & Growth',
      'fitness': 'Wellness & Growth',
      'yoga': 'Wellness & Growth',
      'kinesiology': 'Wellness & Growth',
      'book': 'Wellness & Growth',
      'study': 'Wellness & Growth',
      'piano lesson': 'Wellness & Growth',
      'technology': 'Wellness & Growth',
      'software': 'Wellness & Growth',
      'apple': 'Wellness & Growth',
      'hobbie': 'Wellness & Growth',
      'recreation': 'Lifestyle & Discretionary',
      'clothe': 'Lifestyle & Discretionary',
      'beauty': 'Lifestyle & Discretionary',
      'cosmetic': 'Lifestyle & Discretionary',
      'broadway': 'Lifestyle & Discretionary',
      'theatre': 'Lifestyle & Discretionary',
      'entertainment': 'Lifestyle & Discretionary',
      'game': 'Lifestyle & Discretionary',
      'going out': 'Lifestyle & Discretionary',
      'fun': 'Lifestyle & Discretionary',
      'uber': 'Lifestyle & Discretionary',
      'holiday': 'Lifestyle & Discretionary',
      'travel': 'Lifestyle & Discretionary',
      'gift': 'Lifestyle & Discretionary',
      'music': 'Lifestyle & Discretionary',
      'sheet': 'Lifestyle & Discretionary',
      'misc': 'Lifestyle & Discretionary',
      'business': 'Lifestyle & Discretionary',
      'paying musician': 'Lifestyle & Discretionary',
      'account': 'Lifestyle & Discretionary',
    };

    const toInsert = unmappedCategories
      .map(cat => {
        const lower = cat.toLowerCase();
        const matchedGroup = Object.entries(rules).find(([keyword]) => lower.includes(keyword));
        if (matchedGroup) {
          return { user_id: session.user.id, category_name: cat, group_name: matchedGroup[1] };
        }
        return null;
      })
      .filter(Boolean) as Array<{ user_id: string; category_name: string; group_name: string }>;

    if (toInsert.length === 0) {
      showError('No categories could be auto-matched');
      return;
    }

    try {
      const { error } = await supabase
        .from('category_groups')
        .upsert(toInsert, { onConflict: 'user_id,category_name' });
      
      if (error) throw error;
      showSuccess(`Auto-assigned ${toInsert.length} categories`);
      await fetchGroups();
      onGroupsUpdated();
    } catch (error: any) {
      showError(error.message);
    }
  };

  const resetForm = () => {
    setShowDialog(false);
    setEditingGroup(null);
    setFormCategory('');
    setFormGroup('');
  };

  const handleEdit = (group: CategoryGroup) => {
    setEditingGroup(group);
    setFormCategory(group.category_name);
    setFormGroup(group.group_name);
    setShowDialog(true);
  };

  const groupedByGroup = useMemo(() => {
    const result: Record<string, CategoryGroup[]> = {};
    ALL_GROUPS.forEach(g => { result[g.name] = []; });
    groups.forEach(g => {
      if (!result[g.group_name]) result[g.group_name] = [];
      result[g.group_name].push(g);
    });
    return result;
  }, [groups]);

  const getGroupStyle = (groupName: string) => {
    return ALL_GROUPS.find(g => g.name === groupName) || { name: groupName, color: 'bg-gray-100 text-gray-700 border-gray-200' };
  };

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Tags className="w-5 h-5 text-primary" />
              Category Groups
            </CardTitle>
            <CardDescription>
              {groups.length} categories mapped · {unmappedCategories.length} unmapped
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
              <Button
                variant={viewMode === 'all' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('all')}
                className="rounded-lg h-7 text-xs"
              >
                All
              </Button>
              <Button
                variant={viewMode === 'income' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('income')}
                className="rounded-lg h-7 text-xs"
              >
                <ArrowUpRight className="w-3 h-3 mr-1" />
                Income
              </Button>
              <Button
                variant={viewMode === 'expense' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('expense')}
                className="rounded-lg h-7 text-xs"
              >
                <ArrowDownRight className="w-3 h-3 mr-1" />
                Expenses
              </Button>
            </div>
            {unmappedCategories.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleAutoAssign} className="rounded-xl gap-1.5">
                <Wand2 className="w-3.5 h-3.5" />
                Auto-assign ({unmappedCategories.length})
              </Button>
            )}
            <Button size="sm" onClick={() => setShowDialog(true)} className="rounded-xl gap-1.5" disabled={unmappedCategories.length === 0}>
              <Plus className="w-3.5 h-3.5" />
              Add
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search categories or groups..."
            className="pl-9 rounded-xl"
          />
        </div>

        {/* Group Summary Cards */}
        <div className="space-y-3">
          {(viewMode === 'all' || viewMode === 'income') && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                Income Groups
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {INCOME_GROUPS.map(group => {
                  const count = groupedByGroup[group.name]?.length || 0;
                  return (
                    <div key={group.name} className={cn("p-3 rounded-xl border text-center transition-all", count > 0 ? group.color : "bg-muted/50 text-muted-foreground border-muted")}>
                      <p className="text-xs font-medium mt-1 leading-tight">{group.name}</p>
                      <p className="text-lg font-bold mt-0.5">{count}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(viewMode === 'all' || viewMode === 'expense') && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ArrowDownRight className="w-3 h-3 text-rose-500" />
                Expense Groups
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {EXPENSE_GROUPS.map(group => {
                  const count = groupedByGroup[group.name]?.length || 0;
                  return (
                    <div key={group.name} className={cn("p-3 rounded-xl border text-center transition-all", count > 0 ? group.color : "bg-muted/50 text-muted-foreground border-muted")}>
                      <span className="text-lg">{group.icon}</span>
                      <p className="text-xs font-medium mt-1 leading-tight">{group.name}</p>
                      <p className="text-lg font-bold mt-0.5">{count}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Mappings List */}
        {filteredGroups.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Tags className="w-10 h-10 mx-auto opacity-20 mb-2" />
            <p className="font-medium">No category mappings yet</p>
            <p className="text-sm">Add mappings to organize your transactions</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {ALL_GROUPS.filter(g => {
              if (viewMode === 'income') return INCOME_GROUPS.some(ig => ig.name === g.name);
              if (viewMode === 'expense') return EXPENSE_GROUPS.some(eg => eg.name === g.name);
              return true;
            }).map(group => {
              const items = groupedByGroup[group.name] || [];
              const filtered = searchQuery
                ? items.filter(i => i.category_name.toLowerCase().includes(searchQuery.toLowerCase()))
                : items;
              if (filtered.length === 0) return null;

              return (
                <div key={group.name} className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider sticky top-0 bg-background py-1">
                    {group.name}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {filtered.map(item => (
                      <div
                        key={item.id}
                        className="group inline-flex items-center gap-1 p-1.5 rounded-lg hover:bg-muted/30 transition-colors border"
                      >
                        <Badge variant="outline" className={cn("rounded-md text-xs font-medium", group.color)}>
                          {item.category_name}
                        </Badge>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-5 w-5 rounded" onClick={() => handleEdit(item)}>
                            <Pencil className="h-2.5 w-2.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-5 w-5 rounded hover:text-rose-600" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Unmapped Categories */}
        {unmappedCategories.length > 0 && !searchQuery && (
          <div className="pt-3 border-t">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              ⚠️ Unmapped Categories ({unmappedCategories.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {unmappedCategories.map(cat => (
                <Badge
                  key={cat}
                  variant="outline"
                  className={cn(
                    "rounded-lg text-xs cursor-pointer hover:bg-primary/5 hover:text-primary hover:border-primary/20",
                    categoryType[cat] === 'income' 
                      ? "bg-emerald-50 text-emerald-600 border-emerald-200" 
                      : "bg-gray-50 text-gray-500 border-gray-200"
                  )}
                  onClick={() => {
                    setFormCategory(cat);
                    setShowDialog(true);
                  }}
                >
                  {categoryType[cat] === 'income' && <ArrowUpRight className="w-2.5 h-2.5 mr-0.5" />}
                  {cat}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingGroup ? 'Edit Group Assignment' : 'Assign Category to Group'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              {editingGroup ? (
                <Input value={formCategory} disabled className="rounded-xl bg-muted" />
              ) : (
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {unmappedCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>
                        <span className="flex items-center gap-1.5">
                          {categoryType[cat] === 'income' && <ArrowUpRight className="w-3 h-3 text-emerald-500" />}
                          {cat}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Group</label>
              <Select value={formGroup} onValueChange={setFormGroup}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select a group" />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Income</div>
                  {INCOME_GROUPS.map(g => (
                    <SelectItem key={g.name} value={g.name}>{g.name}</SelectItem>
                  ))}
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-2">Expenses</div>
                  {EXPENSE_GROUPS.map(g => (
                    <SelectItem key={g.name} value={g.name}>
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
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={resetForm} className="rounded-xl">Cancel</Button>
            <Button onClick={handleSave} className="rounded-xl" disabled={!formCategory || !formGroup}>
              {editingGroup ? 'Save Changes' : 'Add Mapping'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default CategoryGroupManager;