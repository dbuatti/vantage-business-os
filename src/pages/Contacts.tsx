"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, User, Plus, Search, Package, Trash2, Users, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { showError, showSuccess } from "@/utils/toast";
import { cn } from "@/lib/utils";
import ClientProfilePane, { Client } from "@/components/contacts/ClientProfilePane";
import InvoicesPane from "@/components/contacts/InvoicesPane";
import TicketsPane from "@/components/contacts/TicketsPane";
import AssetsPane from "@/components/contacts/AssetsPane";
import CatalogPane from "@/components/contacts/CatalogPane";
import InvoiceDetailPane from "@/components/contacts/InvoiceDetailPane";
import TicketDetailPane from "@/components/contacts/TicketDetailPane";

type Selection =
  | { kind: "none" }
  | { kind: "catalog" }
  | { kind: "client"; client: Client };

const Contacts = () => {
  const { session } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addForm, setAddForm] = useState({
    display_name: "",
    email: "",
    phone: "",
    is_company: false,
    tax_id: "",
  });

  const queryClientId = searchParams.get("client");
  const queryView = searchParams.get("view");
  const queryInvoice = searchParams.get("invoice");
  const queryTicket = searchParams.get("ticket");

  const fetchClients = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("clients").select("*").order("display_name");
      if (error) throw error;
      setClients(data || []);
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
      setLastRefreshed(new Date());
    }
  };

  useEffect(() => {
    if (session) fetchClients();
  }, [session]);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === queryClientId) || null,
    [clients, queryClientId]
  );

  const selection: Selection = queryView === "catalog" ? { kind: "catalog" } : selectedClient ? { kind: "client", client: selectedClient } : { kind: "none" };

  const setStatus = (params: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(params).forEach(([k, v]) => {
      if (v === null) next.delete(k);
      else next.set(k, v);
    });
    setSearchParams(next, { replace: true });
  };

  const selectClient = (clientId: string) =>
    setStatus({ client: clientId, view: null, invoice: null, ticket: null });

  const selectCatalog = () => setStatus({ client: null, view: "catalog", invoice: null, ticket: null });

  const openInvoice = (invoiceId: string) =>
    setStatus({ client: selectedClient?.id ?? null, view: "invoices", invoice: invoiceId, ticket: null });

  const openTicket = (ticketId: string) =>
    setStatus({ client: selectedClient?.id ?? null, view: "tickets", ticket: ticketId, invoice: null });

  const clearDetail = () => setStatus({ invoice: null, ticket: null });

  const handleAddClient = async () => {
    if (!session || !addForm.display_name) return;
    try {
      const { error } = await supabase.from("clients").insert([{ ...addForm, owner_user_id: session.user.id }]);
      if (error) throw error;
      showSuccess("Client added");
      setShowAddDialog(false);
      setAddForm({ display_name: "", email: "", phone: "", is_company: false, tax_id: "" });
      fetchClients();
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : "An unexpected error occurred");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
      showSuccess("Client deleted");
      if (id === queryClientId) setStatus({ client: null, view: null, invoice: null, ticket: null });
      fetchClients();
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : "An unexpected error occurred");
    }
  };

  const filteredClients = clients.filter(
    (c) =>
      c.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val);

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
          <p className="text-muted-foreground">Clients, invoices, catalog & support tickets in one place.</p>
          {lastRefreshed && (
            <p className="text-[10px] text-muted-foreground mt-1">
              Last refreshed: {format(lastRefreshed, "h:mm a")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchClients} className="rounded-xl gap-2" disabled={loading}>
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /> Refresh
          </Button>
          <Button onClick={() => setShowAddDialog(true)} className="rounded-xl gap-2">
            <Plus className="w-4 h-4" /> Add Client
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        {/* Left pane: client list + catalog */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              className="pl-10 rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <button
            onClick={selectCatalog}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left",
              selection.kind === "catalog"
                ? "bg-primary/10 border-primary/30"
                : "bg-card border-transparent hover:border-primary/20"
            )}
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm">Catalog</p>
              <p className="text-xs text-muted-foreground">Products & services</p>
            </div>
          </button>

          <div className="space-y-1.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {loading ? (
              <p className="text-xs text-muted-foreground text-center py-8">Loading clients...</p>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto opacity-10 mb-3" />
                <p className="font-bold text-sm">No clients found</p>
              </div>
            ) : (
              filteredClients.map((client) => (
                <div
                  key={client.id}
                  className={cn(
                    "group relative w-full flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer",
                    selection.kind === "client" && selection.client.id === client.id
                      ? "bg-primary/10 border-primary/30"
                      : "bg-card border-transparent hover:border-primary/20"
                  )}
                  onClick={() => selectClient(client.id)}
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    {client.is_company ? <Building2 className="w-5 h-5" /> : <User className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm truncate">{client.display_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[9px] rounded-md">
                        {client.is_company ? "Company" : "Individual"}
                      </Badge>
                      {(client.total_receivable || 0) > 0 && (
                        <span className="text-[10px] text-warning font-semibold">
                          {formatCurrency(client.total_receivable)}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-lg text-danger opacity-0 group-hover:opacity-100 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirmId(client.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right pane: context-aware editor */}
        <div className="min-w-0">
          {selection.kind === "none" && (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground border-2 border-dashed rounded-3xl">
              <Users className="w-14 h-14 mx-auto opacity-10 mb-4" />
              <p className="font-bold text-lg text-foreground">No contact selected</p>
              <p className="text-sm">Select a client from the list, or view your Catalog.</p>
            </div>
          )}

          {selection.kind === "catalog" && <CatalogPane />}

          {selection.kind === "client" &&
            (queryInvoice ? (
              <InvoiceDetailPane invoiceId={queryInvoice} onBack={clearDetail} />
            ) : queryTicket ? (
              <TicketDetailPane ticketId={queryTicket} onBack={clearDetail} />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-6">
                  <ClientProfilePane client={selection.client} onUpdated={fetchClients} />
                  <AssetsPane clientId={selection.client.id} refreshKey={0} />
                </div>
                <div className="lg:col-span-2">
                  <Tabs defaultValue={queryView === "tickets" ? "tickets" : "invoices"}>
                    <TabsList className="bg-muted/50 p-1 rounded-xl h-auto gap-1">
                      <TabsTrigger value="invoices" className="rounded-lg gap-2 py-2 px-4">
                        Invoices
                      </TabsTrigger>
                      <TabsTrigger value="tickets" className="rounded-lg gap-2 py-2 px-4">
                        Tickets
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="invoices" className="animate-fade-in">
                      <InvoicesPane
                        clientId={selection.client.id}
                        clientDisplayName={selection.client.display_name}
                        clientEmail={selection.client.email}
                        onInvoiceSelect={openInvoice}
                      />
                    </TabsContent>
                    <TabsContent value="tickets" className="animate-fade-in">
                      <TicketsPane clientId={selection.client.id} onTicketSelect={openTicket} />
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Add client dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowAddDialog(false)}>
          <div className="w-full max-w-md rounded-2xl bg-background p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold">Add New Client</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Display Name</label>
                <Input
                  placeholder="e.g. Acme Corp or John Doe"
                  value={addForm.display_name}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, display_name: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    placeholder="client@example.com"
                    value={addForm.email}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone</label>
                  <Input
                    placeholder="+1 234 567 890"
                    value={addForm.phone}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, phone: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="add_is_company"
                  checked={addForm.is_company}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, is_company: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="add_is_company" className="text-sm font-normal">
                  This client is a company
                </label>
              </div>
              {addForm.is_company && (
                <div className="space-y-2 animate-fade-in">
                  <label className="text-sm font-medium">Tax ID / ABN</label>
                  <Input
                    placeholder="e.g. 12 345 678 910"
                    value={addForm.tax_id}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, tax_id: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button onClick={handleAddClient} className="rounded-xl" disabled={!addForm.display_name}>
                Add Client
              </Button>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={deleteConfirmId !== null} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this client and all their history? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-rose-600 hover:bg-rose-700"
              onClick={() => {
                if (deleteConfirmId) {
                  handleDelete(deleteConfirmId);
                  setDeleteConfirmId(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Contacts;