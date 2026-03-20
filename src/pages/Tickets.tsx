"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Ticket, 
  Plus, 
  Search, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight, 
  Filter,
  User,
  Briefcase,
  Tag,
  MoreVertical,
  ExternalLink,
  LayoutGrid,
  List
} from 'lucide-react';
import { format } from 'date-fns';
import { showError, showSuccess } from '@/utils/toast';
import { cn } from '@/lib/utils';
import TicketKanban from '@/components/TicketKanban';

interface TicketData {
  id: string;
  ticket_number: number;
  title: string;
  status: string;
  priority: string;
  client_display_name: string;
  client_id: string;
  created_at: string;
  category: string;
  service_tier: string;
}

const Tickets = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('kanban');

  const [form, setForm] = useState({
    title: '',
    description: '',
    client_id: '',
    priority: 'medium',
    category: 'other',
    service_tier: 'standard'
  });

  useEffect(() => {
    if (session) {
      fetchTickets();
      fetchClients();
    }
  }, [session]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTickets(data || []);
    } catch (error: any) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    const { data } = await supabase.from('clients').select('id, display_name');
    setClients(data || []);
  };

  const handleSave = async () => {
    if (!session || !form.title || !form.client_id) return;
    try {
      const client = clients.find(c => c.id === form.client_id);
      const { error } = await supabase
        .from('tickets')
        .insert([{
          ...form,
          owner_user_id: session.user.id,
          client_display_name: client?.display_name,
          status: 'open'
        }]);

      if (error) throw error;
      showSuccess('Ticket created');
      fetchTickets();
      setShowDialog(false);
      setForm({ title: '', description: '', client_id: '', priority: 'medium', category: 'other', service_tier: 'standard' });
    } catch (error: any) {
      showError(error.message);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const { error } = await supabase.from('tickets').update({ status }).eq('id', id);
      if (error) throw error;
      fetchTickets();
    } catch (error: any) {
      showError(error.message);
    }
  };

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         t.client_display_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return <Badge className="bg-rose-100 text-rose-700 border-rose-200 rounded-lg">High</Badge>;
      case 'medium': return <Badge className="bg-amber-100 text-amber-700 border-amber-200 rounded-lg">Medium</Badge>;
      case 'low': return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 rounded-lg">Low</Badge>;
      default: return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open': return <Badge className="bg-blue-100 text-blue-700 border-blue-200 rounded-lg">Open</Badge>;
      case 'in_progress': return <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 rounded-lg">In Progress</Badge>;
      case 'resolved': return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 rounded-lg">Resolved</Badge>;
      case 'closed': return <Badge variant="outline" className="rounded-lg">Closed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Tickets & Projects</h1>
          <p className="text-muted-foreground">Manage client requests, support tickets, and project tasks.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
            <Button 
              variant={viewMode === 'kanban' ? 'default' : 'ghost'} 
              size="sm" 
              onClick={() => setViewMode('kanban')}
              className="rounded-lg h-8 gap-2"
            >
              <LayoutGrid className="w-4 h-4" /> Kanban
            </Button>
            <Button 
              variant={viewMode === 'table' ? 'default' : 'ghost'} 
              size="sm" 
              onClick={() => setViewMode('table')}
              className="rounded-lg h-8 gap-2"
            >
              <List className="w-4 h-4" /> Table
            </Button>
          </div>
          <Button onClick={() => setShowDialog(true)} className="rounded-xl gap-2">
            <Plus className="w-4 h-4" /> New Ticket
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg bg-blue-600 text-white">
          <CardContent className="p-6">
            <p className="text-sm font-medium opacity-80">Open Tickets</p>
            <p className="text-3xl font-black">{tickets.filter(t => t.status === 'open').length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-indigo-600 text-white">
          <CardContent className="p-6">
            <p className="text-sm font-medium opacity-80">In Progress</p>
            <p className="text-3xl font-black">{tickets.filter(t => t.status === 'in_progress').length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-rose-500 text-white">
          <CardContent className="p-6">
            <p className="text-sm font-medium opacity-80">High Priority</p>
            <p className="text-3xl font-black">{tickets.filter(t => t.priority === 'high' && t.status !== 'closed').length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-emerald-600 text-white">
          <CardContent className="p-6">
            <p className="text-sm font-medium opacity-80">Resolved (Total)</p>
            <p className="text-3xl font-black">{tickets.filter(t => t.status === 'resolved').length}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-xl overflow-hidden">
        <CardHeader className="pb-3 border-b bg-muted/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search tickets by title or client..." 
                className="pl-10 rounded-xl bg-background"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40 rounded-xl bg-background">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className={cn("p-0", viewMode === 'kanban' && "p-6 bg-muted/10")}>
          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading tickets...</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Ticket className="w-12 h-12 mx-auto opacity-10 mb-4" />
              <p className="font-bold text-lg text-foreground">No tickets found</p>
              <p>Create a ticket to start tracking work.</p>
            </div>
          ) : viewMode === 'table' ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-20">ID</TableHead>
                  <TableHead>Ticket Title</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.map((ticket) => (
                  <TableRow key={ticket.id} className="group hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate(`/tickets/${ticket.id}`)}>
                    <TableCell className="font-mono text-xs text-muted-foreground">#{ticket.ticket_number}</TableCell>
                    <TableCell>
                      <p className="font-bold">{ticket.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[9px] rounded-md uppercase font-bold tracking-tighter">{ticket.category}</Badge>
                        {ticket.service_tier && <Badge variant="outline" className="text-[9px] rounded-md bg-primary/5 text-primary border-primary/10">{ticket.service_tier}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{ticket.client_display_name}</TableCell>
                    <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                    <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {format(new Date(ticket.created_at), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <TicketKanban tickets={filteredTickets} onStatusChange={handleStatusChange} />
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle>Create New Ticket</DialogTitle>
            <DialogDescription>Log a new request or project task.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Ticket Title</Label>
              <Input 
                placeholder="e.g. Website Redesign or Server Maintenance" 
                value={form.title}
                onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Client</Label>
              <Select value={form.client_id} onValueChange={(v) => setForm(prev => ({ ...prev, client_id: v }))}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.display_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm(prev => ({ ...prev, priority: v }))}>
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
                <Select value={form.category} onValueChange={(v) => setForm(prev => ({ ...prev, category: v }))}>
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
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleSave} className="rounded-xl px-8" disabled={!form.title || !form.client_id}>Create Ticket</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Tickets;