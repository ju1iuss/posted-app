"use client"

import { useMemo, useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Template, TemplateSlide, TemplateLayer } from './types'
import { DraggableLayer } from './draggable-layer'
import { cn } from '@/lib/utils'

interface EditorCanvasProps {
  template: Template
  slide: TemplateSlide | undefined
  layers: TemplateLayer[]
  selectedLayerId: string | null
  onSelectLayer: (layerId: string | null) => void
  onUpdateLayer: (layerId: string, updates: Partial<TemplateLayer>) => void
  onDeleteLayer?: (layerId: string) => void
  readOnly?: boolean
  className?: string
  isPreview?: boolean
  zoom?: number
  fillWidth?: boolean // If true, canvas fills container width and calculates height from aspect ratio
}

export function EditorCanvas({
  template,
  slide,
  layers,
  selectedLayerId,
  onSelectLayer,
  onUpdateLayer,
  onDeleteLayer,
  readOnly,
  className,
  isPreview,
  zoom = 1.0,
  fillWidth = false
}: EditorCanvasProps) {
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({})
  const [randomImageIds, setRandomImageIds] = useState<Record<string, string>>({})
  const [containerWidth, setContainerWidth] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const supabase = useMemo(() => createClient(), [])

  // Measure container dimensions for fillWidth mode
  useEffect(() => {
    if (!fillWidth || !containerRef.current) return
    
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
  }, [fillWidth])

  // Fetch image URLs
  useEffect(() => {
    async function loadImageUrls() {
      const imageIds = new Set<string>()
      const randomCollectionsToFetch: { id: string, type: 'slide' | 'layer', layerId?: string }[] = []
      
      // Collect all image IDs
      if (slide?.background_image_id) {
        imageIds.add(slide.background_image_id)
      } else if (slide?.background_type === 'collection_random' && slide.background_collection_id) {
        randomCollectionsToFetch.push({ id: slide.background_collection_id, type: 'slide' })
      }

      for (const layer of layers) {
        if (layer.image_id) {
          imageIds.add(layer.image_id)
        } else if (layer.image_source_type === 'collection_random' && layer.image_collection_id) {
          randomCollectionsToFetch.push({ id: layer.image_collection_id, type: 'layer', layerId: layer.id })
        }
      }

      // Handle random collections
      const newRandomIds = { ...randomImageIds }
      let changed = false

      for (const req of randomCollectionsToFetch) {
        const key = req.type === 'slide' ? `slide-${slide?.id}` : `layer-${req.layerId}`
        if (!newRandomIds[key]) {
          const { data } = await supabase
            .from('collection_images')
            .select('image_id')
            .eq('collection_id', req.id)
          
          if (data && data.length > 0) {
            const randomIndex = Math.floor(Math.random() * data.length)
            newRandomIds[key] = data[randomIndex].image_id
            imageIds.add(data[randomIndex].image_id)
            changed = true
          }
        } else {
          imageIds.add(newRandomIds[key])
        }
      }

      if (changed) {
        setRandomImageIds(newRandomIds)
      }

      if (imageIds.size === 0) {
        setImageUrls({})
        return
      }

      const { data } = await supabase
        .from('images')
        .select('id, url')
        .in('id', Array.from(imageIds))

      if (data) {
        const urlMap: Record<string, string> = {}
        for (const img of data) {
          urlMap[img.id] = img.url
        }
        setImageUrls(urlMap)
      }
    }

    loadImageUrls()
  }, [slide, layers, supabase]) // Simplified dependency array to re-run when slide/layers change

  // Base size for the canvas (we scale everything from this)
  const baseWidth = 400 // Base visual width in pixels at zoom 1.0
  
  // Calculate effective width based on mode
  // For fillWidth, constrain to fit both width and height
  const effectiveWidth = useMemo(() => {
    if (!fillWidth || containerWidth === 0) {
      return baseWidth * zoom
    }
    
    const templateAspectRatio = template.width / template.height
    const widthBasedHeight = containerWidth / templateAspectRatio
    const heightBasedWidth = containerHeight * templateAspectRatio
    
    // Use the smaller dimension to ensure it fits
    if (widthBasedHeight <= containerHeight) {
      return containerWidth
    } else {
      return heightBasedWidth
    }
  }, [fillWidth, containerWidth, containerHeight, template.width, template.height, zoom])
  
  const canvasStyle = useMemo(() => {
    const aspectRatio = template.width / template.height
    const displayWidth = effectiveWidth
    const displayHeight = displayWidth / aspectRatio
    
    if (fillWidth) {
      return {
        width: `${effectiveWidth}px`,
        height: `${displayHeight}px`,
        maxWidth: '100%',
        maxHeight: '100%',
      }
    }
    
    return {
      width: `${displayWidth}px`,
      height: `${displayHeight}px`,
    }
  }, [template.width, template.height, effectiveWidth, fillWidth])

  // Scale factor for converting template units to display pixels
  const scaleFactor = useMemo(() => {
    return effectiveWidth / template.width
  }, [template.width, effectiveWidth])

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
      className={cn(
        fillWidth ? "w-full" : "flex items-center justify-center w-full h-full",
        className
      )}
    >
      <div
        data-canvas
        className={cn(
          "relative overflow-hidden transition-shadow",
          !isPreview && "shadow-2xl rounded-lg ring-1 ring-zinc-700"
        )}
        style={{
          ...canvasStyle,
          ...(isPreview ? {} : {
            backgroundImage: 'linear-gradient(45deg, #2a2a2a 25%, transparent 25%), linear-gradient(-45deg, #2a2a2a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #2a2a2a 75%), linear-gradient(-45deg, transparent 75%, #2a2a2a 75%)',
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
          }),
        }}
        onClick={(e) => {
          // Click on canvas deselects layer
          if (e.target === e.currentTarget || (e.target as HTMLElement).closest('[data-background]')) {
            onSelectLayer(null)
          }
        }}
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
          {slide?.background_type === 'image' && slide.background_image_id && !slide.video_url && imageUrls[slide.background_image_id] && (
            <Image
              src={imageUrls[slide.background_image_id]}
              alt="Background"
              fill
              className="object-cover"
            />
          )}
          {slide?.background_type === 'collection_random' && slide.background_collection_id && !slide.video_url && imageUrls[randomImageIds[`slide-${slide.id}`]] && (
            <Image
              src={imageUrls[randomImageIds[`slide-${slide.id}`]]}
              alt="Background"
              fill
              className="object-cover"
            />
          )}
          {slide?.background_type === 'image' && slide.background_image_url && !slide.background_image_id && !slide.video_url && (
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
          .map((layer) => (
            <DraggableLayer
              key={layer.id}
              layer={layer}
              canvasWidth={template.width}
              canvasHeight={template.height}
              scaleFactor={scaleFactor}
              selected={layer.id === selectedLayerId}
              imageUrl={
                layer.image_id 
                  ? imageUrls[layer.image_id] 
                  : layer.image_source_type === 'collection_random'
                    ? imageUrls[randomImageIds[`layer-${layer.id}`]]
                    : undefined
              }
              onSelect={() => layer.id && onSelectLayer(layer.id)}
              onUpdate={(updates) => layer.id && onUpdateLayer(layer.id, updates)}
              onDelete={() => layer.id && onDeleteLayer(layer.id)}
              readOnly={readOnly}
            />
          ))}
      </div>
    </div>
  )
}
