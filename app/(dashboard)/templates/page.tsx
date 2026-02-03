"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { 
  Layout, 
  Search, 
  Plus, 
  MoreHorizontal,
  BookTemplate,
  Trash2,
  Edit2,
  Copy,
  Filter
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
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
import { TemplateEditorModal } from "@/components/template-editor/template-editor-modal"
import { EditorCanvas } from "@/components/template-editor/editor-canvas"
import { TemplateSlide, TemplateLayer } from "@/components/template-editor/types"

function TemplatesPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [visibilityFilter, setVisibilityFilter] = useState<string>("all") // "all", "private", "public"
  const [showEditorModal, setShowEditorModal] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [autoEditMode, setAutoEditMode] = useState(false)
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null)
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null)
  
  const supabase = useMemo(() => createClient(), [])

  // Check for ?new=true query param to auto-open new template modal
  useEffect(() => {
    if (searchParams.get('new') === 'true' && !loading && currentOrgId) {
      setAutoEditMode(false)
      setSelectedTemplateId(null)
      setShowEditorModal(true)
      // Clear the query param
      router.replace('/templates', { scroll: false })
    }
  }, [searchParams, loading, currentOrgId, router])


  const loadTemplates = async () => {
    try {
      // Get user's org
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

      // Build query based on orgId
      let query = supabase
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

      if (orgId) {
        query = query.or(`organization_id.eq.${orgId},is_premade.eq.true`)
      } else {
        query = query.eq('is_premade', true)
      }

      const { data, error } = await query
        .order('is_premade', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error

      // Fetch layers for first slide of each template
      const templateIds = data?.map(t => t.id).filter(Boolean) || []
      let layersBySlide: Record<string, TemplateLayer[]> = {}
      
      if (templateIds.length > 0) {
        // Get all slides with their template_id
        const slideIdsByTemplate: Record<string, string[]> = {}
        data?.forEach(t => {
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
      const templatesWithThumbnails = data?.map(t => {
        const sortedSlides = [...(t.template_slides || [])].sort((a: any, b: any) => a.position - b.position)
        const firstSlide = sortedSlides[0] || null
        const firstSlideLayers = firstSlide?.id ? (layersBySlide[firstSlide.id] || []) : []
        
        return { 
          ...t, 
          firstSlide: firstSlide as TemplateSlide | null,
          firstSlideLayers: firstSlideLayers as TemplateLayer[]
        }
      })

      setTemplates(templatesWithThumbnails || [])
    } catch (error: any) {
      console.error(error)
      toast.error("Failed to load templates")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTemplates()
  }, [supabase])

  const handleDeleteTemplate = async () => {
    if (!deleteTemplateId) return

    try {
      const { error } = await supabase
        .from('templates')
        .delete()
        .eq('id', deleteTemplateId)

      if (error) throw error

      toast.success("Template deleted")
      loadTemplates()
    } catch (error: any) {
      toast.error("Failed to delete template: " + error.message)
    } finally {
      setDeleteTemplateId(null)
    }
  }

  const handleDuplicateTemplate = async (template: any) => {
    try {
      toast.loading("Duplicating template...", { id: 'duplicating' })
      
      // 1. Create new template record
      const { data: newTemplate, error: templateError } = await supabase
        .from('templates')
        .insert({
          organization_id: currentOrgId,
          name: `${template.name} (Copy)`,
          description: template.description,
          type: template.type,
          aspect_ratio: template.aspect_ratio,
          width: template.width,
          height: template.height,
          prompt: template.prompt,
          is_premade: false
        })
        .select()
        .single()

      if (templateError) throw templateError

      // 2. Fetch slides and layers to duplicate
      const { data: slides } = await supabase
        .from('template_slides')
        .select('*')
        .eq('template_id', template.id)
      
      if (slides) {
        for (const slide of slides) {
          const { data: newSlide, error: slideError } = await supabase
            .from('template_slides')
            .insert({
              template_id: newTemplate.id,
              position: slide.position,
              background_type: slide.background_type,
              background_color: slide.background_color,
              background_image_id: slide.background_image_id,
              background_collection_id: slide.background_collection_id,
              video_url: slide.video_url,
              video_collection_id: slide.video_collection_id
            })
            .select()
            .single()

          if (slideError) throw slideError

          // Duplicate layers for this slide
          const { data: layers } = await supabase
            .from('template_layers')
            .select('*')
            .eq('slide_id', slide.id)
          
          if (layers && layers.length > 0) {
            const layersToInsert = layers.map(l => ({
              slide_id: newSlide.id,
              type: l.type,
              position: l.position,
              x: l.x,
              y: l.y,
              width: l.width,
              text_content: l.text_content,
              font_family: l.font_family,
              font_size: l.font_size,
              font_weight: l.font_weight,
              text_color: l.text_color,
              text_align: l.text_align,
              background_color: l.background_color,
              stroke_color: l.stroke_color,
              stroke_width: l.stroke_width,
              image_id: l.image_id,
              image_collection_id: l.image_collection_id,
              image_source_type: l.image_source_type
            }))

            await supabase.from('template_layers').insert(layersToInsert)
          }
        }
      }

      toast.success("Template duplicated", { id: 'duplicating' })
      loadTemplates()
    } catch (error: any) {
      toast.error("Failed to duplicate: " + error.message, { id: 'duplicating' })
    }
  }

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = typeFilter === "all" || t.type === typeFilter
    const matchesVisibility = visibilityFilter === "all" || 
      (visibilityFilter === "public" && t.is_premade) ||
      (visibilityFilter === "private" && !t.is_premade)
    return matchesSearch && matchesType && matchesVisibility
  })

  const handleTemplateClick = (template: any) => {
    setAutoEditMode(false)
    setSelectedTemplateId(template.id)
    setShowEditorModal(true)
  }

  const handleCreateNew = () => {
    setAutoEditMode(false)
    setSelectedTemplateId(null)
    setShowEditorModal(true)
  }

  const handleSaved = () => {
    loadTemplates()
  }

  if (loading) {
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
              <Skeleton className="h-11 w-[140px] rounded-xl bg-zinc-800" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="aspect-[9/16] w-full bg-zinc-800" />
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
              <h1 className="text-3xl font-bold tracking-tight text-[#dbdbdb]">Templates</h1>
              <p className="text-[#dbdbdb]/60 text-sm">Create and manage post templates for your accounts.</p>
            </div>
            <Button 
              onClick={handleCreateNew}
              className="bg-[#ddfc7b] text-[#171717] hover:bg-[#ddfc7b]/90 rounded-xl px-5 h-10 gap-2"
            >
              <Plus className="size-4" />
              <span>Create Template</span>
            </Button>
          </div>

          {/* Search and Filters */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#dbdbdb]/60" />
              <Input 
                placeholder="Search templates..." 
                className="pl-10 h-11 rounded-xl border-zinc-700 bg-zinc-800 text-[#dbdbdb] focus:bg-zinc-800 focus:border-zinc-600 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px] h-11 rounded-xl border-zinc-700 bg-zinc-800 text-[#dbdbdb]">
                <Filter className="size-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl bg-zinc-800 border-zinc-700">
                <SelectItem value="all" className="text-[#dbdbdb]">All Types</SelectItem>
                <SelectItem value="carousel" className="text-[#dbdbdb]">Carousel</SelectItem>
                <SelectItem value="video" className="text-[#dbdbdb]">Video</SelectItem>
              </SelectContent>
            </Select>
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
            {filteredTemplates.map((template) => (
              <div 
                key={template.id}
                onClick={() => handleTemplateClick(template)}
                className="group relative aspect-[9/16] border border-zinc-700 bg-zinc-800 hover:border-zinc-600 transition-all cursor-pointer overflow-hidden shadow-sm hover:shadow-md"
              >
                {/* Thumbnail Preview */}
                <div className="absolute inset-0 bg-zinc-900 overflow-hidden flex items-center justify-center">
                  {template.firstSlide ? (
                    <EditorCanvas
                      template={{
                        ...template,
                        width: template.width || 1080,
                        height: template.height || 1920
                      }}
                      slide={template.firstSlide}
                      layers={template.firstSlideLayers || []}
                      selectedLayerId={null}
                      onSelectLayer={() => {}}
                      onUpdateLayer={() => {}}
                      readOnly={true}
                      isPreview={true}
                      fillWidth={true}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                      <Layout className="size-8 text-zinc-700" />
                    </div>
                  )}
                  
                  {/* Overlay Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity pointer-events-none" />
                </div>

                {/* Badges */}
                <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
                  {template.is_premade && (
                    <Badge 
                      className="bg-[#ddfc7b]/90 backdrop-blur-md text-[#171717] border-none shadow-sm text-[8px] px-1.5 py-0 font-bold uppercase"
                    >
                      Premade
                    </Badge>
                  )}
                </div>

                {/* Content Overlay */}
                <div className="absolute inset-x-0 bottom-0 p-3 flex flex-col gap-1.5">
                  <div className="flex items-start justify-between">
                    <h3 className="font-bold text-white text-xs line-clamp-2 leading-tight drop-shadow-sm">
                      {template.name}
                    </h3>
                  </div>
                  
                  <div className="flex items-center gap-3 text-[10px] font-medium text-white/80">
                    <div className="flex items-center gap-1">
                      <Layout className="size-3" />
                      <span>{template.template_slides?.length || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="uppercase tracking-tighter opacity-70">{template.type}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="uppercase tracking-tighter opacity-70">{template.aspect_ratio}</span>
                    </div>
                  </div>
                </div>

                {/* Action Button - Only visible on hover */}
                {!template.is_premade && (
                  <div className="absolute top-2.5 right-2.5 z-30">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button 
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-lg text-white opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100"
                        >
                          <MoreHorizontal className="size-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-32 rounded-xl bg-zinc-800 border-zinc-700">
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation()
                            setAutoEditMode(true)
                            setSelectedTemplateId(template.id)
                            setShowEditorModal(true)
                          }}
                          className="text-[11px] font-bold gap-2 text-[#dbdbdb] focus:text-[#dbdbdb] focus:bg-zinc-700"
                        >
                          <Edit2 className="size-3" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDuplicateTemplate(template)
                          }}
                          className="text-[11px] font-bold gap-2 text-[#dbdbdb] focus:text-[#dbdbdb] focus:bg-zinc-700"
                        >
                          <Copy className="size-3" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteTemplateId(template.id)
                          }}
                          className="text-[11px] font-bold gap-2 text-red-400 focus:text-red-400 focus:bg-red-900/20"
                        >
                          <Trash2 className="size-3" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            ))}

            {filteredTemplates.length === 0 && (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-center bg-zinc-800/50 rounded-3xl border border-dashed border-zinc-700">
                <div className="size-12 rounded-2xl bg-zinc-800 flex items-center justify-center mb-4">
                  <BookTemplate className="size-6 text-[#dbdbdb]/60" />
                </div>
                <h3 className="font-bold text-[#dbdbdb]">No templates found</h3>
                <p className="text-sm text-[#dbdbdb]/60 mt-1">Try a different search or create a new template.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={!!deleteTemplateId} onOpenChange={(open) => !open && setDeleteTemplateId(null)}>
        <AlertDialogContent className="rounded-2xl bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#dbdbdb]">Delete Template</AlertDialogTitle>
            <AlertDialogDescription className="text-[#dbdbdb]/60">
              Are you sure you want to delete this template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl bg-zinc-800 border-zinc-700 text-[#dbdbdb] hover:bg-zinc-700">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteTemplate}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {currentOrgId && (
        <TemplateEditorModal
          open={showEditorModal}
          onOpenChange={(open) => {
            setShowEditorModal(open)
            if (!open) {
              setAutoEditMode(false) // Reset when modal closes
            }
          }}
          templateId={selectedTemplateId}
          organizationId={currentOrgId}
          onSaved={loadTemplates}
          autoEdit={autoEditMode}
        />
      )}
    </div>
  )
}

export default function TemplatesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TemplatesPageContent />
    </Suspense>
  )
}
