"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  MoreVertical, 
  User,
  ChevronRight,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface Ticket {
  id: string;
  ticket_number: number;
  title: string;
  status: string;
  priority: string;
  client_display_name: string;
  category: string;
}

interface TicketKanbanProps {
  tickets: Ticket[];
  onStatusChange: (id: string, status: string) => void;
}

const COLUMNS = [
  { id: 'open', label: 'Open', color: 'bg-blue-500' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-indigo-500' },
  { id: 'resolved', label: 'Resolved', color: 'bg-emerald-500' },
  { id: 'closed', label: 'Closed', color: 'bg-slate-500' },
];

const TicketKanban = ({ tickets, onStatusChange }: TicketKanbanProps) => {
  const navigate = useNavigate();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-rose-500';
      case 'medium': return 'bg-amber-500';
      case 'low': return 'bg-emerald-500';
      default: return 'bg-slate-500';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 overflow-x-auto pb-4">
      {COLUMNS.map((column) => {
        const columnTickets = tickets.filter(t => t.status === column.id);
        
        return (
          <div key={column.id} className="flex flex-col gap-4 min-w-[280px]">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", column.color)} />
                <h3 className="font-bold text-sm uppercase tracking-wider">{column.label}</h3>
                <Badge variant="secondary" className="rounded-full h-5 px-1.5 text-[10px]">
                  {columnTickets.length}
                </Badge>
              </div>
            </div>

            <div className="flex flex-col gap-3 min-h-[500px] p-2 rounded-2xl bg-muted/30 border border-dashed border-muted-foreground/20">
              {columnTickets.map((ticket) => (
                <Card 
                  key={ticket.id} 
                  className="group border-0 shadow-md hover:shadow-xl transition-all cursor-pointer overflow-hidden relative"
                  onClick={() => navigate(`/tickets/${ticket.id}`)}
                >
                  <div className={cn("absolute left-0 top-0 bottom-0 w-1", getPriorityColor(ticket.priority))} />
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-mono text-muted-foreground">#{ticket.ticket_number}</span>
                      <Badge variant="outline" className="text-[9px] rounded-md uppercase font-bold tracking-tighter">
                        {ticket.category}
                      </Badge>
                    </div>
                    
                    <h4 className="font-bold text-sm leading-tight group-hover:text-primary transition-colors">
                      {ticket.title}
                    </h4>

                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-3 h-3 text-primary" />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground truncate">
                        {ticket.client_display_name}
                      </span>
                    </div>

                    <div className="pt-2 border-t flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <MessageSquare className="w-3 h-3" />
                          <span>2</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>4h</span>
                        </div>
                      </div>
                      <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {columnTickets.length === 0 && (
                <div className="flex-1 flex items-center justify-center opacity-20">
                  <p className="text-xs font-bold uppercase tracking-widest">Empty</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TicketKanban;