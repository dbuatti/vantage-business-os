"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Undo2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UndoToastProps {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  duration?: number;
}

const UndoToast = ({ message, onUndo, onDismiss, duration = 6000 }: UndoToastProps) => {
  const [progress, setProgress] = useState(100);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = 50;
    const decrement = (interval / duration) * 100;
    
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev <= 0) {
          clearInterval(timer);
          handleDismiss();
          return 0;
        }
        return prev - decrement;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [duration]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 200);
  };

  const handleUndo = () => {
    onUndo();
    handleDismiss();
  };

  if (!isVisible) return null;

  return (
    <div className={cn(
      "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
      "bg-foreground text-background rounded-2xl shadow-2xl",
      "flex items-center gap-3 px-4 py-3 min-w-[300px]",
      "animate-slide-up transition-all duration-200"
    )}>
      <div className="flex-1 text-sm font-medium">{message}</div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleUndo}
        className="h-8 text-background hover:text-background/80 hover:bg-background/10 gap-1.5"
      >
        <Undo2 className="w-3.5 h-3.5" />
        Undo
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleDismiss}
        className="h-6 w-6 text-background/60 hover:text-background hover:bg-background/10"
      >
        <X className="w-3 h-3" />
      </Button>
      <div 
        className="absolute bottom-0 left-0 h-0.5 bg-primary/50 rounded-full transition-all duration-50"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

export default UndoToast;