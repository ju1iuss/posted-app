"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Settings, Building2, Globe, Bell, Palette, Globe2, Loader2, Save, UserPlus, Mail, Copy, Check, Trash2, RefreshCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function SettingsPage() {
  const [currentOrg, setCurrentOrg] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  
  const [orgName, setOrgName] = useState("")
  const [orgSlug, setOrgSlug] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")
  
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function loadSettings() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch org and members
      const { data: orgMembers } = await supabase
        .from('organization_members')
        .select(`
          role,
          organizations (*),
          profile:profiles (*)
        `)
        .eq('profile_id', user.id)
        .limit(1)
        .single()
      
      if (orgMembers) {
        const org = (orgMembers as any).organizations
        setCurrentOrg(org)
        setOrgName(org.name || "")
        setOrgSlug(org.slug || "")

        // Fetch all members of this org
        const { data: allMembers } = await supabase
          .from('organization_members')
          .select(`
            id,
            role,
            created_at,
            profile:profiles (*)
          `)
          .eq('organization_id', org.id)
        
        setMembers(allMembers || [])
      }
      setLoading(false)
    }

    loadSettings()
  }, [supabase])

  const handleUpdateOrg = async () => {
    try {
      setSaving(true)
      const { error } = await supabase
        .from('organizations')
        .update({
          name: orgName,
          slug: orgSlug,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentOrg.id)

      if (error) throw error
      toast.success("Organization settings updated")
    } catch (error: any) {
      toast.error(error.message || "Failed to update organization")
    } finally {
      setSaving(false)
    }
  }

  const handleRegenerateCode = async () => {
    try {
      setRegenerating(true)
      const { data, error } = await supabase.rpc('regenerate_org_invite_code', { org_id: currentOrg.id })
      if (error) throw error
      setCurrentOrg({ ...currentOrg, invite_code: data })
      toast.success("Invite code regenerated")
    } catch (error: any) {
      toast.error(error.message || "Failed to regenerate code")
    } finally {
      setRegenerating(false)
    }
  }

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail) return
    
    try {
      setInviting(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      const response = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          orgName: currentOrg.name,
          inviteCode: currentOrg.invite_code,
          inviterName: user?.user_metadata?.full_name || user?.email?.split('@')[0]
        })
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error)

      toast.success(`Invite sent to ${inviteEmail}`)
      setInviteEmail("")
    } catch (error: any) {
      toast.error(error.message || "Failed to send invite")
    } finally {
      setInviting(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(currentOrg?.invite_code || "")
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success("Invite code copied to clipboard")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-6 animate-spin text-zinc-400" />
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-10">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Settings</h1>
        <p className="text-zinc-400 text-sm mt-1">Manage your organization and workspace preferences.</p>
      </div>

      <div className="grid gap-6">
        {/* Organization Profile */}
        <Card className="bg-[#2a2a2a] border-zinc-800 shadow-xl overflow-hidden">
          <CardHeader className="border-b border-zinc-800 bg-zinc-800/20">
            <CardTitle className="text-white flex items-center gap-2">
              <Building2 className="size-5 text-[#ddfc7b]" />
              Organization Profile
            </CardTitle>
            <CardDescription className="text-zinc-400">Configure your workspace identity.</CardDescription>
          </CardHeader>
          <CardContent className="pt-8 space-y-6">
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="grid gap-2">
                <Label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Organization Name</Label>
                <Input 
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Acme Inc."
                  className="bg-zinc-900 border-zinc-800 text-white rounded-xl focus:ring-[#ddfc7b]"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Organization Slug</Label>
                <div className="flex items-center">
                  <div className="bg-zinc-800 border-y border-l border-zinc-800 px-3 h-10 flex items-center text-zinc-500 text-xs rounded-l-xl">
                    app.posted.com/
                  </div>
                  <Input 
                    value={orgSlug}
                    onChange={(e) => setOrgSlug(e.target.value)}
                    placeholder="acme"
                    className="bg-zinc-900 border-zinc-800 text-white rounded-r-xl rounded-l-none focus:ring-[#ddfc7b] border-l-0"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-800/50 space-y-4">
              <div className="grid gap-2">
                <Label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Invite Code</Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-zinc-900 border border-zinc-800 h-10 flex items-center px-4 rounded-xl font-mono text-[#ddfc7b] font-bold">
                    {currentOrg?.invite_code || "------"}
                  </div>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="size-10 rounded-xl border-zinc-800 bg-zinc-800 text-[#dbdbdb] hover:bg-zinc-700"
                    onClick={copyToClipboard}
                  >
                    {copied ? <Check className="size-4 text-[#ddfc7b]" /> : <Copy className="size-4" />}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="size-10 rounded-xl border-zinc-800 bg-zinc-800 text-[#dbdbdb] hover:bg-zinc-700"
                    onClick={handleRegenerateCode}
                    disabled={regenerating}
                  >
                    <RefreshCcw className={cn("size-4", regenerating && "animate-spin")} />
                  </Button>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">Share this code with your team to let them join this workspace.</p>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-zinc-800/50">
              <Button 
                onClick={handleUpdateOrg}
                disabled={saving}
                className="bg-[#ddfc7b] text-black hover:bg-[#c9e86a] rounded-xl px-8 font-bold"
              >
                {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : <Save className="size-4 mr-2" />}
                Save Organization
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Members Management */}
        <Card className="bg-[#2a2a2a] border-zinc-800 shadow-xl overflow-hidden">
          <CardHeader className="border-b border-zinc-800 bg-zinc-800/20">
            <CardTitle className="text-white flex items-center gap-2">
              <UserPlus className="size-5 text-[#ddfc7b]" />
              Team Members
            </CardTitle>
            <CardDescription className="text-zinc-400">Invite and manage your team members.</CardDescription>
          </CardHeader>
          <CardContent className="pt-8 space-y-8">
            {/* Invite Form */}
            <form onSubmit={handleSendInvite} className="space-y-4">
              <div className="grid gap-2">
                <Label className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">Invite by Email</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
                    <Input 
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="teammate@company.com"
                      className="bg-zinc-900 border-zinc-800 text-white rounded-xl pl-10 focus:ring-[#ddfc7b]"
                      type="email"
                    />
                  </div>
                  <Button 
                    type="submit"
                    disabled={inviting || !inviteEmail}
                    className="bg-[#ddfc7b] text-black hover:bg-[#c9e86a] rounded-xl px-6 font-bold"
                  >
                    {inviting ? <Loader2 className="size-4 animate-spin mr-2" /> : <UserPlus className="size-4 mr-2" />}
                    Send Invite
                  </Button>
                </div>
              </div>
            </form>

            {/* Members List */}
            <div className="space-y-4 pt-4 border-t border-zinc-800/50">
              <Label className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">Active Members ({members.length})</Label>
              <div className="grid gap-3">
                {members.map((member) => (
                  <div 
                    key={member.id} 
                    className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800 transition-all hover:bg-zinc-900"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-[#ddfc7b] text-[#171717] flex items-center justify-center font-bold text-xs">
                        {member.profile?.email?.substring(0, 2).toUpperCase() || "??"}
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-white">{member.profile?.email}</p>
                        <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">{member.role}</p>
                      </div>
                    </div>
                    {member.role !== 'owner' && (
                      <Button variant="ghost" size="icon" className="text-zinc-600 hover:text-red-400 hover:bg-red-400/10">
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Workspace Preferences */}
        <Card className="bg-[#2a2a2a] border-zinc-800 shadow-xl overflow-hidden">
          <CardHeader className="border-b border-zinc-800 bg-zinc-800/20">
            <CardTitle className="text-white flex items-center gap-2">
              <Palette className="size-5 text-[#ddfc7b]" />
              Workspace Preferences
            </CardTitle>
            <CardDescription className="text-zinc-400">Customize your experience within the app.</CardDescription>
          </CardHeader>
          <CardContent className="pt-8 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800 transition-all hover:bg-zinc-900">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-zinc-800 flex items-center justify-center text-[#ddfc7b]">
                    <Bell className="size-5" />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold text-white">Email Notifications</Label>
                    <p className="text-[10px] text-zinc-500">Receive weekly performance reports and updates.</p>
                  </div>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800 transition-all hover:bg-zinc-900">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-zinc-800 flex items-center justify-center text-[#ddfc7b]">
                    <Globe2 className="size-5" />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold text-white">Auto-generate Alt Text</Label>
                    <p className="text-[10px] text-zinc-500">Automatically use AI to generate alt text for all images.</p>
                  </div>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
