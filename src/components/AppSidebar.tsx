"use client";

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import { 
  LayoutDashboard, 
  ListFilter, 
  Calculator, 
  PiggyBank, 
  Settings, 
  LogOut,
  TrendingUp,
  Target,
  CreditCard,
  Users,
  FileText,
  Briefcase,
  Package,
  Brain,
  ShieldCheck,
  Activity,
  Sparkles,
  CalendarRange,
  CalendarCheck,
  Repeat,
  Table as TableIcon
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { cn } from '@/lib/utils';

const AppSidebar = () => {
  const location = useLocation();
  const { session } = useAuth();

  const mainItems = [
    { title: "Dashboard", icon: LayoutDashboard, url: "/" },
    { title: "Master Tracker", icon: TableIcon, url: "/master-tracker" },
    { title: "Weekly Routine", icon: CalendarCheck, url: "/weekly-routine" },
    { title: "Time Glance", icon: CalendarRange, url: "/time-glance" },
    { title: "AI Insights", icon: Brain, url: "/insights" },
  ];

  const businessItems = [
    { title: "Clients", icon: Users, url: "/clients" },
    { title: "Invoices", icon: FileText, url: "/invoices" },
    { title: "Catalog", icon: Package, url: "/products" },
    { title: "Accountant Portal", icon: ShieldCheck, url: "/accountant-portal" },
    { title: "Tax Report", icon: Calculator, url: "/accountant-report" },
  ];

  const financeItems = [
    { title: "Transactions", icon: ListFilter, url: "/transactions" },
    { title: "Subscriptions", icon: Repeat, url: "/subscriptions" },
    { title: "Budgets", icon: Target, url: "/transactions?tab=planning" },
    { title: "Savings Goals", icon: PiggyBank, url: "/transactions?tab=planning" },
  ];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <Sidebar collapsible="icon" className="border-r bg-sidebar">
      <SidebarHeader className="p-6">
        <div className="flex items-center gap-3 px-2">
          <div className="p-2.5 bg-gradient-to-br from-primary to-indigo-600 rounded-2xl text-white shadow-xl shadow-primary/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="font-black tracking-tighter text-2xl leading-none">
              Vantage
            </span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Intelligent OS</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location.pathname === item.url}
                    tooltip={item.title}
                    className="h-11 rounded-xl px-4"
                  >
                    <Link to={item.url} className="flex items-center gap-3">
                      <item.icon className={cn("w-4 h-4", location.pathname === item.url ? "text-primary" : "text-muted-foreground")} />
                      <span className="font-bold text-sm">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Business</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {businessItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location.pathname === item.url}
                    tooltip={item.title}
                    className="h-11 rounded-xl px-4"
                  >
                    <Link to={item.url} className="flex items-center gap-3">
                      <item.icon className={cn("w-4 h-4", location.pathname === item.url ? "text-primary" : "text-muted-foreground")} />
                      <span className="font-bold text-sm">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Finance</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {financeItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location.pathname === item.url}
                    tooltip={item.title}
                    className="h-11 rounded-xl px-4"
                  >
                    <Link to={item.url} className="flex items-center gap-3">
                      <item.icon className={cn("w-4 h-4", location.pathname === item.url ? "text-primary" : "text-muted-foreground")} />
                      <span className="font-bold text-sm">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-4">
        <div className="px-4 py-3 rounded-2xl bg-muted/50 border group-data-[collapsible=icon]:hidden">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">System Status</span>
          </div>
          <p className="text-[11px] font-medium leading-tight">All systems operational. Data synced 1m ago.</p>
        </div>

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={location.pathname === '/settings'} tooltip="Settings" className="h-11 rounded-xl px-4">
              <Link to="/settings" className="flex items-center gap-3">
                <Settings className="w-4 h-4 text-muted-foreground" />
                <span className="font-bold text-sm">Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <div className="flex items-center gap-3 px-4 py-3 mb-2 group-data-[collapsible=icon]:hidden bg-primary/5 rounded-2xl border border-primary/10">
              <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center text-sm font-black shadow-lg shadow-primary/20">
                {session?.user.email?.[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black truncate">{session?.user.email?.split('@')[0]}</p>
                <p className="text-[9px] font-black text-primary uppercase tracking-widest">Pro Member</p>
              </div>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut} className="h-11 rounded-xl px-4 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30">
              <LogOut className="w-4 h-4" />
              <span className="font-bold text-sm">Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;