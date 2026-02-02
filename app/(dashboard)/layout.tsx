"use client"

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { OrganizationGuard } from "@/components/organization-guard";
import { TopBar } from "@/components/top-bar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <OrganizationGuard>
        <TopBar />
        <div className="flex flex-col w-full min-h-screen pt-12">
          <div className="flex flex-1 overflow-hidden">
            <AppSidebar />
            <SidebarInset className="bg-[#1f1f1f]">
              <div className="flex flex-1 flex-col p-8 bg-[#1f1f1f]">
                <div className="max-w-7xl mx-auto w-full">
                  {children}
                </div>
              </div>
            </SidebarInset>
          </div>
        </div>
      </OrganizationGuard>
    </SidebarProvider>
  );
}
