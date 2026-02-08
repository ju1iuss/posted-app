"use client"

import Image from "next/image"
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
  BarChart3,
  ArrowLeft
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
import { toast } from "sonner"
import { Label } from "@/components/ui/label"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

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

function SortableAccountItem({ 
  item, 
  isActive, 
  pathname,
  isSortable
}: { 
  item: any, 
  isActive: boolean, 
  pathname: string | null,
  isSortable: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: item.id,
    disabled: !isSortable
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    position: 'relative' as const,
  }

  const url = `/accounts/${item.id}`

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <SidebarMenuItem className="list-none">
        <SidebarMenuButton 
          asChild
          isActive={isActive}
          tooltip={item.username || item.name}
          className={cn(
            "h-8 px-2 rounded-md transition-all duration-300 hover:bg-zinc-800 active:scale-[0.98] data-[active=true]:bg-zinc-800/80 data-[active=true]:text-[#dbdbdb] data-[active=true]:shadow-sm data-[active=true]:before:opacity-0",
            isDragging && "bg-zinc-800 shadow-lg scale-[1.02] z-50",
            !isSortable && "cursor-pointer"
          )}
        >
          <Link href={url}>
            {item.metadata?.profile_picture ? (
              <div className="size-[14px] rounded-full overflow-hidden border border-zinc-700 flex-shrink-0">
                <Image
                  src={`/profiles/${item.metadata.profile_picture}`}
                  alt={item.username || item.name}
                  width={14}
                  height={14}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <UserCircle className={cn(
                "size-[14px] transition-transform duration-300 flex-shrink-0",
                isActive ? "text-[#dbdbdb]" : "text-[#dbdbdb]"
              )} />
            )}
            <span className={cn(
              "font-bold tracking-tight text-[11px]",
              isActive ? "text-[#dbdbdb]" : "text-[#dbdbdb]"
            )}>{item.username || item.name}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </div>
  )
}

export function AppSidebar() {
  const [organizations, setOrganizations] = useState<any[]>([])
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null)
  const currentOrg = useMemo(() => 
    organizations.find(org => org.id === currentOrgId) || organizations[0]
  , [organizations, currentOrgId])
  const [accounts, setAccounts] = useState<any[]>([])
  const [sortBy, setSortBy] = useState<'created' | 'name' | 'username' | 'own'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('accounts-sort-by')
      if (saved === 'created' || saved === 'name' || saved === 'username' || saved === 'own') {
        return saved
      }
    }
    return 'own'
  })
  const [user, setUser] = useState<any>(null)
  const [customOrder, setCustomOrder] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('accounts-custom-order')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch (e) {
          return []
        }
      }
    }
    return []
  })

  // Save sorting preference to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accounts-sort-by', sortBy)
    }
  }, [sortBy])

  // Save custom order to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accounts-custom-order', JSON.stringify(customOrder))
    }
  }, [customOrder])

  // Sync custom order with accounts
  useEffect(() => {
    if (accounts.length > 0) {
      const accountIds = accounts.map(a => a.id)
      const missingIds = accountIds.filter(id => !customOrder.includes(id))
      if (missingIds.length > 0) {
        setCustomOrder(prev => [...prev, ...missingIds])
      }
    }
  }, [accounts])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (active.id !== over?.id && sortBy === 'own') {
      setCustomOrder((items) => {
        const oldIndex = items.indexOf(active.id as string)
        const newIndex = items.indexOf(over?.id as string)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const sortedAccounts = useMemo(() => {
    const sorted = [...accounts]
    if (sortBy === 'name') {
      return sorted.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }))
    } else if (sortBy === 'username') {
      return sorted.sort((a, b) => (a.username || '').localeCompare(b.username || '', undefined, { sensitivity: 'base' }))
    } else if (sortBy === 'created') {
      return sorted.sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
        return bTime - aTime // Newest first
      })
    } else if (sortBy === 'own' && customOrder.length > 0) {
      // Sort based on customOrder array of IDs
      return sorted.sort((a, b) => {
        const aIndex = customOrder.indexOf(a.id)
        const bIndex = customOrder.indexOf(b.id)
        
        // If an item isn't in customOrder, put it at the end
        if (aIndex === -1 && bIndex === -1) return 0
        if (aIndex === -1) return 1
        if (bIndex === -1) return -1
        
        return aIndex - bIndex
      })
    }
    return sorted
  }, [accounts, sortBy, customOrder])
  const [loading, setLoading] = useState(true)
  
  const [open, setOpen] = useState(false)
  const [helpText, setHelpText] = useState("")
  const [showPostForMe, setShowPostForMe] = useState(false)
  const [numAccounts, setNumAccounts] = useState([5])
  const [feedbackText, setFeedbackText] = useState("")
  const [mounted, setMounted] = useState(false)
  
  // Create Organization State
  const [isCreateOrgModalOpen, setIsCreateOrgModalOpen] = useState(false)
  const [orgModalView, setOrgModalView] = useState<'choice' | 'create' | 'join'>('choice')
  const [newOrgName, setNewOrgName] = useState("")
  const [inviteCode, setInviteCode] = useState("")
  const [creatingOrg, setCreatingOrg] = useState(false)

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

  // Listen for account updates from other components
  useEffect(() => {
    const handleAccountUpdate = (event: CustomEvent<{ id: string; username?: string; name?: string }>) => {
      const { id, username, name } = event.detail
      setAccounts(prev => prev.map(acc => 
        acc.id === id ? { ...acc, ...(username && { username }), ...(name && { name }) } : acc
      ))
    }

    window.addEventListener('account-updated', handleAccountUpdate as EventListener)
    return () => {
      window.removeEventListener('account-updated', handleAccountUpdate as EventListener)
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

  const handleJoinOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteCode.trim()) return
    setCreatingOrg(true)

    try {
      // For now, show a message that they need an invite
      toast.info("Ask your team admin to invite you to their workspace.")
      setIsCreateOrgModalOpen(false)
      setOrgModalView('choice')
      setInviteCode("")
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || "Failed to join workspace")
    } finally {
      setCreatingOrg(false)
    }
  }

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newOrgName.trim()) return
    setCreatingOrg(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("No user found")

      // 1. Create organization
      const slug = newOrgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({ name: newOrgName.trim(), slug: `${slug}-${Date.now()}` })
        .select()
        .single()

      if (orgError) throw orgError

      // 2. Add user as owner
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: org.id,
          profile_id: user.id,
          role: 'owner'
        })

      if (memberError) throw memberError

      // 3. Refresh organizations list
      const { data: orgMembers } = await supabase
        .from('organization_members')
        .select('organizations(*)')
        .eq('profile_id', user.id)

      const orgs = orgMembers?.map(m => (m as any).organizations).filter(Boolean) || []
      setOrganizations(orgs)
      
      // 4. Set new org as current
      if (orgs.length > 0) {
        const newOrg = orgs.find((o: any) => o.id === org.id) || orgs[0]
        setCurrentOrgId(newOrg.id)
      }

      toast.success("Workspace created successfully!")
      setIsCreateOrgModalOpen(false)
      setOrgModalView('choice')
      setNewOrgName("")
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || "Failed to create workspace")
    } finally {
      setCreatingOrg(false)
    }
  }

  if (loading) return <Sidebar className="bg-[#171717] backdrop-blur-xl" />

  return (
    <>
      <Sidebar className="bg-[#171717] backdrop-blur-xl">
        <SidebarHeader className="px-3 pt-6 pb-2 space-y-4">
          <div className="flex items-center gap-3 px-2 mb-2">
            <div className="size-8 rounded-lg overflow-hidden border border-zinc-700/50 flex-shrink-0 shadow-sm">
              <Image 
                src="/logo.svg" 
                alt="Posted" 
                width={32} 
                height={32}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-lg font-black tracking-tighter text-[#dbdbdb] uppercase">Posted</span>
          </div>

          <div className="px-1 pb-2">
            <OrganizationSelect 
              organizations={organizations}
              currentOrg={currentOrg}
              onOrgChange={(org) => setCurrentOrgId(org.id)}
              onCreateOrg={() => setIsCreateOrgModalOpen(true)}
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
            <div className="flex items-center justify-between px-2 mb-1 gap-1">
              <SidebarGroupLabel className="text-[8px] uppercase tracking-[0.1em] font-black text-[#dbdbdb]/60 h-auto p-0 flex-1">Accounts</SidebarGroupLabel>
              <div className="flex items-center gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="size-4 flex items-center justify-center rounded-md bg-zinc-800 hover:bg-zinc-700 text-[#dbdbdb]/40 hover:text-[#dbdbdb] transition-all duration-300 border border-zinc-700 shadow-xs">
                      <ChevronDown className="size-2" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-32 bg-zinc-900 border-zinc-800 p-1">
                    <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-widest text-[#dbdbdb]/40 px-2 py-1.5">Sort by</DropdownMenuLabel>
                    <DropdownMenuItem 
                      onClick={() => setSortBy('own')}
                      className={cn(
                        "text-[10px] font-bold px-2 py-1.5 rounded-sm focus:bg-zinc-800 focus:text-[#dbdbdb] cursor-pointer flex items-center justify-between",
                        sortBy === 'own' ? "text-[#ddfc7b]" : "text-[#dbdbdb]/60"
                      )}
                    >
                      <span>Own</span>
                      {sortBy === 'own' && <Check className="size-2.5" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setSortBy('created')}
                      className={cn(
                        "text-[10px] font-bold px-2 py-1.5 rounded-sm focus:bg-zinc-800 focus:text-[#dbdbdb] cursor-pointer flex items-center justify-between",
                        sortBy === 'created' ? "text-[#ddfc7b]" : "text-[#dbdbdb]/60"
                      )}
                    >
                      <span>Created</span>
                      {sortBy === 'created' && <Check className="size-2.5" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setSortBy('name')}
                      className={cn(
                        "text-[10px] font-bold px-2 py-1.5 rounded-sm focus:bg-zinc-800 focus:text-[#dbdbdb] cursor-pointer flex items-center justify-between",
                        sortBy === 'name' ? "text-[#ddfc7b]" : "text-[#dbdbdb]/60"
                      )}
                    >
                      <span>Alphabetical</span>
                      {sortBy === 'name' && <Check className="size-2.5" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => setSortBy('username')}
                      className={cn(
                        "text-[10px] font-bold px-2 py-1.5 rounded-sm focus:bg-zinc-800 focus:text-[#dbdbdb] cursor-pointer flex items-center justify-between",
                        sortBy === 'username' ? "text-[#ddfc7b]" : "text-[#dbdbdb]/60"
                      )}
                    >
                      <span>Username</span>
                      {sortBy === 'username' && <Check className="size-2.5" />}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

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
            </div>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {sortedAccounts.length > 0 ? (
                  <DndContext 
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext 
                      items={sortedAccounts.map(a => a.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {sortedAccounts.map((item) => {
                        const url = `/accounts/${item.id}`
                        const isActive = pathname?.startsWith(url)
                        return (
                          <SortableAccountItem 
                            key={item.id} 
                            item={item} 
                            isActive={isActive} 
                            pathname={pathname}
                            isSortable={sortBy === 'own'}
                          />
                        )
                      })}
                    </SortableContext>
                  </DndContext>
                ) : (
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
              asChild
              className={numAccounts[0] < 3 
                ? "w-full bg-zinc-700 hover:bg-zinc-700 text-zinc-500 font-black uppercase tracking-widest text-sm h-12 cursor-not-allowed" 
                : "w-full bg-[#ddfc7b] hover:bg-[#ddfc7b]/90 text-[#171717] font-black uppercase tracking-widest text-sm h-12"
              }
              disabled={numAccounts[0] < 3}
            >
              <Link 
                href={`https://cal.com/juliuss/20min?overlayCalendar=true&notes=${encodeURIComponent(`Requesting demo for ${numAccounts[0]} account${numAccounts[0] > 1 ? 's' : ''}`)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Request Demo
              </Link>
            </Button>
            
            <p className="text-[10px] text-center text-zinc-500 font-medium">
              *600€ per account per month. Minimum 3 accounts.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create/Join Organization Dialog */}
      <Dialog open={isCreateOrgModalOpen} onOpenChange={(open) => {
        setIsCreateOrgModalOpen(open)
        if (!open) {
          setOrgModalView('choice')
          setNewOrgName("")
          setInviteCode("")
        }
      }}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl border-zinc-700 bg-zinc-800 [&>button]:hidden">
          {orgModalView === 'choice' && (
            <>
              <DialogHeader className="space-y-4">
                <div className="flex justify-center">
                  <div className="size-16 rounded-2xl overflow-hidden border border-zinc-700/50 shadow-lg">
                    <Image 
                      src="/logo.svg" 
                      alt="Posted" 
                      width={64} 
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div className="space-y-1 text-center">
                  <DialogTitle className="text-xl font-bold tracking-tight text-[#dbdbdb]">Get Started</DialogTitle>
                  <DialogDescription className="text-[#dbdbdb]/60">
                    Create a new workspace or join an existing one to start creating content.
                  </DialogDescription>
                </div>
              </DialogHeader>
              <div className="grid gap-3 py-6">
                <Button 
                  onClick={() => setOrgModalView('create')}
                  className="w-full h-14 bg-[#ddfc7b] text-[#171717] hover:bg-[#ddfc7b]/90 transition-all font-semibold rounded-xl flex items-center justify-start px-4 gap-4"
                >
                  <div className="size-10 rounded-lg overflow-hidden border border-[#171717]/10 flex items-center justify-center">
                    <Image 
                      src="/logo.svg" 
                      alt="Posted" 
                      width={40} 
                      height={40}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">Create Workspace</div>
                    <div className="text-xs text-[#171717]/60 font-normal">Start fresh with your own team</div>
                  </div>
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setOrgModalView('join')}
                  className="w-full h-14 border-zinc-700 hover:bg-zinc-700 transition-all font-semibold rounded-xl flex items-center justify-start px-4 gap-4 bg-zinc-800 text-[#dbdbdb]"
                >
                  <div className="size-10 rounded-lg bg-zinc-700 flex items-center justify-center">
                    <Users className="size-5 text-[#dbdbdb]" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-[#dbdbdb]">Join Workspace</div>
                    <div className="text-xs text-[#dbdbdb]/60 font-normal">You've been invited to a team</div>
                  </div>
                </Button>
              </div>
            </>
          )}

          {orgModalView === 'create' && (
            <form onSubmit={handleCreateOrg}>
              <DialogHeader className="space-y-4">
                <button 
                  type="button"
                  onClick={() => setOrgModalView('choice')}
                  className="absolute left-4 top-4 p-2 rounded-lg hover:bg-zinc-700 transition-colors text-[#dbdbdb]"
                >
                  <ArrowLeft className="size-4" />
                </button>
                <div className="flex justify-center">
                  <div className="size-16 rounded-2xl overflow-hidden border border-zinc-700/50 shadow-lg">
                    <Image 
                      src="/logo.svg" 
                      alt="Posted" 
                      width={64} 
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div className="space-y-1 text-center">
                  <DialogTitle className="text-xl font-bold tracking-tight text-[#dbdbdb]">Create Workspace</DialogTitle>
                  <DialogDescription className="text-[#dbdbdb]/60">
                    Give your workspace a name to get started.
                  </DialogDescription>
                </div>
              </DialogHeader>
              <div className="grid gap-4 py-6">
                <div className="space-y-2">
                  <Label htmlFor="org-name" className="text-sm font-semibold ml-1 text-[#dbdbdb]">Workspace Name</Label>
                  <Input
                    id="org-name"
                    placeholder="Acme Content"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    className="h-11 rounded-xl border-zinc-700 bg-zinc-900 text-[#dbdbdb] focus:ring-[#ddfc7b]"
                    required
                    autoFocus
                  />
                </div>
              </div>
              <div className="pt-2">
                <Button 
                  type="submit" 
                  className="w-full h-11 bg-[#ddfc7b] text-[#171717] hover:bg-[#ddfc7b]/90 transition-all font-semibold rounded-xl"
                  disabled={creatingOrg || !newOrgName.trim()}
                >
                  {creatingOrg ? "Creating..." : "Create Workspace"}
                </Button>
              </div>
            </form>
          )}

          {orgModalView === 'join' && (
            <form onSubmit={handleJoinOrg}>
              <DialogHeader className="space-y-4">
                <button 
                  type="button"
                  onClick={() => setOrgModalView('choice')}
                  className="absolute left-4 top-4 p-2 rounded-lg hover:bg-zinc-700 transition-colors text-[#dbdbdb]"
                >
                  <ArrowLeft className="size-4" />
                </button>
                <div className="flex justify-center">
                  <div className="size-12 rounded-2xl bg-zinc-700 flex items-center justify-center shadow-lg">
                    <Users className="size-6 text-[#dbdbdb]" />
                  </div>
                </div>
                <div className="space-y-1 text-center">
                  <DialogTitle className="text-xl font-bold tracking-tight text-[#dbdbdb]">Join Workspace</DialogTitle>
                  <DialogDescription className="text-[#dbdbdb]/60">
                    Ask your team admin to send you an invite link, or enter your invite code below.
                  </DialogDescription>
                </div>
              </DialogHeader>
              <div className="grid gap-4 py-6">
                <div className="space-y-2">
                  <Label htmlFor="invite" className="text-sm font-semibold ml-1 text-[#dbdbdb]">Invite Code</Label>
                  <Input
                    id="invite"
                    placeholder="Enter invite code..."
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    className="h-11 rounded-xl border-zinc-700 bg-zinc-900 text-[#dbdbdb] focus:ring-[#ddfc7b]"
                    autoFocus
                  />
                </div>
                <div className="rounded-xl bg-zinc-900/50 p-4 border border-zinc-700">
                  <p className="text-xs text-[#dbdbdb]/60 leading-relaxed">
                    <strong className="text-[#dbdbdb]">Don't have an invite?</strong> Ask your workspace admin to invite you from their Settings page. You'll receive an email with a link to join.
                  </p>
                </div>
              </div>
              <div className="pt-2">
                <Button 
                  type="submit" 
                  className="w-full h-11 bg-[#ddfc7b] text-[#171717] hover:bg-[#ddfc7b]/90 transition-all font-semibold rounded-xl"
                  disabled={creatingOrg || !inviteCode.trim()}
                >
                  {creatingOrg ? "Joining..." : "Join Workspace"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
