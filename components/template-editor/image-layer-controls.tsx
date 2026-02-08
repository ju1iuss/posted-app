"use client"

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Upload, Image as ImageIcon, Check, Maximize, X } from 'lucide-react'
import { TemplateLayer, ImageSourceType } from './types'
import { toast } from 'sonner'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface ImageLayerControlsProps {
  layer: TemplateLayer
  onUpdate: (updates: Partial<TemplateLayer>) => void
  organizationId: string
  readOnly?: boolean
}

export function ImageLayerControls({ layer, onUpdate, organizationId, readOnly }: ImageLayerControlsProps) {
  const [collections, setCollections] = useState<any[]>([])
  const [images, setImages] = useState<any[]>([])
  const [expandedImage, setExpandedImage] = useState<string | null>(null)
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
      if (layer.image_source_type === 'specific' && layer.image_collection_id) {
        const { data } = await supabase
          .from('collection_images')
          .select('images(*)')
          .eq('collection_id', layer.image_collection_id)
          .order('position')
        
        setImages(data?.map((ci: any) => ci.images).filter(Boolean) || [])
      } else {
        setImages([])
      }
    }
    loadImages()
  }, [layer.image_collection_id, layer.image_source_type, supabase])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `${organizationId}/uploads/${fileName}`

    try {
      toast.loading('Uploading image...', { id: 'uploading' })

      // 1. Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath)

      // 3. Create Image Record
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

      // 4. Update Layer
      onUpdate({ 
        image_id: imageData.id,
        image_source_type: 'specific'
      })
      
      toast.success('Image uploaded', { id: 'uploading' })
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error('Failed to upload: ' + error.message, { id: 'uploading' })
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-[10px] font-bold uppercase tracking-widest text-[#dbdbdb]/60">Source</Label>
        <Select
          value={layer.image_source_type || 'specific'}
          onValueChange={(val) => {
            onUpdate({ image_source_type: val as ImageSourceType })
            if (val === 'collection_random') {
              onUpdate({ image_id: null })
            } else if (val === 'specific') {
            } else {
              onUpdate({ image_id: null, image_collection_id: null })
            }
          }}
          disabled={readOnly}
        >
          <SelectTrigger className="h-7 text-[11px] font-bold bg-zinc-900 border-zinc-700 text-[#dbdbdb]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-lg bg-zinc-800 border-zinc-700">
            <SelectItem value="specific" className="text-[11px] text-[#dbdbdb]">Specific Image</SelectItem>
            <SelectItem value="collection_random" className="text-[11px] text-[#dbdbdb]">Random from Collection</SelectItem>
            <SelectItem value="upload" className="text-[11px] text-[#dbdbdb]">Upload Image</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {layer.image_source_type === 'collection_random' && (
        <div className="space-y-1">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-[#dbdbdb]/60">Collection</Label>
          <Select
            value={layer.image_collection_id || ''}
            onValueChange={(val) => onUpdate({ image_collection_id: val })}
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

      {layer.image_source_type === 'specific' && (
        <>
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-[#dbdbdb]/60">Collection</Label>
            <Select
              value={layer.image_collection_id || '_none'}
              onValueChange={(val) => {
                onUpdate({ image_collection_id: val === '_none' ? null : val, image_id: null })
                setImages([])
              }}
              disabled={readOnly}
            >
              <SelectTrigger className="h-7 text-[11px] font-bold bg-zinc-900 border-zinc-700 text-[#dbdbdb]">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent className="rounded-lg bg-zinc-800 border-zinc-700">
                <SelectItem value="_none" className="text-[11px] text-[#dbdbdb]">No collection</SelectItem>
                {collections.map((collection) => (
                  <SelectItem key={collection.id} value={collection.id} className="text-[11px] text-[#dbdbdb]">
                    {collection.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {layer.image_collection_id && (
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-[#dbdbdb]/60">Image</Label>
              <div className="grid grid-cols-3 gap-2 max-h-[200px] overflow-y-auto scrollbar-hide p-1 bg-zinc-900/50 rounded-lg border border-zinc-800">
                {images.length === 0 ? (
                  <div className="col-span-3 text-center py-6 text-[#dbdbdb]/40 text-[10px] italic">
                    No images in collection
                  </div>
                ) : (
                  images.map((image) => (
                    <div
                      key={image.id}
                      className="group relative aspect-square rounded-lg overflow-hidden"
                    >
                      <button
                        onClick={() => !readOnly && onUpdate({ image_id: image.id })}
                        disabled={readOnly}
                        className={cn(
                          "w-full h-full relative border-2 transition-all",
                          layer.image_id === image.id
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
                        {layer.image_id === image.id && (
                          <div className="absolute inset-0 bg-[#ddfc7b]/20 flex items-center justify-center">
                            <div className="size-5 rounded-full bg-[#ddfc7b] flex items-center justify-center">
                              <Check className="size-3 text-[#171717]" />
                            </div>
                          </div>
                        )}
                      </button>
                      {image.url && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setExpandedImage(image.url)
                          }}
                          className="absolute top-1 right-1 size-6 rounded-md bg-black/60 hover:bg-black/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white z-10"
                          title="View larger"
                        >
                          <Maximize className="size-3" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}

      {layer.image_source_type === 'upload' && (
        <div className="space-y-1">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-[#dbdbdb]/60">File</Label>
          <Button
            variant="outline"
            className="w-full h-7 text-[11px] font-bold border-zinc-700 bg-zinc-900 text-[#dbdbdb] hover:bg-zinc-800"
            onClick={() => document.getElementById('image-upload')?.click()}
            disabled={readOnly}
          >
            <Upload className="size-3 mr-1.5" />
            Choose File
          </Button>
          <input
            id="image-upload"
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
            disabled={readOnly}
          />
        </div>
      )}

      <div className="space-y-1.5 pt-1 border-t border-zinc-700">
        <div className="text-[10px] font-bold uppercase tracking-widest text-[#dbdbdb]/60 mb-2">Sizing</div>
        <div className="space-y-2">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-[#dbdbdb]/60">Width</Label>
              <span className="text-[10px] font-bold text-[#dbdbdb]">{layer.width}%</span>
            </div>
            <Slider
              value={[layer.width]}
              onValueChange={([value]) => onUpdate({ width: value })}
              min={10}
              max={500}
              step={5}
              className="py-1"
              disabled={readOnly}
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-[#dbdbdb]/60">Height</Label>
              <span className="text-[10px] font-bold text-[#dbdbdb]">{layer.height || layer.width}%</span>
            </div>
            <Slider
              value={[layer.height || layer.width]}
              onValueChange={([value]) => onUpdate({ height: value })}
              min={10}
              max={500}
              step={5}
              className="py-1"
              disabled={readOnly}
            />
          </div>
        </div>
      </div>

      {/* Expanded Image Modal */}
      {expandedImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-200"
          onClick={() => setExpandedImage(null)}
        >
          <button 
            className="absolute top-6 right-6 size-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all hover:scale-110 z-[110]"
            onClick={() => setExpandedImage(null)}
          >
            <X className="size-6" />
          </button>
          <div className="relative max-w-full max-h-full rounded-2xl overflow-hidden shadow-2xl border border-white/10">
            <img 
              src={expandedImage} 
              className="w-auto h-auto max-w-full max-h-[90vh] object-contain"
              alt="Expanded view"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  )
}
