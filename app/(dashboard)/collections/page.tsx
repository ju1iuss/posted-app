"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import * as VisuallyHidden from "@radix-ui/react-visually-hidden"
import { 
  Library, 
  Search, 
  Plus, 
  MoreHorizontal,
  Trash2,
  Edit2,
  Image as ImageIcon,
  Upload,
  X,
  Loader2,
  ChevronLeft,
  Filter,
  Maximize
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
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
import { toast } from "sonner"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

export default function CollectionsPage() {
  const [collections, setCollections] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [visibilityFilter, setVisibilityFilter] = useState<string>("all") // "all", "private", "public"
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null)
  
  // Create Collection State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState("")
  const [uploading, setUploading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null)

  // Details Modal State
  const [selectedCollection, setSelectedCollection] = useState<any>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [collectionImages, setCollectionImages] = useState<any[]>([])
  const [loadingImages, setLoadingImages] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState("")
  const [isDragging, setIsDragging] = useState(false)

  // Delete Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [collectionToDelete, setCollectionToDelete] = useState<string | null>(null)

  // Expanded Image State
  const [expandedImage, setExpandedImage] = useState<string | null>(null)

  const supabase = useMemo(() => createClient(), [])

  const loadCollections = useCallback(async () => {
    try {
      setLoading(true)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!user) return

      const { data: orgMembers, error: orgError } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('profile_id', user.id)
        .limit(1)
        .single()

      if (orgError && orgError.code !== 'PGRST116') throw orgError

      const orgId = orgMembers?.organization_id
      setCurrentOrgId(orgId)

      // Build query - handle null orgId case
      let query = supabase
        .from('collections')
        .select(`
          *,
          collection_images!left (
            image:images (
              url
            )
          )
        `)

      if (orgId) {
        query = query.or(`organization_id.eq.${orgId},is_public.eq.true`)
      } else {
        query = query.eq('is_public', true)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error

      // Transform data to get clean image URLs and limit to 4
      const transformedData = data?.map(c => ({
        ...c,
        preview_images: c.collection_images
          ?.map((ci: any) => ci.image?.url)
          .filter(Boolean)
          .slice(0, 4) || [],
        total_count: c.collection_images?.length || 0
      }))

      setCollections(transformedData || [])
    } catch (error: any) {
      console.error(error)
      toast.error("Failed to load collections")
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadCollections()
  }, [loadCollections])

  // Real-time subscription for collections and their images
  useEffect(() => {
    const channel = supabase
      .channel('collections-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'collections'
        },
        () => loadCollections()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'collection_images'
        },
        () => loadCollections()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, loadCollections])

  const loadCollectionImages = useCallback(async (collectionId: string) => {
    try {
      setLoadingImages(true)
      const { data, error } = await supabase
        .from('collection_images')
        .select(`
          id,
          image_id,
          position,
          image:images (*)
        `)
        .eq('collection_id', collectionId)
        .order('position', { ascending: true })

      if (error) throw error
      setCollectionImages(data || [])
    } catch (error: any) {
      console.error(error)
      toast.error("Failed to load images")
    } finally {
      setLoadingImages(false)
    }
  }, [supabase])

  useEffect(() => {
    if (isDetailsModalOpen && selectedCollection) {
      const channel = supabase
        .channel(`collection_images_${selectedCollection.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'collection_images',
            filter: `collection_id=eq.${selectedCollection.id}`
          },
          () => {
            loadCollectionImages(selectedCollection.id)
            loadCollections() // Update the main grid count too
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [isDetailsModalOpen, selectedCollection, supabase, loadCollections, loadCollectionImages])

  const handleCollectionClick = (collection: any) => {
    setSelectedCollection(collection)
    setIsDetailsModalOpen(true)
    setIsEditingName(false)
    setEditedName(collection.name)
    loadCollectionImages(collection.id)
  }

  const handleStartEditName = () => {
    if (!selectedCollection) return
    setIsEditingName(true)
    setEditedName(selectedCollection.name)
  }

  const handleSaveName = async () => {
    if (!selectedCollection || !editedName.trim()) {
      setIsEditingName(false)
      setEditedName(selectedCollection?.name || "")
      return
    }

    const originalName = selectedCollection.name
    const newName = editedName.trim()

    // Optimistic update
    setSelectedCollection({ ...selectedCollection, name: newName })
    setCollections(prev => prev.map(c => 
      c.id === selectedCollection.id ? { ...c, name: newName } : c
    ))
    setIsEditingName(false)

    try {
      const { error } = await supabase
        .from('collections')
        .update({ name: newName })
        .eq('id', selectedCollection.id)

      if (error) throw error
    } catch (error: any) {
      console.error(error)
      // Revert on error
      setSelectedCollection({ ...selectedCollection, name: originalName })
      setCollections(prev => prev.map(c => 
        c.id === selectedCollection.id ? { ...c, name: originalName } : c
      ))
      toast.error("Failed to update collection name")
    }
  }

  const handleCancelEditName = () => {
    setIsEditingName(false)
    setEditedName(selectedCollection?.name || "")
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isDetails: boolean = false) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      if (isDetails) {
        uploadImagesToCollection(files)
      } else {
        setSelectedFiles(prev => [...prev, ...files])
        const newPreviews = files.map(file => URL.createObjectURL(file))
        setPreviews(prev => [...prev, ...newPreviews])
      }
    }
  }

  const uploadImagesToCollection = (files: File[]) => {
    if (!selectedCollection || !currentOrgId) return
    setIsDetailsModalOpen(false)
    uploadImagesToCollectionAsync(selectedCollection.id, files, currentOrgId)
  }

  const removeImageFromCollection = async (collectionImageId: string) => {
    try {
      const { error } = await supabase
        .from('collection_images')
        .delete()
        .eq('id', collectionImageId)

      if (error) throw error

      setCollectionImages(prev => prev.filter(ci => ci.id !== collectionImageId))
      toast.success("Image removed")
      loadCollections() // Refresh the grid
    } catch (error: any) {
      console.error(error)
      toast.error("Failed to remove image")
    }
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
    URL.revokeObjectURL(previews[index])
    setPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const handleDeleteCollectionClick = (e: React.MouseEvent, collectionId: string) => {
    e.stopPropagation() // Prevent opening the modal
    setCollectionToDelete(collectionId)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteCollection = async () => {
    if (!collectionToDelete) return

    try {
      const { error } = await supabase
        .from('collections')
        .delete()
        .eq('id', collectionToDelete)

      if (error) throw error

      setCollections(prev => prev.filter(c => c.id !== collectionToDelete))
      toast.success("Collection deleted")
      setDeleteDialogOpen(false)
      setCollectionToDelete(null)
    } catch (error: any) {
      console.error(error)
      toast.error("Failed to delete collection")
    }
  }

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) {
      toast.error("Please enter a collection name")
      return
    }

    if (selectedFiles.length === 0) {
      toast.error("Please select at least one image")
      return
    }

    if (!currentOrgId) {
      toast.error("No organization selected")
      return
    }

    // Capture values before closing modal
    const name = newCollectionName.trim()
    const files = [...selectedFiles]
    const orgId = currentOrgId

    try {
      setUploading(true)
      
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      
      // Check if collection with same name exists in this org
      const { data: existing } = await supabase
        .from('collections')
        .select('id')
        .eq('organization_id', orgId)
        .eq('slug', slug)
        .single()

      if (existing) {
        toast.error("A collection with this name already exists.")
        setUploading(false)
        return
      }

      const { data: collection, error: collectionError } = await supabase
        .from('collections')
        .insert({
          name: name,
          slug,
          organization_id: orgId,
          is_public: false
        })
        .select()
        .single()

      if (collectionError) throw collectionError

      // Split files: first 4 for synchronous upload, rest for background
      const firstFour = files.slice(0, 4)
      const remaining = files.slice(4)
      
      setUploadProgress({ current: 0, total: files.length })

      // Upload first 4 synchronously to ensure they show up in the grid immediately
      for (let i = 0; i < firstFour.length; i++) {
        const file = firstFour[i]
        setUploadProgress({ current: i + 1, total: files.length })
        
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `${orgId}/uploads/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(filePath, file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('images')
          .getPublicUrl(filePath)

        const { data: image, error: imageError } = await supabase
          .from('images')
          .insert({
            organization_id: orgId,
            storage_path: filePath,
            url: publicUrl,
            filename: file.name,
            source: 'upload',
            size_bytes: file.size,
            mime_type: file.type
          })
          .select()
          .single()

        if (imageError) throw imageError

        // Link image to collection
        const { error: linkError } = await supabase
          .from('collection_images')
          .insert({
            collection_id: collection.id,
            image_id: image.id,
            position: i
          })

        if (linkError) throw linkError

        // Set cover image
        if (i === 0) {
          await supabase
            .from('collections')
            .update({ cover_image_url: publicUrl })
            .eq('id', collection.id)
        }
      }

      // Close modal and reset state
      setIsCreateModalOpen(false)
      setNewCollectionName("")
      setSelectedFiles([])
      setPreviews([])
      setUploading(false)
      setUploadProgress(null)
      
      // Refresh the grid to show the new collection with its first 4 images
      loadCollections()
      
      if (remaining.length > 0) {
        // Start background upload for the rest, starting position after the first 4
        uploadImagesToCollectionAsync(collection.id, remaining, orgId, firstFour.length)
        toast.success(`Collection created! First ${firstFour.length} images uploaded, the remaining ${remaining.length} are uploading in the background.`)
      } else {
        toast.success("Collection created successfully!")
      }
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || "Failed to create collection")
      setUploading(false)
    }
  }

  const uploadImagesToCollectionAsync = async (collectionId: string, files: File[], orgId: string, startPos?: number) => {
    const toastId = toast.loading(`Uploading 0/${files.length} images...`)
    setUploading(true)
    setUploadProgress({ current: 0, total: files.length })
    
    try {
      let nextPosition = 0;
      
      if (typeof startPos === 'number') {
        nextPosition = startPos;
      } else {
        // Get the current max position to append new images
        const { data: currentImages } = await supabase
          .from('collection_images')
          .select('position')
          .eq('collection_id', collectionId)
        
        nextPosition = currentImages && currentImages.length > 0
          ? Math.max(...currentImages.map(ci => ci.position || 0)) + 1
          : 0
      }

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const current = i + 1
        toast.loading(`Uploading ${current}/${files.length} images...`, { id: toastId })
        setUploadProgress({ current, total: files.length })
        
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `${orgId}/uploads/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(filePath, file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('images')
          .getPublicUrl(filePath)

        const { data: image, error: imageError } = await supabase
          .from('images')
          .insert({
            organization_id: orgId,
            storage_path: filePath,
            url: publicUrl,
            filename: file.name,
            source: 'upload',
            size_bytes: file.size,
            mime_type: file.type
          })
          .select()
          .single()

        if (imageError) throw imageError

        // Link image to collection
        const { error: linkError } = await supabase
          .from('collection_images')
          .insert({
            collection_id: collectionId,
            image_id: image.id,
            position: nextPosition + i
          })

        if (linkError) throw linkError

        // If it's the first image in the collection, update collection cover
        // Or if the collection currently has no cover
        if (nextPosition + i === 0) {
          await supabase
            .from('collections')
            .update({ cover_image_url: publicUrl })
            .eq('id', collectionId)
        }
      }

      toast.success(`Successfully uploaded ${files.length} images`, { id: toastId })
      loadCollections() // Final refresh to update counts/cover
    } catch (error: any) {
      console.error(error)
      toast.error(`Background upload failed: ${error.message}`, { id: toastId })
    } finally {
      setUploading(false)
      setUploadProgress(null)
    }
  }

  const filteredCollections = collections.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesVisibility = visibilityFilter === "all" ||
      (visibilityFilter === "public" && c.is_public) ||
      (visibilityFilter === "private" && !c.is_public)
    return matchesSearch && matchesVisibility
  })

  if (loading && !collections.length) {
    return (
      <div className="min-h-screen pb-10">
        <div className="max-w-[1000px] mx-auto px-6 pt-10">
          <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-10 w-48 bg-zinc-800" />
                <Skeleton className="h-4 w-64 bg-zinc-800" />
              </div>
              <Skeleton className="h-10 w-36 rounded-xl bg-zinc-800" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-11 flex-1 rounded-xl bg-zinc-800" />
              <Skeleton className="h-11 w-[140px] rounded-xl bg-zinc-800" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex flex-col gap-3 p-2 rounded-2xl border border-zinc-700 bg-zinc-800">
                  <Skeleton className="aspect-square w-full rounded-xl bg-zinc-700" />
                  <div className="px-1 pb-1 space-y-2">
                    <Skeleton className="h-4 w-3/4 bg-zinc-700" />
                    <Skeleton className="h-3 w-1/4 bg-zinc-700" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-10">
      <div className="max-w-[1000px] mx-auto px-6 pt-10">
        <div className="flex flex-col gap-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight text-[#dbdbdb]">Collections</h1>
              <p className="text-[#dbdbdb]/60 text-sm">Organize your images into collections for easy access.</p>
            </div>
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="bg-[#ddfc7b] text-[#171717] hover:bg-[#ddfc7b]/90 rounded-xl px-5 h-10 gap-2"
                >
                  <Plus className="size-4" />
                  <span>New Collection</span>
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rounded-2xl bg-zinc-800 border-zinc-700 max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-[#dbdbdb]">Create New Collection</DialogTitle>
                <DialogDescription className="text-[#dbdbdb]/60">
                  Give your collection a name and upload some images.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <label htmlFor="name" className="text-sm font-medium text-[#dbdbdb]">Name</label>
                  <Input
                    id="name"
                    placeholder="e.g. Summer Vibes 2024"
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    className="rounded-xl bg-zinc-900 border-zinc-700 text-[#dbdbdb]"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-[#dbdbdb]">Images</label>
                  <div 
                    className={cn(
                      "border-2 border-dashed border-zinc-700 rounded-2xl p-8 flex flex-col items-center justify-center gap-2 hover:border-zinc-600 transition-all cursor-pointer bg-zinc-800/50 max-h-[300px] overflow-y-auto",
                      selectedFiles.length > 0 && "p-4 items-start justify-start"
                    )}
                      onClick={() => document.getElementById('file-upload')?.click()}
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (e.dataTransfer.files) {
                          const files = Array.from(e.dataTransfer.files)
                          setSelectedFiles(prev => [...prev, ...files])
                          const newPreviews = files.map(file => URL.createObjectURL(file))
                          setPreviews(prev => [...prev, ...newPreviews])
                        }
                      }}
                    >
                      <input
                        id="file-upload"
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileChange(e, false)}
                      />
                      {previews.length === 0 ? (
                        <>
                          <div className="size-10 rounded-full bg-zinc-800 flex items-center justify-center shadow-sm border border-zinc-700">
                            <Upload className="size-5 text-[#dbdbdb]/60" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-medium text-[#dbdbdb]">Click or drag to upload</p>
                            <p className="text-xs text-[#dbdbdb]/60">PNG, JPG up to 10MB</p>
                          </div>
                        </>
                      ) : (
                        <div className="grid grid-cols-4 gap-2 w-full">
                          {previews.map((preview, index) => (
                            <div key={index} className="relative aspect-square rounded-lg overflow-hidden group">
                              <Image
                                src={preview}
                                alt="Preview"
                                fill
                                className="object-cover"
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  removeFile(index)
                                }}
                                className="absolute top-1 right-1 size-5 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-[#171717] opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="size-3" />
                              </button>
                            </div>
                          ))}
                          <div className="aspect-square rounded-lg border-2 border-dashed border-zinc-700 flex items-center justify-center hover:bg-zinc-900 transition-colors">
                            <Plus className="size-5 text-[#dbdbdb]/60" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="rounded-xl border-zinc-700 text-[#dbdbdb] hover:bg-zinc-800"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateCollection}
                    disabled={uploading || !newCollectionName || selectedFiles.length === 0}
                    className="bg-[#ddfc7b] text-[#171717] hover:bg-[#ddfc7b]/90 rounded-xl px-8"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        {uploadProgress ? `Uploading ${uploadProgress.current}/${uploadProgress.total}...` : "Creating..."}
                      </>
                    ) : (
                      "Create Collection"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search and Filters */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#dbdbdb]/60" />
              <Input 
                placeholder="Search collections..." 
                className="pl-10 h-11 rounded-xl border-zinc-700 bg-zinc-800/50 focus:bg-zinc-800 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
              <SelectTrigger className="w-[140px] h-11 rounded-xl border-zinc-700 bg-zinc-800 text-[#dbdbdb]">
                <Filter className="size-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl bg-zinc-800 border-zinc-700">
                <SelectItem value="all" className="text-[#dbdbdb]">All</SelectItem>
                <SelectItem value="private" className="text-[#dbdbdb]">Private</SelectItem>
                <SelectItem value="public" className="text-[#dbdbdb]">Public</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredCollections.map((collection) => (
              <div 
                key={collection.id}
                onClick={() => handleCollectionClick(collection)}
                className="group flex flex-col gap-3 p-2 rounded-2xl border border-zinc-700 bg-zinc-800 hover:border-zinc-400 transition-all cursor-pointer shadow-sm hover:shadow-md"
              >
                {/* 2x2 Thumbnail Grid */}
                <div className="aspect-square w-full grid grid-cols-2 grid-rows-2 gap-1 rounded-xl overflow-hidden bg-zinc-900 relative group/thumb">
                  {[0, 1, 2, 3].map((idx) => (
                    <div key={idx} className="relative w-full h-full bg-zinc-900 group/item">
                      {collection.preview_images?.[idx] ? (
                        <>
                          <Image
                            src={collection.preview_images[idx]}
                            alt={`${collection.name} preview ${idx}`}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setExpandedImage(collection.preview_images[idx])
                            }}
                            className="absolute top-1 right-1 size-6 rounded-md bg-black/60 hover:bg-black/80 backdrop-blur-sm opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center justify-center text-white z-10"
                            title="View larger"
                          >
                            <Maximize className="size-3" />
                          </button>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="size-4 text-zinc-700" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Info */}
                <div className="px-1 pb-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-[#dbdbdb] text-sm line-clamp-1 leading-tight">
                      {collection.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-[#dbdbdb]/60">
                        <span>{collection.total_count}</span>
                      </div>
                      {!collection.is_public && (
                        <button
                          onClick={(e) => handleDeleteCollectionClick(e, collection.id)}
                          className="size-6 rounded-md flex items-center justify-center text-[#dbdbdb]/40 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                          title="Delete collection"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#dbdbdb]/60">
                    {collection.is_public ? "Public" : "Private"}
                  </span>
                </div>
              </div>
            ))}

            {filteredCollections.length === 0 && (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-center bg-zinc-800/50 rounded-3xl border border-dashed border-zinc-700">
                <div className="size-12 rounded-2xl bg-zinc-900 flex items-center justify-center mb-4">
                  <Library className="size-6 text-[#dbdbdb]/60" />
                </div>
                <h3 className="font-bold text-[#dbdbdb]">No collections found</h3>
                <p className="text-sm text-[#dbdbdb]/60 mt-1">Create your first collection to organize your images.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Details Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent 
          showCloseButton={false}
          className="sm:max-w-[800px] h-[80vh] flex flex-col p-0 rounded-3xl overflow-hidden border border-zinc-700 shadow-2xl bg-zinc-800"
        >
          <VisuallyHidden.Root>
            <DialogTitle>{selectedCollection?.name || "Collection Details"}</DialogTitle>
          </VisuallyHidden.Root>
          <div className="flex flex-col h-full bg-zinc-800">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-700">
              <div className="flex flex-col flex-1 min-w-0">
                {isEditingName ? (
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onBlur={handleSaveName}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveName()
                      } else if (e.key === 'Escape') {
                        handleCancelEditName()
                      }
                    }}
                    autoFocus
                    className="text-xl font-black text-[#dbdbdb] tracking-tight bg-zinc-900 border-zinc-600 focus:border-[#ddfc7b] h-auto py-1 px-2"
                  />
                ) : (
                  <h2 
                    onClick={handleStartEditName}
                    className="text-xl font-black text-[#dbdbdb] tracking-tight cursor-pointer hover:text-[#ddfc7b] transition-colors select-none"
                    title="Click to edit"
                  >
                    {selectedCollection?.name}
                  </h2>
                )}
                <p className="text-[10px] font-bold text-[#dbdbdb]/60 uppercase tracking-widest">
                  {uploading && uploadProgress 
                    ? `Uploading ${uploadProgress.current}/${uploadProgress.total}` 
                    : `${collectionImages.length} Images`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={() => document.getElementById('details-file-upload')?.click()}
                  disabled={uploading}
                  className="bg-[#ddfc7b] text-[#171717] hover:bg-[#ddfc7b]/90 rounded-xl px-4 h-9 gap-2 text-xs font-bold"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="size-3 animate-spin" />
                      {uploadProgress && <span>{uploadProgress.current}/{uploadProgress.total}</span>}
                    </>
                  ) : (
                    <>
                      <Plus className="size-3" />
                      <span>Add Images</span>
                    </>
                  )}
                </Button>
                <input
                  id="details-file-upload"
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileChange(e, true)}
                />
                
                {/* Custom Close Button */}
                <DialogClose asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-xl border border-zinc-700 hover:bg-zinc-900 text-[#dbdbdb]/60 hover:text-[#dbdbdb] transition-all"
                  >
                    <X className="size-5" />
                  </Button>
                </DialogClose>
              </div>
            </div>

            {/* Modal Content - Image Grid */}
            <div 
              className={cn(
                "flex-1 overflow-y-auto p-6 bg-zinc-900/30 relative transition-colors",
                isDragging && "bg-[#ddfc7b]/5 ring-2 ring-inset ring-[#ddfc7b]/20"
              )}
              onDragOver={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setIsDragging(true)
              }}
              onDragLeave={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setIsDragging(false)
              }}
              onDrop={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setIsDragging(false)
                if (e.dataTransfer.files) {
                  const files = Array.from(e.dataTransfer.files)
                  uploadImagesToCollection(files)
                }
              }}
            >
              {isDragging && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-900/40 backdrop-blur-[2px] pointer-events-none">
                  <div className="flex flex-col items-center gap-2 text-[#ddfc7b]">
                    <div className="size-12 rounded-full bg-[#ddfc7b]/10 flex items-center justify-center border border-[#ddfc7b]/20">
                      <Upload className="size-6" />
                    </div>
                    <p className="text-sm font-bold">Drop images to upload</p>
                  </div>
                </div>
              )}
              {loadingImages ? (
                <div className="w-full h-full flex items-center justify-center">
                  <Loader2 className="size-6 animate-spin text-[#dbdbdb]/60" />
                </div>
              ) : collectionImages.length > 0 ? (
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {collectionImages.map((ci) => (
                    <div 
                      key={ci.id} 
                      className="group relative aspect-square rounded-xl overflow-hidden bg-zinc-800 border border-zinc-700 shadow-sm hover:shadow-md transition-all"
                    >
                      <Image
                        src={ci.image.url}
                        alt={ci.image.filename || "Collection image"}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      {/* Action Overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setExpandedImage(ci.image.url)
                          }}
                          className="size-8 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95"
                          title="View larger"
                        >
                          <Maximize className="size-4" />
                        </button>
                        <button
                          onClick={() => removeImageFromCollection(ci.id)}
                          className="size-8 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95"
                          title="Delete"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-center py-12">
                  <div className="size-12 rounded-2xl bg-zinc-800 border border-zinc-700 shadow-sm flex items-center justify-center mb-4">
                    <ImageIcon className="size-6 text-zinc-700" />
                  </div>
                  <h3 className="font-bold text-[#dbdbdb]">No images yet</h3>
                  <p className="text-xs text-[#dbdbdb]/60 mt-1 max-w-[200px]">Upload some images to start your collection.</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl bg-zinc-800 border-zinc-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#dbdbdb]">Delete Collection</AlertDialogTitle>
            <AlertDialogDescription className="text-[#dbdbdb]/60">
              Are you sure you want to delete this collection? This action cannot be undone and will remove all images in this collection.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-zinc-700 text-[#dbdbdb] hover:bg-zinc-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteCollection}
              className="bg-red-500 text-white hover:bg-red-600 rounded-xl"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Expanded Image Modal */}
      {expandedImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-200"
          onClick={() => setExpandedImage(null)}
        >
          <button 
            className="absolute top-6 right-6 size-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all hover:scale-110 z-[110]"
            onClick={() => setExpandedImage(null)}
          >
            <X className="size-6" />
          </button>
          <div className="relative max-w-full max-h-full rounded-2xl overflow-hidden shadow-2xl border border-white/10">
            <img 
              src={expandedImage} 
              className="w-auto h-auto max-w-full max-h-[90vh] object-contain"
              alt="Expanded view"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  )
}
