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
import { Tags, Plus, Pencil, Trash2, Wand2, Search } from 'lucide-react';
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
  transactions: Array<{ category_1: string }>;
  onGroupsUpdated: () => void;
}

const GROUPS = [
  { name: 'Fixed Essentials', color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800', icon: '🏠' },
  { name: 'Flexible Essentials', color: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800', icon: '🛒' },
  { name: 'Sustenance', color: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800', icon: '🍽️' },
  { name: 'Wellness & Growth', color: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800', icon: '🌱' },
  { name: 'Lifestyle & Discretionary', color: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800', icon: '🎭' },
];

const CategoryGroupManager = ({ transactions, onGroupsUpdated }: CategoryGroupManagerProps) => {
  const { session } = useAuth();
  const [groups, setGroups] = useState<CategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CategoryGroup | null>(null);
  const [formCategory, setFormCategory] = useState('');
  const [formGroup, setFormGroup] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const allCategories = useMemo(() => {
    const cats = new Set(transactions.map(t => t.category_1).filter(Boolean));
    return Array.from(cats).sort();
  }, [transactions]);

  const unmappedCategories = useMemo(() => {
    const mapped = new Set(groups.map(g => g.category_name));
    return allCategories.filter(c => !mapped.has(c));
  }, [allCategories, groups]);

  const filteredGroups = useMemo(() => {
    if (!searchQuery) return groups;
    return groups.filter(g =>
      g.category_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.group_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [groups, searchQuery]);

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
      if (editingGroup) {
        const { error } = await supabase
          .from('category_groups')
          .update({ group_name: formGroup })
          .eq('id', editingGroup.id);
        if (error) throw error;
        showSuccess('Category group updated');
      } else {
        const { error } = await supabase
          .from('category_groups')
          .insert([{ user_id: session.user.id, category_name: formCategory, group_name: formGroup }]);
        if (error) throw error;
        showSuccess('Category group added');
      }
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
      // Fixed Essentials
      'rent': 'Fixed Essentials',
      'mortgage': 'Fixed Essentials',
      'insurance': 'Fixed Essentials',
      'car payment': 'Fixed Essentials',
      'loan': 'Fixed Essentials',
      'subscription': 'Fixed Essentials',
      'phone': 'Fixed Essentials',
      'internet': 'Fixed Essentials',
      'utilities': 'Fixed Essentials',
      'electric': 'Fixed Essentials',
      'water': 'Fixed Essentials',
      'gas bill': 'Fixed Essentials',
      // Flexible Essentials
      'transport': 'Flexible Essentials',
      'fuel': 'Flexible Essentials',
      'gas': 'Flexible Essentials',
      'car': 'Flexible Essentials',
      'maintenance': 'Flexible Essentials',
      'clothing': 'Flexible Essentials',
      'household': 'Flexible Essentials',
      'supplies': 'Flexible Essentials',
      // Sustenance
      'groceries': 'Sustenance',
      'food': 'Sustenance',
      'restaurant': 'Sustenance',
      'dining': 'Sustenance',
      'coffee': 'Sustenance',
      'lunch': 'Sustenance',
      'dinner': 'Sustenance',
      'takeout': 'Sustenance',
      // Wellness & Growth
      'health': 'Wellness & Growth',
      'medical': 'Wellness & Growth',
      'doctor': 'Wellness & Growth',
      'pharmacy': 'Wellness & Growth',
      'gym': 'Wellness & Growth',
      'fitness': 'Wellness & Growth',
      'education': 'Wellness & Growth',
      'course': 'Wellness & Growth',
      'book': 'Wellness & Growth',
      'therapy': 'Wellness & Growth',
      // Lifestyle & Discretionary
      'entertainment': 'Lifestyle & Discretionary',
      'movie': 'Lifestyle & Discretionary',
      'streaming': 'Lifestyle & Discretionary',
      'shopping': 'Lifestyle & Discretionary',
      'hobby': 'Lifestyle & Discretionary',
      'travel': 'Lifestyle & Discretionary',
      'vacation': 'Lifestyle & Discretionary',
      'gift': 'Lifestyle & Discretionary',
      'game': 'Lifestyle & Discretionary',
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
      const { error } = await supabase.from('category_groups').insert(toInsert);
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

  const getGroupStyle = (groupName: string) => {
    return GROUPS.find(g => g.name === groupName) || GROUPS[0];
  };

  const groupedByGroup = useMemo(() => {
    const result: Record<string, CategoryGroup[]> = {};
    GROUPS.forEach(g => { result[g.name] = []; });
    groups.forEach(g => {
      if (!result[g.group_name]) result[g.group_name] = [];
      result[g.group_name].push(g);
    });
    return result;
  }, [groups]);

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
            {unmappedCategories.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleAutoAssign} className="rounded-xl gap-1.5">
                <Wand2 className="w-3.5 h-3.5" />
                Auto-assign ({unmappedCategories.length})
              </Button>
            )}
            <Button size="sm" onClick={() => setShowDialog(true)} className="rounded-xl gap-1.5" disabled={unmappedCategories.length === 0}>
              <Plus className="w-3.5 h-3.5" />
              Add Mapping
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {GROUPS.map(group => {
            const count = groupedByGroup[group.name]?.length || 0;
            return (
              <div
                key={group.name}
                className={cn(
                  "p-3 rounded-xl border text-center transition-all",
                  count > 0 ? group.color : "bg-muted/50 text-muted-foreground border-muted"
                )}
              >
                <span className="text-lg">{group.icon}</span>
                <p className="text-xs font-medium mt-1 leading-tight">{group.name}</p>
                <p className="text-lg font-bold mt-0.5">{count}</p>
              </div>
            );
          })}
        </div>

        {/* Mappings List */}
        {filteredGroups.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Tags className="w-10 h-10 mx-auto opacity-20 mb-2" />
            <p className="font-medium">No category mappings yet</p>
            <p className="text-sm">Add mappings to organize your transactions</p>
          </div>
        ) : (
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {GROUPS.map(group => {
              const items = groupedByGroup[group.name] || [];
              const filtered = searchQuery
                ? items.filter(i => i.category_name.toLowerCase().includes(searchQuery.toLowerCase()))
                : items;
              if (filtered.length === 0) return null;

              return (
                <div key={group.name} className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider sticky top-0 bg-background py-1">
                    {group.icon} {group.name}
                  </p>
                  {filtered.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30 transition-colors group"
                    >
                      <Badge variant="outline" className={cn("rounded-lg text-xs font-medium", group.color)}>
                        {item.category_name}
                      </Badge>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-lg" onClick={() => handleEdit(item)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-lg hover:text-rose-600" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
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
                  className="rounded-lg text-xs bg-gray-50 text-gray-500 border-gray-200 cursor-pointer hover:bg-primary/5 hover:text-primary hover:border-primary/20"
                  onClick={() => {
                    setFormCategory(cat);
                    setShowDialog(true);
                  }}
                >
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
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
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
                  {GROUPS.map(g => (
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