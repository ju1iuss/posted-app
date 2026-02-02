"use client"

import { useState, useMemo, useEffect } from 'react'
import { Template, TemplateSlide, TemplateLayer } from './types'
import { EditorCanvas } from './editor-canvas'
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Bookmark, 
  ChevronLeft, 
  ChevronRight,
  Music2,
  Plus
} from 'lucide-react'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselApi,
} from "@/components/ui/carousel"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from '@/lib/utils'

interface TemplatePreviewProps {
  template: Template
  slides: TemplateSlide[]
  layers: Record<string, TemplateLayer[]>
}

export function TemplatePreview({
  template,
  slides,
  layers
}: TemplatePreviewProps) {
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!api) return
    setCount(api.scrollSnapList().length)
    setCurrent(api.selectedScrollSnap())

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap())
    })
  }, [api])

  const sortedSlides = useMemo(() => {
    if (!slides || slides.length === 0) return []
    return [...slides].sort((a, b) => a.position - b.position)
  }, [slides])

  if (sortedSlides.length === 0) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-black/5">
        <div className="text-zinc-400">No slides to preview</div>
      </div>
    )
  }

  return (
    <div className="relative flex items-center justify-center w-full h-full bg-black/5 overflow-hidden">
      {/* TikTok Phone Frame-like Container */}
      <div className="relative h-full max-h-[85vh] aspect-[9/16] bg-black shadow-2xl rounded-[3rem] overflow-hidden border-[8px] border-zinc-900 flex items-center justify-center">
        
        {/* Progress Bars (Top) */}
        <div className="absolute top-4 left-4 right-4 z-20 flex gap-1">
          {sortedSlides.map((_, i) => (
            <div 
              key={i} 
              className={cn(
                "h-0.5 flex-1 rounded-full transition-colors duration-300",
                i === current ? "bg-white" : "bg-white/30"
              )} 
            />
          ))}
        </div>

        {/* Carousel Content */}
        <Carousel 
          setApi={setApi} 
          className="w-full h-full flex items-center justify-center"
          opts={{
            align: "start",
            loop: false,
          }}
        >
          <CarouselContent className="h-full ml-0 pr-0">
            {sortedSlides.map((slide) => (
              <CarouselItem key={slide.id || slide.position} className="h-full pl-0 pr-0 basis-full flex items-center justify-center py-4">
                <div className="w-full h-full flex items-center justify-center">
                  <EditorCanvas
                    template={template}
                    slide={slide}
                    layers={layers[slide.id || ''] || []}
                    selectedLayerId={null}
                    onSelectLayer={() => {}}
                    onUpdateLayer={() => {}}
                    readOnly={true}
                    isPreview={true}
                    fillWidth={true}
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          
          {/* Navigation Arrows */}
          {current > 0 && (
            <button 
              onClick={() => api?.scrollPrev()}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-30 size-10 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all border border-white/10"
            >
              <ChevronLeft className="size-6" />
            </button>
          )}
          {current < count - 1 && (
            <button 
              onClick={() => api?.scrollNext()}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-30 size-10 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-all border border-white/10"
            >
              <ChevronRight className="size-6" />
            </button>
          )}
        </Carousel>

        {/* TikTok Overlays (Right Sidebar) */}
        <div className="absolute right-3 bottom-24 z-20 flex flex-col items-center gap-5">
          {/* Profile */}
          <div className="relative mb-2">
            <Avatar className="size-11 border-2 border-white">
              <AvatarImage src="" />
              <AvatarFallback className="bg-zinc-800 text-white text-xs">AI</AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 size-5 rounded-full bg-[#FE2C55] flex items-center justify-center border-2 border-white">
              <Plus className="size-3 text-white stroke-[3px]" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col items-center gap-1">
            <div className="size-10 flex items-center justify-center text-white">
              <Heart className="size-7 fill-white/10" />
            </div>
            <span className="text-[11px] font-bold text-white shadow-sm">1.2k</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <div className="size-10 flex items-center justify-center text-white">
              <MessageCircle className="size-7 fill-white/10" />
            </div>
            <span className="text-[11px] font-bold text-white shadow-sm">84</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <div className="size-10 flex items-center justify-center text-white">
              <Bookmark className="size-7 fill-white/10" />
            </div>
            <span className="text-[11px] font-bold text-white shadow-sm">243</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <div className="size-10 flex items-center justify-center text-white">
              <Share2 className="size-7 fill-white/10" />
            </div>
            <span className="text-[11px] font-bold text-white shadow-sm">12</span>
          </div>

          {/* Spinning Disc (Music) */}
          <div className="mt-4 animate-spin-slow">
            <div className="size-10 rounded-full bg-gradient-to-tr from-zinc-800 to-zinc-600 p-2 border-4 border-zinc-900">
              <div className="size-full rounded-full bg-zinc-400/20 flex items-center justify-center">
                <Music2 className="size-4 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Info */}
        <div className="absolute left-4 right-16 bottom-6 z-20 flex flex-col gap-2.5">
          <div className="flex flex-col gap-1">
            <span className="font-bold text-white text-[15px]">@posted_ai</span>
            <p className="text-white text-[14px] line-clamp-2 leading-tight">
              {template.description || "This is a beautiful template generated with Posted AI. #automation #creative"}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Music2 className="size-3.5 text-white" />
            <div className="overflow-hidden whitespace-nowrap text-[13px] text-white font-medium">
              <div className="animate-marquee inline-block">
                {template.name} - Original Sound - Posted AI
              </div>
            </div>
          </div>
        </div>

        {/* Vignette Overlays */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/40 to-transparent pointer-events-none z-10" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/60 to-transparent pointer-events-none z-10" />
      </div>

      <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 10s linear infinite;
        }
        .animate-spin-slow {
          animation: spin 3s linear infinite;
        }
      `}</style>
    </div>
  )
}
