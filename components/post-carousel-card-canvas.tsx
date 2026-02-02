"use client"

import { useMemo, useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Template, TemplateSlide, TemplateLayer } from '@/components/template-editor/types'
import { DraggableLayer } from '@/components/template-editor/draggable-layer'
import { cn } from '@/lib/utils'

interface PostCarouselCardCanvasProps {
  template: Template
  slide: TemplateSlide | undefined
  layers: TemplateLayer[]
  imageUrlMap: Map<string, string>
  className?: string
}

export function PostCarouselCardCanvas({
  template,
  slide,
  layers,
  imageUrlMap,
  className
}: PostCarouselCardCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)

  useEffect(() => {
    if (!containerRef.current) return
    
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
        setContainerHeight(entry.contentRect.height)
      }
    })
    
    observer.observe(containerRef.current)
    setContainerWidth(containerRef.current.offsetWidth)
    setContainerHeight(containerRef.current.offsetHeight)
    
    return () => observer.disconnect()
  }, [])

  // Calculate scale factor to fit canvas in container
  const templateAspectRatio = template.width / template.height
  const containerAspectRatio = containerWidth / containerHeight

  const scaleFactor = useMemo(() => {
    if (containerWidth === 0 || containerHeight === 0) return 1
    
    const widthBasedScale = containerWidth / template.width
    const heightBasedScale = containerHeight / template.height
    
    return Math.min(widthBasedScale, heightBasedScale)
  }, [containerWidth, containerHeight, template.width, template.height])

  const canvasStyle: React.CSSProperties = useMemo(() => {
    const scaledWidth = template.width * scaleFactor
    const scaledHeight = template.height * scaleFactor
    
    return {
      width: `${scaledWidth}px`,
      height: `${scaledHeight}px`,
      position: 'relative',
    }
  }, [template.width, template.height, scaleFactor])

  const backgroundStyle = useMemo(() => {
    if (!slide) return { backgroundColor: '#ffffff' }
    
    if (slide.background_type === 'color' && slide.background_color) {
      return { backgroundColor: slide.background_color }
    }
    
    return { backgroundColor: '#ffffff' }
  }, [slide])

  return (
    <div 
      ref={containerRef}
      className={cn("flex items-center justify-center w-full h-full", className)}
    >
      <div
        data-canvas
        className="relative overflow-hidden"
        style={canvasStyle}
      >
        {/* Background */}
        <div data-background className="absolute inset-0" style={backgroundStyle}>
          {slide?.video_url && (
            <video
              src={slide.video_url}
              className="w-full h-full object-cover"
              muted
              loop
              playsInline
            />
          )}
          {/* Use background_image_url from post content if available */}
          {slide?.background_image_url && !slide.video_url && (
            <Image
              src={slide.background_image_url}
              alt="Background"
              fill
              className="object-cover"
            />
          )}
        </div>

        {/* Layers */}
        {[...layers]
          .sort((a, b) => a.position - b.position)
          .map((layer) => {
            // Get image URL from post content if available
            let imageUrl: string | undefined = undefined
            if (layer.type === 'image') {
              // Check if we have a saved URL from post content
              if (imageUrlMap.has(layer.id || '')) {
                imageUrl = imageUrlMap.get(layer.id || '')
              }
            }

            return (
              <DraggableLayer
                key={layer.id}
                layer={layer}
                canvasWidth={template.width}
                canvasHeight={template.height}
                scaleFactor={scaleFactor}
                selected={false}
                imageUrl={imageUrl}
                onSelect={() => {}}
                onUpdate={() => {}}
                readOnly={true}
              />
            )
          })}
      </div>
    </div>
  )
}
