"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Zap, RotateCcw, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BpmTapperProps {
  targetBpm: number;
  onComplete: (actualBpm: number, accuracy: number, taps: number) => void;
  isActive: boolean;
}

const REQUIRED_TAPS = 8;

const BpmTapper = ({ targetBpm, onComplete, isActive }: BpmTapperProps) => {
  const [taps, setTaps] = useState<number[]>([]);
  const [currentBpm, setCurrentBpm] = useState<number | null>(null);
  const [isPressed, setIsPressed] = useState(false);
  const lastTapRef = useRef<number>(0);

  const reset = useCallback(() => {
    setTaps([]);
    setCurrentBpm(null);
    lastTapRef.current = 0;
  }, []);

  useEffect(() => {
    if (!isActive) reset();
  }, [isActive, reset]);

  const handleTap = () => {
    if (!isActive) return;

    const now = performance.now();
    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 100);

    if (lastTapRef.current > 0) {
      const interval = now - lastTapRef.current;
      // Ignore taps that are too slow (less than 30 BPM) or too fast (more than 300 BPM)
      if (interval > 200 && interval < 2000) {
        const newTaps = [...taps, interval].slice(-(REQUIRED_TAPS - 1));
        setTaps(newTaps);

        const avgInterval = newTaps.reduce((a, b) => a + b, 0) / newTaps.length;
        const bpm = 60000 / avgInterval;
        setCurrentBpm(bpm);

        if (newTaps.length === REQUIRED_TAPS - 1) {
          const accuracy = Math.max(0, 100 - (Math.abs(targetBpm - bpm) / targetBpm) * 100);
          onComplete(bpm, accuracy, REQUIRED_TAPS);
          reset();
        }
      } else {
        // Reset if tap is outside reasonable bounds
        setTaps([]);
      }
    }
    lastTapRef.current = now;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleTap();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTap]);

  const progress = (taps.length / (REQUIRED_TAPS - 1)) * 100;

  return (
    <div className="space-y-8 text-center">
      <div className="relative flex justify-center">
        <button
          onMouseDown={handleTap}
          className={cn(
            "w-48 h-48 rounded-full border-8 transition-all duration-75 flex flex-col items-center justify-center gap-2 shadow-2xl",
            isPressed 
              ? "scale-95 bg-primary border-primary-foreground/20 text-white" 
              : "bg-card border-primary/20 text-primary hover:border-primary/40",
            !isActive && "opacity-50 cursor-not-allowed"
          )}
          disabled={!isActive}
        >
          <Zap className={cn("w-10 h-10", isPressed ? "animate-pulse" : "")} />
          <span className="font-black text-xl uppercase tracking-tighter">
            {isPressed ? "TAP!" : "SPACEBAR"}
          </span>
        </button>
        
        {/* Progress Ring */}
        <svg className="absolute -inset-4 w-56 h-56 -rotate-90 pointer-events-none" viewBox="0 0 100 100">
          <circle
            cx="50" cy="50" r="48"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-muted/20"
          />
          <circle
            cx="50" cy="50" r="48"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeDasharray="301.59"
            strokeDashoffset={301.59 - (301.59 * progress) / 100}
            strokeLinecap="round"
            className="text-primary transition-all duration-300"
          />
        </svg>
      </div>

      <div className="max-w-xs mx-auto space-y-2">
        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          <span>Progress</span>
          <span>{taps.length + (lastTapRef.current > 0 ? 1 : 0)} / {REQUIRED_TAPS} Taps</span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      {currentBpm && (
        <div className="animate-fade-in">
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Current Pace</p>
          <p className="text-5xl font-black tabular-nums text-primary">
            {Math.round(currentBpm)}
            <span className="text-lg ml-1 opacity-50">BPM</span>
          </p>
        </div>
      )}
    </div>
  );
};

export default BpmTapper;