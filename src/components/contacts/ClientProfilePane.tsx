"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Mail,
  Phone,
  Building2,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { showError, showSuccess } from "@/utils/toast";

export interface Client {
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

interface ClientProfilePaneProps {
  client: Client;
  onUpdated: () => void;
}

const ClientProfilePane = ({ client, onUpdated }: ClientProfilePaneProps) => {
  const { session } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    display_name: "",
    email: "",
    phone: "",
    is_company: false,
    tax_id: "",
  });

  useEffect(() => {
    setForm({
      display_name: client.display_name,
      email: client.email || "",
      phone: client.phone || "",
      is_company: client.is_company,
      tax_id: client.tax_id || "",
    });
  }, [client]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val);

  const handleSave = async () => {
    if (!session) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("clients")
        .update(form)
        .eq("id", client.id);
      if (error) throw error;
      showSuccess("Client updated");
      setEditing(false);
      onUpdated();
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : "An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-xl overflow-hidden">
        <CardHeader className="bg-primary text-primary-foreground pb-6">
          <CardTitle className="text-sm font-semibold opacity-80">Financial Summary</CardTitle>
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs opacity-70">Total Invoiced</p>
              <p className="text-3xl font-black">{formatCurrency(client.total_invoiced || 0)}</p>
            </div>
            <div className="pt-4 border-t border-primary-foreground/20">
              <p className="text-xs opacity-70">Outstanding Balance</p>
              <p className="text-3xl font-black text-warning">{formatCurrency(client.total_receivable || 0)}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {editing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input
                  value={form.display_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, display_name: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_company"
                  checked={form.is_company}
                  onChange={(e) => setForm((prev) => ({ ...prev, is_company: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="is_company" className="font-normal">Company client</Label>
              </div>
              {form.is_company && (
                <div className="space-y-2">
                  <Label>Tax ID / ABN</Label>
                  <Input
                    value={form.tax_id}
                    onChange={(e) => setForm((prev) => ({ ...prev, tax_id: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={saving} className="rounded-xl gap-2">
                  <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save"}
                </Button>
                <Button variant="outline" onClick={() => setEditing(false)} className="rounded-xl gap-2">
                  <X className="w-4 h-4" /> Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground font-semibold">
                Client since {format(new Date(client.created_at), "MMMM yyyy")}
              </p>
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 rounded-lg bg-muted"><Mail className="w-4 h-4 text-muted-foreground" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-muted-foreground">Email</p>
                  <p className="font-medium truncate">{client.email || "No email provided"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 rounded-lg bg-muted"><Phone className="w-4 h-4 text-muted-foreground" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-muted-foreground">Phone</p>
                  <p className="font-medium">{client.phone || "No phone provided"}</p>
                </div>
              </div>
              {client.tax_id && (
                <div className="flex items-center gap-3 text-sm">
                  <div className="p-2 rounded-lg bg-muted"><Building2 className="w-4 h-4 text-muted-foreground" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-muted-foreground">Tax ID / ABN</p>
                    <p className="font-medium">{client.tax_id}</p>
                  </div>
                </div>
              )}
              <Button variant="outline" onClick={() => setEditing(true)} className="rounded-xl gap-2 w-full">
                <Pencil className="w-4 h-4" /> Edit Profile
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientProfilePane;