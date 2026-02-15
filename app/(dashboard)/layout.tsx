"use client"

import { SidebarProvider, SidebarInset, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { OrganizationGuard } from "@/components/organization-guard";
import { SubscriptionGuard } from "@/components/subscription-guard";
import { PanelLeft } from "lucide-react";

import { usePathname } from "next/navigation";

function SidebarExpandButton() {
  const { state, toggleSidebar } = useSidebar();

  if (state === "expanded") return null;

  return (
    <button
      onClick={toggleSidebar}
      className="fixed top-4 left-4 z-50 size-8 flex items-center justify-center rounded-lg bg-zinc-800 border border-zinc-700 text-[#dbdbdb]/60 hover:text-[#dbdbdb] hover:bg-zinc-700 transition-all shadow-md"
    >
      <PanelLeft className="size-4" />
    </button>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isSubscribePage = pathname === "/subscribe";

  return (
    <SidebarProvider>
      <OrganizationGuard>
        <SubscriptionGuard>
          <div className="flex w-full min-h-screen bg-[#171717]">
            {!isSubscribePage && <AppSidebar />}
            {!isSubscribePage && <SidebarExpandButton />}
            <SidebarInset className="bg-[#171717] flex flex-col min-w-0">
              <div className="flex-1 my-2 mr-2 rounded-2xl bg-[#1f1f1f] border border-zinc-800/40 shadow-sm overflow-hidden relative">
                <div className="absolute inset-0 overflow-y-auto">
                  <div className="flex flex-col p-8 min-h-full">
                    <div className={isSubscribePage ? "max-w-4xl mx-auto w-full" : "max-w-7xl mx-auto w-full"}>
                      {children}
                    </div>
                  </div>
                </div>
              </div>
            </SidebarInset>
          </div>
        </SubscriptionGuard>
      </OrganizationGuard>
    </SidebarProvider>
  );
}
