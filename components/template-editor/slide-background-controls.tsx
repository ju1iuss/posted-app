"use client"

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Upload, Video, Image as ImageIcon, Check } from 'lucide-react'
import { TemplateSlide, BackgroundType } from './types'
import { toast } from 'sonner'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface SlideBackgroundControlsProps {
  slide: TemplateSlide
  templateType: 'carousel' | 'video'
  onUpdate: (updates: Partial<TemplateSlide>) => void
  organizationId: string
  readOnly?: boolean
}

export function SlideBackgroundControls({
  slide,
  templateType,
  onUpdate,
  organizationId,
  readOnly
}: SlideBackgroundControlsProps) {
  const [collections, setCollections] = useState<any[]>([])
  const [images, setImages] = useState<any[]>([])
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function loadCollections() {
      const { data } = await supabase
        .from('collections')
        .select('*')
        .order('name')
      setCollections(data || [])
    }
    loadCollections()
  }, [supabase])

  useEffect(() => {
    async function loadImages() {
      if (slide.background_collection_id) {
        const { data } = await supabase
          .from('collection_images')
          .select('images(*)')
          .eq('collection_id', slide.background_collection_id)
          .order('position')
        
        setImages(data?.map((ci: any) => ci.images).filter(Boolean) || [])
      }
    }
    loadImages()
  }, [slide.background_collection_id, supabase])

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `${organizationId}/uploads/${fileName}`

    try {
      toast.loading('Uploading video...', { id: 'uploading' })

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath)

      onUpdate({ video_url: publicUrl })
      toast.success('Video uploaded', { id: 'uploading' })
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error('Failed to upload video: ' + error.message, { id: 'uploading' })
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `${organizationId}/uploads/${fileName}`

    try {
      toast.loading('Uploading image...', { id: 'uploading' })

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath)

      // Create image record
      const { data: imageData, error: dbError } = await supabase
        .from('images')
        .insert({
          organization_id: organizationId,
          storage_path: filePath,
          url: publicUrl,
          filename: file.name,
          source: 'upload',
          mime_type: file.type,
          size_bytes: file.size
        })
        .select()
        .single()

      if (dbError) throw dbError

      onUpdate({ 
        background_image_id: imageData.id,
        background_image_url: publicUrl 
      })
      toast.success('Image uploaded', { id: 'uploading' })
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error('Failed to upload image: ' + error.message, { id: 'uploading' })
    }
  }

  if (templateType === 'video') {
    return (
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-[#dbdbdb]/60">Source</Label>
          <Select
            value={slide.video_collection_id ? 'collection' : slide.video_url ? 'upload' : 'none'}
            onValueChange={(val) => {
              if (val === 'collection') {
                onUpdate({ video_url: null })
              } else if (val === 'upload') {
                onUpdate({ video_collection_id: null })
              }
            }}
            disabled={readOnly}
          >
            <SelectTrigger className="h-7 text-[11px] font-bold bg-zinc-900 border-zinc-700 text-[#dbdbdb]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-lg bg-zinc-800 border-zinc-700">
              <SelectItem value="collection" className="text-[11px] text-[#dbdbdb]">From Collection</SelectItem>
              <SelectItem value="upload" className="text-[11px] text-[#dbdbdb]">Upload Video</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {slide.video_collection_id && (
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-[#dbdbdb]/60">Collection</Label>
            <Select
              value={slide.video_collection_id}
              onValueChange={(val) => onUpdate({ video_collection_id: val })}
              disabled={readOnly}
            >
              <SelectTrigger className="h-7 text-[11px] font-bold bg-zinc-900 border-zinc-700 text-[#dbdbdb]">
                <SelectValue placeholder="Select collection" />
              </SelectTrigger>
              <SelectContent className="rounded-lg bg-zinc-800 border-zinc-700">
                {collections.map((collection) => (
                  <SelectItem key={collection.id} value={collection.id} className="text-[11px] text-[#dbdbdb]">
                    {collection.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {!slide.video_collection_id && (
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-[#dbdbdb]/60">File</Label>
            <Button
              variant="outline"
              className="w-full h-7 text-[11px] font-bold border-zinc-700 bg-zinc-900 text-[#dbdbdb] hover:bg-zinc-800"
              onClick={() => document.getElementById('video-upload')?.click()}
              disabled={readOnly}
            >
              <Upload className="size-3 mr-1.5" />
              Choose File
            </Button>
            <input
              id="video-upload"
              type="file"
              accept="video/*"
              onChange={handleVideoUpload}
              className="hidden"
              disabled={readOnly}
            />
          </div>
        )}
      </div>
    )
  }

  // Carousel background controls
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-[10px] font-bold uppercase tracking-widest text-[#dbdbdb]/60">Background</Label>
        <Select
          value={slide.background_type || 'none'}
          onValueChange={(val) => {
            const updates: Partial<TemplateSlide> = { background_type: val as BackgroundType }
            if (val === 'color') {
              updates.background_color = '#ffffff'
              updates.background_image_id = null
              updates.background_collection_id = null
            } else if (val === 'none') {
              updates.background_color = null
              updates.background_image_id = null
              updates.background_collection_id = null
            }
            onUpdate(updates)
          }}
          disabled={readOnly}
        >
          <SelectTrigger className="h-7 text-[11px] font-bold bg-zinc-900 border-zinc-700 text-[#dbdbdb]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-lg bg-zinc-800 border-zinc-700">
            <SelectItem value="none" className="text-[11px] text-[#dbdbdb]">None</SelectItem>
            <SelectItem value="color" className="text-[11px] text-[#dbdbdb]">Color</SelectItem>
            <SelectItem value="image" className="text-[11px] text-[#dbdbdb]">Specific Image</SelectItem>
            <SelectItem value="collection_random" className="text-[11px] text-[#dbdbdb]">Random from Collection</SelectItem>
            <SelectItem value="collection_specific" className="text-[11px] text-[#dbdbdb]">Specific from Collection</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {slide.background_type === 'color' && (
        <div className="space-y-1">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-[#dbdbdb]/60">Color</Label>
          <div className="flex items-center gap-1.5">
            <Input
              type="color"
              value={slide.background_color || '#ffffff'}
              onChange={(e) => onUpdate({ background_color: e.target.value })}
              className="h-7 w-12 p-0.5 cursor-pointer bg-zinc-900 border-zinc-700"
              disabled={readOnly}
            />
            <Input
              type="text"
              value={slide.background_color || '#ffffff'}
              onChange={(e) => onUpdate({ background_color: e.target.value })}
              className="flex-1 h-7 text-[10px] font-mono font-bold bg-zinc-900 border-zinc-700 text-[#dbdbdb]"
              disabled={readOnly}
            />
          </div>
        </div>
      )}

      {(slide.background_type === 'image' || slide.background_type === 'collection_random' || slide.background_type === 'collection_specific') && (
        <div className="space-y-1">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-[#dbdbdb]/60">Collection</Label>
          <Select
            value={slide.background_collection_id || ''}
            onValueChange={(val) => {
              onUpdate({ background_collection_id: val, background_image_id: null })
            }}
            disabled={readOnly}
          >
            <SelectTrigger className="h-7 text-[11px] font-bold bg-zinc-900 border-zinc-700 text-[#dbdbdb]">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent className="rounded-lg bg-zinc-800 border-zinc-700">
              {collections.map((collection) => (
                <SelectItem key={collection.id} value={collection.id} className="text-[11px] text-[#dbdbdb]">
                  {collection.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {slide.background_type === 'image' && !slide.background_collection_id && (
        <div className="space-y-1">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-[#dbdbdb]/60">Background Image</Label>
          <Button
            variant="outline"
            className="w-full h-7 text-[11px] font-bold border-zinc-700 bg-zinc-900 text-[#dbdbdb] hover:bg-zinc-800"
            onClick={() => document.getElementById('bg-image-upload')?.click()}
            disabled={readOnly}
          >
            <Upload className="size-3 mr-1.5" />
            {slide.background_image_id ? 'Change Image' : 'Upload Image'}
          </Button>
          <input
            id="bg-image-upload"
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            disabled={readOnly}
          />
        </div>
      )}

      {slide.background_type === 'image' && slide.background_collection_id && (
        <div className="space-y-2">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-[#dbdbdb]/60">Image</Label>
          <div className="grid grid-cols-3 gap-2 max-h-[200px] overflow-y-auto scrollbar-hide p-1 bg-zinc-900/50 rounded-lg border border-zinc-800">
            {images.length === 0 ? (
              <div className="col-span-3 text-center py-6 text-[#dbdbdb]/40 text-[10px] italic">
                No images in collection
              </div>
            ) : (
              images.map((image) => (
                <button
                  key={image.id}
                  onClick={() => !readOnly && onUpdate({ background_image_id: image.id })}
                  disabled={readOnly}
                  className={cn(
                    "group relative aspect-square rounded-lg overflow-hidden border-2 transition-all",
                    slide.background_image_id === image.id
                      ? "border-[#ddfc7b] ring-2 ring-[#ddfc7b]/30"
                      : "border-zinc-800 hover:border-zinc-700"
                  )}
                >
                  {image.url ? (
                    <Image
                      src={image.url}
                      alt={image.filename || 'Image'}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                      <ImageIcon className="size-4 text-[#dbdbdb]/40" />
                    </div>
                  )}
                  {slide.background_image_id === image.id && (
                    <div className="absolute inset-0 bg-[#ddfc7b]/20 flex items-center justify-center">
                      <div className="size-5 rounded-full bg-[#ddfc7b] flex items-center justify-center">
                        <Check className="size-3 text-[#171717]" />
                      </div>
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
