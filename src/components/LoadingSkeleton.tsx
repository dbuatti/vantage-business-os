"use client";

import React from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const SummarySkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    {[...Array(4)].map((_, i) => (
      <Card key={i} className="border-0 shadow-lg overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-700 animate-pulse" />
        <CardContent className="relative p-5 space-y-3">
          <Skeleton className="h-4 w-24 bg-white/20" />
          <Skeleton className="h-8 w-32 bg-white/20" />
          <Skeleton className="h-5 w-28 bg-white/20 rounded-full" />
        </CardContent>
      </Card>
    ))}
  </div>
);

export const FormSkeleton = () => (
  <Card className="w-full bg-card/80 backdrop-blur-sm border shadow-xl">
    <CardHeader>
      <Skeleton className="h-6 w-44 rounded-lg" />
    </CardHeader>
    <CardContent className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-16 rounded-full" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        ))}
      </div>
      <Skeleton className="h-11 w-full rounded-xl" />
    </CardContent>
  </Card>
);

export const TableSkeleton = () => (
  <Card className="border shadow-lg overflow-hidden">
    <CardContent className="p-0">
      <div className="p-4 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-3 border-b last:border-0">
            <Skeleton className="h-4 w-24 rounded-lg" />
            <Skeleton className="h-4 w-20 rounded-lg" />
            <Skeleton className="h-6 w-16 rounded-lg" />
            <Skeleton className="h-5 w-20 rounded-lg ml-auto" />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);