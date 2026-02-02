"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Settings, Building2, Globe, Bell, Palette, Globe2, Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export default function SettingsPage() {
  const [currentOrg, setCurrentOrg] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [orgName, setOrgName] = useState("")
  const [orgSlug, setOrgSlug] = useState("")
  
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function loadSettings() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: orgMembers } = await supabase
        .from('organization_members')
        .select('organizations(*)')
        .eq('profile_id', user.id)
        .limit(1)
        .single()
      
      if (orgMembers) {
        const org = (orgMembers as any).organizations
        setCurrentOrg(org)
        setOrgName(org.name || "")
        setOrgSlug(org.slug || "")
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
        {/* Organization Settings */}
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

        {/* Preferences */}
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
