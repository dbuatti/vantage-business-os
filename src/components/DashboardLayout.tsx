"use client";

import React from 'react';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from './AppSidebar';
import CommandPalette from './CommandPalette';
import ThemeToggle from './ThemeToggle';
import { Button } from './ui/button';
import { Search, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const navigate = useNavigate();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b flex items-center justify-between px-4 sm:px-6 sticky top-0 bg-background/80 backdrop-blur-md z-30">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div className="h-4 w-[1px] bg-border hidden sm:block" />
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-muted-foreground hidden sm:flex items-center gap-2 rounded-lg px-3"
                onClick={() => {
                  const event = new KeyboardEvent('keydown', {
                    key: 'k',
                    metaKey: true,
                  });
                  document.dispatchEvent(event);
                }}
              >
                <Search className="w-4 h-4" />
                <span className="text-xs">Search...</span>
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                size="sm" 
                className="rounded-xl h-9 gap-2 px-4 font-bold shadow-lg shadow-primary/20"
                onClick={() => navigate('/transactions')}
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Quick Add</span>
              </Button>
              <div className="h-4 w-[1px] bg-border" />
              <ThemeToggle />
            </div>
          </header>
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </main>
        <CommandPalette />
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;