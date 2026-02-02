"use client"

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Template, TemplateSlide, TemplateLayer } from '@/components/template-editor/types'
import { PostCarouselCardCanvas } from './post-carousel-card-canvas'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import * as VisuallyHidden from "@radix-ui/react-visually-hidden"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselApi,
} from "@/components/ui/carousel"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Download, Trash2, ChevronLeft, ChevronRight, X, Heart, MessageCircle, Share2, Bookmark, Music2, Plus, ChevronDown, Circle, CheckCircle2 } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { toast } from "sonner"
import { cn } from '@/lib/utils'

type PostStatus = 'draft' | 'ready' | 'exported' | 'posted'

interface PostContent {
  template_id: string
  title?: string
  caption?: string
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

interface PostPreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  postId: string
  postContent: PostContent | null
  accountName?: string
  accountUsername?: string
  title?: string
  caption?: string
  status?: PostStatus
  onDelete?: () => void
  onStatusChange?: (status: PostStatus) => void
}

export function PostPreviewModal({
  open,
  onOpenChange,
  postId,
  postContent,
  accountName,
  accountUsername,
  title,
  caption,
  status = 'ready',
  onDelete,
  onStatusChange
}: PostPreviewModalProps) {
  const [template, setTemplate] = useState<Template | null>(null)
  const [slides, setSlides] = useState<TemplateSlide[]>([])
  const [layers, setLayers] = useState<Record<string, TemplateLayer[]>>({})
  const [imageUrlMap, setImageUrlMap] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)
  const [count, setCount] = useState(0)
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
    if (!open || !postContent?.template_id) return

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
            if (layer.text_content) {
              contentMap.set(layer.layer_id, layer.text_content)
            }
          })
        })

        // Create map of layer_id -> image_url from post content
        const postImageUrlMap = new Map<string, string>()
        postContent.slides.forEach(slide => {
          slide.layers.forEach(layer => {
            if (layer.image_url && layer.layer_id) {
              postImageUrlMap.set(layer.layer_id, layer.image_url)
            }
          })
        })

        // Group layers by slide and update text content
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

        setImageUrlMap(postImageUrlMap)
        setLayers(layersBySlide)
      } catch (error: any) {
        console.error('Error loading post data:', error)
        toast.error(error.message || 'Failed to load post')
      } finally {
        setLoading(false)
      }
    }

    loadPostData()
  }, [open, postContent, supabase])

  const sortedSlides = useMemo(() => {
    if (!slides || slides.length === 0) return []
    return [...slides].sort((a, b) => a.position - b.position)
  }, [slides])

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this post?')) return

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)

      if (error) throw error

      toast.success('Post deleted')
      onOpenChange(false)
      onDelete?.()
    } catch (error: any) {
      console.error('Error deleting post:', error)
      toast.error(error.message || 'Failed to delete post')
    }
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

  const handleDownload = async (type: 'separate' | 'with-text' | 'first-slide-separate') => {
    // Get title and caption from props or postContent
    const postTitle = title || postContent?.title || ''
    const postCaption = caption || postContent?.caption || ''
    
    // Always download text file with title and caption
    const textContent = `TITLE:\n${postTitle}\n\nCAPTION:\n${postCaption}`
    const blob = new Blob([textContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `post-${postId}-text.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast.success('Text file downloaded!')
    toast.info(`Image download (${type}) coming soon`)
    // TODO: Implement image download using html2canvas or similar
  }

  if (!template || loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg h-[90vh] p-0 bg-transparent border-none shadow-none">
          <VisuallyHidden.Root>
            <DialogTitle>Loading post preview</DialogTitle>
          </VisuallyHidden.Root>
          <div className="flex items-center justify-center h-full">
            <div className="size-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg h-[90vh] p-0 bg-transparent border-none shadow-none overflow-visible flex flex-col" showCloseButton={false}>
        <VisuallyHidden.Root>
          <DialogTitle>Post Preview</DialogTitle>
        </VisuallyHidden.Root>
        <div className="relative flex-1 flex items-center justify-center">
          {/* Close Button */}
          <button 
            onClick={() => onOpenChange(false)}
            className="absolute top-2 right-2 z-50 size-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-all"
          >
            <X className="size-5" />
          </button>

          {/* TikTok Phone Frame - centered vertically */}
          <div className="relative h-[80vh] max-h-[80vh] aspect-[9/16] bg-black shadow-2xl rounded-[2.5rem] overflow-hidden border-[6px] border-zinc-800">
            
            {/* Progress Bars (Top) */}
            {sortedSlides.length > 1 && (
              <div className="absolute top-3 left-3 right-3 z-30 flex gap-1 px-1">
                {sortedSlides.map((_, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "h-[3px] flex-1 rounded-full transition-colors duration-300",
                      i === current ? "bg-white" : "bg-white/30"
                    )} 
                  />
                ))}
              </div>
            )}

            {/* Carousel Content */}
            <Carousel 
              setApi={setApi} 
              className="absolute inset-0 [&_[data-slot=carousel-content]]:h-full [&_[data-slot=carousel-content]>div]:h-full"
              opts={{
                align: "start",
                loop: false,
              }}
            >
              <CarouselContent className="ml-0 h-full">
                {sortedSlides.map((slide) => (
                  <CarouselItem key={slide.id || slide.position} className="pl-0 basis-full h-full">
                    <div className="relative w-full h-full">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <PostCarouselCardCanvas
                          template={template}
                          slide={slide}
                          layers={layers[slide.id || ''] || []}
                          imageUrlMap={imageUrlMap}
                          className="w-full h-full"
                        />
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              
              {/* Navigation Arrows */}
              {sortedSlides.length > 1 && (
                <>
                  <button 
                    onClick={() => api?.scrollPrev()}
                    disabled={current === 0}
                    className={cn(
                      "absolute left-2 top-1/2 -translate-y-1/2 z-30 size-10 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md text-white transition-all border border-white/10",
                      current === 0 ? "opacity-30 cursor-not-allowed" : "hover:bg-white/20"
                    )}
                  >
                    <ChevronLeft className="size-6" />
                  </button>
                  <button 
                    onClick={() => api?.scrollNext()}
                    disabled={current >= count - 1}
                    className={cn(
                      "absolute right-14 top-1/2 -translate-y-1/2 z-30 size-10 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md text-white transition-all border border-white/10",
                      current >= count - 1 ? "opacity-30 cursor-not-allowed" : "hover:bg-white/20"
                    )}
                  >
                    <ChevronRight className="size-6" />
                  </button>
                </>
              )}
            </Carousel>

            {/* TikTok Overlays (Right Sidebar) */}
            <div className="absolute right-2 bottom-28 z-20 flex flex-col items-center gap-4">
              {/* Profile */}
              <div className="relative mb-2">
                <Avatar className="size-10 border-2 border-white">
                  <AvatarFallback className="bg-zinc-800 text-white text-xs font-bold">P</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 size-4 rounded-full bg-[#FE2C55] flex items-center justify-center border border-white">
                  <Plus className="size-2.5 text-white stroke-[3px]" />
                </div>
              </div>

              {/* Actions */}
              <button className="flex flex-col items-center gap-0.5 text-white">
                <div className="size-10 flex items-center justify-center">
                  <Heart className="size-7" />
                </div>
                <span className="text-[10px] font-bold">1.2k</span>
              </button>

              <button className="flex flex-col items-center gap-0.5 text-white">
                <div className="size-10 flex items-center justify-center">
                  <MessageCircle className="size-7 scale-x-[-1]" />
                </div>
                <span className="text-[10px] font-bold">234</span>
              </button>

              <button className="flex flex-col items-center gap-0.5 text-white">
                <div className="size-10 flex items-center justify-center">
                  <Bookmark className="size-6" />
                </div>
                <span className="text-[10px] font-bold">89</span>
              </button>

              <button className="flex flex-col items-center gap-0.5 text-white">
                <div className="size-10 flex items-center justify-center">
                  <Share2 className="size-6" />
                </div>
                <span className="text-[10px] font-bold">Share</span>
              </button>
            </div>

            {/* Bottom Info */}
            <div className="absolute bottom-3 left-3 right-14 z-20">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-white text-sm">@{accountUsername || accountName?.toLowerCase().replace(/\s+/g, '_') || 'posted_ai'}</span>
              </div>
              {/* Title - bold, below name */}
              {(title || postContent?.title) && (
                <p className="text-white text-sm font-bold mb-1 line-clamp-1">
                  {title || postContent?.title}
                </p>
              )}
              {/* Caption - below title */}
              {(caption || postContent?.caption) && (
                <p className="text-white text-xs line-clamp-2 mb-2">
                  {caption || postContent?.caption}
                </p>
              )}
              <div className="flex items-center gap-2 text-white/80">
                <Music2 className="size-3" />
                <span className="text-[10px]">Original Sound - {accountName || 'Posted AI'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons Below Phone */}
        <div className="flex items-center justify-center gap-3 pb-4 pt-2 z-50">
          {/* Status Selector */}
          <Select value={status} onValueChange={(v) => handleStatusChange(v as PostStatus)}>
            <SelectTrigger className="w-32 h-9 bg-zinc-800 border-zinc-700 text-white text-sm">
              <div className="flex items-center gap-2">
                {status === 'posted' ? (
                  <CheckCircle2 className="size-3 text-green-400" />
                ) : (
                  <Circle className="size-3" />
                )}
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
              <SelectItem value="draft" className="text-white focus:bg-zinc-700 focus:text-white">Draft</SelectItem>
              <SelectItem value="ready" className="text-white focus:bg-zinc-700 focus:text-white">Ready</SelectItem>
              <SelectItem value="exported" className="text-white focus:bg-zinc-700 focus:text-white">Exported</SelectItem>
              <SelectItem value="posted" className="text-green-400 focus:bg-zinc-700 focus:text-green-400">Posted</SelectItem>
            </SelectContent>
          </Select>

          {/* Download Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                className="flex items-center gap-2 bg-zinc-800 border-zinc-800 text-white hover:bg-zinc-700"
              >
                <Download className="size-4" />
                Download
                <ChevronDown className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="bg-zinc-800 border-zinc-700 text-white">
              <DropdownMenuItem
                onClick={() => handleDownload('separate')}
                className="cursor-pointer hover:bg-zinc-700 focus:bg-zinc-700"
              >
                Download with text separate
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDownload('with-text')}
                className="cursor-pointer hover:bg-zinc-700 focus:bg-zinc-700"
              >
                Download with text
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDownload('first-slide-separate')}
                className="cursor-pointer hover:bg-zinc-700 focus:bg-zinc-700"
              >
                Download with text only first slide separate
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Delete Button */}
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            className="flex items-center gap-2"
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
