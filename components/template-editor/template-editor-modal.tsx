"use client"

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X, Save, Download, Undo2, Redo2, Pencil, ZoomIn, ZoomOut } from 'lucide-react'
import { toast } from 'sonner'
import { DndContext } from '@dnd-kit/core'
import { useEditorState } from './use-editor-state'
import { Template, AspectRatio } from './types'
import { ASPECT_RATIOS } from './constants'
import { EditorCanvas } from './editor-canvas'
import { SlidePanel } from './slide-panel'
import { LayerPanel } from './layer-panel'
import { ExportDialog } from './export-dialog'
import { TemplatePreview } from './template-preview'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface TemplateEditorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  templateId?: string | null
  organizationId: string
  onSaved?: () => void
}

export function TemplateEditorModal({
  open,
  onOpenChange,
  templateId,
  organizationId,
  onSaved
}: TemplateEditorModalProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [isReadOnly, setIsReadOnly] = useState(true)
  const [canEdit, setCanEdit] = useState(false) // Whether this template can be edited at all
  const supabase = useMemo(() => createClient(), [])
  
  const {
    state,
    dispatch,
    addSlide,
    deleteSlide,
    duplicateSlide,
    updateSlide,
    addLayer,
    updateLayer,
    deleteLayer,
    setAspectRatio
  } = useEditorState()

  // Load template data
  useEffect(() => {
    if (!open) return

    if (!templateId) {
      setIsReadOnly(false) // New templates are always editable
      setCanEdit(true)
      // Reset to empty state for new template
      dispatch({ type: 'RESET' })
      return
    }

    async function loadTemplate() {
      setLoading(true)
      try {
        // Load template with slides and layers
        const { data: templateData, error: templateError } = await supabase
          .from('templates')
          .select('*')
          .eq('id', templateId)
          .single()

        if (templateError) throw templateError

        // Reset state first, then load template data
        dispatch({ type: 'RESET', template: templateData })
        // Always start in view mode for existing templates
        setIsReadOnly(true)
        // Can only edit if owned by this org and not a premade template
        setCanEdit(!templateData.is_premade && templateData.organization_id === organizationId)

        // Load slides
        const { data: slidesData, error: slidesError } = await supabase
          .from('template_slides')
          .select('*')
          .eq('template_id', templateId)
          .order('position', { ascending: true })

        if (slidesError) throw slidesError

        dispatch({ type: 'SET_SLIDES', slides: slidesData || [] })

        // Load layers for each slide
        if (slidesData && slidesData.length > 0) {
          const slideIds = slidesData.map(s => s.id).filter(Boolean) as string[]
          
          for (const slideId of slideIds) {
            const { data: layersData } = await supabase
              .from('template_layers')
              .select('*')
              .eq('slide_id', slideId)
              .order('position', { ascending: true })

            if (layersData) {
              dispatch({ type: 'SET_LAYERS', slideId, layers: layersData })
            }
          }

          // Select first slide
          if (slidesData[0]?.id) {
            dispatch({ type: 'SELECT_SLIDE', slideId: slidesData[0].id })
          }
        } else {
          // No slides, add default
          addSlide({
            position: 0,
            background_type: 'none',
            background_color: '#ffffff'
          })
        }
      } catch (error: any) {
        console.error('Error loading template:', error)
        toast.error('Failed to load template')
      } finally {
        setLoading(false)
      }
    }

    loadTemplate()
  }, [open, templateId, supabase, addSlide, dispatch])

  // Add initial slide for new template
  useEffect(() => {
    if (open && !templateId && state.slides.length === 0) {
      addSlide({
        position: 0,
        background_type: 'none',
        background_color: '#ffffff'
      })
    }
  }, [open, templateId, state.slides.length, addSlide])

  // Loss prevention
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [state.isDirty])

  const handleClose = () => {
    if (state.isDirty) {
      setShowUnsavedDialog(true)
    } else {
      onOpenChange(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Determine if we need to duplicate
      const isDuplicating = !templateId || state.template.is_premade || state.template.organization_id !== organizationId

      // Save template
      const templateData = {
        organization_id: organizationId,
        name: isDuplicating && templateId ? `${state.template.name} (Copy)` : state.template.name,
        description: state.template.description,
        type: state.template.type,
        aspect_ratio: state.template.aspect_ratio,
        width: state.template.width,
        height: state.template.height,
        prompt: state.template.prompt,
        is_premade: false
      }

      let savedTemplateId: string

      if (templateId && !isDuplicating) {
        // Update existing
        const { error } = await supabase
          .from('templates')
          .update(templateData)
          .eq('id', templateId)

        if (error) throw error
        savedTemplateId = templateId
      } else {
        // Create new (or duplicate)
        const { data, error } = await supabase
          .from('templates')
          .insert(templateData)
          .select()
          .single()

        if (error) throw error
        savedTemplateId = data.id
      }

      // Delete existing slides and layers if updating
      if (!isDuplicating) {
        const { data: existingSlides } = await supabase
          .from('template_slides')
          .select('id')
          .eq('template_id', savedTemplateId)

        if (existingSlides) {
          const slideIds = existingSlides.map(s => s.id).filter(Boolean) as string[]
          
          if (slideIds.length > 0) {
            await supabase
              .from('template_layers')
              .delete()
              .in('slide_id', slideIds)

            await supabase
              .from('template_slides')
              .delete()
              .eq('template_id', savedTemplateId)
          }
        }
      }

      // Insert new slides
        const slidesToInsert = state.slides.map((slide, idx) => ({
          template_id: savedTemplateId,
          position: idx,
          background_type: slide.background_type,
          background_color: slide.background_color,
          background_image_id: slide.background_image_id,
          background_image_url: slide.background_image_url,
          background_collection_id: slide.background_collection_id,
          video_url: slide.video_url,
          video_collection_id: slide.video_collection_id
        }))

      const { data: insertedSlides, error: slidesError } = await supabase
        .from('template_slides')
        .insert(slidesToInsert)
        .select()

      if (slidesError) throw slidesError

      // Insert layers
      if (insertedSlides) {
        const layersToInsert: any[] = []
        
        for (const slide of state.slides) {
          const insertedSlide = insertedSlides.find(s => s.position === slide.position)
          if (!insertedSlide?.id) continue

          const slideLayers = state.layers[slide.id || ''] || []
          for (const layer of slideLayers) {
            layersToInsert.push({
              slide_id: insertedSlide.id,
              type: layer.type,
              position: layer.position,
              x: layer.x,
              y: layer.y,
              width: layer.width,
              height: layer.height || layer.width,
              text_content: layer.text_content,
              font_family: layer.font_family,
              font_size: layer.font_size,
              font_weight: layer.font_weight,
              text_color: layer.text_color,
              text_align: layer.text_align,
              background_color: layer.background_color,
              stroke_color: layer.stroke_color,
              stroke_width: layer.stroke_width,
              image_id: layer.image_id,
              image_collection_id: layer.image_collection_id,
              image_source_type: layer.image_source_type
            })
          }
        }

        if (layersToInsert.length > 0) {
          const { error: layersError } = await supabase
            .from('template_layers')
            .insert(layersToInsert)

          if (layersError) throw layersError
        }
      }

      dispatch({ type: 'SET_DIRTY', isDirty: false })
      toast.success(isDuplicating && templateId ? 'Created a copy of the template' : 'Template saved successfully')
      onSaved?.()
      onOpenChange(false) // Close modal after save/duplicate
    } catch (error: any) {
      console.error('Error saving template:', error)
      toast.error(error.message || 'Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  const currentSlide = state.slides.find(s => s.id === state.selectedSlideId)
  const currentLayers = currentSlide ? state.layers[currentSlide.id || ''] || [] : []
  const selectedLayer = currentLayers.find(l => l.id === state.selectedLayerId)

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent 
          className="max-w-screen h-screen p-0 rounded-none border-none overflow-hidden top-0 left-0 translate-x-0 translate-y-0 sm:max-w-full flex flex-col bg-zinc-900"
          showCloseButton={false}
        >
          {/* Header */}
          <div className="px-3 py-2 border-b border-zinc-700 bg-zinc-900 shrink-0 flex items-center justify-between z-30">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="h-7 w-7 hover:bg-zinc-800 text-[#dbdbdb]/60"
              >
                <X className="size-4" />
              </Button>
              <div className="h-4 w-px bg-zinc-700" />
              
              <DialogTitle className="sr-only">
                {templateId ? 'Edit Template' : 'Create Template'}
              </DialogTitle>

              {/* Project Name */}
              <input
                value={state.template.name}
                onChange={(e) => dispatch({ type: 'SET_TEMPLATE', template: { ...state.template, name: e.target.value } })}
                className="bg-transparent border-none text-xs font-bold text-[#dbdbdb] focus:outline-none w-[120px] hover:bg-zinc-800 px-2 py-1 rounded transition-colors"
                placeholder="New Template"
                readOnly={isReadOnly}
              />

              <div className="h-4 w-px bg-zinc-700" />

              {/* Aspect Ratio */}
              <Select
                value={state.template.aspect_ratio}
                onValueChange={(val) => setAspectRatio(val as AspectRatio)}
                disabled={isReadOnly}
              >
                <SelectTrigger className="h-7 w-[130px] text-[10px] font-bold border-transparent bg-zinc-800 hover:bg-zinc-700 text-[#dbdbdb] transition-all px-2 rounded">
                  <SelectValue placeholder="Select Ratio" />
                </SelectTrigger>
                <SelectContent className="rounded-lg bg-zinc-800 border-zinc-700">
                  {Object.entries(ASPECT_RATIOS).map(([ratio, config]) => (
                    <SelectItem key={ratio} value={ratio} className="text-[10px] text-[#dbdbdb]">
                      {ratio} - {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="h-4 w-px bg-zinc-700" />

              {/* Slide Count */}
              <div className="flex items-center justify-center size-6 rounded bg-zinc-800 text-[10px] font-bold text-[#dbdbdb]">
                {state.slides.length}
              </div>

              <div className="h-4 w-px bg-zinc-700" />

              {/* Zoom Controls */}
              <div className="flex items-center gap-0.5 bg-zinc-800 rounded-lg p-0.5 border border-zinc-700">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-md hover:bg-zinc-700 text-[#dbdbdb]/60 hover:text-[#dbdbdb]"
                  onClick={() => dispatch({ type: 'SET_ZOOM', zoom: Math.max(0.5, state.zoom - 0.25) })}
                >
                  <ZoomOut className="size-3" />
                </Button>
                <Select
                  value={String(state.zoom)}
                  onValueChange={(val) => dispatch({ type: 'SET_ZOOM', zoom: Number(val) })}
                >
                  <SelectTrigger className="h-6 w-[60px] text-[10px] font-bold border-0 bg-transparent hover:bg-zinc-700 text-[#dbdbdb] transition-all px-1.5 rounded-md">
                    <SelectValue placeholder={`${Math.round(state.zoom * 100)}%`} />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg min-w-[80px] bg-zinc-800 border-zinc-700">
                    <SelectItem value="0.5" className="text-[10px] text-[#dbdbdb]">50%</SelectItem>
                    <SelectItem value="0.75" className="text-[10px] text-[#dbdbdb]">75%</SelectItem>
                    <SelectItem value="1" className="text-[10px] text-[#dbdbdb]">100%</SelectItem>
                    <SelectItem value="1.25" className="text-[10px] text-[#dbdbdb]">125%</SelectItem>
                    <SelectItem value="1.5" className="text-[10px] text-[#dbdbdb]">150%</SelectItem>
                    <SelectItem value="2" className="text-[10px] text-[#dbdbdb]">200%</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-md hover:bg-zinc-700 text-[#dbdbdb]/60 hover:text-[#dbdbdb]"
                  onClick={() => dispatch({ type: 'SET_ZOOM', zoom: Math.min(2.0, state.zoom + 0.25) })}
                >
                  <ZoomIn className="size-3" />
                </Button>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-[#dbdbdb]/60 hover:text-[#dbdbdb]"
                onClick={() => {}}
              >
                <Undo2 className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-[#dbdbdb]/60 hover:text-[#dbdbdb]"
                onClick={() => {}}
              >
                <Redo2 className="size-3.5" />
              </Button>
              <div className="h-4 w-px bg-zinc-700 mx-1" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExportDialog(true)}
                className="h-7 px-3 text-[10px] border-zinc-700 bg-zinc-800 text-[#dbdbdb] hover:bg-zinc-700 font-bold"
              >
                <Download className="size-3 mr-1.5" />
                Export
              </Button>
              {isReadOnly && canEdit ? (
                <Button
                  onClick={() => setIsReadOnly(false)}
                  className="h-7 px-3 text-[10px] bg-[#ddfc7b] text-[#171717] hover:bg-[#ddfc7b]/90 rounded-lg font-bold"
                >
                  <Pencil className="size-3 mr-1.5" />
                  Edit
                </Button>
              ) : !isReadOnly ? (
                <Button
                  onClick={handleSave}
                  disabled={saving || !state.template.name}
                  className="h-7 px-3 text-[10px] bg-[#ddfc7b] text-[#171717] hover:bg-[#ddfc7b]/90 rounded-lg font-bold"
                >
                  <Save className="size-3 mr-1.5" />
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              ) : null}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 relative overflow-hidden flex">
            {loading ? (
              <div className="flex-1 flex items-center justify-center bg-zinc-900">
                <div className="text-[#dbdbdb]/60">Loading template...</div>
              </div>
            ) : isReadOnly ? (
              <div className="flex-1 bg-zinc-900">
                <TemplatePreview
                  template={state.template}
                  slides={state.slides}
                  layers={state.layers}
                />
              </div>
            ) : (
              <DndContext>
                {/* Left: Slide Panel */}
                <div className="w-[180px] h-full shrink-0 z-20">
                  <SlidePanel
                    slides={state.slides}
                    selectedSlideId={state.selectedSlideId}
                    onSelectSlide={(slideId) => dispatch({ type: 'SELECT_SLIDE', slideId })}
                    onAddSlide={() => {
                      const newPosition = state.slides.length
                      addSlide({
                        position: newPosition,
                        background_type: 'none',
                        background_color: '#ffffff'
                      })
                    }}
                    onDeleteSlide={deleteSlide}
                    onDuplicateSlide={duplicateSlide}
                    onReorderSlides={(slideIds) => {
                      dispatch({ type: 'REORDER_SLIDES', slideIds })
                    }}
                    readOnly={isReadOnly}
                  />
                </div>

                {/* Center: Canvas */}
                <div className="flex-1 h-full bg-zinc-900 overflow-auto p-8 flex items-center justify-center relative">
                  <EditorCanvas
                    template={state.template}
                    slide={currentSlide}
                    layers={currentLayers}
                    selectedLayerId={state.selectedLayerId}
                    onSelectLayer={(layerId) => dispatch({ type: 'SELECT_LAYER', layerId })}
                    onUpdateLayer={updateLayer}
                    onDeleteLayer={deleteLayer}
                    readOnly={isReadOnly}
                    zoom={state.zoom}
                  />
                </div>

                {/* Right: Layer Panel */}
                <div className="w-[260px] h-full shrink-0 z-20">
                  <LayerPanel
                    layers={currentLayers}
                    selectedLayerId={state.selectedLayerId}
                    onSelectLayer={(layerId) => dispatch({ type: 'SELECT_LAYER', layerId })}
                    onAddTextLayer={() => {
                      if (!currentSlide?.id) return
                      if (currentLayers.filter(l => l.type === 'text').length >= 10) {
                        toast.error('Maximum 10 text layers per slide')
                        return
                      }
                      addLayer(currentSlide.id, {
                        type: 'text',
                        position: currentLayers.length,
                        x: 50,
                        y: 50,
                        width: 80,
                        height: 20,
                        text_content: 'New Text',
                        font_family: 'TikTok Sans',
                        font_size: 48,
                        font_weight: 'bold',
                        text_color: '#ffffff',
                        text_align: 'center',
                        stroke_width: 0
                      })
                    }}
                    onAddImageLayer={() => {
                      if (!currentSlide?.id) return
                      addLayer(currentSlide.id, {
                        type: 'image',
                        position: currentLayers.length,
                        x: 50,
                        y: 50,
                        width: 60,
                        height: 60,
                        image_source_type: 'specific'
                      })
                    }}
                    onUpdateLayer={updateLayer}
                    onDeleteLayer={deleteLayer}
                    onReorderLayers={(layerIds) => {
                      if (!currentSlide?.id) return
                      dispatch({ type: 'REORDER_LAYERS', slideId: currentSlide.id, layerIds })
                    }}
                    selectedLayer={selectedLayer}
                    currentSlide={currentSlide}
                    templateType={state.template.type}
                    onUpdateSlide={(updates) => {
                      if (currentSlide?.id) {
                        updateSlide(currentSlide.id, updates)
                      }
                    }}
                    organizationId={organizationId}
                    readOnly={isReadOnly}
                  />
                </div>
              </DndContext>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Unsaved Changes Dialog */}
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent className="rounded-2xl bg-zinc-800 border-zinc-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#dbdbdb]">Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription className="text-[#dbdbdb]/60">
              You have unsaved changes. Are you sure you want to close without saving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-[#dbdbdb] hover:bg-zinc-700">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                dispatch({ type: 'SET_DIRTY', isDirty: false })
                setShowUnsavedDialog(false)
                onOpenChange(false)
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Export Dialog */}
      {showExportDialog && (
        <ExportDialog
          open={showExportDialog}
          onOpenChange={setShowExportDialog}
          template={state.template}
          slides={state.slides}
          layers={state.layers}
        />
      )}
    </>
  )
}
