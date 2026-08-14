"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useSettings } from "@/components/SettingsProvider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListFilter, Repeat, CalendarCheck, Target, FolderTree, Loader2 } from "lucide-react";
import Transactions from "@/pages/Transactions";
import WeeklyLog from "@/pages/WeeklyLog";
import SubscriptionAudit from "@/components/SubscriptionAudit";
import CategoryGroupManager from "@/components/CategoryGroupManager";
import BudgetTracker from "@/components/BudgetTracker";
import SavingsGoals from "@/components/SavingsGoals";
import { Transaction } from "@/types/finance";
import { fetchAllPaginated } from "@/utils/supabase";
import { showError } from "@/utils/toast";

const VALID_VIEWS = ["transactions", "subscriptions", "budgets", "weekly", "categories"] as const;
type LedgerView = (typeof VALID_VIEWS)[number];

const SubscriptionsView = () => {
  const { selectedYear } = useSettings();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchAllPaginated<Transaction>({
          table: "finance_transactions",
          select: "*",
          order: [
            { column: "transaction_date", ascending: false },
            { column: "id", ascending: false },
          ],
          yearFilter: selectedYear !== "All" ? { column: "transaction_date", year: selectedYear } : undefined,
          pageSize: 1000,
        });
        if (!cancelled) setTransactions(data);
      } catch (error: unknown) {
        if (!cancelled) showError(error instanceof Error ? error.message : "An unexpected error occurred");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedYear]);

  if (loading)
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );

  return <SubscriptionAudit transactions={transactions} />;
};

const BudgetsView = () => {
  const { selectedYear } = useSettings();
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchAllPaginated<Transaction>({
          table: "finance_transactions",
          select: "*",
          order: [
            { column: "transaction_date", ascending: false },
            { column: "id", ascending: false },
          ],
          yearFilter: selectedYear !== "All" ? { column: "transaction_date", year: selectedYear } : undefined,
          pageSize: 1000,
        });
        if (!cancelled) setTransactions(data);
      } catch (error: unknown) {
        if (!cancelled) showError(error instanceof Error ? error.message : "An unexpected error occurred");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedYear]);

  return (
    <div className="space-y-6">
      <BudgetTracker transactions={transactions} />
      <SavingsGoals transactions={transactions} />
    </div>
  );
};

const CategoriesView = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [groups, setGroups] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const t = await fetchAllPaginated<Transaction>({
          table: "finance_transactions",
          select: "*",
          order: [
            { column: "transaction_date", ascending: false },
            { column: "id", ascending: false },
          ],
          pageSize: 1000,
        });
        if (!cancelled) setTransactions(t);
        const { data } = await supabase.from("category_groups").select("*").order("group_name");
        if (!cancelled) setGroups(data || []);
      } catch (error: unknown) {
        if (!cancelled) showError(error instanceof Error ? error.message : "An unexpected error occurred");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <CategoryGroupManager
      transactions={transactions}
      onGroupsUpdated={() => {}}
    />
  );
};

const viewMeta: Record<LedgerView, { label: string; icon: typeof ListFilter }> = {
  transactions: { label: "Transactions", icon: ListFilter },
  subscriptions: { label: "Subscriptions", icon: Repeat },
  budgets: { label: "Budgets & Savings", icon: Target },
  weekly: { label: "Weekly Routine", icon: CalendarCheck },
  categories: { label: "Categories", icon: FolderTree },
};

const Ledger = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("view");
  const view: LedgerView = VALID_VIEWS.includes(requested as LedgerView)
    ? (requested as LedgerView)
    : "transactions";

  const setView = (next: string) => {
    setSearchParams(next === "transactions" ? {} : { view: next }, { replace: true });
  };

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ledger</h1>
          <p className="text-muted-foreground">
            {view === "transactions" && "Import, review, and organize every transaction."}
            {view === "subscriptions" && "Audit recurring subscriptions and memberships."}
            {view === "budgets" && "Plan budgets and track savings goals."}
            {view === "weekly" && "Log your weekly savings and debt snapshot."}
            {view === "categories" && "Organize categories into groups."}
          </p>
        </div>
      </div>

      <Tabs value={view} onValueChange={setView} className="space-y-6">
        <TabsList className="rounded-xl flex-wrap h-auto gap-1 p-1 bg-muted/50">
          {(Object.keys(viewMeta) as LedgerView[]).map((key) => {
            const meta = viewMeta[key];
            return (
              <TabsTrigger key={key} value={key} className="rounded-lg gap-2">
                <meta.icon className="w-4 h-4" />
                {meta.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="transactions" className="space-y-6 animate-fade-in">
          <Transactions />
        </TabsContent>
        <TabsContent value="subscriptions" className="space-y-6 animate-fade-in">
          <SubscriptionsView />
        </TabsContent>
        <TabsContent value="budgets" className="space-y-6 animate-fade-in">
          <BudgetsView />
        </TabsContent>
        <TabsContent value="weekly" className="space-y-6 animate-fade-in">
          <WeeklyLog />
        </TabsContent>
        <TabsContent value="categories" className="space-y-6 animate-fade-in">
          <CategoriesView />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Ledger;