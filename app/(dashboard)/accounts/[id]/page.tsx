"use client"

import { useState, useEffect, useMemo, useTransition } from "react"
import { useParams } from "next/navigation"
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
  Check
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
  const [isPending, startTransition] = useTransition()
  
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function loadAccountData() {
      if (!accountId) return

      startTransition(() => {
        setLoading(true)
      })

      try {
        // Fetch account first with organization credits
        const { data: accountData, error: accountError } = await supabase
          .from('accounts')
          .select('*, organizations(credits)')
          .eq('id', accountId)
          .single()

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
        
        setAccount(accountData)

        // Fetch templates with first slide (after account is loaded)
        const { data: templatesData, error: templatesError } = await supabase
          .from('templates')
          .select(`
            *,
            template_slides (
              id,
              position,
              background_type,
              background_image_id,
              background_color,
              background_image_url
            )
          `)
          .or(`organization_id.eq.${accountData.organization_id},is_premade.eq.true`)
        
        if (templatesError) {
          console.error('Error loading templates:', templatesError)
          toast.error('Failed to load templates')
        } else {
          // Fetch layers for first slide of each template
          const templateIds = templatesData?.map(t => t.id).filter(Boolean) || []
          let layersBySlide: Record<string, any[]> = {}
          
          if (templateIds.length > 0) {
            const slideIdsByTemplate: Record<string, string[]> = {}
            templatesData?.forEach(t => {
              const sortedSlides = [...(t.template_slides || [])].sort((a: any, b: any) => a.position - b.position)
              if (sortedSlides.length > 0 && sortedSlides[0].id) {
                if (!slideIdsByTemplate[t.id]) {
                  slideIdsByTemplate[t.id] = []
                }
                slideIdsByTemplate[t.id].push(sortedSlides[0].id)
              }
            })

            const allSlideIds = Object.values(slideIdsByTemplate).flat()
            
            if (allSlideIds.length > 0) {
              const { data: layersData } = await supabase
                .from('template_layers')
                .select('*')
                .in('slide_id', allSlideIds)
              
              if (layersData) {
                layersData.forEach((layer: any) => {
                  if (layer.slide_id) {
                    if (!layersBySlide[layer.slide_id]) {
                      layersBySlide[layer.slide_id] = []
                    }
                    layersBySlide[layer.slide_id].push(layer)
                  }
                })
              }
            }
          }
          
          // Transform to include first slide and its layers
          const templatesWithThumbnails = templatesData?.map(t => {
            const sortedSlides = [...(t.template_slides || [])].sort((a: any, b: any) => a.position - b.position)
            const firstSlide = sortedSlides[0] || null
            const firstSlideLayers = firstSlide?.id ? (layersBySlide[firstSlide.id] || []) : []
            
            return { 
              ...t, 
              firstSlide,
              firstSlideLayers
            }
          })

          setTemplates(templatesWithThumbnails || [])
        }

        // Fetch posts
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select('*')
          .eq('account_id', accountId)
          .order('created_at', { ascending: false })

        if (postsError) {
          console.error('Error loading posts:', postsError)
          toast.error('Failed to load posts')
          setPosts([])
          setLoading(false)
          return
        }

        if (!postsData || postsData.length === 0) {
          setPosts([])
          setLoading(false)
          return
        }

        // Fetch all post images for these posts
        const postIds = postsData.map(p => p.id)
        const { data: postImagesData, error: postImagesError } = await supabase
          .from('post_images')
          .select(`
            post_id,
            position,
            images (
              url,
              storage_path
            )
          `)
          .in('post_id', postIds)
          .order('position', { ascending: true })

        if (postImagesError) {
          console.error('Error loading post images:', postImagesError)
          // Continue without images rather than failing completely
        }

        // Create a map of post_id -> first image
        const imageMap = new Map<string, string>()
        if (postImagesData) {
          postImagesData.forEach((pi: any) => {
            if (!imageMap.has(pi.post_id) && pi.images?.url) {
              imageMap.set(pi.post_id, pi.images.url)
            }
          })
        }

        // Transform posts to include thumbnail and content
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
      } catch (error: any) {
        console.error('Unexpected error loading account:', error)
        toast.error(error?.message || 'An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    }

    loadAccountData()
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

      if (field === 'username' || field === 'name') {
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

  const handleGeneratePost = async () => {
    // Check credits
    const currentCredits = (account?.organizations as any)?.credits ?? 0
    if (currentCredits <= 0) {
      setShowCreditModal(true)
      return
    }

    if (!account?.template_id) {
      toast.error('Please select a template first')
      setShowTemplateModal(true)
      return
    }

    if (!account.prompt) {
      toast.error('Please add an account prompt first')
      return
    }

    // Ensure the latest prompt is saved to the database before generating
    await updateAccountField('prompt', account.prompt)

    const tempId = `pending-${Date.now()}`
    setPendingPostId(tempId)

    // Optimistically update credits immediately (before API call)
    const newCredits = currentCredits - 1
    window.dispatchEvent(new CustomEvent('credits-updated', { 
      detail: { credits: newCredits, organizationId: account.organization_id } 
    }))
    setAccount((prev: any) => ({
      ...prev,
      organizations: { ...prev.organizations, credits: newCredits }
    }))

    // Add loading skeleton to posts
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: accountId,
          templateId: account.template_id,
          prompt: account.prompt,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 402) {
          // Revert credit deduction on insufficient credits error
          window.dispatchEvent(new CustomEvent('credits-updated', { 
            detail: { credits: currentCredits, organizationId: account.organization_id } 
          }))
          setAccount((prev: any) => ({
            ...prev,
            organizations: { ...prev.organizations, credits: currentCredits }
          }))
          setShowCreditModal(true)
          // Remove loading skeleton
          setPosts(prev => prev.filter(p => p.id !== tempId))
          setPendingPostId(null)
          return
        }
        throw new Error(data.error || 'Failed to generate post')
      }

      // Fetch the new post with thumbnail
      const { data: newPostData, error: postError } = await supabase
        .from('posts')
        .select('*')
        .eq('id', data.post.id)
        .single()

      if (postError) {
        throw postError
      }

      // Fetch thumbnail if available
      const { data: postImagesData } = await supabase
        .from('post_images')
        .select(`
          post_id,
          position,
          images (url, storage_path)
        `)
        .eq('post_id', data.post.id)
        .order('position', { ascending: true })
        .limit(1)

      const imagesData = postImagesData?.[0]?.images as any
      const thumbnail = (Array.isArray(imagesData) ? imagesData?.[0]?.url : imagesData?.url) || null
      const metrics = (newPostData.metrics as any) || {}
      const views = metrics.views || 0

      // Replace loading skeleton with actual post in place (smooth transition)
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

      // Sync credits from server response (in case of any discrepancy)
      if (typeof data.newCredits === 'number') {
        window.dispatchEvent(new CustomEvent('credits-updated', { 
          detail: { credits: data.newCredits, organizationId: account.organization_id } 
        }))
        setAccount((prev: any) => ({
          ...prev,
          organizations: { ...prev.organizations, credits: data.newCredits }
        }))
      }

      toast.success('Post generated successfully!')
    } catch (error: any) {
      console.error('Error generating post:', error)
      // Revert credit deduction on error
      window.dispatchEvent(new CustomEvent('credits-updated', { 
        detail: { credits: currentCredits, organizationId: account.organization_id } 
      }))
      setAccount((prev: any) => ({
        ...prev,
        organizations: { ...prev.organizations, credits: currentCredits }
      }))
      // Remove loading skeleton
      setPosts(prev => prev.filter(p => p.id !== tempId))
      toast.error(error.message || 'Failed to generate post')
    } finally {
      setPendingPostId(null)
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
      {/* Subtle loading indicator when switching accounts */}
      {loading && account && (
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 bg-zinc-800/90 backdrop-blur-sm rounded-lg border border-zinc-700 shadow-lg">
          <Loader2 className="size-3.5 animate-spin text-[#ddfc7b]" />
          <span className="text-[10px] font-bold text-[#dbdbdb]">Loading...</span>
        </div>
      )}
      <div className={cn(
        "max-w-[600px] mx-auto px-4 pt-6 transition-opacity duration-200",
        loading && account && "opacity-60"
      )}>
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
            <Button variant="outline" size="icon" className="h-9 w-9 border border-zinc-700 rounded-md">
              <Plus className="size-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-9 px-4 border border-zinc-700 rounded-md text-sm font-bold text-[#dbdbdb] hover:bg-zinc-700 flex items-center gap-2">
                  {account.status ? account.status.charAt(0).toUpperCase() + account.status.slice(1) : 'Planning'}
                  <ChevronDown className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 rounded-xl bg-zinc-800 border-zinc-700">
                <DropdownMenuItem 
                  onClick={() => updateAccountField('status', 'planning')}
                  className={`text-[11px] font-bold gap-2 ${
                    account.status === 'planning' 
                      ? 'text-[#ddfc7b] focus:text-[#ddfc7b]' 
                      : 'text-[#dbdbdb] focus:text-[#dbdbdb]'
                  } focus:bg-zinc-700`}
                >
                  Planning
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => updateAccountField('status', 'active')}
                  className={`text-[11px] font-bold gap-2 ${
                    account.status === 'active' 
                      ? 'text-[#ddfc7b] focus:text-[#ddfc7b]' 
                      : 'text-[#dbdbdb] focus:text-[#dbdbdb]'
                  } focus:bg-zinc-700`}
                >
                  Active
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => updateAccountField('status', 'paused')}
                  className={`text-[11px] font-bold gap-2 ${
                    account.status === 'paused' 
                      ? 'text-[#ddfc7b] focus:text-[#ddfc7b]' 
                      : 'text-[#dbdbdb] focus:text-[#dbdbdb]'
                  } focus:bg-zinc-700`}
                >
                  Paused
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => updateAccountField('status', 'archived')}
                  className={`text-[11px] font-bold gap-2 ${
                    account.status === 'archived' 
                      ? 'text-[#ddfc7b] focus:text-[#ddfc7b]' 
                      : 'text-[#dbdbdb] focus:text-[#dbdbdb]'
                  } focus:bg-zinc-700`}
                >
                  Archived
                </DropdownMenuItem>
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

        {/* Video Grid */}
        <div className="grid grid-cols-3 gap-0">
          {/* Create Post Card */}
          <div 
            onClick={handleGeneratePost}
            className="group relative aspect-[3/4] cursor-pointer overflow-hidden bg-[#171717] border border-zinc-700 hover:border-zinc-600 transition-all flex flex-col items-center justify-center gap-2 hover:bg-zinc-900"
          >
            <div className="size-8 rounded-full bg-zinc-800 shadow-sm flex items-center justify-center text-[#dbdbdb]/60 group-hover:text-[#dbdbdb] transition-colors">
              <Plus className="size-5" />
            </div>
            <span className="text-xs font-bold text-[#dbdbdb]/60 group-hover:text-[#dbdbdb] transition-colors uppercase tracking-wider">New Post</span>
          </div>

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
                  // Don't open preview if status is "posted"
                  if (post.status === 'posted') {
                    return
                  }
                  setSelectedPost(post)
                  setShowPostModal(true)
                }}
                className={cn(
                  "group relative aspect-[3/4] overflow-hidden bg-muted border border-zinc-800 hover:border-zinc-700 transition-colors",
                  post.status === 'posted' ? 'cursor-default' : 'cursor-pointer'
                )}
              >
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

      {/* Delete Confirmation Modal */}
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
    </div>
  )
}
