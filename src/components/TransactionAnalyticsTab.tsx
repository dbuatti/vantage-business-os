"use client";

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TransactionCharts from './TransactionCharts';
import CategoryBreakdown from './CategoryBreakdown';
import MerchantAnalysis from './MerchantAnalysis';
import SpendingHeatmap from './SpendingHeatmap';
import TransactionStats from './TransactionStats';
import { Transaction } from '@/types/finance';

interface TransactionAnalyticsTabProps {
  transactions: Transaction[];
  categoryGroups: any[];
}

const TransactionAnalyticsTab = ({ transactions, categoryGroups }: TransactionAnalyticsTabProps) => {
  return (
    <div className="space-y-6 animate-fade-in">
      <Tabs defaultValue="charts" className="space-y-4">
        <TabsList className="h-9 p-1 bg-muted/30 rounded-lg">
          <TabsTrigger value="charts" className="text-xs rounded-md">Visual Trends</TabsTrigger>
          <TabsTrigger value="categories" className="text-xs rounded-md">Categories</TabsTrigger>
          <TabsTrigger value="merchants" className="text-xs rounded-md">Merchants</TabsTrigger>
          <TabsTrigger value="heatmap" className="text-xs rounded-md">Heatmap</TabsTrigger>
          <TabsTrigger value="stats" className="text-xs rounded-md">Key Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="charts" className="space-y-4">
          <TransactionCharts transactions={transactions} categoryGroups={categoryGroups} />
        </TabsContent>
        <TabsContent value="categories" className="space-y-4">
          <CategoryBreakdown transactions={transactions} categoryGroups={categoryGroups} />
        </TabsContent>
        <TabsContent value="merchants" className="space-y-4">
          <MerchantAnalysis transactions={transactions} />
        </TabsContent>
        <TabsContent value="heatmap" className="space-y-4">
          <SpendingHeatmap transactions={transactions} />
        </TabsContent>
        <TabsContent value="stats" className="space-y-4">
          <TransactionStats transactions={transactions} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TransactionAnalyticsTab;