"use client";

import React from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, FileText, Share2, Download } from "lucide-react";
import TaxAveraging from "@/pages/TaxAveraging";
import AccountantReport from "@/pages/AccountantReport";
import AccountantPortal from "@/pages/AccountantPortal";
import ExportCenter from "@/pages/ExportCenter";

const VALID_VIEWS = ["averaging", "report", "portal", "export"] as const;
type TaxView = (typeof VALID_VIEWS)[number];

const viewMeta: Record<TaxView, { label: string; icon: typeof Calculator }> = {
  averaging: { label: "Tax Averaging", icon: Calculator },
  report: { label: "Accountant Report", icon: FileText },
  portal: { label: "Accountant Portal", icon: Share2 },
  export: { label: "Export", icon: Download },
};

const TaxCenter = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("view");
  const view: TaxView = VALID_VIEWS.includes(requested as TaxView)
    ? (requested as TaxView)
    : "averaging";

  const setView = (next: string) => {
    setSearchParams(next === "averaging" ? {} : { view: next }, { replace: true });
  };

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tax Center</h1>
          <p className="text-muted-foreground">
            {view === "averaging" && "Manage business streams and ATO special professional averaging."}
            {view === "report" && "Prepare your tax information with ease."}
            {view === "portal" && "A read-only tax report you can share with your accountant."}
            {view === "export" && "Generate professional Excel workbooks for your accountant."}
          </p>
        </div>
      </div>

      <Tabs value={view} onValueChange={setView} className="space-y-6">
        <TabsList className="rounded-xl flex-wrap h-auto gap-1 p-1 bg-muted/50">
          {(Object.keys(viewMeta) as TaxView[]).map((key) => {
            const meta = viewMeta[key];
            return (
              <TabsTrigger key={key} value={key} className="rounded-lg gap-2">
                <meta.icon className="w-4 h-4" />
                {meta.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="averaging" className="space-y-6 animate-fade-in">
          <TaxAveraging />
        </TabsContent>
        <TabsContent value="report" className="space-y-6 animate-fade-in">
          <AccountantReport />
        </TabsContent>
        <TabsContent value="portal" className="space-y-6 animate-fade-in">
          <AccountantPortal />
        </TabsContent>
        <TabsContent value="export" className="space-y-6 animate-fade-in">
          <ExportCenter />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TaxCenter;