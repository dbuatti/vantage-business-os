"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Package, 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  DollarSign,
  Tag,
  FileText
} from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  description: string;
  unit_price: number;
  default_tax_rate: number;
}

const Products = () => {
  const { session } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const [form, setForm] = useState({
    name: '',
    description: '',
    unit_price: '',
    default_tax_rate: '0'
  });

  useEffect(() => {
    if (session) fetchProducts();
  }, [session]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');
      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!session || !form.name) return;
    try {
      const productData = {
        name: form.name,
        description: form.description,
        unit_price: parseFloat(form.unit_price) || 0,
        default_tax_rate: parseFloat(form.default_tax_rate) || 0,
        owner_user_id: session.user.id
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);
        if (error) throw error;
        showSuccess('Product updated');
      } else {
        const { error } = await supabase
          .from('products')
          .insert([productData]);
        if (error) throw error;
        showSuccess('Product added');
      }
      fetchProducts();
      setShowDialog(false);
      resetForm();
    } catch (error: any) {
      showError(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure? This will remove the product from your catalog.')) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      showSuccess('Product deleted');
      fetchProducts();
    } catch (error: any) {
      showError(error.message);
    }
  };

  const resetForm = () => {
    setEditingProduct(null);
    setForm({ name: '', description: '', unit_price: '', default_tax_rate: '0' });
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      description: product.description || '',
      unit_price: product.unit_price.toString(),
      default_tax_rate: product.default_tax_rate.toString()
    });
    setShowDialog(true);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Products & Services</h1>
          <p className="text-muted-foreground">Manage your standard offerings for faster invoicing.</p>
        </div>
        <Button onClick={() => { resetForm(); setShowDialog(true); }} className="rounded-xl gap-2">
          <Plus className="w-4 h-4" /> Add Item
        </Button>
      </div>

      <Card className="border-0 shadow-xl overflow-hidden">
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search products or services..." 
              className="pl-10 rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Item</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Tax Rate</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10">Loading catalog...</TableCell></TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20 text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto opacity-10 mb-4" />
                    <p className="font-bold text-lg text-foreground">Catalog is empty</p>
                    <p>Add your services or products to speed up billing.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => (
                  <TableRow key={product.id} className="group hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                          <Tag className="w-5 h-5" />
                        </div>
                        <p className="font-bold">{product.name}</p>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="text-sm text-muted-foreground truncate">{product.description || '—'}</p>
                    </TableCell>
                    <TableCell className="text-right font-black">
                      {formatCurrency(product.unit_price)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {product.default_tax_rate}%
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => openEdit(product)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-rose-600" onClick={() => handleDelete(product.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Item' : 'Add New Item'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Item Name</Label>
              <Input 
                placeholder="e.g. Piano Lesson (1hr) or Consulting" 
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                placeholder="Detailed description for invoices..." 
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                className="rounded-xl min-h-[100px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Unit Price ($)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    type="number"
                    step="0.01"
                    placeholder="0.00" 
                    value={form.unit_price}
                    onChange={(e) => setForm(prev => ({ ...prev, unit_price: e.target.value }))}
                    className="pl-10 rounded-xl font-bold"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Default Tax (%)</Label>
                <Input 
                  type="number"
                  placeholder="0" 
                  value={form.default_tax_rate}
                  onChange={(e) => setForm(prev => ({ ...prev, default_tax_rate: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDialog(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleSave} className="rounded-xl" disabled={!form.name}>
              {editingProduct ? 'Save Changes' : 'Add to Catalog'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Products;