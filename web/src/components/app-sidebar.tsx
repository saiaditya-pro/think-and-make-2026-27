"use client";

import { BarChart3, Camera, Home, LayoutGrid, Plus, Radio, School, Star, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

export const PRIMARY_NAV: NavItem[] = [
  { href: "/dashboard/reports", label: "Dashboard", icon: Home },
  { href: "/dashboard/schools", label: "Schools", icon: School },
];

export const FORMS_NAV: NavItem[] = [
  { href: "/dashboard/schools/enrollment", label: "1 · Enrollment", icon: LayoutGrid },
  { href: "/dashboard/schools/contact-info", label: "2 · Contact Info", icon: Users },
  { href: "/dashboard/headcounts", label: "3 · Headcounts", icon: BarChart3 },
  { href: "/dashboard/sl-selection", label: "4 · SL Selection", icon: Star },
  { href: "/dashboard/kits", label: "5 · Kit Handover", icon: Radio },
];

export const KIT_NAV: NavItem = FORMS_NAV[4];

export const INSIGHTS_NAV: NavItem[] = [
  { href: "/dashboard/inquibuddy", label: "InquiBuddy", icon: Camera },
  { href: "/dashboard/observations", label: "Observations", icon: BarChart3 },
];

function NavGroup({ label, items, pathname }: { label?: string; items: NavItem[]; pathname: string }) {
  return (
    <SidebarGroup>
      {label && <SidebarGroupLabel className="text-white/50">{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const isActive = pathname === item.href;
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  render={<Link href={item.href as never} />}
                  isActive={isActive}
                  className="rounded-lg border-l-2 border-transparent text-white/80 hover:bg-white/10 hover:text-white data-active:border-brand-coral data-active:bg-white/10 data-active:font-semibold data-active:text-white"
                >
                  <item.icon className="size-4" />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar className="border-0">
      <SidebarHeader className="p-3">
        <div className="flex items-center gap-2 rounded-xl bg-white px-2.5 py-2 shadow-sm">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-coral" aria-hidden>
            <Plus className="size-4 text-white" />
          </span>
          <p className="text-sm font-bold text-brand-teal">Think &amp; Make</p>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavGroup items={PRIMARY_NAV} pathname={pathname} />
        <NavGroup label="Forms" items={FORMS_NAV} pathname={pathname} />
        <NavGroup label="Insights" items={INSIGHTS_NAV} pathname={pathname} />
      </SidebarContent>
    </Sidebar>
  );
}
