import type { LucideIcon } from "lucide-react";
import { BarChart3, ClipboardList, Eye, Home, Package, Star, Users } from "lucide-react";

export type DashboardCard = {
  slug: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  highlighted?: boolean;
};

export const DASHBOARD_CARDS: DashboardCard[] = [
  { slug: "schools", title: "School Enrollment", subtitle: "Visit data, infra, principal details", icon: ClipboardList },
  { slug: "schools", title: "Schools Contact Info", subtitle: "Principal, teachers, session schedule", icon: Home },
  { slug: "headcounts", title: "Students Count Info", subtitle: "SL / cluster / team / student totals", icon: Users },
  { slug: "sl-selection", title: "SL Selection Assessment", subtitle: "Student Leader selection per section", icon: Star },
  { slug: "kits", title: "Kits Handover Info", subtitle: "Kit delivery & acknowledgement", icon: Package },
  { slug: "reports", title: "School Dashboard", subtitle: "Form data status overview", icon: BarChart3 },
  { slug: "inquibuddy", title: "Inqui Buddy", subtitle: "Innovation Evaluator", icon: Star, highlighted: true },
  { slug: "observations", title: "Unit 1 Session Observations", subtitle: "Record session feedback", icon: Eye },
];
