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
import { Ticket, Plus, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { showError, showSuccess } from "@/utils/toast";
import { cn } from "@/lib/utils";
import TicketKanban from "@/components/TicketKanban";

interface TicketData {
  id: string;
  ticket_number: number;
  title: string;
  status: string;
  priority: string;
  category: string;
  service_tier: string;
  created_at: string;
}

interface TicketsPaneProps {
  clientId: string;
  onTicketSelect: (ticketId: string) => void;
}

const TicketsPane = ({ clientId, onTicketSelect }: TicketsPaneProps) => {
  const { session } = useAuth();
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "medium",
    category: "other",
    service_tier: "standard",
  });

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setTickets(data || []);
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    if (clientId) fetchTickets();
  }, [clientId, fetchTickets]);

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const { error } = await supabase.from("tickets").update({ status }).eq("id", id);
      if (error) throw error;
      fetchTickets();
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : "An unexpected error occurred");
    }
  };

  const handleSave = async () => {
    if (!session || !form.title) return;
    try {
      const { error } = await supabase.from("tickets").insert([
        {
          ...form,
          owner_user_id: session.user.id,
          client_id: clientId,
          status: "open",
        },
      ]);
      if (error) throw error;
      showSuccess("Ticket created");
      fetchTickets();
      setShowDialog(false);
      setForm({ title: "", description: "", priority: "medium", category: "other", service_tier: "standard" });
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : "An unexpected error occurred");
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge className="bg-danger-bg text-danger border-danger-border rounded-lg">High</Badge>;
      case "medium":
        return <Badge className="bg-warning-bg text-warning border-warning-border rounded-lg">Medium</Badge>;
      case "low":
        return <Badge className="bg-profit-bg text-profit border-profit-border rounded-lg">Low</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge className="bg-info-bg text-info border-info-border rounded-lg">Open</Badge>;
      case "in_progress":
        return <Badge className="bg-ai-bg text-ai border-ai-border rounded-lg">In Progress</Badge>;
      case "resolved":
        return <Badge className="bg-profit-bg text-profit border-profit-border rounded-lg">Resolved</Badge>;
      case "closed":
        return <Badge variant="outline" className="rounded-lg">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-muted rounded-xl p-1 h-auto">
          <Button
            variant={viewMode === "table" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("table")}
            className="rounded-lg h-8 gap-2"
          >
            Table
          </Button>
          <Button
            variant={viewMode === "kanban" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("kanban")}
            className="rounded-lg h-8 gap-2"
          >
            Kanban
          </Button>
        </div>
        <Button onClick={() => setShowDialog(true)} className="rounded-xl gap-2">
          <Plus className="w-4 h-4" /> New Ticket
        </Button>
      </div>

      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className={cn("p-0", viewMode === "kanban" && "p-6 bg-muted/10")}>
          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Ticket className="w-12 h-12 mx-auto opacity-10 mb-4" />
              <p className="font-bold text-lg text-foreground">No tickets for this client</p>
              <p>Create a ticket to start tracking work.</p>
            </div>
          ) : viewMode === "table" ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Ticket</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Created</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((ticket) => (
                    <TableRow
                      key={ticket.id}
                      className="group hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => onTicketSelect(ticket.id)}
                    >
                      <TableCell>
                        <p className="font-bold">{ticket.title}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">#{ticket.ticket_number}</p>
                      </TableCell>
                      <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                      <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {format(new Date(ticket.created_at), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <TicketKanban tickets={tickets} onStatusChange={handleStatusChange} />
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle>Create New Ticket</DialogTitle>
            <DialogDescription>Log a new request or project task for this client.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Ticket Title</Label>
              <Input
                placeholder="e.g. Website Redesign or Server Maintenance"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm((prev) => ({ ...prev, priority: v }))}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm((prev) => ({ ...prev, category: v }))}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="support">Support</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <textarea
                className="w-full min-h-[100px] rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                placeholder="Detailed description of the work required..."
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleSave} className="rounded-xl px-8" disabled={!form.title}>Create Ticket</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TicketsPane;