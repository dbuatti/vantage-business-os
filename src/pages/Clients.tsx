"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from "@/components/ui/badge";
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
  Users, 
  Plus, 
  Search, 
  Mail, 
  Phone, 
  MoreVertical, 
  Pencil, 
  Trash2, 
  ExternalLink,
  Building2,
  User,
  DollarSign,
  ArrowUpRight
} from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { cn } from '@/lib/utils';

interface Client {
  id: string;
  display_name: string;
  email: string;
  phone: string;
  is_company: boolean;
  tax_id: string;
  total_invoiced: number;
  total_receivable: number;
  created_at: string;
}

const Clients = () => {
  const { session } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  
  const [form, setForm] = useState({
    display_name: '',
    email: '',
    phone: '',
    is_company: false,
    tax_id: ''
  });

  useEffect(() => {
    if (session) fetchClients();
  }, [session]);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('display_name');
      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!session) return;
    try {
      if (editingClient) {
        const { error } = await supabase
          .from('clients')
          .update(form)
          .eq('id', editingClient.id);
        if (error) throw error;
        showSuccess('Client updated');
      } else {
        const { error } = await supabase
          .from('clients')
          .insert([{ ...form, owner_user_id: session.user.id }]);
        if (error) throw error;
        showSuccess('Client added');
      }
      fetchClients();
      setShowDialog(false);
      resetForm();
    } catch (error: any) {
      showError(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure? This will delete the client and their history.')) return;
    try {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
      showSuccess('Client deleted');
      fetchClients();
    } catch (error: any) {
      showError(error.message);
    }
  };

  const resetForm = () => {
    setEditingClient(null);
    setForm({ display_name: '', email: '', phone: '', is_company: false, tax_id: '' });
  };

  const openEdit = (client: Client) => {
    setEditingClient(client);
    setForm({
      display_name: client.display_name,
      email: client.email || '',
      phone: client.phone || '',
      is_company: client.is_company,
      tax_id: client.tax_id || ''
    });
    setShowDialog(true);
  };

  const filteredClients = clients.filter(c => 
    c.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Clients</h1>
          <p className="text-muted-foreground">Manage your business relationships and billing history.</p>
        </div>
        <Button onClick={() => { resetForm(); setShowDialog(true); }} className="rounded-xl gap-2">
          <Plus className="w-4 h-4" /> Add Client
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-lg bg-primary text-white">
          <CardContent className="p-6">
            <p className="text-sm font-medium opacity-80">Total Clients</p>
            <p className="text-3xl font-black">{clients.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-emerald-600 text-white">
          <CardContent className="p-6">
            <p className="text-sm font-medium opacity-80">Total Invoiced</p>
            <p className="text-3xl font-black">
              {formatCurrency(clients.reduce((s, c) => s + (c.total_invoiced || 0), 0))}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-amber-500 text-white">
          <CardContent className="p-6">
            <p className="text-sm font-medium opacity-80">Outstanding Balance</p>
            <p className="text-3xl font-black">
              {formatCurrency(clients.reduce((s, c) => s + (c.total_receivable || 0), 0))}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-xl overflow-hidden">
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search clients by name or email..." 
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
                <TableHead>Client</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-right">Total Invoiced</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-10">Loading clients...</TableCell></TableRow>
              ) : filteredClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto opacity-10 mb-4" />
                    <p className="font-bold text-lg text-foreground">No clients found</p>
                    <p>Add your first client to start invoicing.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredClients.map((client) => (
                  <TableRow key={client.id} className="group hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                          {client.is_company ? <Building2 className="w-5 h-5" /> : <User className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-bold">{client.display_name}</p>
                          <Badge variant="outline" className="text-[10px] rounded-md">
                            {client.is_company ? 'Company' : 'Individual'}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {client.email && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Mail className="w-3 h-3" /> {client.email}
                          </div>
                        )}
                        {client.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Phone className="w-3 h-3" /> {client.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(client.total_invoiced || 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={cn(
                        "font-bold",
                        (client.total_receivable || 0) > 0 ? "text-amber-600" : "text-emerald-600"
                      )}>
                        {formatCurrency(client.total_receivable || 0)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => openEdit(client)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-rose-600" onClick={() => handleDelete(client.id)}>
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
            <DialogTitle>{editingClient ? 'Edit Client' : 'Add New Client'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input 
                placeholder="e.g. Acme Corp or John Doe" 
                value={form.display_name}
                onChange={(e) => setForm(prev => ({ ...prev, display_name: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input 
                  type="email"
                  placeholder="client@example.com" 
                  value={form.email}
                  onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input 
                  placeholder="+1 234 567 890" 
                  value={form.phone}
                  onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <input 
                type="checkbox" 
                id="is_company" 
                checked={form.is_company}
                onChange={(e) => setForm(prev => ({ ...prev, is_company: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="is_company" className="font-normal">This client is a company</Label>
            </div>
            {form.is_company && (
              <div className="space-y-2 animate-fade-in">
                <Label>Tax ID / ABN</Label>
                <Input 
                  placeholder="e.g. 12 345 678 910" 
                  value={form.tax_id}
                  onChange={(e) => setForm(prev => ({ ...prev, tax_id: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDialog(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleSave} className="rounded-xl" disabled={!form.display_name}>
              {editingClient ? 'Save Changes' : 'Add Client'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Clients;