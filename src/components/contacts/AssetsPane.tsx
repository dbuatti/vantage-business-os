"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Trash2, Key, Shield, Info } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";

interface ClientAsset {
  id: string;
  asset_type: string;
  name: string;
  details: Record<string, unknown>;
}

interface AssetsPaneProps {
  clientId: string;
  refreshKey: number;
}

const AssetsPane = ({ clientId, refreshKey }: AssetsPaneProps) => {
  const { session } = useAuth();
  const [assets, setAssets] = useState<ClientAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ name: "", asset_type: "Note", value: "" });

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("client_assets")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setAssets(data || []);
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    if (clientId) fetchAssets();
  }, [clientId, refreshKey, fetchAssets]);

  const handleAdd = async () => {
    if (!session || !form.name) return;
    try {
      const { error } = await supabase.from("client_assets").insert([
        {
          client_id: clientId,
          owner_user_id: session.user.id,
          name: form.name,
          asset_type: form.asset_type,
          details: { value: form.value },
        },
      ]);
      if (error) throw error;
      showSuccess("Asset added");
      setShowDialog(false);
      setForm({ name: "", asset_type: "Note", value: "" });
      fetchAssets();
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : "An unexpected error occurred");
    }
  };

  const deleteAsset = async (assetId: string) => {
    try {
      const { error } = await supabase.from("client_assets").delete().eq("id", assetId);
      if (error) throw error;
      setAssets((prev) => prev.filter((a) => a.id !== assetId));
      showSuccess("Asset removed");
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : "An unexpected error occurred");
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg">Client Assets</CardTitle>
        <Button variant="ghost" size="icon" onClick={() => setShowDialog(true)} className="h-8 w-8 rounded-lg">
          <Plus className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-xs text-muted-foreground text-center py-4">Loading...</p>
        ) : assets.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No assets or notes stored.</p>
        ) : (
          assets.map((asset) => (
            <div
              key={asset.id}
              className="group p-3 rounded-xl bg-muted/50 border border-transparent hover:border-primary/20 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {asset.asset_type === "Credential" ? (
                    <Key className="w-3.5 h-3.5 text-warning" />
                  ) : asset.asset_type === "Technical" ? (
                    <Shield className="w-3.5 h-3.5 text-primary" />
                  ) : (
                    <Info className="w-3.5 h-3.5 text-primary" />
                  )}
                  <span className="text-xs font-semibold">{asset.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteAsset(asset.id)}
                  className="h-5 w-5 rounded opacity-0 group-hover:opacity-100 text-danger"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
              <p className="text-sm mt-1 font-medium">{asset.details?.value}</p>
            </div>
          ))
        )}
      </CardContent>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add Client Asset</DialogTitle>
            <DialogDescription>Store important details or notes for this client.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Asset Name</Label>
              <Input
                placeholder="e.g. Piano Serial, Hosting Login, Project Code"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <select
                className="w-full h-11 rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                value={form.asset_type}
                onChange={(e) => setForm((prev) => ({ ...prev, asset_type: e.target.value }))}
              >
                <option value="Note">General Note</option>
                <option value="Credential">Credential / Password</option>
                <option value="Technical">Technical Detail</option>
                <option value="Contract">Contract Detail</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Value / Details</Label>
              <Input
                placeholder="The actual information..."
                value={form.value}
                onChange={(e) => setForm((prev) => ({ ...prev, value: e.target.value }))}
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleAdd} className="rounded-xl">Add Asset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default AssetsPane;