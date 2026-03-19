"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  ArrowLeft, 
  Mail, 
  Phone, 
  Building2, 
  User, 
  FileText, 
  Plus, 
  DollarSign, 
  TrendingUp,
  Clock,
  ExternalLink,
  Pencil
} from 'lucide-react';
import { format } from 'date-fns';
import { showError } from '@/utils/toast';
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

interface Invoice {
  id: string;
  number: string;
  invoice_date: string;
  due_date: string;
  status: string;
  total_amount: number;
}

const ClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session && id) {
      fetchClientData();
    }
  }, [session, id]);

  const fetchClientData = async () => {
    setLoading(true);
    try {
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();
      
      if (clientError) throw clientError;
      setClient(clientData);

      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select('id, number, invoice_date, due_date, status, total_amount')
        .eq('client_id', id)
        .order('invoice_date', { ascending: false });
      
      if (invoiceError) throw invoiceError;
      setInvoices(invoiceData || []);
    } catch (error: any) {
      showError(error.message);
      navigate('/clients');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );

  if (!client) return null;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="rounded-xl">
            <Link to="/clients">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-black tracking-tight">{client.display_name}</h1>
              <Badge variant="outline" className="rounded-lg">
                {client.is_company ? 'Company' : 'Individual'}
              </Badge>
            </div>
            <p className="text-muted-foreground">Client since {format(new Date(client.created_at), 'MMMM yyyy')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="rounded-xl gap-2">
            <Pencil className="w-4 h-4" /> Edit Profile
          </Button>
          <Button asChild className="rounded-xl gap-2">
            <Link to={`/invoices?client=${client.id}`}>
              <Plus className="w-4 h-4" /> New Invoice
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Info Cards */}
        <div className="space-y-6">
          <Card className="border-0 shadow-xl overflow-hidden">
            <CardHeader className="bg-primary text-white pb-6">
              <CardTitle className="text-sm font-bold uppercase tracking-widest opacity-80">Financial Summary</CardTitle>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-xs opacity-70">Total Invoiced</p>
                  <p className="text-3xl font-black">{formatCurrency(client.total_invoiced || 0)}</p>
                </div>
                <div className="pt-4 border-t border-white/20">
                  <p className="text-xs opacity-70">Outstanding Balance</p>
                  <p className="text-3xl font-black text-amber-300">{formatCurrency(client.total_receivable || 0)}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 rounded-lg bg-muted"><Mail className="w-4 h-4 text-muted-foreground" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground font-bold uppercase">Email</p>
                  <p className="font-medium truncate">{client.email || 'No email provided'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 rounded-lg bg-muted"><Phone className="w-4 h-4 text-muted-foreground" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground font-bold uppercase">Phone</p>
                  <p className="font-medium">{client.phone || 'No phone provided'}</p>
                </div>
              </div>
              {client.tax_id && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="p-2 rounded-lg bg-muted"><Building2 className="w-4 h-4 text-muted-foreground" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground font-bold uppercase">Tax ID / ABN</p>
                    <p className="font-medium">{client.tax_id}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Total Invoices</span>
                </div>
                <span className="font-bold">{invoices.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium">Pending</span>
                </div>
                <span className="font-bold">{invoices.filter(i => i.status !== 'Paid').length}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Invoice List */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-0 shadow-xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Invoice History</CardTitle>
                <CardDescription>All billing records for this client</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Invoice</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        No invoices found for this client.
                      </TableCell>
                    </TableRow>
                  ) : (
                    invoices.map((invoice) => (
                      <TableRow key={invoice.id} className="group hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <p className="font-bold">{invoice.number}</p>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(invoice.invoice_date), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn(
                            "rounded-lg text-[10px] font-bold uppercase",
                            invoice.status === 'Paid' ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                            invoice.status === 'Overdue' ? "bg-rose-100 text-rose-700 border-rose-200" :
                            "bg-blue-100 text-blue-700 border-blue-200"
                          )}>
                            {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-black">
                          {formatCurrency(invoice.total_amount)}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" asChild className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link to={`/invoices/${invoice.id}`}>
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ClientDetail;