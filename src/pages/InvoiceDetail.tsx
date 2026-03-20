"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent } from '@/components/ui/card';
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
  Printer, 
  Download, 
  Mail, 
  CheckCircle2, 
  Clock,
  Building2,
  Globe,
  Phone,
  FileText,
  ExternalLink,
  Share2,
  Copy,
  Check
} from 'lucide-react';
import { format } from 'date-fns';
import { showError, showSuccess } from '@/utils/toast';
import { cn } from '@/lib/utils';

interface Invoice {
  id: string;
  number: string;
  invoice_date: string;
  due_date: string;
  status: string;
  total_amount: number;
  line_items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
  }>;
  client_id: string;
  client_display_name: string;
  public_share_token: string;
}

interface Settings {
  company_name: string;
  company_email: string;
  company_phone: string;
  company_website: string;
  company_abn: string;
}

const InvoiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (session && id) {
      fetchInvoiceData();
    }
  }, [session, id]);

  const fetchInvoiceData = async () => {
    setLoading(true);
    try {
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', id)
        .single();
      
      if (invoiceError) throw invoiceError;
      setInvoice(invoiceData);

      const { data: settingsData } = await supabase
        .from('settings')
        .select('*')
        .eq('owner_user_id', session?.user.id)
        .single();
      
      setSettings(settingsData);
    } catch (error: any) {
      showError(error.message);
      navigate('/invoices');
    } finally {
      setLoading(false);
    }
  };

  const markAsPaid = async () => {
    if (!invoice) return;
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'Paid' })
        .eq('id', invoice.id);
      
      if (error) throw error;
      showSuccess('Invoice marked as paid');
      fetchInvoiceData();
    } catch (error: any) {
      showError(error.message);
    }
  };

  const copyPublicLink = () => {
    if (!invoice?.public_share_token) return;
    const url = `${window.location.origin}/portal/invoice/${invoice.public_share_token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showSuccess('Public link copied to clipboard');
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );

  if (!invoice) return null;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-8 pb-20">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="rounded-xl">
            <Link to="/invoices">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Invoice {invoice.number}</h1>
            <p className="text-sm text-muted-foreground">Manage and preview your invoice</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={copyPublicLink} className="rounded-xl gap-2">
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
            {copied ? 'Copied' : 'Public Link'}
          </Button>
          {invoice.status !== 'Paid' && (
            <Button variant="outline" onClick={markAsPaid} className="rounded-xl gap-2 text-emerald-600 hover:bg-emerald-50">
              <CheckCircle2 className="w-4 h-4" /> Mark Paid
            </Button>
          )}
          <Button variant="outline" onClick={() => window.print()} className="rounded-xl gap-2">
            <Printer className="w-4 h-4" /> Print
          </Button>
          <Button className="rounded-xl gap-2">
            <Download className="w-4 h-4" /> Download PDF
          </Button>
        </div>
      </div>

      {/* Invoice Document */}
      <Card className="border-0 shadow-2xl overflow-hidden print:shadow-none print:border">
        <CardContent className="p-8 sm:p-12 space-y-12">
          {/* Doc Header */}
          <div className="flex flex-col sm:flex-row justify-between gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary rounded-2xl text-white">
                  <FileText className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tighter uppercase">{settings?.company_name || 'Your Business'}</h2>
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Tax Invoice</p>
                </div>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                {settings?.company_abn && <p>ABN: {settings.company_abn}</p>}
                {settings?.company_email && <p>{settings.company_email}</p>}
                {settings?.company_phone && <p>{settings.company_phone}</p>}
                {settings?.company_website && <p>{settings.company_website}</p>}
              </div>
            </div>
            <div className="text-left sm:text-right space-y-2">
              <Badge className={cn(
                "rounded-lg px-4 py-1 text-xs font-black uppercase tracking-widest",
                invoice.status === 'Paid' ? "bg-emerald-500 text-white" : "bg-primary text-white"
              )}>
                {invoice.status}
              </Badge>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Invoice Number</p>
                <p className="text-xl font-black">{invoice.number}</p>
              </div>
              <div className="grid grid-cols-2 sm:block gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold">Date Issued</p>
                  <p className="font-medium">{format(new Date(invoice.invoice_date), 'MMM dd, yyyy')}</p>
                </div>
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground uppercase font-bold">Due Date</p>
                  <p className="font-medium">{format(new Date(invoice.due_date), 'MMM dd, yyyy')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bill To */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-8 border-t">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase font-black tracking-widest">Bill To</p>
              <div className="space-y-1">
                <p className="text-lg font-black">{invoice.client_display_name}</p>
                <Button variant="link" asChild className="p-0 h-auto text-primary print:hidden">
                  <Link to={`/clients/${invoice.client_id}`} className="flex items-center gap-1 text-xs">
                    View Client Profile <ExternalLink className="w-3 h-3" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b-2 border-foreground">
                  <TableHead className="text-foreground font-black uppercase text-xs">Description</TableHead>
                  <TableHead className="text-foreground font-black uppercase text-xs text-right">Qty</TableHead>
                  <TableHead className="text-foreground font-black uppercase text-xs text-right">Unit Price</TableHead>
                  <TableHead className="text-foreground font-black uppercase text-xs text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.line_items.map((item, i) => (
                  <TableRow key={i} className="border-b border-muted">
                    <TableCell className="py-6 font-medium">{item.description}</TableCell>
                    <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(item.unit_price)}</TableCell>
                    <TableCell className="text-right font-bold tabular-nums">{formatCurrency(item.quantity * item.unit_price)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Totals */}
          <div className="flex justify-end pt-8">
            <div className="w-full sm:w-64 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatCurrency(invoice.total_amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax (0%)</span>
                <span className="font-medium">$0.00</span>
              </div>
              <div className="flex justify-between items-center pt-4 border-t-2 border-foreground">
                <span className="text-lg font-black uppercase">Total</span>
                <span className="text-2xl font-black text-primary">{formatCurrency(invoice.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-20 text-center space-y-4">
            <p className="text-sm text-muted-foreground italic">Thank you for your business!</p>
            <div className="flex justify-center gap-6 text-xs text-muted-foreground font-medium uppercase tracking-widest">
              <span className="flex items-center gap-1.5"><Globe className="w-3 h-3" /> {settings?.company_website || 'yourwebsite.com'}</span>
              <span className="flex items-center gap-1.5"><Mail className="w-3 h-3" /> {settings?.company_email || 'hello@business.com'}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoiceDetail;