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
  Coins,
  MessageSquare,
  Send,
  HelpCircle,
  LayoutGrid,
  Brain,
  Target,
  FileText,
  Users,
  Zap,
  Globe,
  BarChart3
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
import { OrganizationSelect } from "@/components/organization-select";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Kbd } from "@/components/ui/kbd"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"

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
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null)
  const currentOrg = useMemo(() => 
    organizations.find(org => org.id === currentOrgId) || organizations[0]
  , [organizations, currentOrgId])
  const [accounts, setAccounts] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  const [open, setOpen] = useState(false)
  const [helpText, setHelpText] = useState("")
  const [showPostForMe, setShowPostForMe] = useState(false)
  const [numAccounts, setNumAccounts] = useState([5])
  const [feedbackText, setFeedbackText] = useState("")
  const [mounted, setMounted] = useState(false)

  const pathname = usePathname()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    setMounted(true)
  }, [])

  // Listen for credits updates from other components
  useEffect(() => {
    const handleCreditsUpdate = (event: CustomEvent<{ credits: number; organizationId: string }>) => {
      const { credits, organizationId } = event.detail
      setOrganizations(prev => prev.map(org => 
        org.id === organizationId ? { ...org, credits } : org
      ))
    }

    window.addEventListener('credits-updated', handleCreditsUpdate as EventListener)
    return () => {
      window.removeEventListener('credits-updated', handleCreditsUpdate as EventListener)
    }
  }, [])

  const navigate = (path: string) => {
    router.push(path)
    setOpen(false)
  }

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  useEffect(() => {
    async function loadAccounts() {
      if (!currentOrgId) return
      
      const { data: accs } = await supabase
        .from('accounts')
        .select('*')
        .eq('organization_id', currentOrgId)
      
      setAccounts(accs || [])
    }
    
    loadAccounts()
  }, [currentOrgId, supabase])

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
        setCurrentOrgId(activeOrg.id)

        // Set up real-time subscription for credits
        const channel = supabase
          .channel('org-credits')
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'organizations'
            },
            (payload) => {
              setOrganizations(prev => prev.map(org => 
                org.id === payload.new.id ? { ...org, credits: payload.new.credits } : org
              ))
            }
          )
          .subscribe()

        setLoading(false)
        
        return () => {
          supabase.removeChannel(channel)
        }
      }
      
      setLoading(false)
    }

    loadSidebarData()
  }, [supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return <Sidebar className="bg-[#171717] backdrop-blur-xl" />

  return (
    <>
      <Sidebar className="bg-[#171717] backdrop-blur-xl">
        <SidebarHeader className="px-3 pt-6 pb-2 space-y-3">
          <div className="px-1 pb-2">
            <OrganizationSelect 
              organizations={organizations}
              currentOrg={currentOrg}
              onOrgChange={(org) => setCurrentOrgId(org.id)}
            />
          </div>

          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 px-2.5 py-1 text-[#dbdbdb]/60 hover:text-[#dbdbdb] bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 rounded-lg transition-all group w-full"
          >
            <Search className="size-3.5" />
            <span className="text-[11px] font-medium flex-1 text-left">Search...</span>
            <Kbd className="bg-zinc-700/50 border-zinc-600/50 text-[#dbdbdb] text-[10px] px-1.5 py-0">⌘K</Kbd>
          </button>
        </SidebarHeader>
        <SidebarContent className="px-2 gap-0.5">
          {/* Dashboard */}
          <SidebarGroup className="p-0.5 mt-2">
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
          <div className="flex gap-2 mb-2 w-full">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="flex-1 h-8 p-0 text-[#dbdbdb]/60 hover:text-[#dbdbdb] hover:bg-zinc-800 border border-zinc-700/50 rounded-lg"
                >
                  <MessageSquare className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="right" className="w-80 p-3 rounded-xl shadow-xl border-zinc-700 bg-zinc-800 ml-2">
                <div className="space-y-2">
                  <div className="space-y-0.5">
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-[#dbdbdb]/60">Feedback</h4>
                    <p className="text-[10px] text-[#dbdbdb]/80">Help us improve by sharing your thoughts.</p>
                  </div>
                  <div className="space-y-2">
                    <textarea
                      className="w-full h-16 bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs text-[#dbdbdb] focus:outline-none focus:ring-1 focus:ring-[#ddfc7b] resize-none"
                      placeholder="What can we do better?"
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                    />
                    <Button 
                      className="w-full bg-[#ddfc7b] hover:bg-[#ddfc7b]/90 text-[#171717] font-black uppercase tracking-widest text-[10px] h-7"
                      onClick={async () => {
                        if (feedbackText) {
                          try {
                            await fetch("/api/feedback", {
                              method: "POST",
                              body: JSON.stringify({
                                message: feedbackText,
                                type: "Feedback",
                                userEmail: user?.email,
                              }),
                            })
                            setFeedbackText("")
                          } catch (error) {
                            console.error("Failed to send feedback:", error)
                          }
                        }
                      }}
                    >
                      Submit Feedback
                    </Button>
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex-1 h-8 p-0 text-[#dbdbdb]/60 hover:text-[#dbdbdb] hover:bg-zinc-800 border border-zinc-700/50 rounded-lg font-bold text-sm">
                  ?
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="right" className="w-64 p-3 rounded-xl shadow-xl border-zinc-700 bg-zinc-800 ml-2">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-[#dbdbdb]/60">Need help?</h4>
                    <p className="text-xs text-[#dbdbdb]/80">Send us a message and we'll get back to you.</p>
                  </div>
                  <div className="relative">
                    <Input
                      placeholder="Describe your issue..."
                      value={helpText}
                      onChange={(e) => setHelpText(e.target.value)}
                      className="pr-10 text-xs h-9 rounded-lg border-zinc-700 bg-zinc-900 text-[#dbdbdb] focus-visible:ring-[#ddfc7b]"
                    />
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="absolute right-1 top-1 size-7 text-[#dbdbdb]/60 hover:text-[#dbdbdb]"
                      onClick={async () => {
                        if (helpText) {
                          try {
                            await fetch("/api/feedback", {
                              method: "POST",
                              body: JSON.stringify({
                                message: helpText,
                                type: "Help Request",
                                userEmail: user?.email,
                              }),
                            })
                            setHelpText("")
                          } catch (error) {
                            console.error("Failed to send help request:", error)
                          }
                        }
                      }}
                    >
                      <Send className="size-3.5" />
                    </Button>
                  </div>
                  <div className="h-px bg-zinc-700" />
                  <DropdownMenuItem asChild className="text-xs font-medium rounded-lg cursor-pointer text-[#dbdbdb]">
                    <Link href="/tutorials">Tutorials</Link>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button 
              variant="ghost" 
              size="sm" 
              asChild
              className="flex-1 h-8 p-0 text-[#dbdbdb]/60 hover:text-[#dbdbdb] hover:bg-zinc-800 border border-zinc-700/50 rounded-lg data-[active=true]:bg-zinc-800/80 data-[active=true]:text-[#dbdbdb]"
            >
              <Link href="/tutorials">
                <BookOpen className={cn(
                  "size-3.5 transition-transform duration-300",
                  pathname === "/tutorials" ? "text-[#dbdbdb]" : "text-[#dbdbdb]/60"
                )} />
              </Link>
            </Button>
          </div>

          {/* Credits Display */}
          <Link href="/billing">
            <div className="px-2 py-2 rounded-lg bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 transition-all duration-300 cursor-pointer group">
              <div className="flex items-center gap-2">
                <Coins className="size-3.5 text-[#ddfc7b]" />
                <div className="flex flex-col flex-1">
                <span className="text-[10px] font-bold text-[#dbdbdb]/60 uppercase tracking-wider">Credits</span>
                <span className="text-[14px] font-black text-[#ddfc7b]">{currentOrg?.credits?.toLocaleString() || 0}</span>
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

          {/* Automate Posting Button */}
          <Button 
            className="w-full h-7 bg-[#ddfc7b] hover:bg-[#ddfc7b]/90 text-[#171717] rounded-lg gap-2 shadow-sm transition-all active:scale-95 group"
            onClick={() => setShowPostForMe(true)}
          >
            <Sparkles className="size-3.5 group-hover:animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest">Automate Posting</span>
          </Button>
        </SidebarFooter>
      </Sidebar>

      {/* Dialogs and Command Palettes */}
      {mounted && (
        <CommandDialog open={open} onOpenChange={setOpen}>
          <CommandInput placeholder="Type a command or search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Suggestions">
              <CommandItem className="gap-2 cursor-pointer" onSelect={() => navigate("/dashboard")}>
                <LayoutGrid className="size-4" />
                <span>Go to Dashboard</span>
              </CommandItem>
              <CommandItem className="gap-2 cursor-pointer" onSelect={() => navigate("/accounts")}>
                <Users className="size-4" />
                <span>Manage Accounts</span>
              </CommandItem>
              <CommandItem className="gap-2 cursor-pointer" onSelect={() => navigate("/templates")}>
                <FileText className="size-4" />
                <span>Content Templates</span>
              </CommandItem>
              <CommandItem className="gap-2 cursor-pointer" onSelect={() => navigate("/ai")}>
                <Brain className="size-4" />
                <span>AI Generation</span>
              </CommandItem>
            </CommandGroup>
            <CommandGroup heading="Workspace">
              <CommandItem className="gap-2 cursor-pointer" onSelect={() => navigate("/strategy")}>
                <Target className="size-4" />
                <span>Marketing Strategy</span>
              </CommandItem>
              <CommandItem className="gap-2 cursor-pointer" onSelect={() => navigate("/collections")}>
                <LayoutGrid className="size-4" />
                <span>Collections</span>
              </CommandItem>
              <CommandItem className="gap-2 cursor-pointer" onSelect={() => navigate("/sophia-1")}>
                <Sparkles className="size-4" />
                <span>Sophia-1</span>
              </CommandItem>
            </CommandGroup>
            <CommandGroup heading="Settings">
              <CommandItem className="gap-2 cursor-pointer" onSelect={() => navigate("/settings")}>
                <Settings className="size-4" />
                <span>Settings</span>
              </CommandItem>
              <CommandItem className="gap-2 cursor-pointer" onSelect={() => navigate("/billing")}>
                <CreditCard className="size-4" />
                <span>Billing & Plan</span>
              </CommandItem>
              <CommandItem className="gap-2 cursor-pointer" onSelect={() => navigate("/help")}>
                <HelpCircle className="size-4" />
                <span>Help & Support</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </CommandDialog>
      )}

      {/* Post For Me Modal */}
      <Dialog open={showPostForMe} onOpenChange={setShowPostForMe}>
        <DialogContent className="sm:max-w-[600px] bg-[#171717] border-zinc-700 text-[#dbdbdb] p-0 overflow-hidden">
          <div className="bg-[#ddfc7b] p-6 text-[#171717]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter leading-none mb-2">
                We Post For You
              </DialogTitle>
              <DialogDescription className="text-[#171717]/80 font-medium">
                Professional content management and growth for your niche.
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="mt-1 bg-zinc-800 p-1.5 rounded-md border border-zinc-700">
                    <Zap className="size-3.5 text-[#ddfc7b]" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#dbdbdb]">Warm-up Included</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">Account warm-up in your specific niche.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 bg-zinc-800 p-1.5 rounded-md border border-zinc-700">
                    <Globe className="size-3.5 text-[#ddfc7b]" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#dbdbdb]">Content Distribution</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">Maximum 2 high-quality posts per day.</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="mt-1 bg-zinc-800 p-1.5 rounded-md border border-zinc-700">
                    <BarChart3 className="size-3.5 text-[#ddfc7b]" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#dbdbdb]">Detailed Metrics</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">Audience location, age, and post performance.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 bg-zinc-800 p-1.5 rounded-md border border-zinc-700">
                    <LayoutGrid className="size-3.5 text-[#ddfc7b]" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#dbdbdb]">Performance Dashboard</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">See everything in one place in real-time.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="h-px bg-zinc-800" />

            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Number of Accounts</p>
                  <p className="text-2xl font-black text-[#dbdbdb]">{numAccounts[0]}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-baseline gap-2 justify-end mb-1">
                    <p className="text-lg font-black text-[#ddfc7b]">€600</p>
                    <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-tighter">per account</p>
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Price per Month</p>
                  <p className="text-2xl font-black text-[#ddfc7b]">€{(numAccounts[0] * 600).toLocaleString()}</p>
                </div>
              </div>
              
              <Slider
                value={numAccounts}
                onValueChange={setNumAccounts}
                min={1}
                max={75}
                step={1}
                className="py-4 shadow-none"
              />
              
              <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">
                <span>1 Account</span>
                <span>75 Accounts</span>
              </div>
            </div>

            <Button 
              className={numAccounts[0] < 3 
                ? "w-full bg-zinc-700 hover:bg-zinc-700 text-zinc-500 font-black uppercase tracking-widest text-sm h-12 cursor-not-allowed" 
                : "w-full bg-[#ddfc7b] hover:bg-[#ddfc7b]/90 text-[#171717] font-black uppercase tracking-widest text-sm h-12"
              }
              disabled={numAccounts[0] < 3}
            >
              Request Demo
            </Button>
            
            <p className="text-[10px] text-center text-zinc-500 font-medium">
              *600€ per account per month. Minimum 3 accounts.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
