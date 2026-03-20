"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from "@/components/ui/progress";
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
  ArrowLeft, 
  Clock, 
  User, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  MoreVertical,
  Briefcase,
  Tag,
  MessageSquare,
  Shield,
  Brain,
  Sparkles,
  History,
  Loader2,
  Zap
} from 'lucide-react';
import { format } from 'date-fns';
import { showError, showSuccess } from '@/utils/toast';
import { cn } from '@/lib/utils';

interface Ticket {
  id: string;
  ticket_number: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  client_display_name: string;
  client_id: string;
  created_at: string;
  category: string;
  service_tier: string;
  estimated_hours: number;
  actual_hours: number;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  is_internal: boolean;
  user_id: string;
}

interface AIAnalysis {
  summary: string;
  solution: string;
  confidence: number;
  updated_at: string;
}

const TicketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [showTimeDialog, setShowTimeDialog] = useState(false);
  const [timeToLog, setTimeToLog] = useState('');

  useEffect(() => {
    if (session && id) {
      fetchTicketData();
    }
  }, [session, id]);

  const fetchTicketData = async () => {
    setLoading(true);
    try {
      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', id)
        .single();
      
      if (ticketError) throw ticketError;
      setTicket(ticketData);

      const [commentRes, aiRes] = await Promise.all([
        supabase.from('ticket_comments').select('*').eq('ticket_id', id).order('created_at', { ascending: true }),
        supabase.from('ticket_ai_analyses').select('*').eq('ticket_id', id).maybeSingle()
      ]);
      
      setComments(commentRes.data || []);
      setAiAnalysis(aiRes.data);
    } catch (error: any) {
      showError(error.message);
      navigate('/tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !session || !id) return;

    try {
      const { error } = await supabase
        .from('ticket_comments')
        .insert([{
          ticket_id: id,
          user_id: session.user.id,
          content: newComment,
          is_internal: isInternal
        }]);

      if (error) throw error;
      setNewComment('');
      fetchTicketData();
      showSuccess('Comment added');
    } catch (error: any) {
      showError(error.message);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-ticket', {
        body: { ticketId: id }
      });
      if (error) throw error;
      setAiAnalysis(data);
      showSuccess('AI Analysis complete');
    } catch (error: any) {
      showError(error.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleLogTime = async () => {
    if (!ticket || !timeToLog) return;
    try {
      const hours = parseFloat(timeToLog);
      const newTotal = (ticket.actual_hours || 0) + hours;
      
      const { error } = await supabase
        .from('tickets')
        .update({ actual_hours: newTotal })
        .eq('id', ticket.id);
      
      if (error) throw error;
      showSuccess(`Logged ${hours} hours`);
      setShowTimeDialog(false);
      setTimeToLog('');
      fetchTicketData();
    } catch (error: any) {
      showError(error.message);
    }
  };

  const updateStatus = async (status: string) => {
    if (!id) return;
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
      showSuccess(`Status updated to ${status}`);
      fetchTicketData();
    } catch (error: any) {
      showError(error.message);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );

  if (!ticket) return null;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="rounded-xl">
            <Link to="/tickets">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">#{ticket.ticket_number}</span>
              <h1 className="text-2xl font-black tracking-tight">{ticket.title}</h1>
            </div>
            <p className="text-sm text-muted-foreground">Client: <Link to={`/clients/${ticket.client_id}`} className="font-bold text-primary hover:underline">{ticket.client_display_name}</Link></p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={ticket.status} onValueChange={updateStatus}>
            <SelectTrigger className="w-40 rounded-xl h-10 font-bold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="rounded-xl h-10" onClick={() => setShowTimeDialog(true)}>
            <Clock className="w-4 h-4 mr-2" /> Log Time
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Analysis Result */}
          {aiAnalysis && (
            <Card className="border-0 shadow-xl bg-gradient-to-br from-violet-50 to-white dark:from-violet-950/20 dark:to-card border-violet-100 dark:border-violet-900 overflow-hidden animate-fade-in">
              <div className="h-1 bg-gradient-to-r from-violet-500 to-purple-500" />
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-violet-600 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> AI Analysis
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px] border-violet-200 text-violet-600">
                    {Math.round(aiAnalysis.confidence * 100)}% Confidence
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase">Summary</p>
                  <p className="text-sm font-medium">{aiAnalysis.summary}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase">Suggested Solution</p>
                  <div className="text-sm leading-relaxed bg-white/50 dark:bg-black/20 p-3 rounded-xl border border-violet-100 dark:border-violet-900">
                    {aiAnalysis.solution}
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground italic">Last analyzed {format(new Date(aiAnalysis.updated_at), 'MMM dd, h:mm a')}</p>
              </CardContent>
            </Card>
          )}

          <Card className="border-0 shadow-xl">
            <CardHeader className="pb-4 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-primary" />
                Description
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{ticket.description || 'No description provided.'}</p>
            </CardContent>
          </Card>

          {/* Conversation */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2 px-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Conversation
            </h3>
            
            <div className="space-y-4">
              {comments.map((comment) => (
                <div 
                  key={comment.id} 
                  className={cn(
                    "p-4 rounded-2xl border transition-all",
                    comment.is_internal 
                      ? "bg-amber-50/50 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900" 
                      : "bg-background shadow-sm"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                        {comment.user_id === session?.user.id ? 'ME' : 'CL'}
                      </div>
                      <span className="text-xs font-bold">{comment.user_id === session?.user.id ? 'You' : 'Client'}</span>
                      {comment.is_internal && <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[9px] h-4 px-1.5">Internal Note</Badge>}
                    </div>
                    <span className="text-[10px] text-muted-foreground">{format(new Date(comment.created_at), 'MMM dd, h:mm a')}</span>
                  </div>
                  <p className="text-sm">{comment.content}</p>
                </div>
              ))}
            </div>

            <Card className="border-0 shadow-lg overflow-hidden">
              <form onSubmit={handleAddComment}>
                <CardContent className="p-4 space-y-4">
                  <textarea 
                    className="w-full min-h-[80px] rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    placeholder="Type your message or internal note..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="is_internal" 
                        checked={isInternal}
                        onChange={(e) => setIsInternal(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                      />
                      <Label htmlFor="is_internal" className="text-xs font-medium text-muted-foreground">Internal Note</Label>
                    </div>
                    <Button type="submit" className="rounded-xl gap-2 px-6" disabled={!newComment.trim()}>
                      <Send className="w-4 h-4" /> Send
                    </Button>
                  </div>
                </CardContent>
              </form>
            </Card>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="border-0 shadow-xl">
            <CardHeader className="pb-4 border-b">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Ticket Details</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground uppercase">Priority</span>
                  <Badge className={cn(
                    "rounded-lg px-3 py-0.5",
                    ticket.priority === 'high' ? "bg-rose-100 text-rose-700" :
                    ticket.priority === 'medium' ? "bg-amber-100 text-amber-700" :
                    "bg-emerald-100 text-emerald-700"
                  )}>{ticket.priority}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground uppercase">Category</span>
                  <Badge variant="outline" className="rounded-lg px-3 py-0.5 uppercase text-[10px]">{ticket.category}</Badge>
                </div>
                <div className="pt-4 border-t space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Est. Hours</span>
                    <span className="font-bold">{ticket.estimated_hours || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Actual Hours</span>
                    <span className={cn("font-bold", ticket.actual_hours > (ticket.estimated_hours || 0) && ticket.estimated_hours > 0 ? "text-rose-600" : "text-emerald-600")}>
                      {ticket.actual_hours || 0}
                    </span>
                  </div>
                  {ticket.estimated_hours > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-bold uppercase text-muted-foreground">
                        <span>Progress</span>
                        <span>{Math.round((ticket.actual_hours / ticket.estimated_hours) * 100)}%</span>
                      </div>
                      <Progress value={(ticket.actual_hours / ticket.estimated_hours) * 100} className="h-1.5" />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Assistant Widget */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
            <CardContent className="p-6 relative space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-white/20 rounded-lg">
                  <Brain className="w-4 h-4" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest opacity-80">AI Assistant</span>
              </div>
              <p className="text-sm font-medium leading-relaxed">I can analyze this ticket to suggest a solution or summarize the conversation.</p>
              <Button 
                variant="secondary" 
                className="w-full rounded-xl font-bold gap-2 shadow-lg"
                onClick={handleAnalyze}
                disabled={analyzing}
              >
                {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Analyze Ticket
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Time Logging Dialog */}
      <Dialog open={showTimeDialog} onOpenChange={setShowTimeDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Log Work Hours</DialogTitle>
            <DialogDescription>Add actual hours spent on this ticket.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label>Hours to Add</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  type="number" 
                  step="0.25" 
                  placeholder="0.00"
                  value={timeToLog} 
                  onChange={(e) => setTimeToLog(e.target.value)}
                  className="pl-10 rounded-xl text-lg font-bold"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTimeDialog(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleLogTime} className="rounded-xl px-8" disabled={!timeToLog}>Log Time</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TicketDetail;