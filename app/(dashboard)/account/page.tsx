"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { User, Mail, Shield, UserCircle, Loader2, Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function AccountPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  
  const [fullName, setFullName] = useState("")
  
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function loadUserData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUser(user)

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (profile) {
        setProfile(profile)
        setFullName(profile.full_name || "")
      }

      // Get organization ID for upload path
      const { data: orgMember } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('profile_id', user.id)
        .limit(1)
        .single()
      
      if (orgMember) {
        setOrganizationId(orgMember.organization_id)
      }

      setLoading(false)
    }

    loadUserData()
  }, [supabase])

  const handleUpdateProfile = async () => {
    try {
      setSaving(true)
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) throw error
      toast.success("Profile updated successfully")
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB')
      return
    }

    try {
      setUploadingAvatar(true)
      toast.loading('Uploading profile picture...', { id: 'avatar-upload' })

      // Get organization ID or use 'public' as fallback
      const orgId = organizationId || 'public'
      const fileExt = file.name.split('.').pop()
      const fileName = `avatar-${user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `${orgId}/avatars/${fileName}`

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath)

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      // Update local state
      setProfile({ ...profile, avatar_url: publicUrl })
      toast.success('Profile picture uploaded successfully', { id: 'avatar-upload' })
    } catch (error: any) {
      console.error('Avatar upload error:', error)
      toast.error(error.message || 'Failed to upload profile picture', { id: 'avatar-upload' })
    } finally {
      setUploadingAvatar(false)
      // Reset input
      e.target.value = ''
    }
  }

  if (loading) {
    return (
      <div className="space-y-8 max-w-4xl mx-auto">
        <div className="space-y-2">
          <Skeleton className="h-10 w-48 bg-zinc-800" />
          <Skeleton className="h-4 w-96 bg-zinc-800" />
        </div>
        <div className="grid gap-6">
          <Card className="bg-[#2a2a2a] border-zinc-800 shadow-xl overflow-hidden">
            <CardHeader className="border-b border-zinc-800 bg-zinc-800/20">
              <Skeleton className="h-6 w-48 bg-zinc-800" />
              <Skeleton className="h-4 w-64 bg-zinc-800 mt-2" />
            </CardHeader>
            <CardContent className="pt-8 space-y-6">
              <div className="flex flex-col sm:flex-row items-center gap-8">
                <Skeleton className="size-24 rounded-full bg-zinc-800" />
                <div className="flex-1 w-full space-y-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20 bg-zinc-800" />
                    <Skeleton className="h-10 w-full bg-zinc-900" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24 bg-zinc-800" />
                    <Skeleton className="h-10 w-full bg-zinc-900" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Account</h1>
        <p className="text-zinc-400 text-sm mt-1">Manage your personal information and account settings.</p>
      </div>

      <div className="grid gap-6">
        {/* Profile Card */}
        <Card className="bg-[#2a2a2a] border-zinc-800 shadow-xl overflow-hidden">
          <CardHeader className="border-b border-zinc-800 bg-zinc-800/20">
            <CardTitle className="text-white flex items-center gap-2">
              <UserCircle className="size-5 text-[#ddfc7b]" />
              Personal Information
            </CardTitle>
            <CardDescription className="text-zinc-400">Update your public profile information.</CardDescription>
          </CardHeader>
          <CardContent className="pt-8 space-y-6">
            <div className="flex flex-col sm:flex-row items-center gap-8">
              <div className="relative group">
                <Avatar className="size-24 border-2 border-zinc-700 shadow-2xl">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback className="bg-zinc-800 text-zinc-400 text-2xl font-bold">
                    {user?.email?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <label className="absolute bottom-0 right-0 p-2 bg-[#ddfc7b] rounded-full text-black shadow-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  {uploadingAvatar ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Camera className="size-4" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    disabled={uploadingAvatar}
                    className="hidden"
                  />
                </label>
              </div>
              <div className="flex-1 w-full space-y-4">
                <div className="grid gap-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Full Name</label>
                  <Input 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="bg-zinc-900 border-zinc-800 text-white rounded-xl focus:ring-[#ddfc7b]"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Email Address</label>
                  <Input 
                    value={user?.email}
                    disabled
                    className="bg-zinc-900 border-zinc-800 text-zinc-500 rounded-xl cursor-not-allowed"
                  />
                  <p className="text-[10px] text-zinc-500 italic">Email cannot be changed manually. Contact support for assistance.</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <Button 
                onClick={handleUpdateProfile}
                disabled={saving}
                className="bg-[#ddfc7b] text-black hover:bg-[#c9e86a] rounded-xl px-8 font-bold"
              >
                {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security Card */}
        <Card className="bg-[#2a2a2a] border-zinc-800 shadow-xl overflow-hidden">
          <CardHeader className="border-b border-zinc-800 bg-zinc-800/20">
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="size-5 text-[#ddfc7b]" />
              Security
            </CardTitle>
            <CardDescription className="text-zinc-400">Manage your account security and authentication.</CardDescription>
          </CardHeader>
          <CardContent className="pt-8 space-y-6">
            <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800">
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">Password</p>
                <p className="text-xs text-zinc-500">Last changed 3 months ago</p>
              </div>
              <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 rounded-xl font-bold">
                Update Password
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
