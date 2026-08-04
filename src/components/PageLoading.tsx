"use client";

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles } from 'lucide-react';

export const PageLoading = ({ label = 'Loading' }: { label?: string }) => (
  <div className="min-h-screen w-full bg-background flex items-center justify-center p-6 animate-fade-in">
    <div className="w-full max-w-md space-y-6">
      <div className="flex items-center justify-center gap-3">
        <div className="p-2.5 bg-gradient-to-br from-primary to-indigo-600 rounded-xl text-white shadow-xl shadow-primary/20 animate-pulse">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
          <p className="text-xs font-semibold text-muted-foreground/60">Syncing your business data</p>
        </div>
      </div>

      <Card className="border-0 shadow-lg overflow-hidden">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 rounded-2xl" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-2/3 rounded-lg" />
              <Skeleton className="h-6 w-1/2 rounded-lg" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
          <div className="space-y-3 pt-2">
            <Skeleton className="h-4 w-full rounded-lg" />
            <Skeleton className="h-4 w-4/5 rounded-lg" />
            <Skeleton className="h-4 w-3/5 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

export default PageLoading;
