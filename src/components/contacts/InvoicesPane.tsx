"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  FileText,
  Plus,
  CheckCircle2,
  BellRing,
  X,
  PlusCircle,
  Package,
} from "lucide-react";
import { format } from "date-fns";
import { showError, showSuccess } from "@/utils/toast";
import { cn } from "@/lib/utils";

interface Invoice {
  id: string;
  number: string;
  invoice_date: string;
  due_date: string;
  status: string;
  total_amount: number;
}

interface Product {
  id: string;
  name: string;
  description: string;
  unit_price: number;
}

interface InvoicesPaneProps {
  clientId: string;
  clientDisplayName: string;
  clientEmail?: string;
  onInvoiceSelect: (invoiceId: string) => void;
}

const InvoicesPane = ({
  clientId,
  clientDisplayName,
  clientEmail,
  onInvoiceSelect,
}: InvoicesPaneProps) => {
  const { session } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({
    invoice_date: format(new Date(), "yyyy-MM-dd"),
    due_date: format(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
    status: "Draft" as const,
    line_items: [{ description: "", quantity: 1, unit_price: 0 }],
  });

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, number, invoice_date, due_date, status, total_amount")
        .eq("client_id", clientId)
        .order("invoice_date", { ascending: false });
      if (error) throw error;
      setInvoices(data || []);
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  const fetchProducts = async () => {
    const { data } = await supabase.from("products").select("id, name, description, unit_price");
    setProducts(data || []);
  };

  useEffect(() => {
    if (clientId) {
      fetchInvoices();
      fetchProducts();
    }
  }, [clientId, fetchInvoices]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Paid":
        return <Badge className="bg-profit-bg text-profit border-profit-border rounded-lg">Paid</Badge>;
      case "Sent":
        return <Badge className="bg-info-bg text-info border-info-border rounded-lg">Sent</Badge>;
      case "Draft":
        return <Badge variant="outline" className="rounded-lg">Draft</Badge>;
      case "Overdue":
        return <Badge className="bg-danger-bg text-danger border-danger-border rounded-lg">Overdue</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase.from("invoices").update({ status }).eq("id", id);
      if (error) throw error;
      showSuccess(`Invoice marked as ${status}`);
      fetchInvoices();
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : "An unexpected error occurred");
    }
  };

  const sendReminder = (invoice: Invoice) => {
    if (!clientEmail) {
      showError("Client has no email address set");
      return;
    }
    const subject = `Reminder: Invoice ${invoice.number} is ${invoice.status === "Overdue" ? "Overdue" : "Due Soon"}`;
    const body = `Hi ${clientDisplayName},\n\nThis is a friendly reminder that invoice ${invoice.number} for ${formatCurrency(invoice.total_amount)} is ${invoice.status === "Overdue" ? "now overdue" : "due on " + format(new Date(invoice.due_date), "MMM dd")}.\n\nPlease let us know if you have any questions.\n\nBest regards,\n${session?.user.email?.split("@")[0]}`;
    window.location.href = `mailto:${clientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    showSuccess("Reminder email template opened");
  };

  const handleAddLineItem = () => {
    setForm((prev) => ({
      ...prev,
      line_items: [...prev.line_items, { description: "", quantity: 1, unit_price: 0 }],
    }));
  };

  const handleRemoveLineItem = (index: number) => {
    setForm((prev) => ({
      ...prev,
      line_items: prev.line_items.filter((_, i) => i !== index),
    }));
  };

  const handleLineItemChange = (index: number, field: string, value: string | number) => {
    const newItems = [...form.line_items];
    newItems[index] = { ...newItems[index], [field]: value };
    setForm((prev) => ({ ...prev, line_items: newItems }));
  };

  const handleSelectProduct = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      const newItems = [...form.line_items];
      newItems[index] = {
        ...newItems[index],
        description: product.name,
        unit_price: product.unit_price,
      };
      setForm((prev) => ({ ...prev, line_items: newItems }));
    }
  };

  const calculateTotal = () =>
    form.line_items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  const handleSave = async () => {
    if (!session) return;
    try {
      const total = calculateTotal();
      const { error } = await supabase.from("invoices").insert([
        {
          client_id: clientId,
          client_display_name: clientDisplayName,
          invoice_date: form.invoice_date,
          due_date: form.due_date,
          status: form.status,
          line_items: form.line_items,
          total_amount: total,
          owner_user_id: session.user.id,
          number: `INV-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        },
      ]);
      if (error) throw error;
      showSuccess("Invoice created");
      fetchInvoices();
      setShowDialog(false);
      setForm({
        invoice_date: format(new Date(), "yyyy-MM-dd"),
        due_date: format(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
        status: "Draft" as const,
        line_items: [{ description: "", quantity: 1, unit_price: 0 }],
      });
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : "An unexpected error occurred");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {loading ? "Loading..." : `${invoices.length} invoice${invoices.length !== 1 ? "s" : ""}`}
        </p>
        <Button onClick={() => setShowDialog(true)} className="rounded-xl gap-2">
          <Plus className="w-4 h-4" /> New Invoice
        </Button>
      </div>

      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Invoice</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10">
                      Loading invoices...
                    </TableCell>
                  </TableRow>
                ) : invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-20 text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto opacity-10 mb-4" />
                      <p className="font-bold text-lg text-foreground">No invoices yet</p>
                      <p>Create your first invoice for this client.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((invoice) => (
                    <TableRow
                      key={invoice.id}
                      className="group hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => onInvoiceSelect(invoice.id)}
                    >
                      <TableCell>
                        <p className="font-bold">{invoice.number}</p>
                        <p className="text-xs font-semibold text-muted-foreground">
                          Due {format(new Date(invoice.due_date), "MMM dd")}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(invoice.invoice_date), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell className="text-right font-black">
                        {formatCurrency(invoice.total_amount)}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {invoice.status !== "Paid" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg text-warning"
                                onClick={() => sendReminder(invoice)}
                                title="Send Reminder"
                              >
                                <BellRing className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg text-profit"
                                onClick={() => updateStatus(invoice.id, "Paid")}
                                title="Mark Paid"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-3xl rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Invoice — {clientDisplayName}</DialogTitle>
            <DialogDescription>Fill in the details below to generate a professional invoice.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={form.invoice_date}
                  onChange={(e) => setForm((prev) => ({ ...prev, invoice_date: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm((prev) => ({ ...prev, due_date: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-muted-foreground">Line Items</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAddLineItem}
                  className="h-7 text-xs rounded-lg gap-1.5"
                >
                  <PlusCircle className="w-3.5 h-3.5" /> Add Item
                </Button>
              </div>
              <div className="space-y-3">
                {form.line_items.map((item, index) => (
                  <div key={index} className="space-y-2 p-4 rounded-2xl bg-muted/30 border animate-fade-in">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 space-y-2">
                        <Select onValueChange={(v) => handleSelectProduct(index, v)}>
                          <SelectTrigger className="h-9 rounded-lg bg-background">
                            <SelectValue placeholder="Select from catalog..." />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                <div className="flex items-center gap-2">
                                  <Package className="w-3 h-3 text-muted-foreground" />
                                  <span>{p.name}</span>
                                  <span className="text-xs text-muted-foreground ml-2">
                                    ({formatCurrency(p.unit_price)})
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="Description of service..."
                          value={item.description}
                          onChange={(e) => handleLineItemChange(index, "description", e.target.value)}
                          className="rounded-xl bg-background"
                        />
                      </div>
                      <div className="w-20">
                        <Label className="text-xs font-semibold text-muted-foreground mb-1 block">Qty</Label>
                        <Input
                          type="number"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) =>
                            handleLineItemChange(index, "quantity", parseFloat(e.target.value) || 0)
                          }
                          className="rounded-xl bg-background"
                        />
                      </div>
                      <div className="w-32">
                        <Label className="text-xs font-semibold text-muted-foreground mb-1 block">Price</Label>
                        <Input
                          type="number"
                          placeholder="Price"
                          value={item.unit_price}
                          onChange={(e) =>
                            handleLineItemChange(index, "unit_price", parseFloat(e.target.value) || 0)
                          }
                          className="rounded-xl bg-background font-bold"
                        />
                      </div>
                      <div className="pt-6">
                        {form.line_items.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveLineItem(index)}
                            className="h-10 w-10 rounded-xl text-rose-500"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t flex justify-end">
              <div className="text-right space-y-1">
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-3xl font-black text-primary">{formatCurrency(calculateTotal())}</p>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDialog(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleSave} className="rounded-xl px-8" disabled={calculateTotal() <= 0}>
              Create Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvoicesPane;