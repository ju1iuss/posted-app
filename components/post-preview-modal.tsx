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
import { Download, Trash2, ChevronLeft, ChevronRight, X, Heart, MessageCircle, Share2, Bookmark, Music2, Plus, ChevronDown, Circle, CheckCircle2, Loader2 } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { toast } from "sonner"
import { cn } from '@/lib/utils'
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
import html2canvas from 'html2canvas'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
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
      if (!postContent?.template_id) return
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

  const handleDeleteClick = () => {
    setShowDeleteDialog(true)
  }

  const handleDeleteConfirm = async () => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)

      if (error) throw error

      toast.success('Post deleted')
      setShowDeleteDialog(false)
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
    if (!template || sortedSlides.length === 0) {
      toast.error('No slides to export')
      return
    }

    setIsExporting(true)
    toast.info('Preparing download...')

    try {
      const zip = new JSZip()
      const imagesFolder = zip.folder('images')
      
      // Get title and caption
      const postTitle = title || postContent?.title || ''
      const postCaption = caption || postContent?.caption || ''
      
      // Collect slide text content for slides where text is removed from image
      const slideTexts: string[] = []
      for (let i = 0; i < sortedSlides.length; i++) {
        const slide = sortedSlides[i]
        const slideLayers = layers[slide.id || ''] || []
        
        // Determine which text layers are removed from the image
        let removedTextLayers: typeof slideLayers = []
        if (type === 'separate') {
          // All text removed from all slides
          removedTextLayers = slideLayers.filter(l => l.type === 'text' && l.text_content)
        } else if (type === 'first-slide-separate' && i === 0) {
          // Only dynamic (non-fixed) text removed from first slide
          removedTextLayers = slideLayers.filter(l => l.type === 'text' && l.text_content && !l.is_fixed)
        }
        
        if (removedTextLayers.length > 0) {
          slideTexts.push(`SLIDE ${i + 1}:`)
          removedTextLayers.forEach(l => slideTexts.push(l.text_content!))
          slideTexts.push('')
        }
      }

      // Add text file to zip
      let textContent = `TITLE:\n${postTitle}\n\nCAPTION:\n${postCaption}`
      if (slideTexts.length > 0) {
        textContent += `\n\nSLIDE TEXT:\n${slideTexts.join('\n')}`
      }
      zip.file('post-text.txt', textContent)

      // Force-load TikTok Sans fonts before export
      await Promise.all([
        document.fonts.load('normal 48px "TikTok Sans"'),
        document.fonts.load('bold 48px "TikTok Sans"'),
        document.fonts.load('900 48px "TikTok Sans"'),
      ])
      await document.fonts.ready

      // Create a hidden container for full-resolution rendering
      const exportContainer = document.createElement('div')
      exportContainer.style.cssText = `
        position: fixed;
        left: -99999px;
        top: 0;
        z-index: -1;
      `
      document.body.appendChild(exportContainer)

      // Export each slide
      for (let i = 0; i < sortedSlides.length; i++) {
        const slide = sortedSlides[i]
        const slideLayers = layers[slide.id || ''] || []
        
        // Filter layers based on export type
        let exportLayers = slideLayers
        if (type === 'separate') {
          // Remove ALL text from all slides
          exportLayers = slideLayers.filter(l => l.type !== 'text')
        } else if (type === 'first-slide-separate' && i === 0) {
          // Remove only dynamic (non-fixed) text from first slide; keep fixed text
          exportLayers = slideLayers.filter(l => !(l.type === 'text' && !l.is_fixed))
        }

        // Create the slide element - MATCHING DraggableLayer positioning exactly
        const slideElement = document.createElement('div')
        slideElement.style.cssText = `
          width: ${template.width}px;
          height: ${template.height}px;
          position: relative;
          overflow: hidden;
        `
        
        // Add background
        if (slide.background_type === 'color' && slide.background_color) {
          slideElement.style.backgroundColor = slide.background_color
        } else {
          slideElement.style.backgroundColor = '#ffffff'
        }
        
        // Add background image if exists
        if (slide.background_image_url && !slide.video_url) {
          const bgDiv = document.createElement('div')
          bgDiv.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: url("${slide.background_image_url}");
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
          `
          slideElement.appendChild(bgDiv)
          
          // Pre-load the image to ensure it's in cache for html2canvas
          const bgImageUrl = slide.background_image_url
          if (bgImageUrl) {
            await new Promise((resolve) => {
              const img = new Image()
              img.crossOrigin = 'anonymous'
              img.onload = resolve
              img.onerror = () => {
                console.warn('Background image failed to load:', bgImageUrl)
                resolve(null)
              }
              img.src = bgImageUrl
              setTimeout(resolve, 5000)
            })
          }
        }
        
        // Add layers - USING PERCENTAGE POSITIONING like DraggableLayer
        for (const layer of [...exportLayers].sort((a, b) => a.position - b.position)) {
          const layerDiv = document.createElement('div')
          
          // Base positioning - EXACTLY like DraggableLayer
          layerDiv.style.position = 'absolute'
          layerDiv.style.left = `${layer.x}%`
          layerDiv.style.top = `${layer.y}%`
          layerDiv.style.width = `${layer.width}%`
          layerDiv.style.transform = 'translate(-50%, -50%)'
          layerDiv.style.zIndex = String(10 + (layer.position || 0))
          
          if (layer.type === 'image') {
            if (layer.height) {
              layerDiv.style.height = `${layer.height}%`
            } else {
              // When no height set, use auto to maintain aspect ratio
              layerDiv.style.height = 'auto'
            }
          }
          
          if (layer.type === 'text') {
            // Text layer styling
            const fontSize = layer.font_size || 48
            const strokeWidth = layer.stroke_width || 0
            const rawWeight = layer.font_weight || 'bold'
            const fontWeight = rawWeight === 'black' ? '900' : rawWeight
            
            const textDiv = document.createElement('div')
            textDiv.style.fontFamily = `'TikTok Sans', ${layer.font_family || 'TikTok Sans'}, sans-serif`
            textDiv.style.fontSize = `${fontSize}px`
            textDiv.style.lineHeight = '1.2'
            textDiv.style.fontWeight = fontWeight
            textDiv.style.color = layer.text_color || '#ffffff'
            textDiv.style.textAlign = layer.text_align || 'center'
            textDiv.style.width = '100%'
            textDiv.style.wordWrap = 'break-word'
            textDiv.style.whiteSpace = 'pre-wrap'
            
            // Use -webkit-text-stroke for clean border rendering
            if (strokeWidth > 0 && layer.stroke_color) {
              textDiv.style.setProperty('-webkit-text-stroke', `${strokeWidth}px ${layer.stroke_color}`)
              textDiv.style.paintOrder = 'stroke fill'
            }
            
            // Background color handling
            if (layer.background_color) {
              const span = document.createElement('span')
              span.style.backgroundColor = layer.background_color
              span.style.padding = '6px 12px'
              span.style.borderRadius = '16px'
              span.style.display = 'inline-block'
              span.innerText = layer.text_content || ''
              textDiv.appendChild(span)
            } else {
              textDiv.innerText = layer.text_content || ''
            }
            
            layerDiv.appendChild(textDiv)
          } else if (layer.type === 'image') {
            const imgUrl = imageUrlMap.get(layer.id || '') || (layer as any).image_url
            const hasHeight = layer.height !== undefined && layer.height !== null && layer.height > 0
            
            // For image layers, set height to maintain proportions
            if (hasHeight) {
              layerDiv.style.height = `${layer.height}%`
            }
            
            if (imgUrl) {
              const innerImgDiv = document.createElement('div')
              innerImgDiv.style.cssText = `
                width: 100%;
                height: 100%;
                border-radius: 12px;
                background-image: url("${imgUrl}");
                background-size: cover;
                background-position: center;
                background-repeat: no-repeat;
              `
              layerDiv.appendChild(innerImgDiv)
              
              // Pre-load the image
              await new Promise((resolve) => {
                const img = new Image()
                img.crossOrigin = 'anonymous'
                img.onload = resolve
                img.onerror = () => {
                  console.warn('Layer image failed to load:', imgUrl)
                  resolve(null)
                }
                img.src = imgUrl
                setTimeout(resolve, 5000)
              })
            } else {
              // Placeholder
              const placeholder = document.createElement('div')
              placeholder.style.cssText = `
                width: 100%;
                height: 100%;
                min-height: 50px;
                background-color: rgba(63, 63, 70, 0.8);
                border: 2px dashed rgb(82, 82, 91);
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
              `
              const span = document.createElement('span')
              span.style.color = 'rgba(219, 219, 219, 0.6)'
              span.style.fontWeight = '500'
              span.style.textAlign = 'center'
              span.style.padding = '8px'
              span.innerText = layer.image_collection_id ? 'Random Collection' : 'No image'
              placeholder.appendChild(span)
              layerDiv.appendChild(placeholder)
            }
          } else if (layer.type === 'shape') {
            const shapeLayer = layer as any
            layerDiv.style.backgroundColor = shapeLayer.fill_color || '#cccccc'
            layerDiv.style.borderRadius = `${shapeLayer.border_radius || 0}px`
            layerDiv.style.opacity = String(shapeLayer.opacity !== undefined ? shapeLayer.opacity / 100 : 1)
          }
          
          slideElement.appendChild(layerDiv)
        }
        
        exportContainer.innerHTML = ''
        exportContainer.appendChild(slideElement)
        
        // Wait for fonts to be ready and rendering to settle
        await document.fonts.ready
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Capture with html2canvas
        const canvas = await html2canvas(slideElement, {
          width: template.width,
          height: template.height,
          scale: 1,
          useCORS: true,
          allowTaint: true,
          backgroundColor: null,
          logging: false,
        })
        
        // Convert to blob and add to zip
        const imageBlob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((blob) => {
            resolve(blob!)
          }, 'image/png', 1.0)
        })
        
        const fileName = `slide-${String(i + 1).padStart(2, '0')}.png`
        imagesFolder?.file(fileName, imageBlob)
      }
      
      // Clean up
      document.body.removeChild(exportContainer)
      
      // Generate and download zip
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const timestamp = new Date().toISOString().slice(0, 10)
      saveAs(zipBlob, `post-${timestamp}-${postId.slice(0, 8)}.zip`)
      
      toast.success('Download complete!')
    } catch (error: any) {
      console.error('Export error:', error)
      toast.error('Failed to export: ' + (error.message || 'Unknown error'))
    } finally {
      setIsExporting(false)
    }
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
          <Select value={status} onValueChange={(v) => handleStatusChange(v as PostStatus)} disabled={isExporting}>
            <SelectTrigger size="sm" className="w-32 !bg-zinc-800 border border-zinc-700 text-white text-sm hover:!bg-zinc-700 shadow-sm disabled:opacity-50">
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
                disabled={isExporting}
                className="flex items-center gap-2 bg-zinc-800 border-zinc-800 text-white hover:bg-zinc-700 disabled:opacity-50"
              >
                {isExporting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
                {isExporting ? 'Exporting...' : 'Download'}
                {!isExporting && <ChevronDown className="size-3" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="bg-zinc-800 border-zinc-700 text-white">
              <DropdownMenuItem
                onClick={() => handleDownload('with-text')}
                className="cursor-pointer hover:bg-zinc-700 focus:bg-zinc-700 flex items-center justify-between gap-2"
              >
                <span>Download</span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-zinc-700 text-zinc-300 rounded-full">Default</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDownload('separate')}
                className="cursor-pointer hover:bg-zinc-700 focus:bg-zinc-700"
              >
                Images without text
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDownload('first-slide-separate')}
                className="cursor-pointer hover:bg-zinc-700 focus:bg-zinc-700"
              >
                First slide without text, rest with text
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Delete Button */}
          <Button
            size="sm"
            onClick={handleDeleteClick}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white border-0"
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        </div>
      </DialogContent>

      {/* Delete Confirmation Modal */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-[#171717] border-zinc-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#dbdbdb]">Delete Post</AlertDialogTitle>
            <AlertDialogDescription className="text-[#dbdbdb]/80">
              Are you sure you want to delete this post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-[#dbdbdb] hover:bg-zinc-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
