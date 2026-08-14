"use client";

import React from "react";
import { Link, useLocation } from "react-router-dom";
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
import { LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { navGroups, footerNav, brandNav, isNavActive } from "@/lib/nav-config";
import { cn } from "@/lib/utils";

const AppSidebar = () => {
  const location = useLocation();
  const { session } = useAuth();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <Sidebar collapsible="icon" className="border-r bg-sidebar">
      <SidebarHeader className="p-6">
        <div className="flex items-center gap-3 px-2">
          <div className="p-2.5 bg-gradient-to-br from-primary to-indigo-600 rounded-xl text-white shadow-xl shadow-primary/20">
            <brandNav.icon className="w-6 h-6" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="font-bold tracking-tighter text-2xl leading-none">
              {brandNav.title}
            </span>
            <span className="text-xs font-semibold text-muted-foreground mt-1">
              {brandNav.subtitle}
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="px-4 text-xs font-semibold text-muted-foreground/60">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isNavActive(item.url, location.pathname, location.search)}
                      tooltip={item.title}
                      className="h-11 rounded-xl px-4"
                    >
                      <Link to={item.url} className="flex items-center gap-3">
                        <item.icon
                          className={cn(
                            "w-4 h-4",
                            isNavActive(item.url, location.pathname, location.search)
                              ? "text-primary"
                              : "text-muted-foreground"
                          )}
                        />
                        <span className="font-bold text-sm">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-4">
        <div className="px-4 py-3 rounded-2xl bg-muted/50 border group-data-[collapsible=icon]:hidden">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-muted-foreground">System Status</span>
          </div>
          <p className="text-[11px] font-medium leading-tight">All systems operational. Real-time sync enabled.</p>
        </div>

        <SidebarMenu>
          {footerNav.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={isNavActive(item.url, location.pathname, location.search)}
                tooltip={item.title}
                className="h-11 rounded-xl px-4"
              >
                <Link to={item.url} className="flex items-center gap-3">
                  <item.icon className="w-4 h-4 text-muted-foreground" />
                  <span className="font-bold text-sm">{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          <SidebarMenuItem>
            <div className="flex items-center gap-3 px-4 py-3 mb-2 group-data-[collapsible=icon]:hidden bg-primary/5 rounded-2xl border border-primary/10">
              <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center text-sm font-bold shadow-sm shadow-primary/20">
                {session?.user.email?.[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{session?.user.email?.split("@")[0]}</p>
                <p className="text-xs font-semibold opacity-70">Pro Member</p>
              </div>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut} className="h-11 rounded-xl px-4 text-danger hover:text-danger hover:bg-danger-bg">
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