"use client";

import { ArrowLeft, BarChart3, Building2, Camera, Home, LayoutGrid, Plus, Radio, Star, Users } from "lucide-react";
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
import { type FormSlug, formHref, partnerHref, usePartnerRouteId } from "@/hooks/use-partner-route";
import { usePartner } from "@/hooks/use-school-lookup";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

const FORMS: { slug: FormSlug; label: string; icon: NavItem["icon"] }[] = [
  { slug: "enrollment", label: "1 · Enrollment", icon: LayoutGrid },
  { slug: "contact-info", label: "2 · Contact Info", icon: Users },
  { slug: "headcounts", label: "3 · Headcounts", icon: BarChart3 },
  { slug: "sl-selection", label: "4 · SL Selection", icon: Star },
  { slug: "kits", label: "5 · Kit Handover", icon: Radio },
];

/** Form links scoped to a partner, or the partner-less routes (school role) when there is none. */
function formsNav(partnerId?: string): NavItem[] {
  return FORMS.map((form) => ({ href: formHref(form.slug, partnerId), label: form.label, icon: form.icon }));
}

const INQUIBUDDY_NAV: NavItem = { href: "/dashboard/inquibuddy", label: "InquiBuddy", icon: Camera };

function insightsNav(partnerId?: string): NavItem[] {
  return [INQUIBUDDY_NAV, { href: formHref("observations", partnerId), label: "Observations", icon: BarChart3 }];
}

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

function PartnerHeader({ partnerId }: { partnerId: string }) {
  const { partner } = usePartner(partnerId);

  return (
    <div className="space-y-1 px-2 pt-1">
      <Link
        href="/dashboard"
        className="flex items-center gap-1 text-xs text-white/60 hover:text-white"
      >
        <ArrowLeft className="size-3" /> All partners
      </Link>
      <p className="truncate text-sm font-semibold text-white">{partner?.name ?? "Partner"}</p>
    </div>
  );
}

export function AppSidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const partnerId = usePartnerRouteId();
  const isSchool = role === "school";

  return (
    <Sidebar className="border-0">
      <SidebarHeader className="p-3">
        <div className="flex items-center gap-2 rounded-xl bg-white px-2.5 py-2 shadow-sm">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-coral" aria-hidden>
            <Plus className="size-4 text-white" />
          </span>
          <p className="text-sm font-bold text-brand-teal">Think &amp; Make</p>
        </div>
        {partnerId && <PartnerHeader partnerId={partnerId} />}
      </SidebarHeader>
      <SidebarContent>
        {isSchool ? (
          <>
            <NavGroup items={[{ href: "/dashboard", label: "Dashboard", icon: Home }]} pathname={pathname} />
            <NavGroup label="Forms" items={formsNav()} pathname={pathname} />
            <NavGroup label="Insights" items={insightsNav()} pathname={pathname} />
          </>
        ) : partnerId ? (
          <>
            <NavGroup items={[{ href: partnerHref(partnerId), label: "Dashboard", icon: Home }]} pathname={pathname} />
            <NavGroup label="Forms" items={formsNav(partnerId)} pathname={pathname} />
            <NavGroup label="Insights" items={insightsNav(partnerId)} pathname={pathname} />
          </>
        ) : (
          <>
            <NavGroup items={[{ href: "/dashboard", label: "Partners", icon: Building2 }]} pathname={pathname} />
            <NavGroup label="Insights" items={[INQUIBUDDY_NAV]} pathname={pathname} />
          </>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
