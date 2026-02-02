"use client"

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Template, TemplateSlide, TemplateLayer } from '@/components/template-editor/types'
import { PostCarouselCardCanvas } from './post-carousel-card-canvas'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselApi,
} from "@/components/ui/carousel"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import { ChevronLeft, ChevronRight, MoreHorizontal, Download, Trash2, Circle, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from '@/lib/utils'

interface PostContent {
  template_id: string
  slides: {
    slide_id: string
    position: number
    background_image_url?: string | null
    layers: {
      layer_id: string
      text_content?: string
      image_url?: string | null
    }[]
  }[]
}

type PostStatus = 'draft' | 'ready' | 'exported' | 'posted'

interface PostCarouselCardProps {
  postId: string
  postContent: PostContent | null
  status?: PostStatus
  onDelete?: () => void
  onExpand?: () => void
  onStatusChange?: (status: PostStatus) => void
  className?: string
}

export function PostCarouselCard({
  postId,
  postContent,
  status = 'ready',
  onDelete,
  onExpand,
  onStatusChange,
  className
}: PostCarouselCardProps) {
  const [template, setTemplate] = useState<Template | null>(null)
  const [slides, setSlides] = useState<TemplateSlide[]>([])
  const [layers, setLayers] = useState<Record<string, TemplateLayer[]>>({})
  const [loading, setLoading] = useState(true)
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)
  const [count, setCount] = useState(0)
  const [imageUrlMap, setImageUrlMap] = useState<Map<string, string>>(new Map())
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    if (!api) return
    setCount(api.scrollSnapList().length)
    setCurrent(api.selectedScrollSnap())

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap())
    })
  }, [api])

  useEffect(() => {
    if (!postContent?.template_id) {
      setLoading(false)
      return
    }

    async function loadPostData() {
      setLoading(true)
      try {
        // Fetch template
        const { data: templateData, error: templateError } = await supabase
          .from('templates')
          .select('*')
          .eq('id', postContent.template_id)
          .single()

        if (templateError || !templateData) {
          throw new Error('Template not found')
        }

        setTemplate(templateData as Template)

        // Fetch slides
        const { data: slidesData, error: slidesError } = await supabase
          .from('template_slides')
          .select('*')
          .eq('template_id', postContent.template_id)
          .order('position', { ascending: true })

        if (slidesError) throw slidesError

        // Merge background_image_url from post content into slides
        const slidesWithContent = (slidesData || []).map(slide => {
          const contentSlide = postContent.slides.find(s => s.slide_id === slide.id)
          return {
            ...slide,
            background_image_url: contentSlide?.background_image_url || slide.background_image_url
          }
        })

        setSlides(slidesWithContent as TemplateSlide[] || [])

        // Fetch all layers
        const slideIds = (slidesData || []).map(s => s.id)
        if (slideIds.length === 0) {
          setLayers({})
          setLoading(false)
          return
        }

        const { data: layersData, error: layersError } = await supabase
          .from('template_layers')
          .select('*')
          .in('slide_id', slideIds)
          .order('position', { ascending: true })

        if (layersError) throw layersError

        // Merge generated text content into layers
        const layersBySlide: Record<string, TemplateLayer[]> = {}
        const contentMap = new Map<string, string>()
        
        // Create map of layer_id -> text_content from post content
        postContent.slides.forEach(slide => {
          slide.layers.forEach(layer => {
            contentMap.set(layer.layer_id, layer.text_content)
          })
        })

        // Create map of layer_id -> image_url from post content
        const imageUrlMap = new Map<string, string>()
        postContent.slides.forEach(slide => {
          slide.layers.forEach(layer => {
            if (layer.image_url) {
              imageUrlMap.set(layer.layer_id, layer.image_url)
            }
          })
        })

        // Group layers by slide and update text content and image URLs
        layersData?.forEach((layer: any) => {
          const slideId = layer.slide_id
          if (!layersBySlide[slideId]) {
            layersBySlide[slideId] = []
          }
          
          // Update text_content if it exists in generated content
          if (layer.type === 'text' && contentMap.has(layer.id)) {
            layer.text_content = contentMap.get(layer.id)
          }
          
          layersBySlide[slideId].push(layer as TemplateLayer)
        })

        // Store image URL map for use in rendering
        setImageUrlMap(imageUrlMap)

        setLayers(layersBySlide)
      } catch (error: any) {
        console.error('Error loading post data:', error)
        toast.error(error.message || 'Failed to load post')
      } finally {
        setLoading(false)
      }
    }

    loadPostData()
  }, [postContent, supabase])

  const sortedSlides = useMemo(() => {
    if (!slides || slides.length === 0) return []
    return [...slides].sort((a, b) => a.position - b.position)
  }, [slides])

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this post?')) return

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)

      if (error) throw error

      toast.success('Post deleted')
      onDelete?.()
    } catch (error: any) {
      console.error('Error deleting post:', error)
      toast.error(error.message || 'Failed to delete post')
    }
  }

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation()
    toast.info('Download functionality coming soon')
    // TODO: Implement download using html2canvas or similar
  }

  const handleStatusChange = async (newStatus: PostStatus) => {
    try {
      const { error } = await supabase
        .from('posts')
        .update({ status: newStatus })
        .eq('id', postId)

      if (error) throw error

      toast.success(`Status changed to ${newStatus}`)
      onStatusChange?.(newStatus)
    } catch (error: any) {
      console.error('Error updating status:', error)
      toast.error(error.message || 'Failed to update status')
    }
  }

  const statusLabels: Record<PostStatus, string> = {
    draft: 'Draft',
    ready: 'Ready',
    exported: 'Exported',
    posted: 'Posted'
  }

  if (loading || !template) {
    return (
      <div className={cn("relative aspect-[3/4] overflow-hidden bg-zinc-900 border border-zinc-800 transition-all duration-300", className)}>
        <div className="w-full h-full flex flex-col items-center justify-center gap-3">
          <div className="size-8 border-2 border-[#dbdbdb]/40 border-t-transparent rounded-full animate-spin" />
          <span className="text-[#dbdbdb]/60 text-[10px] font-bold uppercase tracking-tighter">Loading...</span>
        </div>
      </div>
    )
  }

  if (sortedSlides.length === 0) {
    return (
      <div className={cn("relative aspect-[3/4] overflow-hidden bg-zinc-900 border border-zinc-800 transition-all duration-300", className)}>
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-[#dbdbdb]/60 text-[10px] font-bold uppercase tracking-tighter">No slides</span>
        </div>
      </div>
    )
  }

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger expand if clicking on navigation or menu
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('[data-dropdown]')) {
      return
    }
    // Don't open preview if status is "posted"
    if (status === 'posted') {
      return
    }
    onExpand?.()
  }

  return (
    <div 
      onClick={handleCardClick}
      className={cn(
        "group relative aspect-[3/4] overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all duration-300 animate-in fade-in",
        status === 'posted' ? 'cursor-default' : 'cursor-pointer',
        className
      )}
    >
      {/* Status badge */}
      {status === 'posted' && (
        <div className="absolute top-2 left-2 z-30">
          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-green-500/80 backdrop-blur-sm rounded-md">
            <CheckCircle2 className="size-2.5 text-white" />
            <span className="text-[9px] font-bold text-white uppercase">Posted</span>
          </div>
        </div>
      )}

      {/* 3-dot menu */}
      <div className="absolute top-2 right-2 z-30" data-dropdown>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-lg text-white opacity-0 group-hover:opacity-100 transition-all"
            >
              <MoreHorizontal className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40 rounded-xl bg-zinc-800 border-zinc-700">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="text-[11px] font-bold gap-2 text-[#dbdbdb] focus:text-[#dbdbdb] focus:bg-zinc-700">
                {status === 'posted' ? <CheckCircle2 className="size-3 text-green-400" /> : <Circle className="size-3" />}
                Status: {statusLabels[status]}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="bg-zinc-800 border-zinc-700">
                <DropdownMenuRadioGroup value={status} onValueChange={(v) => handleStatusChange(v as PostStatus)}>
                  <DropdownMenuRadioItem value="draft" className="text-[11px] font-bold text-[#dbdbdb] focus:bg-zinc-700">
                    Draft
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="ready" className="text-[11px] font-bold text-[#dbdbdb] focus:bg-zinc-700">
                    Ready
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="exported" className="text-[11px] font-bold text-[#dbdbdb] focus:bg-zinc-700">
                    Exported
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="posted" className="text-[11px] font-bold text-green-400 focus:bg-zinc-700">
                    Posted
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem 
              onClick={handleDownload}
              className="text-[11px] font-bold gap-2 text-[#dbdbdb] focus:text-[#dbdbdb] focus:bg-zinc-700"
            >
              <Download className="size-3" />
              Download
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={handleDelete}
              className="text-[11px] font-bold gap-2 text-red-400 focus:text-red-400 focus:bg-zinc-700"
            >
              <Trash2 className="size-3" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Carousel */}
      <Carousel 
        setApi={setApi} 
        className="w-full h-full"
        opts={{
          align: "start",
          loop: false,
        }}
      >
        <CarouselContent className="h-full ml-0 pr-0">
          {sortedSlides.map((slide) => (
            <CarouselItem key={slide.id || slide.position} className="h-full pl-0 pr-0 basis-full">
              <div className="w-full h-full relative flex items-center justify-center">
                <PostCarouselCardCanvas
                  template={template}
                  slide={slide}
                  layers={layers[slide.id || ''] || []}
                  imageUrlMap={imageUrlMap}
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        
        {/* Navigation Arrows - Always visible when multiple slides */}
        {count > 1 && (
          <>
            <button 
              onClick={(e) => {
                e.stopPropagation()
                api?.scrollPrev()
              }}
              disabled={current === 0}
              className={cn(
                "absolute left-1 top-1/2 -translate-y-1/2 z-20 size-7 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm text-white transition-all",
                current === 0 ? "opacity-30 cursor-not-allowed" : "hover:bg-black/70 opacity-80"
              )}
            >
              <ChevronLeft className="size-4" />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation()
                api?.scrollNext()
              }}
              disabled={current >= count - 1}
              className={cn(
                "absolute right-1 top-1/2 -translate-y-1/2 z-20 size-7 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm text-white transition-all",
                current >= count - 1 ? "opacity-30 cursor-not-allowed" : "hover:bg-black/70 opacity-80"
              )}
            >
              <ChevronRight className="size-4" />
            </button>
          </>
        )}
      </Carousel>

      {/* Slide indicator dots */}
      {count > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex gap-1">
          {sortedSlides.map((_, i) => (
            <div 
              key={i} 
              className={cn(
                "h-1 rounded-full transition-all",
                i === current ? "w-4 bg-white" : "w-1 bg-white/40"
              )} 
            />
          ))}
        </div>
      )}
    </div>
  )
}
