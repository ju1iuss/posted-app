"use client"

import Image from "next/image"
import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Building2, Users, ArrowLeft } from "lucide-react"

type View = 'choice' | 'create' | 'join'

export function OrganizationGuard({ children }: { children: React.ReactNode }) {
  const [hasOrg, setHasOrg] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState("")
  const [inviteCode, setInviteCode] = useState("")
  const [creating, setCreating] = useState(false)
  const [view, setView] = useState<View>('choice')
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function checkOrg() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('profile_id', user.id)
        .limit(1)

      if (error && error.code !== 'PGRST116') {
        console.error(error)
      }

      setHasOrg(data && data.length > 0)
      setLoading(false)
    }

    checkOrg()
  }, [supabase])

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name) return
    setCreating(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("No user found")

      // 1. Create organization
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({ name, slug: `${slug}-${Date.now()}` })
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

      setHasOrg(true)
      toast.success("Workspace created successfully!")
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || "Failed to create workspace")
    } finally {
      setCreating(false)
    }
  }

  const handleJoinOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteCode) return
    setCreating(true)

    try {
      // For now, show a message that they need an invite
      toast.info("Ask your team admin to invite you to their workspace.")
    } catch (error: any) {
      toast.error(error.message || "Failed to join workspace")
    } finally {
      setCreating(false)
    }
  }


  if (hasOrg === false) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_45%_at_50%_50%,#2a2a2a_0,#171717_100%)]" />
        
        <Dialog open={true}>
          <DialogContent className="sm:max-w-[425px] rounded-2xl border-zinc-700 bg-zinc-800 [&>button]:hidden">
            {view === 'choice' && (
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
                    onClick={() => setView('create')}
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
                    onClick={() => setView('join')}
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

            {view === 'create' && (
              <form onSubmit={handleCreateOrg}>
                <DialogHeader className="space-y-4">
                  <button 
                    type="button"
                    onClick={() => setView('choice')}
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
                    <Label htmlFor="name" className="text-sm font-semibold ml-1 text-[#dbdbdb]">Workspace Name</Label>
                    <Input
                      id="name"
                      placeholder="Acme Content"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
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
                    disabled={creating || !name}
                  >
                    {creating ? "Creating..." : "Create Workspace"}
                  </Button>
                </div>
              </form>
            )}

            {view === 'join' && (
              <form onSubmit={handleJoinOrg}>
                <DialogHeader className="space-y-4">
                  <button 
                    type="button"
                    onClick={() => setView('choice')}
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
                <div className="flex flex-col gap-2 pt-2">
                  <Button 
                    type="submit" 
                    className="w-full h-11 bg-[#ddfc7b] text-[#171717] hover:bg-[#ddfc7b]/90 transition-all font-semibold rounded-xl"
                    disabled={creating || !inviteCode}
                  >
                    {creating ? "Joining..." : "Join Workspace"}
                  </Button>
                  <Button 
                    type="button"
                    variant="ghost"
                    onClick={() => setView('create')}
                    className="w-full h-11 text-[#dbdbdb]/60 hover:text-[#dbdbdb] hover:bg-zinc-700 transition-all font-medium rounded-xl"
                  >
                    Or create your own workspace
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return <>{children}</>
}
