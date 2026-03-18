"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Keyboard, Command } from 'lucide-react';

const shortcuts = [
  { keys: ['⌘', 'Enter'], description: 'Submit form' },
  { keys: ['⌘', 'K'], description: 'Focus search' },
  { keys: ['?'], description: 'Show keyboard shortcuts' },
  { keys: ['Esc'], description: 'Close dialogs / Clear search' },
];

const KeyboardShortcuts = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="rounded-xl text-muted-foreground hover:text-foreground"
      >
        <Keyboard className="w-4 h-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="w-5 h-5 text-primary" />
              Keyboard Shortcuts
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {shortcuts.map(({ keys, description }, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{description}</span>
                <div className="flex items-center gap-1">
                  {keys.map((key, j) => (
                    <React.Fragment key={j}>
                      <kbd className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted border rounded-lg shadow-sm">
                        {key}
                      </kbd>
                      {j < keys.length - 1 && <span className="text-muted-foreground text-xs">+</span>}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">?</kbd> anytime to show this dialog
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default KeyboardShortcuts;