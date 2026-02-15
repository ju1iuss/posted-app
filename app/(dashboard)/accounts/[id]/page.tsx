"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { 
  Heart, 
  MessageCircle, 
  MoreHorizontal,
  Plus,
  Verified,
  Lock,
  Play,
  Pencil,
  Shuffle,
  UserCircle,
  Camera,
  Layout,
  ChevronDown,
  Expand,
  Wand2,
  Loader2,
  Check,
  CheckCircle2,
  Trash2,
  CheckSquare,
  Square,
  X,
  Minus
} from "lucide-react"
import Image from "next/image"
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { TemplateSelectorModal } from "@/components/template-selector-modal"
import { CreditLimitModal } from "@/components/credit-limit-modal"
import { PostCarouselCard } from "@/components/post-carousel-card"
import { PostPreviewModal } from "@/components/post-preview-modal"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const PROFILE_IMAGES = [
  "304f3d97891b0e150af1af0865bc7293.jpg",
  "7503e4cd8b6f05ad88f1a02afee71ca3.jpg",
  "7fad32e2107350c7f472ac85da30d597.jpg",
  "98ba2dd52d1e5ca476dfa624fb0870ef.jpg",
  "a3e6f65a776da84ebbe229872b14d5d1.jpg",
  "a67bbd2371cd11546dd8df93c791c269.jpg",
]

export default function AccountPage() {
  const params = useParams()
  const router = useRouter()
  const accountId = params.id as string
  const [activeTab, setActiveTab] = useState<"videos" | "liked" | "private">("videos")
  const [account, setAccount] = useState<any>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [templates, setTemplates] = useState<any[]>([])
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showCreditModal, setShowCreditModal] = useState(false)
  const [generatingPost, setGeneratingPost] = useState(false)
  const [pendingPostId, setPendingPostId] = useState<string | null>(null)
  const [selectedPost, setSelectedPost] = useState<any>(null)
  const [showPostModal, setShowPostModal] = useState(false)
  const [postToDelete, setPostToDelete] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showPromptModal, setShowPromptModal] = useState(false)
  const [enhancingPrompt, setEnhancingPrompt] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const [uploadingProfilePic, setUploadingProfilePic] = useState(false)
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [bulkCount, setBulkCount] = useState(1)
  const [showNewPostPopover, setShowNewPostPopover] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkExporting, setBulkExporting] = useState(false)
  
  const supabase = useMemo(() => createClient(), [])

  // Track org id for template caching
  const [lastTemplateOrgId, setLastTemplateOrgId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadAccountData() {
      if (!accountId) return

      // Only show full skeleton on very first load (no account yet)
      // For subsequent switches, keep old data visible
      if (!account) {
        setLoading(true)
      }

      try {
        // Fetch account and posts in PARALLEL
        const [accountResult, postsResult] = await Promise.all([
          supabase
            .from('accounts')
            .select('*, organizations(credits)')
            .eq('id', accountId)
            .single(),
          supabase
            .from('posts')
            .select('*')
            .eq('account_id', accountId)
            .order('created_at', { ascending: false })
        ])

        if (cancelled) return

        const { data: accountData, error: accountError } = accountResult

        if (accountError) {
          console.error('Error loading account:', accountError)
          if (accountError.code === 'PGRST116') {
            toast.error('Account not found')
          } else {
            toast.error(accountError.message || 'Failed to load account')
          }
          setLoading(false)
          return
        }
        
        if (!accountData) {
          toast.error('Account not found')
          setLoading(false)
          return
        }
        
        // Update account + posts immediately so UI swaps fast
        setAccount(accountData)

        // Process posts
        const { data: postsData, error: postsError } = postsResult

        if (postsError) {
          console.error('Error loading posts:', postsError)
          setPosts([])
        } else if (!postsData || postsData.length === 0) {
          setPosts([])
        } else {
          // Fetch post images in background
          const postIds = postsData.map(p => p.id)
          const { data: postImagesData } = await supabase
            .from('post_images')
            .select(`post_id, position, images (url, storage_path)`)
            .in('post_id', postIds)
            .order('position', { ascending: true })

          if (cancelled) return

          const imageMap = new Map<string, string>()
          if (postImagesData) {
            postImagesData.forEach((pi: any) => {
              if (!imageMap.has(pi.post_id) && pi.images?.url) {
                imageMap.set(pi.post_id, pi.images.url)
              }
            })
          }

          const transformedPosts = postsData.map((post: any) => {
            const thumbnail = imageMap.get(post.id) || null
            const metrics = post.metrics as any || {}
            const views = metrics.views || 0
            return {
              id: post.id,
              thumbnail,
              views: formatViews(views),
              type: post.type,
              content: post.content,
              title: post.title,
              caption: post.caption,
              status: post.status
            }
          })
          setPosts(transformedPosts)
        }

        setLoading(false)

        // Fetch templates only if org changed (they're shared across accounts in same org)
        if (accountData.organization_id !== lastTemplateOrgId) {
          const { data: templatesData, error: templatesError } = await supabase
            .from('templates')
            .select(`*, template_slides (id, position, background_type, background_image_id, background_color, background_image_url)`)
            .or(`organization_id.eq.${accountData.organization_id},is_premade.eq.true`)

          if (cancelled) return
          
          if (!templatesError && templatesData) {
            const slideIdsByTemplate: Record<string, string[]> = {}
            templatesData.forEach(t => {
              const sortedSlides = [...(t.template_slides || [])].sort((a: any, b: any) => a.position - b.position)
              if (sortedSlides.length > 0 && sortedSlides[0].id) {
                slideIdsByTemplate[t.id] = [sortedSlides[0].id]
              }
            })

            const allSlideIds = Object.values(slideIdsByTemplate).flat()
            let layersBySlide: Record<string, any[]> = {}
            
            if (allSlideIds.length > 0) {
              const { data: layersData } = await supabase
                .from('template_layers')
                .select('*')
                .in('slide_id', allSlideIds)
              
              if (cancelled) return
              if (layersData) {
                layersData.forEach((layer: any) => {
                  if (layer.slide_id) {
                    if (!layersBySlide[layer.slide_id]) layersBySlide[layer.slide_id] = []
                    layersBySlide[layer.slide_id].push(layer)
                  }
                })
              }
            }

            const templatesWithThumbnails = templatesData.map(t => {
              const sortedSlides = [...(t.template_slides || [])].sort((a: any, b: any) => a.position - b.position)
              const firstSlide = sortedSlides[0] || null
              const firstSlideLayers = firstSlide?.id ? (layersBySlide[firstSlide.id] || []) : []
              return { ...t, firstSlide, firstSlideLayers }
            })

            setTemplates(templatesWithThumbnails)
            setLastTemplateOrgId(accountData.organization_id)
          }
        }
      } catch (error: any) {
        console.error('Unexpected error loading account:', error)
        toast.error(error?.message || 'An unexpected error occurred')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadAccountData()
    return () => { cancelled = true }
  }, [accountId, supabase])

  const updateAccountField = async (field: string, value: any) => {
    if (!accountId || !account) return

    // Optimistic update
    const previousAccount = { ...account }
    const updatedAccount = { ...account }
    
    if (field === 'profile_picture') {
      updatedAccount.metadata = { ...updatedAccount.metadata, profile_picture: value }
    } else {
      updatedAccount[field] = value
    }
    
    setAccount(updatedAccount)

    try {
      const updateData: any = {}
      if (field === 'profile_picture') {
        updateData.metadata = { ...account.metadata, profile_picture: value }
      } else {
        updateData[field] = value
      }

      const { error } = await supabase
        .from('accounts')
        .update(updateData)
        .eq('id', accountId)

      if (error) throw error

      setShowSaved(true)
      setTimeout(() => setShowSaved(false), 2000)

      if (field === 'username' || field === 'name' || field === 'status') {
        window.dispatchEvent(new CustomEvent('account-updated', {
          detail: { id: accountId, [field]: value }
        }))
      }
    } catch (error: any) {
      console.error(error)
      setAccount(previousAccount) // Revert on error
      toast.error(error.message || `Failed to update ${field}`)
    }
  }

  const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !account) return

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
      setUploadingProfilePic(true)
      toast.loading('Uploading profile picture...', { id: 'profile-pic-upload' })

      const orgId = account.organization_id || 'public'
      const fileExt = file.name.split('.').pop()
      const fileName = `profile-${accountId}-${Math.random().toString(36).substring(2)}.${fileExt}`
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

      // Store the full URL for uploaded images (to distinguish from predefined images)
      await updateAccountField('profile_picture', publicUrl)
      
      toast.success('Profile picture uploaded successfully', { id: 'profile-pic-upload' })
    } catch (error: any) {
      console.error('Profile picture upload error:', error)
      toast.error(error.message || 'Failed to upload profile picture', { id: 'profile-pic-upload' })
    } finally {
      setUploadingProfilePic(false)
      // Reset input
      e.target.value = ''
    }
  }

  const formatViews = (views: number): string => {
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M`
    } else if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K`
    }
    return views.toString()
  }

  const handleGenerateSinglePost = async (): Promise<boolean> => {
    const currentCredits = (account?.organizations as any)?.credits ?? 0
    if (currentCredits <= 0) {
      setShowCreditModal(true)
      return false
    }

    if (!account?.template_id) {
      toast.error('Please select a template first')
      setShowTemplateModal(true)
      return false
    }

    const tempId = `pending-${Date.now()}-${Math.random()}`

    // Optimistically update credits
    const newCredits = currentCredits - 1
    window.dispatchEvent(new CustomEvent('credits-updated', { 
      detail: { credits: newCredits, organizationId: account.organization_id } 
    }))
    setAccount((prev: any) => ({
      ...prev,
      organizations: { ...prev.organizations, credits: newCredits }
    }))

    setPosts(prev => [{
      id: tempId,
      thumbnail: null,
      views: '0',
      type: account.template_id ? templates.find(t => t.id === account.template_id)?.type || 'carousel' : 'carousel',
      isLoading: true,
      content: null
    }, ...prev])

    try {
      const response = await fetch('/api/generate-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: accountId,
          templateId: account.template_id,
          prompt: account.prompt,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 402) {
          window.dispatchEvent(new CustomEvent('credits-updated', { 
            detail: { credits: currentCredits, organizationId: account.organization_id } 
          }))
          setAccount((prev: any) => ({
            ...prev,
            organizations: { ...prev.organizations, credits: currentCredits }
          }))
          setShowCreditModal(true)
          setPosts(prev => prev.filter(p => p.id !== tempId))
          return false
        }
        throw new Error(data.error || 'Failed to generate post')
      }

      const { data: newPostData, error: postError } = await supabase
        .from('posts')
        .select('*')
        .eq('id', data.post.id)
        .single()

      if (postError) throw postError

      const { data: postImagesData } = await supabase
        .from('post_images')
        .select(`post_id, position, images (url, storage_path)`)
        .eq('post_id', data.post.id)
        .order('position', { ascending: true })
        .limit(1)

      const imagesData = postImagesData?.[0]?.images as any
      const thumbnail = (Array.isArray(imagesData) ? imagesData?.[0]?.url : imagesData?.url) || null
      const metrics = (newPostData.metrics as any) || {}
      const views = metrics.views || 0

      const newPost = {
        id: newPostData.id,
        thumbnail,
        views: formatViews(views),
        type: newPostData.type,
        content: newPostData.content,
        title: newPostData.title,
        caption: newPostData.caption,
        status: newPostData.status,
        isLoading: false
      }
      setPosts(prev => prev.map(p => p.id === tempId ? newPost : p))

      if (typeof data.newCredits === 'number') {
        window.dispatchEvent(new CustomEvent('credits-updated', { 
          detail: { credits: data.newCredits, organizationId: account.organization_id } 
        }))
        setAccount((prev: any) => ({
          ...prev,
          organizations: { ...prev.organizations, credits: data.newCredits }
        }))
      }

      return true
    } catch (error: any) {
      console.error('Error generating post:', error)
      window.dispatchEvent(new CustomEvent('credits-updated', { 
        detail: { credits: currentCredits, organizationId: account.organization_id } 
      }))
      setAccount((prev: any) => ({
        ...prev,
        organizations: { ...prev.organizations, credits: currentCredits }
      }))
      setPosts(prev => prev.filter(p => p.id !== tempId))
      toast.error(error.message || 'Failed to generate post')
      return false
    }
  }

  const handleGeneratePost = async (count: number = 1) => {
    if (!account?.template_id) {
      toast.error('Please select a template first')
      setShowTemplateModal(true)
      return
    }

    // Ensure prompt is saved
    if (account.prompt !== undefined) {
      await updateAccountField('prompt', account.prompt || '')
    }

    setShowNewPostPopover(false)
    setGeneratingPost(true)

    if (count === 1) {
      await handleGenerateSinglePost()
    } else {
      toast.info(`Generating ${count} posts...`)
      let successCount = 0
      for (let i = 0; i < count; i++) {
        const ok = await handleGenerateSinglePost()
        if (ok) successCount++
        else break // stop on credit/error failure
      }
      if (successCount > 1) {
        toast.success(`${successCount} posts generated!`)
      } else if (successCount === 1) {
        toast.success('Post generated successfully!')
      }
    }
    
    setGeneratingPost(false)
  }

  // Bulk actions
  const togglePostSelection = useCallback((postId: string) => {
    setSelectedPostIds(prev => {
      const next = new Set(prev)
      if (next.has(postId)) next.delete(postId)
      else next.add(postId)
      return next
    })
  }, [])

  const selectablePostIds = useMemo(() => 
    posts.filter(p => !p.isLoading).map(p => p.id),
    [posts]
  )

  const toggleSelectAll = useCallback(() => {
    if (selectedPostIds.size === selectablePostIds.length) {
      setSelectedPostIds(new Set())
    } else {
      setSelectedPostIds(new Set(selectablePostIds))
    }
  }, [selectedPostIds.size, selectablePostIds])

  const exitSelectMode = useCallback(() => {
    setSelectMode(false)
    setSelectedPostIds(new Set())
  }, [])

  const handleBulkDelete = async () => {
    if (selectedPostIds.size === 0) return
    setBulkDeleting(true)
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .in('id', Array.from(selectedPostIds))

      if (error) throw error

      setPosts(prev => prev.filter(p => !selectedPostIds.has(p.id)))
      toast.success(`${selectedPostIds.size} post(s) deleted`)
      exitSelectMode()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete posts')
    } finally {
      setBulkDeleting(false)
    }
  }

  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedPostIds.size === 0) return
    try {
      const { error } = await supabase
        .from('posts')
        .update({ status: newStatus })
        .in('id', Array.from(selectedPostIds))

      if (error) throw error

      setPosts(prev => prev.map(p => selectedPostIds.has(p.id) ? { ...p, status: newStatus } : p))
      toast.success(`${selectedPostIds.size} post(s) set to ${newStatus}`)
      exitSelectMode()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status')
    }
  }

  // Only show full skeleton on initial load (no account data yet)
  if (loading && !account) {
    return (
      <div className="min-h-screen bg-background pb-10">
        <div className="max-w-[600px] mx-auto px-4 pt-6">
          <div className="flex gap-6 items-center mb-8">
            <Skeleton className="size-20 md:size-24 rounded-full bg-zinc-800" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-8 w-48 bg-zinc-800" />
              <Skeleton className="h-4 w-32 bg-zinc-800" />
              <div className="flex gap-2">
                <Skeleton className="h-9 w-32 bg-zinc-800" />
                <Skeleton className="h-9 w-9 bg-zinc-800" />
                <Skeleton className="h-9 w-24 bg-zinc-800" />
              </div>
            </div>
          </div>
          <div className="flex gap-6 mb-6">
            <Skeleton className="h-4 w-20 bg-zinc-800" />
            <Skeleton className="h-4 w-20 bg-zinc-800" />
            <Skeleton className="h-4 w-20 bg-zinc-800" />
          </div>
          <Skeleton className="h-24 w-full rounded-xl bg-zinc-800 mb-6" />
          <div className="flex gap-8 border-b border-border/60 mb-4">
            <Skeleton className="h-8 w-20 bg-zinc-800" />
            <Skeleton className="h-8 w-20 bg-zinc-800" />
          </div>
          <div className="grid grid-cols-3 gap-0.5">
            {[...Array(9)].map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] w-full bg-zinc-800" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!account && !loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Account not found</div>
      </div>
    )
  }

  // Get profile picture from metadata or use default
  const profilePic = account.metadata?.profile_picture 
    ? (account.metadata.profile_picture.startsWith('http') 
        ? account.metadata.profile_picture 
        : `/profiles/${account.metadata.profile_picture}`)
    : null

  const accountData = {
    username: account.username || account.name.toLowerCase().replace(/\s+/g, ''),
    displayName: account.name,
    verified: false,
    bio: account.notes || "",
    followers: "0",
    following: "0",
    likes: "0",
    profilePic,
    status: account.status
  }

  return (
    <div className="min-h-screen bg-background pb-10 relative">
      <div className="max-w-[600px] mx-auto px-4 pt-6">
        {/* Profile Info Section */}
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex items-center justify-between mb-2 h-6">
            <div /> {/* Spacer */}
            <div className={cn(
              "flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#ddfc7b] transition-all duration-300",
              showSaved ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1 pointer-events-none"
            )}>
              <Check className="size-3" />
              Saved
            </div>
          </div>
          <div className="flex gap-6 items-center">
            <Popover>
              <PopoverTrigger asChild>
                <button className="relative size-20 md:size-24 border border-border rounded-full overflow-hidden flex items-center justify-center bg-muted shrink-0 shadow-sm group">
                  {profilePic ? (
                    <Image
                      src={profilePic}
                      alt={accountData.displayName}
                      width={96}
                      height={96}
                      className="w-full h-full object-cover scale-110"
                    />
                  ) : (
                    <div className="text-2xl font-bold text-[#dbdbdb]/60">{accountData.displayName[0]}</div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="size-6 text-white" />
                  </div>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3 rounded-2xl" align="start">
                <div className="space-y-3">
                  <h4 className="text-sm font-bold">Select Profile Picture</h4>
                  
                  {/* Upload Option */}
                  <label className="block">
                    <div className="w-full aspect-square rounded-lg overflow-hidden border-2 border-dashed border-zinc-700 hover:border-[#ddfc7b] transition-all cursor-pointer flex flex-col items-center justify-center gap-2 bg-zinc-800/50 hover:bg-zinc-800">
                      {uploadingProfilePic ? (
                        <Loader2 className="size-5 animate-spin text-[#ddfc7b]" />
                      ) : (
                        <>
                          <Camera className="size-5 text-[#ddfc7b]" />
                          <span className="text-[10px] font-bold text-[#ddfc7b] uppercase">Upload</span>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePictureUpload}
                      disabled={uploadingProfilePic}
                      className="hidden"
                    />
                  </label>

                  <div className="grid grid-cols-4 gap-2">
                    {PROFILE_IMAGES.map((img) => (
                      <button
                        key={img}
                        onClick={() => updateAccountField('profile_picture', img)}
                        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                          account.metadata?.profile_picture === img ? "border-[#ddfc7b] scale-95" : "border-transparent hover:border-zinc-700"
                        }`}
                      >
                        <Image
                          src={`/profiles/${img}`}
                          alt="Profile option"
                          fill
                          className="object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <div className="flex flex-col gap-3 min-w-0 flex-1">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <input
                    className="text-xl md:text-2xl font-bold tracking-tight bg-transparent border-none outline-none focus:ring-0 w-full truncate p-0 hover:bg-zinc-800 rounded transition-colors"
                    value={account.username || ""}
                    onChange={(e) => setAccount({ ...account, username: e.target.value })}
                    onBlur={(e) => updateAccountField('username', e.target.value)}
                    placeholder="Username"
                  />
                  {accountData.verified && (
                    <Verified className="size-4 text-[#20D5EC] fill-[#20D5EC]" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    className="text-sm font-medium text-[#dbdbdb] bg-transparent border-none outline-none focus:ring-0 p-0 hover:bg-zinc-800 rounded transition-colors"
                    value={account.name || ""}
                    onChange={(e) => setAccount({ ...account, name: e.target.value })}
                    onBlur={(e) => updateAccountField('name', e.target.value)}
                    placeholder="Display Name"
                  />
                </div>
              </div>
              
          <div className="flex gap-2">
            <Button
              onClick={() => setShowTemplateModal(true)}
              className="bg-[#FE2C55] hover:bg-[#E11D48] text-white px-6 font-bold rounded-md h-9 text-sm transition-colors flex items-center gap-2"
            >
              <Layout className="size-4" />
              {account.template_id 
                ? templates.find(t => t.id === account.template_id)?.name || "Template"
                : "Select Template"
              }
              <ChevronDown className="size-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-9 w-9 border border-zinc-700 rounded-md hover:bg-red-600/10 hover:border-red-600/50 hover:text-red-500 transition-colors"
              onClick={() => setShowDeleteAccountDialog(true)}
            >
              <Trash2 className="size-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-9 px-4 border border-zinc-700 rounded-md text-sm font-bold text-[#dbdbdb] hover:bg-zinc-700 hover:text-[#dbdbdb] focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none flex items-center gap-2">
                  {account.status ? account.status.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : 'Planning'}
                  <ChevronDown className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 rounded-xl bg-zinc-800 border-zinc-700">
                {[
                  { value: 'planning', label: 'Planning', dot: 'bg-zinc-500' },
                  { value: 'warming_up', label: 'Warming Up', dot: 'bg-yellow-500' },
                  { value: 'active', label: 'Active', dot: 'bg-green-500' },
                  { value: 'not_active', label: 'Not Active', dot: 'bg-zinc-500' },
                  { value: 'paused', label: 'Paused', dot: 'bg-red-500' },
                ].map((s) => (
                  <DropdownMenuItem 
                    key={s.value}
                    onClick={() => updateAccountField('status', s.value)}
                    className={cn(
                      "text-[11px] font-bold gap-2",
                      "focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none",
                      "hover:bg-zinc-700 hover:text-[#dbdbdb]",
                      account.status === s.value 
                        ? 'text-[#ddfc7b] focus:text-[#ddfc7b] focus:bg-zinc-700 hover:text-[#ddfc7b]' 
                        : 'text-[#dbdbdb] focus:text-[#dbdbdb] focus:bg-zinc-700'
                    )}
                  >
                    <div className={cn("size-2 rounded-full", s.dot)} />
                    {s.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Stats Row */}
          <div className="flex gap-6 text-sm py-0">
            <div>
              <span className="font-bold">{accountData.following}</span>
              <span className="text-[#dbdbdb]/60 ml-1">Following</span>
            </div>
            <div>
              <span className="font-bold">{accountData.followers}</span>
              <span className="text-[#dbdbdb]/60 ml-1">Followers</span>
            </div>
            <div>
              <span className="font-bold">{accountData.likes}</span>
              <span className="text-[#dbdbdb]/60 ml-1">Likes</span>
            </div>
          </div>

          {/* Bio Section */}
          <div className="mt-1">
            <textarea
              className="text-sm whitespace-pre-line leading-relaxed text-[#dbdbdb] bg-transparent border-none outline-none focus:ring-0 p-0 w-full min-h-[40px] resize-none hover:bg-zinc-800 rounded transition-colors placeholder:text-[#dbdbdb]/40"
              value={account.notes || ""}
              onChange={(e) => setAccount({ ...account, notes: e.target.value })}
              onBlur={(e) => updateAccountField('notes', e.target.value)}
              placeholder="Add a bio..."
              rows={2}
            />
          </div>

      {/* Prompt Section */}
      <div className="mt-0">
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-bold text-[#dbdbdb]/60 uppercase tracking-tight block">Account Prompt</label>
          <div className="flex items-center gap-1">
            <button
              onClick={async () => {
                if (!account.prompt || account.prompt.trim().length === 0) {
                  toast.error('Please enter a prompt first')
                  return
                }
                setEnhancingPrompt(true)
                try {
                  const response = await fetch('/api/enhance-prompt', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      prompt: account.prompt,
                    }),
                  })

                  const data = await response.json()

                  if (!response.ok) {
                    throw new Error(data.error || 'Failed to enhance prompt')
                  }

                  setAccount({ ...account, prompt: data.enhancedPrompt })
                  await updateAccountField('prompt', data.enhancedPrompt)
                  toast.success('Prompt enhanced successfully!')
                } catch (error: any) {
                  console.error('Error enhancing prompt:', error)
                  toast.error(error.message || 'Failed to enhance prompt')
                } finally {
                  setEnhancingPrompt(false)
                }
              }}
              disabled={enhancingPrompt || !account.prompt}
              className={cn(
                "size-6 flex items-center justify-center rounded-md bg-zinc-800 hover:bg-zinc-700 text-[#dbdbdb]/60 hover:text-[#ddfc7b] transition-all border border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed relative",
                !account.prompt && "border-yellow-500/50"
              )}
              title={!account.prompt ? "Enter text in the prompt field first" : "Enhance prompt with AI"}
            >
              {enhancingPrompt ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Wand2 className="size-3.5" />
              )}
              {!account.prompt && (
                <span className="absolute -top-1 -right-1 size-2 bg-yellow-500 rounded-full" />
              )}
            </button>
            <button
              onClick={() => setShowPromptModal(true)}
              className="size-6 flex items-center justify-center rounded-md bg-zinc-800 hover:bg-zinc-700 text-[#dbdbdb]/60 hover:text-[#dbdbdb] transition-all border border-zinc-700"
              title="Expand to full view"
            >
              <Expand className="size-3.5" />
            </button>
          </div>
        </div>
        <textarea
          className="text-sm leading-relaxed text-[#dbdbdb] bg-zinc-800/50 p-3 rounded-xl border border-zinc-700 w-full min-h-[100px] resize-none outline-none focus:ring-1 focus:ring-zinc-600 focus:bg-zinc-800 transition-all"
          value={account.prompt || ""}
          onChange={(e) => setAccount({ ...account, prompt: e.target.value })}
          onBlur={(e) => updateAccountField('prompt', e.target.value)}
          placeholder="Enter the AI prompt for this account..."
        />
      </div>
        </div>

        {/* Tabs Section */}
        <div className="flex border-b border-border/60 mb-0 mt-4">
          <button
            onClick={() => setActiveTab("videos")}
            className={`flex items-center gap-2 px-6 py-1 font-bold text-sm border-b-2 transition-all ${
              activeTab === "videos"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Videos
          </button>
          <button
            onClick={() => setActiveTab("private")}
            className={`flex items-center gap-2 px-6 py-1 font-bold text-sm border-b-2 transition-all ${
              activeTab === "private"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Lock className="size-3.5" />
            Liked
          </button>
        </div>

        {/* Bulk Actions Bar */}
        {selectMode && (
          <div className="sticky top-0 z-30 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-700 -mx-4 px-4 py-2 flex items-center gap-2 mb-0">
            <button
              onClick={exitSelectMode}
              className="size-7 rounded-md bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-[#dbdbdb]/60 hover:text-[#dbdbdb] transition-colors"
            >
              <X className="size-4" />
            </button>
            <button
              onClick={toggleSelectAll}
              className="h-7 px-2.5 rounded-md bg-zinc-800 hover:bg-zinc-700 flex items-center gap-1.5 text-[10px] font-bold text-[#dbdbdb] transition-colors uppercase tracking-wider"
            >
              {selectedPostIds.size === selectablePostIds.length ? (
                <><CheckSquare className="size-3.5" /> Deselect All</>
              ) : (
                <><Square className="size-3.5" /> Select All</>
              )}
            </button>
            <span className="text-[10px] font-bold text-[#dbdbdb]/60 uppercase tracking-wider">
              {selectedPostIds.size} selected
            </span>
            <div className="flex-1" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  disabled={selectedPostIds.size === 0}
                  className="h-7 px-2.5 rounded-md bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 flex items-center gap-1.5 text-[10px] font-bold text-[#dbdbdb] transition-colors uppercase tracking-wider"
                >
                  Status <ChevronDown className="size-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36 rounded-xl bg-zinc-800 border-zinc-700">
                {['draft', 'ready', 'exported', 'posted'].map(s => (
                  <DropdownMenuItem
                    key={s}
                    onClick={() => handleBulkStatusChange(s)}
                    className="text-[11px] font-bold text-[#dbdbdb] focus:bg-zinc-700 capitalize"
                  >
                    {s}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              disabled={selectedPostIds.size === 0 || bulkDeleting}
              onClick={handleBulkDelete}
              className="h-7 px-2.5 rounded-md bg-red-600/20 hover:bg-red-600/40 disabled:opacity-40 flex items-center gap-1.5 text-[10px] font-bold text-red-400 transition-colors uppercase tracking-wider"
            >
              {bulkDeleting ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
              Delete
            </button>
          </div>
        )}

        {/* Video Grid */}
        <div className="grid grid-cols-3 gap-0">
          {/* Create Post Card */}
          <Popover open={showNewPostPopover} onOpenChange={setShowNewPostPopover}>
            <PopoverTrigger asChild>
              <div 
                className="group relative aspect-[3/4] cursor-pointer overflow-hidden bg-[#171717] border border-zinc-700 hover:border-zinc-600 transition-all flex flex-col items-center justify-center gap-2 hover:bg-zinc-900"
              >
                {generatingPost ? (
                  <>
                    <Loader2 className="size-6 animate-spin text-[#dbdbdb]/60" />
                    <span className="text-xs font-bold text-[#dbdbdb]/60 uppercase tracking-wider">Generating...</span>
                  </>
                ) : (
                  <>
                    <div className="size-8 rounded-full bg-zinc-800 shadow-sm flex items-center justify-center text-[#dbdbdb]/60 group-hover:text-[#dbdbdb] transition-colors">
                      <Plus className="size-5" />
                    </div>
                    <span className="text-xs font-bold text-[#dbdbdb]/60 group-hover:text-[#dbdbdb] transition-colors uppercase tracking-wider">New Post</span>
                  </>
                )}
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3 rounded-2xl bg-zinc-800 border-zinc-700" align="start">
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-[#dbdbdb]">Generate Posts</h4>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-[#dbdbdb]/60">Number of posts</Label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setBulkCount(Math.max(1, bulkCount - 1))}
                      className="size-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center text-[#dbdbdb] hover:bg-zinc-700 transition-colors"
                    >
                      <Minus className="size-4" />
                    </button>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={bulkCount}
                      onChange={(e) => setBulkCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                      className="h-8 text-center text-sm font-bold bg-zinc-900 border-zinc-700 text-[#dbdbdb] w-14 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      onClick={() => setBulkCount(Math.min(20, bulkCount + 1))}
                      className="size-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center text-[#dbdbdb] hover:bg-zinc-700 transition-colors"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                </div>
                <Button
                  onClick={() => handleGeneratePost(bulkCount)}
                  disabled={generatingPost}
                  className="w-full bg-[#ddfc7b] text-[#171717] hover:bg-[#ddfc7b]/90 font-bold text-sm h-9"
                >
                  {generatingPost ? (
                    <><Loader2 className="size-4 mr-2 animate-spin" /> Generating...</>
                  ) : (
                    <>Generate {bulkCount > 1 ? `${bulkCount} Posts` : 'Post'}</>
                  )}
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Select Mode Toggle - small card */}
          {!selectMode && posts.filter(p => !p.isLoading).length > 0 && (
            <div 
              onClick={() => setSelectMode(true)}
              className="group relative aspect-[3/4] cursor-pointer overflow-hidden bg-[#171717] border border-zinc-700 hover:border-zinc-600 transition-all flex flex-col items-center justify-center gap-2 hover:bg-zinc-900"
            >
              <div className="size-8 rounded-full bg-zinc-800 shadow-sm flex items-center justify-center text-[#dbdbdb]/60 group-hover:text-[#dbdbdb] transition-colors">
                <CheckSquare className="size-5" />
              </div>
              <span className="text-xs font-bold text-[#dbdbdb]/60 group-hover:text-[#dbdbdb] transition-colors uppercase tracking-wider">Select</span>
            </div>
          )}

          {/* Post Cards */}
          {posts.map((post) => (
            post.isLoading ? (
              <div
                key={post.id}
                className="group relative aspect-[3/4] overflow-hidden bg-zinc-900 border border-zinc-800 transition-all duration-300"
              >
                <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                  <div className="size-8 border-2 border-[#dbdbdb]/40 border-t-transparent rounded-full animate-spin" />
                  <span className="text-[#dbdbdb]/60 text-[10px] font-bold uppercase tracking-tighter">Generating...</span>
                </div>
              </div>
            ) : selectMode ? (
              <div
                key={post.id}
                onClick={() => togglePostSelection(post.id)}
                className={cn(
                  "group relative aspect-[3/4] overflow-hidden cursor-pointer transition-all border",
                  selectedPostIds.has(post.id)
                    ? "border-[#ddfc7b] ring-2 ring-[#ddfc7b]/30"
                    : "border-zinc-800 hover:border-zinc-700"
                )}
              >
                {/* Selection checkbox overlay */}
                <div className={cn(
                  "absolute top-2 left-2 z-20 size-6 rounded-md flex items-center justify-center transition-all",
                  selectedPostIds.has(post.id)
                    ? "bg-[#ddfc7b] text-[#171717]"
                    : "bg-black/50 backdrop-blur-sm text-white/60"
                )}>
                  {selectedPostIds.has(post.id) ? (
                    <Check className="size-4" />
                  ) : (
                    <Square className="size-4" />
                  )}
                </div>
                {/* Render actual card content */}
                {post.type === 'carousel' && post.content ? (
                  <div className="w-full h-full pointer-events-none">
                    <PostCarouselCard
                      postId={post.id}
                      postContent={post.content}
                      status={post.status}
                      title={post.title}
                      caption={post.caption}
                    />
                  </div>
                ) : (
                  <>
                    {post.status === 'posted' && (
                      <div className="absolute top-2 right-2 z-10">
                        <Badge className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 backdrop-blur-md border-none bg-green-500/20 text-green-400">
                          <CheckCircle2 className="size-2.5 mr-1" />
                          Posted
                        </Badge>
                      </div>
                    )}
                    {post.thumbnail ? (
                      <Image
                        src={post.thumbnail}
                        alt={`Post ${post.id}`}
                        width={300}
                        height={400}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                        <span className="text-[#dbdbdb]/60 text-[10px] font-bold uppercase tracking-tighter">No image</span>
                      </div>
                    )}
                  </>
                )}
                {/* Dim overlay when not selected */}
                {!selectedPostIds.has(post.id) && (
                  <div className="absolute inset-0 bg-black/20 pointer-events-none" />
                )}
              </div>
            ) : post.type === 'carousel' && post.content ? (
              <PostCarouselCard
                key={post.id}
                postId={post.id}
                postContent={post.content}
                status={post.status}
                title={post.title}
                caption={post.caption}
                onDelete={() => {
                  setPostToDelete(post.id)
                  setShowDeleteDialog(true)
                }}
                onExpand={() => {
                  setSelectedPost(post)
                  setShowPostModal(true)
                }}
                onStatusChange={(newStatus) => {
                  setPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: newStatus } : p))
                }}
              />
            ) : (
              <div
                key={post.id}
                onClick={() => {
                  setSelectedPost(post)
                  setShowPostModal(true)
                }}
                className="group relative aspect-[3/4] overflow-hidden bg-muted border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer"
              >
                {post.status === 'posted' && (
                  <div className="absolute top-2 left-2 z-20">
                    <Badge 
                      className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 backdrop-blur-md border-none bg-green-500/20 text-green-400"
                    >
                      <CheckCircle2 className="size-2.5 mr-1" />
                      Posted
                    </Badge>
                  </div>
                )}
                {post.thumbnail ? (
                  <Image
                    src={post.thumbnail}
                    alt={`Post ${post.id}`}
                    width={300}
                    height={400}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                    <span className="text-[#dbdbdb]/60 text-[10px] font-bold uppercase tracking-tighter">No image</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                {(post.type === 'video' || post.type === 'carousel') && (
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white drop-shadow-md">
                    <Play className="size-3.5 fill-white" />
                    <span className="text-[11px] font-bold">{post.views}</span>
                  </div>
                )}
              </div>
            )
          ))}
        </div>
      </div>

      {/* Template Selector Modal */}
      {account && (
        <TemplateSelectorModal
          open={showTemplateModal}
          onOpenChange={setShowTemplateModal}
          selectedTemplateId={account.template_id || null}
          onSelectTemplate={(templateId) => updateAccountField('template_id', templateId)}
          organizationId={account.organization_id}
        />
      )}

      {/* Credit Limit Modal */}
      <CreditLimitModal 
        open={showCreditModal}
        onOpenChange={setShowCreditModal}
      />

      {/* Post Preview Modal */}
      {selectedPost && (
        <PostPreviewModal
          open={showPostModal}
          onOpenChange={setShowPostModal}
          postId={selectedPost.id}
          postContent={selectedPost.content}
          accountName={account?.name}
          accountUsername={account?.username || undefined}
          title={selectedPost.title}
          caption={selectedPost.caption}
          status={selectedPost.status}
          onDelete={() => {
            setPosts(prev => prev.filter(p => p.id !== selectedPost.id))
            setSelectedPost(null)
            setShowPostModal(false)
          }}
          onStatusChange={(newStatus) => {
            setPosts(prev => prev.map(p => p.id === selectedPost.id ? { ...p, status: newStatus } : p))
            setSelectedPost((prev: any) => prev ? { ...prev, status: newStatus } : prev)
          }}
        />
      )}

      {/* Prompt Modal */}
      <Dialog open={showPromptModal} onOpenChange={setShowPromptModal}>
        <DialogContent className="sm:max-w-[700px] rounded-2xl bg-zinc-800 border-zinc-700 max-h-[85vh] flex flex-col">
          <DialogHeader className="pb-3">
            <DialogTitle className="text-base font-bold tracking-tight text-[#dbdbdb]">
              Account Prompt
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden flex flex-col">
            <textarea
              className="text-sm leading-relaxed text-[#dbdbdb] bg-zinc-900/50 p-4 rounded-xl border border-zinc-700 w-full min-h-[400px] resize-none outline-none focus:ring-1 focus:ring-zinc-600 focus:bg-zinc-900 transition-all font-mono"
              value={account.prompt || ""}
              onChange={(e) => setAccount({ ...account, prompt: e.target.value })}
              onBlur={(e) => updateAccountField('prompt', e.target.value)}
              placeholder="Enter the AI prompt for this account..."
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Post Confirmation Modal */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-[#171717] border-zinc-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#dbdbdb]">Delete Carousel</AlertDialogTitle>
            <AlertDialogDescription className="text-[#dbdbdb]/80">
              Are you sure you want to delete this carousel? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-[#dbdbdb] hover:bg-zinc-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!postToDelete) return
                
                try {
                  const { error } = await supabase
                    .from('posts')
                    .delete()
                    .eq('id', postToDelete)

                  if (error) throw error

                  setPosts(prev => prev.filter(p => p.id !== postToDelete))
                  toast.success('Carousel deleted')
                  setShowDeleteDialog(false)
                  setPostToDelete(null)
                } catch (error: any) {
                  console.error('Error deleting carousel:', error)
                  toast.error(error.message || 'Failed to delete carousel')
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Account Confirmation Modal */}
      <AlertDialog open={showDeleteAccountDialog} onOpenChange={setShowDeleteAccountDialog}>
        <AlertDialogContent className="bg-[#171717] border-zinc-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#dbdbdb]">Delete Account</AlertDialogTitle>
            <AlertDialogDescription className="text-[#dbdbdb]/80">
              Are you sure you want to delete this account? This will permanently delete the account and all associated posts. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              className="bg-zinc-800 border-zinc-700 text-[#dbdbdb] hover:bg-zinc-700"
              disabled={deletingAccount}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!accountId) return
                
                setDeletingAccount(true)
                try {
                  const { error } = await supabase
                    .from('accounts')
                    .delete()
                    .eq('id', accountId)

                  if (error) throw error

                  toast.success('Account deleted successfully')
                  router.push('/dashboard')
                } catch (error: any) {
                  console.error('Error deleting account:', error)
                  toast.error(error.message || 'Failed to delete account')
                  setDeletingAccount(false)
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
              disabled={deletingAccount}
            >
              {deletingAccount ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
