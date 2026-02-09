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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { ChevronLeft, ChevronRight, MoreHorizontal, Download, Trash2, Circle, CheckCircle2, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { cn } from '@/lib/utils'
import html2canvas from 'html2canvas'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

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

type PostStatus = 'draft' | 'ready' | 'exported' | 'posted'

interface PostCarouselCardProps {
  postId: string
  postContent: PostContent | null
  status?: PostStatus
  title?: string
  caption?: string
  onDelete?: () => void
  onExpand?: () => void
  onStatusChange?: (status: PostStatus) => void
  className?: string
}

export function PostCarouselCard({
  postId,
  postContent,
  status = 'ready',
  title,
  caption,
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
    if (!postContent?.template_id) {
      setLoading(false)
      return
    }

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

        // Safely get slides array from post content
        const contentSlides = Array.isArray(postContent.slides) ? postContent.slides : []

        // Merge background_image_url from post content into slides
        const slidesWithContent = (slidesData || []).map(slide => {
          const contentSlide = contentSlides.find(s => s.slide_id === slide.id)
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
        contentSlides.forEach(slide => {
          const slideLayers = Array.isArray(slide.layers) ? slide.layers : []
          slideLayers.forEach(layer => {
            if (layer.text_content) {
              contentMap.set(layer.layer_id, layer.text_content)
            }
          })
        })

        // Create map of layer_id -> image_url from post content
        const imageUrlMap = new Map<string, string>()
        contentSlides.forEach(slide => {
          const slideLayers = Array.isArray(slide.layers) ? slide.layers : []
          slideLayers.forEach(layer => {
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
    onDelete?.()
  }

  const handleDownload = async (e: React.MouseEvent, type: 'separate' | 'with-text' | 'first-slide-separate') => {
    e.stopPropagation()
    
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
      
      // Add text file to zip
      const textContent = `TITLE:\n${postTitle}\n\nCAPTION:\n${postCaption}`
      zip.file('post-text.txt', textContent)

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
        
        // Determine if we should include text for this slide
        const hideText = type === 'separate' || 
          (type === 'first-slide-separate' && i === 0)
        
        // Filter layers based on export type
        const exportLayers = hideText 
          ? slideLayers.filter(l => l.type !== 'text')
          : slideLayers

        // Create the slide element
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
          
          // Pre-load the image
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
        
        // Add layers
        for (const layer of [...exportLayers].sort((a, b) => a.position - b.position)) {
          const layerDiv = document.createElement('div')
          
          // Base positioning
          layerDiv.style.position = 'absolute'
          layerDiv.style.left = `${layer.x}%`
          layerDiv.style.top = `${layer.y}%`
          layerDiv.style.width = `${layer.width}%`
          layerDiv.style.transform = 'translate(-50%, -50%)'
          layerDiv.style.zIndex = String(10 + (layer.position || 0))
          
          if (layer.type === 'image') {
            const hasHeight = layer.height !== undefined && layer.height !== null && layer.height > 0
            if (hasHeight) {
              layerDiv.style.height = `${layer.height}%`
            }
          }
          
          if (layer.type === 'text') {
            // Text layer styling
            const fontSize = layer.font_size || 48
            const strokeWidth = layer.stroke_width || 0
            
            const textDiv = document.createElement('div')
            textDiv.style.fontFamily = `${layer.font_family || 'TikTok Sans'}, sans-serif`
            textDiv.style.fontSize = `${fontSize}px`
            textDiv.style.lineHeight = '1.2'
            textDiv.style.fontWeight = String(layer.font_weight || 'bold')
            textDiv.style.color = layer.text_color || '#ffffff'
            textDiv.style.textAlign = layer.text_align || 'center'
            textDiv.style.width = '100%'
            textDiv.style.wordWrap = 'break-word'
            textDiv.style.whiteSpace = 'pre-wrap'
            
            // Text shadow/stroke
            if (strokeWidth > 0 && layer.stroke_color) {
              textDiv.style.textShadow = `
                -${strokeWidth}px -${strokeWidth}px 0 ${layer.stroke_color},
                ${strokeWidth}px -${strokeWidth}px 0 ${layer.stroke_color},
                -${strokeWidth}px ${strokeWidth}px 0 ${layer.stroke_color},
                ${strokeWidth}px ${strokeWidth}px 0 ${layer.stroke_color}
              `
            }
            
            // Background color handling
            if (layer.background_color) {
              const span = document.createElement('span')
              span.style.backgroundColor = layer.background_color
              span.style.padding = '6px 12px'
              span.style.borderRadius = '8px'
              span.style.display = 'inline-block'
              span.innerText = layer.text_content || ''
              textDiv.appendChild(span)
            } else {
              textDiv.innerText = layer.text_content || ''
            }
            
            layerDiv.appendChild(textDiv)
          } else if (layer.type === 'image') {
            const imgUrl = imageUrlMap.get(layer.id || '') || (layer as any).image_url
            
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
        
        // Wait for rendering and fonts to load
        await new Promise(resolve => setTimeout(resolve, 300))
        
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

  const handleStatusChange = async (newStatus: PostStatus, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
    }
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

  // Check if className contains aspect override indicators
  const hasAspectOverride = className?.includes('!aspect') || className?.includes('aspect-auto') || className?.includes('w-full h-full')

  if (loading || !template) {
    return (
      <div className={cn(
        "relative overflow-hidden transition-all duration-300", 
        !hasAspectOverride ? "aspect-[3/4] bg-zinc-900 border border-zinc-800" : "w-full h-full",
        className
      )}>
        <div className="w-full h-full flex flex-col items-center justify-center gap-3">
          <div className="size-8 border-2 border-[#dbdbdb]/40 border-t-transparent rounded-full animate-spin" />
          <span className="text-[#dbdbdb]/60 text-[10px] font-bold uppercase tracking-tighter">Loading...</span>
        </div>
      </div>
    )
  }

  if (sortedSlides.length === 0) {
    return (
      <div className={cn(
        "relative overflow-hidden transition-all duration-300", 
        !hasAspectOverride ? "aspect-[3/4] bg-zinc-900 border border-zinc-800" : "w-full h-full",
        className
      )}>
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
        "group relative overflow-hidden transition-all duration-300 animate-in fade-in flex items-center justify-center",
        !hasAspectOverride ? "aspect-[3/4] bg-zinc-900 border border-zinc-800 hover:border-zinc-700" : "w-full h-full bg-transparent",
        status === 'posted' ? 'cursor-default' : 'cursor-pointer',
        className
      )}
    >
      {/* Status badge - only show if posted */}
      {status === 'posted' && (
        <div className="absolute top-2 left-2 z-30">
          <Badge 
            className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 backdrop-blur-md border-none bg-green-500/20 text-green-400"
          >
            <CheckCircle2 className="size-2.5 mr-1" />
            Posted
          </Badge>
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
          <DropdownMenuContent align="end" className="w-40 rounded-xl bg-zinc-800 border-zinc-700" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="text-[11px] font-bold gap-2 text-[#dbdbdb] focus:text-[#dbdbdb] focus:bg-zinc-700">
                {status === 'posted' ? <CheckCircle2 className="size-3 text-green-400" /> : <Circle className="size-3" />}
                Status: {statusLabels[status]}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="bg-zinc-800 border-zinc-700" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuRadioGroup value={status} onValueChange={(v) => handleStatusChange(v as PostStatus)}>
                  <DropdownMenuRadioItem 
                    value="draft" 
                    className="text-[11px] font-bold text-[#dbdbdb] focus:bg-zinc-700"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Draft
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem 
                    value="ready" 
                    className="text-[11px] font-bold text-[#dbdbdb] focus:bg-zinc-700"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Ready
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem 
                    value="exported" 
                    className="text-[11px] font-bold text-[#dbdbdb] focus:bg-zinc-700"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Exported
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem 
                    value="posted" 
                    className="text-[11px] font-bold text-green-400 focus:bg-zinc-700"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Posted
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger 
                disabled={isExporting}
                className="text-[11px] font-bold gap-2 text-[#dbdbdb] focus:text-[#dbdbdb] focus:bg-zinc-700"
              >
                {isExporting ? <Loader2 className="size-3 animate-spin" /> : <Download className="size-3" />}
                {isExporting ? 'Exporting...' : 'Download'}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="bg-zinc-800 border-zinc-700" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDownload(e as any, 'with-text')
                  }}
                  className="text-[11px] font-bold text-[#dbdbdb] focus:bg-zinc-700 flex items-center justify-between gap-2"
                >
                  <span>Download</span>
                  <span className="px-1.5 py-0.5 text-[9px] font-bold bg-zinc-700 text-zinc-300 rounded-full">Default</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDownload(e as any, 'separate')
                  }}
                  className="text-[11px] font-bold text-[#dbdbdb] focus:bg-zinc-700"
                >
                  Images without text
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDownload(e as any, 'first-slide-separate')
                  }}
                  className="text-[11px] font-bold text-[#dbdbdb] focus:bg-zinc-700"
                >
                  First slide without text
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator className="bg-zinc-700" />
            <DropdownMenuItem 
              onClick={(e) => {
                e.stopPropagation()
                handleDelete(e)
              }}
              className="text-[11px] font-bold gap-2 text-red-400 focus:text-red-400 focus:bg-zinc-700"
            >
              <Trash2 className="size-3" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Carousel */}
      <div className="relative w-full h-full">
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
        </Carousel>

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
      </div>

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
