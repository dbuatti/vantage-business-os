"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Command } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const SearchBar = ({ value, onChange, placeholder = "Search entries..." }: SearchBarProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      // Escape to clear and blur
      if (e.key === 'Escape' && isFocused) {
        onChange('');
        inputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocused, onChange]);

  return (
    <div className={cn(
      "relative flex items-center transition-all duration-200",
      isFocused && "ring-2 ring-primary/20 rounded-xl"
    )}>
      <Search className={cn(
        "absolute left-3 w-4 h-4 transition-colors",
        isFocused ? "text-primary" : "text-muted-foreground"
      )} />
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        className="pl-9 pr-20 h-9 rounded-xl text-sm"
      />
      <div className="absolute right-2 flex items-center gap-1">
        {value && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-lg"
            onClick={() => onChange('')}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
        {!value && (
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground bg-muted border rounded-md">
            <Command className="w-2.5 h-2.5" />K
          </kbd>
        )}
      </div>
    </div>
  );
};

export default SearchBar;