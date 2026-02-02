"use client"

import Link from "next/link"
import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { 
  ChevronDown, 
  ChevronRight,
  Building2, 
  User, 
  Sparkles, 
  ImageIcon, 
  Library,
  Lightbulb, 
  LayoutDashboard, 
  Plus, 
  Settings, 
  Check,
  Search,
  Command,
  CreditCard,
  LogOut,
  UserCircle,
  Layout,
  BookOpen,
  Coins
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarGroupAction,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarInput,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { CreateAccountModal } from "@/components/create-account-modal"

const playgroundItems = [
  {
    title: "AI Image Creator",
    url: "/ai",
    icon: ImageIcon,
  },
  {
    title: "Strategy Creation",
    url: "/strategy",
    icon: Lightbulb,
    disabled: true,
  },
]

const profileItems = [
  {
    title: "Account",
    url: "/account",
    icon: User,
  },
  {
    title: "Billing",
    url: "/billing",
    icon: CreditCard,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
]

export function AppSidebar() {
  const [organizations, setOrganizations] = useState<any[]>([])
  const [currentOrg, setCurrentOrg] = useState<any>(null)
  const [accounts, setAccounts] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  const pathname = usePathname()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function loadSidebarData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }
      setUser(user)

      // Fetch organizations
      const { data: orgMembers } = await supabase
        .from('organization_members')
        .select('organizations(*)')
        .eq('profile_id', user.id)

      const orgs = orgMembers?.map(m => (m as any).organizations).filter(Boolean) || []
      setOrganizations(orgs)
      
      if (orgs.length > 0) {
        const activeOrg = orgs[0] as any
        setCurrentOrg(activeOrg)

        // Fetch accounts for active org
        const { data: accs } = await supabase
          .from('accounts')
          .select('*')
          .eq('organization_id', activeOrg.id)
        
        setAccounts(accs || [])
      }
      setLoading(false)
    }

    loadSidebarData()
  }, [supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return <Sidebar className="border-r border-zinc-700 bg-[#171717] backdrop-blur-xl" />

  return (
    <Sidebar className="border-r border-zinc-700 bg-[#171717] backdrop-blur-xl pt-12">
      <SidebarHeader className="px-3 pt-6 pb-3">
        <div className="flex items-center justify-center gap-2">
          <span className="text-base font-black tracking-tighter text-[#dbdbdb] uppercase">Posted</span>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2 gap-0.5">
        {/* Dashboard */}
        <SidebarGroup className="p-0.5 mt-4">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild
                  isActive={pathname === "/dashboard"}
                  tooltip="Dashboard"
                  className="h-8 px-2 rounded-md transition-all duration-300 hover:bg-zinc-800 active:scale-[0.98] data-[active=true]:bg-zinc-800/80 data-[active=true]:text-[#dbdbdb] data-[active=true]:shadow-sm data-[active=true]:before:opacity-0"
                >
                  <Link href="/dashboard">
                    <LayoutDashboard className={cn(
                      "size-[14px] transition-transform duration-300",
                      pathname === "/dashboard" ? "text-[#dbdbdb]" : "text-[#dbdbdb]"
                    )} />
                    <span className={cn(
                      "font-bold tracking-tight text-[11px]",
                      pathname === "/dashboard" ? "text-[#dbdbdb]" : "text-[#dbdbdb]"
                    )}>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild
                  isActive={pathname === "/templates"}
                  tooltip="Templates"
                  className="h-8 px-2 rounded-md transition-all duration-300 hover:bg-zinc-800 active:scale-[0.98] data-[active=true]:bg-zinc-800/80 data-[active=true]:text-[#dbdbdb] data-[active=true]:shadow-sm data-[active=true]:before:opacity-0"
                >
                  <Link href="/templates">
                    <Layout className={cn(
                      "size-[14px] transition-transform duration-300 group-hover:scale-110",
                      pathname === "/templates" ? "text-[#dbdbdb]" : "text-[#dbdbdb]"
                    )} />
                    <span className={cn(
                      "font-bold tracking-tight text-[11px]",
                      pathname === "/templates" ? "text-[#dbdbdb]" : "text-[#dbdbdb]"
                    )}>Templates</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild
                  isActive={pathname === "/collections"}
                  tooltip="Collections"
                  className="h-8 px-2 rounded-md transition-all duration-300 hover:bg-zinc-800 active:scale-[0.98] data-[active=true]:bg-zinc-800/80 data-[active=true]:text-[#dbdbdb] data-[active=true]:shadow-sm data-[active=true]:before:opacity-0"
                >
                  <Link href="/collections">
                    <Library className={cn(
                      "size-[14px] transition-transform duration-300",
                      pathname === "/collections" ? "text-[#dbdbdb]" : "text-[#dbdbdb]"
                    )} />
                    <span className={cn(
                      "font-bold tracking-tight text-[11px]",
                      pathname === "/collections" ? "text-[#dbdbdb]" : "text-[#dbdbdb]"
                    )}>Collections</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Accounts Section */}
        <SidebarGroup className="mt-0.5 p-0.5">
          <div className="flex items-center justify-between px-2 mb-1">
            <SidebarGroupLabel className="text-[8px] uppercase tracking-[0.1em] font-black text-[#dbdbdb]/60 h-auto p-0">Accounts</SidebarGroupLabel>
            {currentOrg?.id && (
              <CreateAccountModal 
                organizationId={currentOrg.id} 
                onAccountCreated={(newAccount) => setAccounts(prev => [...prev, newAccount])}
              >
                <button className="size-4 flex items-center justify-center rounded-md bg-zinc-800 hover:bg-[#ddfc7b] text-[#dbdbdb]/60 hover:text-[#171717] transition-all duration-300 border border-zinc-700 shadow-xs">
                  <Plus className="size-2" />
                </button>
              </CreateAccountModal>
            )}
          </div>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {accounts.length > 0 ? accounts.map((item) => {
                const url = `/accounts/${item.id}`
                const isActive = pathname?.startsWith(url)
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton 
                      asChild
                      isActive={isActive}
                      tooltip={item.name}
                      className="h-8 px-2 rounded-md transition-all duration-300 hover:bg-zinc-800 active:scale-[0.98] data-[active=true]:bg-zinc-800/80 data-[active=true]:text-[#dbdbdb] data-[active=true]:shadow-sm data-[active=true]:before:opacity-0"
                    >
                      <Link href={url}>
                        <UserCircle className={cn(
                          "size-[14px] transition-transform duration-300",
                          isActive ? "text-[#dbdbdb]" : "text-[#dbdbdb]"
                        )} />
                        <span className={cn(
                          "font-bold tracking-tight text-[11px]",
                          isActive ? "text-[#dbdbdb]" : "text-[#dbdbdb]"
                        )}>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              }) : (
                <div className="px-2 py-1.5 text-[8px] text-[#dbdbdb]/60 font-bold uppercase tracking-widest bg-zinc-800/50 rounded-md border border-dashed border-zinc-700 text-center">No accounts</div>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Playground Section */}
        <SidebarGroup className="mt-0.5 p-0.5">
          <SidebarGroupLabel className="text-[8px] uppercase tracking-[0.1em] font-black text-[#dbdbdb]/60 px-2 mb-1 h-auto p-0">Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {playgroundItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  {item.disabled ? (
                    <SidebarMenuButton 
                      disabled
                      tooltip={item.title}
                      className="h-8 px-2 rounded-md transition-all duration-300 opacity-50 cursor-not-allowed"
                    >
                      <item.icon className="size-[14px] text-[#dbdbdb]/40" />
                      <span className="font-bold tracking-tight text-[11px] text-[#dbdbdb]/40">{item.title}</span>
                    </SidebarMenuButton>
                  ) : (
                    <SidebarMenuButton 
                      asChild
                      isActive={pathname === item.url}
                      tooltip={item.title}
                      className="h-8 px-2 rounded-md transition-all duration-300 hover:bg-zinc-800 active:scale-[0.98] data-[active=true]:bg-zinc-800/80 data-[active=true]:text-[#dbdbdb] data-[active=true]:shadow-sm data-[active=true]:before:opacity-0"
                    >
                      <Link href={item.url}>
                        <item.icon className={cn(
                          "size-[14px] transition-transform duration-300",
                          pathname === item.url ? "text-[#dbdbdb]" : "text-[#dbdbdb]"
                        )} />
                        <span className={cn(
                          "font-bold tracking-tight text-[11px]",
                          pathname === item.url ? "text-[#dbdbdb]" : "text-[#dbdbdb]"
                        )}>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>
      
      <SidebarFooter className="p-2.5 space-y-2">
        {/* Tutorials */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              asChild
              isActive={pathname === "/tutorials"}
              tooltip="Tutorials"
              className="h-8 px-2 rounded-md transition-all duration-300 hover:bg-zinc-800 active:scale-[0.98] data-[active=true]:bg-zinc-800/80 data-[active=true]:text-[#dbdbdb] data-[active=true]:shadow-sm data-[active=true]:before:opacity-0"
            >
              <Link href="/tutorials">
                <BookOpen className={cn(
                  "size-[14px] transition-transform duration-300",
                  pathname === "/tutorials" ? "text-[#dbdbdb]" : "text-[#dbdbdb]"
                )} />
                <span className={cn(
                  "font-bold tracking-tight text-[11px]",
                  pathname === "/tutorials" ? "text-[#dbdbdb]" : "text-[#dbdbdb]"
                )}>Tutorials</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Credits Display */}
        <Link href="/billing">
          <div className="px-2 py-2 rounded-lg bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 transition-all duration-300 cursor-pointer group">
            <div className="flex items-center gap-2">
              <Coins className="size-3.5 text-[#ddfc7b]" />
              <div className="flex flex-col flex-1">
                <span className="text-[10px] font-bold text-[#dbdbdb]/60 uppercase tracking-wider">Credits</span>
                <span className="text-[14px] font-black text-[#ddfc7b]">1,000</span>
              </div>
              <ChevronRight className="size-3.5 text-[#dbdbdb]/40 group-hover:text-[#dbdbdb] transition-colors" />
            </div>
          </div>
        </Link>

        {/* Profile Dropdown */}
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton 
                  size="lg"
                  className="h-10 px-2 rounded-lg bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 transition-all duration-300 group data-[state=open]:bg-zinc-700 shadow-sm"
                >
                  <div className="flex aspect-square size-6 items-center justify-center rounded-full bg-[#ddfc7b] text-[#171717] font-bold text-[8px] ring-2 ring-zinc-700 shadow-sm transition-transform duration-300 group-hover:scale-105">
                    {user?.email?.substring(0, 2).toUpperCase() || "JD"}
                  </div>
                  <div className="flex flex-col flex-1 text-left ml-2 overflow-hidden">
                    <span className="truncate text-[11px] font-bold tracking-tight text-[#dbdbdb]">{user?.user_metadata?.full_name || user?.email?.split('@')[0] || "User Account"}</span>
                    <span className="truncate text-[8px] text-[#dbdbdb]/60 font-black uppercase tracking-wider">{user?.email}</span>
                  </div>
                  <ChevronDown className="size-2.5 text-[#dbdbdb]/60 transition-transform duration-300 group-data-[state=open]:rotate-180" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-xl bg-zinc-800 p-1 shadow-[0_10px_30px_rgba(0,0,0,0.5)] border-zinc-700 backdrop-blur-xl"
                side="top"
                align="end"
                sideOffset={12}
              >
                <div className="px-2 py-2.5 flex items-center gap-3">
                  <div className="size-9 rounded-full bg-[#ddfc7b] text-[#171717] flex items-center justify-center text-[10px] font-bold shadow-sm">
                    {user?.email?.substring(0, 2).toUpperCase() || "JD"}
                  </div>
                  <div className="flex flex-col leading-tight">
                    <span className="text-[12px] font-black text-[#dbdbdb]">{user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Account"}</span>
                    <span className="text-[8px] font-bold text-[#dbdbdb]/60 uppercase tracking-wider">Free Member</span>
                  </div>
                </div>
                <DropdownMenuSeparator className="mx-1 mb-1 bg-zinc-700" />
                {profileItems.map((item) => (
                  <DropdownMenuItem 
                    key={item.title} 
                    asChild
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer transition-all focus:bg-zinc-700"
                  >
                    <Link href={item.url}>
                      <item.icon className="size-3.5 text-[#dbdbdb]/60" />
                      <span className="text-[12px] font-bold text-[#dbdbdb]">{item.title}</span>
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator className="mx-1 my-1 bg-zinc-700" />
                <DropdownMenuItem 
                  onClick={handleSignOut}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer text-red-400 transition-all focus:bg-red-900/20"
                >
                  <LogOut className="size-3.5" />
                  <span className="text-[12px] font-bold">Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
