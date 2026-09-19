import { auth } from "@/auth";
import { AppSidebar } from "@/components/app-sidebar";
import { SchoolSelectionProvider } from "@/components/forms/school-selection-context";
import { TopBar } from "@/components/top-bar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <TopBar role={session?.user.role ?? "school"} />
        <SchoolSelectionProvider>
          <div className="min-h-0 flex-1 bg-brand-bg">{children}</div>
        </SchoolSelectionProvider>
      </SidebarInset>
    </SidebarProvider>
  );
}
