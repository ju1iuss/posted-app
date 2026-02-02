"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Layout, Check, ExternalLink, Pencil } from "lucide-react"
import { EditorCanvas } from "@/components/template-editor/editor-canvas"
import { TemplateSlide, TemplateLayer } from "@/components/template-editor/types"

interface TemplateSelectorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedTemplateId: string | null
  onSelectTemplate: (templateId: string | null) => void
  organizationId: string
}

export function TemplateSelectorModal({
  open,
  onOpenChange,
  selectedTemplateId,
  onSelectTemplate,
  organizationId
}: TemplateSelectorModalProps) {
  const router = useRouter()
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    if (!open) return

    async function loadTemplates() {
      setLoading(true)
      try {
        // Build query
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
          .or(`organization_id.eq.${organizationId},is_premade.eq.true`)

        const { data, error } = await query
          .order('is_premade', { ascending: false })
          .order('created_at', { ascending: false })

        if (error) throw error

        // Fetch layers for first slide of each template
        const templateIds = data?.map(t => t.id).filter(Boolean) || []
        let layersBySlide: Record<string, TemplateLayer[]> = {}
        
        if (templateIds.length > 0) {
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
      } finally {
        setLoading(false)
      }
    }

    loadTemplates()
  }, [open, organizationId, supabase])

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const handleSelect = (templateId: string | null) => {
    onSelectTemplate(templateId)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] rounded-2xl bg-zinc-800 border-zinc-700 max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-3">
          <DialogTitle className="text-base font-bold tracking-tight text-[#dbdbdb] flex items-center gap-2">
            <Layout className="size-4" />
            Select Template
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[#dbdbdb]/60" />
          <Input 
            placeholder="Search templates..." 
            className="pl-9 h-9 rounded-lg border-zinc-700 bg-zinc-900 text-[#dbdbdb] focus:bg-zinc-800 focus:border-zinc-600 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto pr-2">
          {loading ? (
            <div className="grid grid-cols-3 gap-3 pb-4">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="aspect-[9/16] border-2 border-zinc-700 rounded-lg overflow-hidden bg-zinc-900 animate-pulse"
                >
                  <div className="w-full h-full bg-zinc-800" />
                </div>
              ))}
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="flex items-center justify-center h-48">
              <div className="text-[#dbdbdb]/60 text-sm">No templates found</div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 pb-4">
              {/* None option */}
              <button
                onClick={() => handleSelect(null)}
                className={`
                  relative group aspect-[9/16] border-2 rounded-lg overflow-hidden transition-all cursor-pointer
                  ${selectedTemplateId === null 
                    ? 'border-[#ddfc7b] shadow-lg shadow-[#ddfc7b]/20' 
                    : 'border-zinc-700 hover:border-zinc-600'
                  }
                `}
              >
                <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center">
                  <Layout className="size-6 text-zinc-700" />
                </div>
                {selectedTemplateId === null && (
                  <div className="absolute top-1 right-1 size-4 rounded-full bg-[#ddfc7b] flex items-center justify-center shadow-lg">
                    <Check className="size-2.5 text-[#171717]" />
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/90 to-transparent">
                  <div className="text-[9px] font-bold text-white line-clamp-1 drop-shadow-sm">
                    No Template
                  </div>
                </div>
              </button>

              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSelect(template.id)}
                  className={`
                    relative group aspect-[9/16] border-2 rounded-lg overflow-hidden transition-all cursor-pointer
                    ${selectedTemplateId === template.id 
                      ? 'border-[#ddfc7b] shadow-lg shadow-[#ddfc7b]/20 scale-[0.98]' 
                      : 'border-zinc-700 hover:border-zinc-600 hover:scale-[0.99]'
                    }
                  `}
                >
                  {/* Template Preview */}
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
                      <Layout className="size-6 text-zinc-700" />
                    )}
                  </div>

                  {/* Overlay Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity pointer-events-none" />

                  {/* Badges */}
                  {template.is_premade && (
                    <div className="absolute top-1 left-1">
                      <Badge 
                        className="bg-[#ddfc7b]/90 backdrop-blur-md text-[#171717] border-none shadow-sm text-[7px] px-1 py-0 font-bold uppercase"
                      >
                        Premade
                      </Badge>
                    </div>
                  )}

                  {/* Selected Indicator */}
                  {selectedTemplateId === template.id && (
                    <div className="absolute top-1 right-1 size-4 rounded-full bg-[#ddfc7b] flex items-center justify-center shadow-lg animate-in zoom-in-50 duration-200">
                      <Check className="size-2.5 text-[#171717]" />
                    </div>
                  )}

                  {/* Template Name */}
                  <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/90 to-transparent">
                    <div className="text-[9px] font-bold text-white line-clamp-1 drop-shadow-sm">
                      {template.name}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-zinc-700 flex gap-2">
          <Button
            variant="outline"
            className="flex-1 h-9 text-xs font-medium border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-[#dbdbdb]"
            onClick={() => {
              router.push("/templates")
              onOpenChange(false)
            }}
          >
            <ExternalLink className="size-3.5 mr-1.5" />
            See all templates
          </Button>
          <Button
            variant="outline"
            className="flex-1 h-9 text-xs font-medium border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-[#dbdbdb]"
            onClick={() => {
              router.push("/templates")
              onOpenChange(false)
            }}
          >
            <Pencil className="size-3.5 mr-1.5" />
            Edit templates
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
