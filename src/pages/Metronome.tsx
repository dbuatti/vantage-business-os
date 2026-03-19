"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { Input } from '@/components/ui/input';
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { 
  Activity, 
  Trophy, 
  History, 
  Play, 
  RotateCcw, 
  Target, 
  TrendingUp,
  Music,
  Timer,
  CheckCircle2,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { format } from 'date-fns';
import { showError, showSuccess } from '@/utils/toast';
import BpmTapper from '@/components/BpmTapper';
import { cn } from '@/lib/utils';

interface Score {
  id: string;
  target_bpm: number;
  actual_bpm: number;
  accuracy_percent: number;
  created_at: string;
}

const Metronome = () => {
  const { session } = useAuth();
  const [targetBpm, setTargetBpm] = useState(120);
  const [isPracticing, setIsPracticing] = useState(false);
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastResult, setLastResult] = useState<{ bpm: number; accuracy: number } | null>(null);

  useEffect(() => {
    if (session) fetchScores();
  }, [session]);

  const fetchScores = async () => {
    try {
      const { data, error } = await supabase
        .from('metronome_scores')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      setScores(data || []);
    } catch (error: any) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (actualBpm: number, accuracy: number, taps: number) => {
    setIsPracticing(false);
    setLastResult({ bpm: actualBpm, accuracy });

    if (!session) return;

    try {
      const { error } = await supabase
        .from('metronome_scores')
        .insert([{
          user_id: session.user.id,
          target_bpm: targetBpm,
          actual_bpm: actualBpm,
          accuracy_percent: accuracy,
          taps_count: taps
        }]);

      if (error) throw error;
      fetchScores();
      
      if (accuracy > 98) {
        showSuccess("PERFECT! You're a human metronome!");
      } else if (accuracy > 90) {
        showSuccess("Great job! Very accurate.");
      }
    } catch (error: any) {
      showError(error.message);
    }
  };

  const startPractice = () => {
    setLastResult(null);
    setIsPracticing(true);
  };

  const avgAccuracy = scores.length > 0 
    ? Math.round(scores.reduce((s, a) => s + a.accuracy_percent, 0) / scores.length) 
    : 0;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-8 space-y-8 pb-20">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-primary rounded-2xl text-white shadow-lg shadow-primary/20">
              <Timer className="w-8 h-8" />
            </div>
            BPM Master
          </h1>
          <p className="text-muted-foreground text-lg">Train your internal clock for perfect timing.</p>
        </div>
        <div className="flex items-center gap-3">
          <Card className="border-0 shadow-lg bg-primary/5 px-4 py-2 flex items-center gap-3">
            <Trophy className="w-5 h-5 text-primary" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Avg Accuracy</p>
              <p className="text-xl font-black text-primary">{avgAccuracy}%</p>
            </div>
          </Card>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Practice Area */}
        <Card className="lg:col-span-2 border-0 shadow-2xl overflow-hidden bg-gradient-to-b from-card to-muted/20">
          <CardHeader className="border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-black flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Practice Mode
              </CardTitle>
              {!isPracticing && (
                <Button onClick={startPractice} className="rounded-xl gap-2 px-6 shadow-lg shadow-primary/20">
                  <Play className="w-4 h-4 fill-current" /> Start Session
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-8 sm:p-12">
            {!isPracticing && !lastResult ? (
              <div className="space-y-12 text-center py-10">
                <div className="space-y-6 max-w-sm mx-auto">
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Target Tempo</Label>
                    <div className="text-6xl font-black text-primary tracking-tighter">
                      {targetBpm} <span className="text-xl opacity-50">BPM</span>
                    </div>
                  </div>
                  <Slider
                    value={[targetBpm]}
                    onValueChange={([v]) => setTargetBpm(v)}
                    min={40}
                    max={240}
                    step={1}
                    className="py-4"
                  />
                  <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                    <span>40 BPM</span>
                    <span>240 BPM</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                  {[60, 90, 120, 140, 160, 180].map(bpm => (
                    <Button 
                      key={bpm} 
                      variant="outline" 
                      onClick={() => setTargetBpm(bpm)}
                      className={cn("rounded-xl font-bold", targetBpm === bpm && "bg-primary text-white border-primary")}
                    >
                      {bpm}
                    </Button>
                  ))}
                </div>
              </div>
            ) : isPracticing ? (
              <div className="animate-in zoom-in-95 duration-300">
                <div className="text-center mb-12">
                  <Badge variant="outline" className="rounded-full px-4 py-1 border-primary/30 text-primary font-bold mb-2">
                    TARGET: {targetBpm} BPM
                  </Badge>
                  <h3 className="text-2xl font-black">Match the Tempo</h3>
                  <p className="text-muted-foreground">Tap the button or press Spacebar 8 times</p>
                </div>
                <BpmTapper 
                  targetBpm={targetBpm} 
                  isActive={isPracticing} 
                  onComplete={handleComplete} 
                />
              </div>
            ) : (
              <div className="text-center space-y-8 py-10 animate-in slide-in-from-bottom-4 duration-500">
                <div className="relative inline-block">
                  <div className={cn(
                    "w-40 h-40 rounded-full flex flex-col items-center justify-center border-8 shadow-2xl mx-auto",
                    lastResult!.accuracy > 95 ? "bg-emerald-500 border-emerald-200 text-white" :
                    lastResult!.accuracy > 85 ? "bg-blue-500 border-blue-200 text-white" :
                    "bg-amber-500 border-amber-200 text-white"
                  )}>
                    <span className="text-4xl font-black">{Math.round(lastResult!.accuracy)}%</span>
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Accuracy</span>
                  </div>
                  {lastResult!.accuracy > 95 && (
                    <div className="absolute -top-2 -right-2 p-2 bg-yellow-400 rounded-full shadow-lg animate-bounce">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="text-3xl font-black tracking-tight">
                    {Math.round(lastResult!.bpm)} <span className="text-lg opacity-60">BPM</span>
                  </h3>
                  <p className="text-muted-foreground">
                    You were off by <span className="font-bold text-foreground">{Math.abs(targetBpm - Math.round(lastResult!.bpm))} BPM</span>
                  </p>
                </div>

                <div className="flex justify-center gap-3">
                  <Button onClick={startPractice} className="rounded-xl px-8 h-12 font-bold shadow-xl">
                    Try Again
                  </Button>
                  <Button variant="outline" onClick={() => setLastResult(null)} className="rounded-xl px-8 h-12 font-bold">
                    Change Tempo
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar: History & Stats */}
        <div className="space-y-6">
          <Card className="border-0 shadow-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Recent Sessions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {loading ? (
                  <div className="p-8 text-center text-muted-foreground animate-pulse">Loading history...</div>
                ) : scores.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground italic">No sessions yet. Start practicing!</div>
                ) : (
                  scores.map((score) => (
                    <div key={score.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm">{Math.round(score.actual_bpm)} BPM</span>
                          <span className="text-[10px] text-muted-foreground">vs {score.target_bpm}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">
                          {format(new Date(score.created_at), 'MMM dd, HH:mm')}
                        </p>
                      </div>
                      <Badge className={cn(
                        "rounded-lg font-black",
                        score.accuracy_percent > 95 ? "bg-emerald-100 text-emerald-700" :
                        score.accuracy_percent > 85 ? "bg-blue-100 text-blue-700" :
                        "bg-amber-100 text-amber-700"
                      )}>
                        {Math.round(score.accuracy_percent)}%
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-primary text-white overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
            <CardContent className="p-6 relative space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <p className="text-sm font-black uppercase tracking-widest opacity-80">Pro Tip</p>
              </div>
              <p className="text-sm font-medium leading-relaxed">
                Consistency is key. Try practicing at 60 BPM for 5 minutes daily to build a rock-solid internal pulse.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Metronome;