import {
  LayoutDashboard,
  ListFilter,
  Settings,
  LogOut,
  Users,
  Brain,
  Table as TableIcon,
  TrendingUp,
  Calculator,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  title: string;
  icon: LucideIcon;
  url: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    label: "Main",
    items: [
      { title: "Dashboard", icon: LayoutDashboard, url: "/" },
      { title: "Ledger", icon: ListFilter, url: "/finance" },
      { title: "Contacts", icon: Users, url: "/contacts" },
      { title: "Insights", icon: Brain, url: "/insights" },
      { title: "Master Tracker", icon: TableIcon, url: "/master-tracker" },
      { title: "Performance", icon: TrendingUp, url: "/performance" },
      { title: "Tax Center", icon: Calculator, url: "/tax" },
    ],
  },
];

export const footerNav: NavItem[] = [
  { title: "Settings", icon: Settings, url: "/settings" },
];

export const brandNav = { title: "Vantage", subtitle: "Intelligent OS", icon: Sparkles };

export const isNavActive = (
  url: string,
  pathname: string,
  search?: string
): boolean => {
  const cleanUrl = url.split("?")[0];
  if (cleanUrl === "/") return pathname === "/";
  if (url.includes("?")) {
    return pathname === cleanUrl && search === `?${url.split("?")[1]}`;
  }
  return pathname === cleanUrl || pathname.startsWith(`${cleanUrl}/`);
};