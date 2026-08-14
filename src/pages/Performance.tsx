"use client";

import React from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gauge, TrendingUp } from "lucide-react";
import Productivity from "@/pages/Productivity";
import ProjectROI from "@/pages/ProjectROI";

const VALID_VIEWS = ["overview", "roi"] as const;
type PerformanceView = (typeof VALID_VIEWS)[number];

const viewMeta: Record<PerformanceView, { label: string; icon: typeof Gauge }> = {
  overview: { label: "Overview", icon: Gauge },
  roi: { label: "Project ROI", icon: TrendingUp },
};

const Performance = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("view");
  const view: PerformanceView = VALID_VIEWS.includes(requested as PerformanceView)
    ? (requested as PerformanceView)
    : "overview";

  const setView = (next: string) => {
    setSearchParams(next === "overview" ? {} : { view: next }, { replace: true });
  };

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Performance</h1>
          <p className="text-muted-foreground">
            {view === "overview" && "Analyze your time investment and client efficiency."}
            {view === "roi" && "Analyzing the financial efficiency of your time investment."}
          </p>
        </div>
      </div>

      <Tabs value={view} onValueChange={setView} className="space-y-6">
        <TabsList className="rounded-xl flex-wrap h-auto gap-1 p-1 bg-muted/50">
          {(Object.keys(viewMeta) as PerformanceView[]).map((key) => {
            const meta = viewMeta[key];
            return (
              <TabsTrigger key={key} value={key} className="rounded-lg gap-2">
                <meta.icon className="w-4 h-4" />
                {meta.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="overview" className="space-y-6 animate-fade-in">
          <Productivity />
        </TabsContent>
        <TabsContent value="roi" className="space-y-6 animate-fade-in">
          <ProjectROI />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Performance;