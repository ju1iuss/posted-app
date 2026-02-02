"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  HelpCircle,
  MessageSquare,
  Send,
  Sparkles,
  LayoutGrid,
  Command as CommandIcon,
  Check,
  Users,
  BarChart3,
  Zap,
  Globe,
  Settings,
  CreditCard,
  Target,
  FileText,
  Brain,
} from "lucide-react"
import {
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

import { OrganizationSelect } from "@/components/organization-select";

export function TopBar() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [helpText, setHelpText] = React.useState("")
  const [showPostForMe, setShowPostForMe] = React.useState(false)
  const [numAccounts, setNumAccounts] = React.useState([5])
  const [feedbackText, setFeedbackText] = React.useState("")

  const navigate = (path: string) => {
    router.push(path)
    setOpen(false)
  }

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  return (
    <>
      <header className="flex h-12 shrink-0 items-center justify-between px-4 border-b border-zinc-700 dark:border-zinc-700 bg-[#171717] backdrop-blur-xl fixed top-0 left-0 right-0 z-40 w-full">
        <div className="flex items-center gap-3">
          <OrganizationSelect />
        </div>

        <div className="flex items-center gap-2">
          {/* Search Bar */}
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 px-2.5 py-1.5 text-[#dbdbdb]/60 hover:text-[#dbdbdb] bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-all group w-48"
          >
            <Search className="size-3.5" />
            <span className="text-[11px] font-medium flex-1 text-left">Search...</span>
            <Kbd className="bg-zinc-700 border-zinc-600 text-[#dbdbdb] text-[10px] px-1.5 py-0">⌘K</Kbd>
          </button>

          {/* Feedback Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 px-2.5 text-[#dbdbdb] hover:text-[#dbdbdb] hover:bg-zinc-800 rounded-lg gap-2 border border-zinc-700"
              >
                <MessageSquare className="size-3.5" />
                <span className="text-[11px] font-bold uppercase tracking-wider hidden sm:inline">Feedback</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-4 rounded-xl shadow-xl border-zinc-700 bg-zinc-800">
              <div className="space-y-3">
                <div className="space-y-1">
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-[#dbdbdb]/60">Feedback</h4>
                  <p className="text-xs text-[#dbdbdb]/80">Help us improve by sharing your thoughts.</p>
                </div>
                <div className="space-y-3">
                  <textarea
                    className="w-full h-24 bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-xs text-[#dbdbdb] focus:outline-none focus:ring-1 focus:ring-[#ddfc7b] resize-none"
                    placeholder="What can we do better?"
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                  />
                  <Button 
                    className="w-full bg-[#ddfc7b] hover:bg-[#ddfc7b]/90 text-[#171717] font-black uppercase tracking-widest text-[10px] h-8"
                    onClick={() => {
                      if (feedbackText) {
                        console.log("Feedback submitted:", feedbackText)
                        setFeedbackText("")
                      }
                    }}
                  >
                    Submit Feedback
                  </Button>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Help Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-[#dbdbdb] hover:text-[#dbdbdb] hover:bg-zinc-800 border border-zinc-700 rounded-md font-bold text-base">
                ?
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-3 rounded-xl shadow-xl border-zinc-700 bg-zinc-800">
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
                    onClick={() => {
                      if (helpText) {
                        console.log("Sending help request:", helpText)
                        setHelpText("")
                      }
                    }}
                  >
                    <Send className="size-3.5" />
                  </Button>
                </div>
                <div className="h-px bg-zinc-700" />
                <DropdownMenuItem className="text-xs font-medium rounded-lg cursor-pointer text-[#dbdbdb]">
                  Documentation
                </DropdownMenuItem>
                <DropdownMenuItem className="text-xs font-medium rounded-lg cursor-pointer text-[#dbdbdb]">
                  Keyboard Shortcuts
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Post for me Button */}
          <Button 
            className="h-8 px-3 bg-[#ddfc7b] hover:bg-[#ddfc7b]/90 text-[#171717] rounded-lg gap-2 shadow-sm transition-all active:scale-95 group"
            onClick={() => setShowPostForMe(true)}
          >
            <Sparkles className="size-3.5 group-hover:animate-pulse" />
            <span className="text-[11px] font-black uppercase tracking-widest">Automate Posting</span>
          </Button>
        </div>
      </header>

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
