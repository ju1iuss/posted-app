"use client"

import { Plus, Trash2, GripVertical, Type, Image as ImageIcon, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TemplateLayer } from './types'
import { TextLayerControls } from './text-layer-controls'
import { ImageLayerControls } from './image-layer-controls'
import { SlideBackgroundControls } from './slide-background-controls'
import { cn } from '@/lib/utils'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface LayerPanelProps {
  layers: TemplateLayer[]
  selectedLayerId: string | null
  onSelectLayer: (layerId: string | null) => void
  onAddTextLayer: () => void
  onAddImageLayer: () => void
  onUpdateLayer: (layerId: string, updates: Partial<TemplateLayer>) => void
  onDeleteLayer: (layerId: string) => void
  onDuplicateLayer: (layerId: string) => void
  onReorderLayers: (layerIds: string[]) => void
  selectedLayer?: TemplateLayer
  currentSlide?: any
  templateType?: 'carousel' | 'video'
  onUpdateSlide?: (updates: Partial<any>) => void
  organizationId: string
  readOnly?: boolean
}

function SortableLayerItem({
  layer,
  selected,
  onSelect,
  onDelete,
  onDuplicate,
  readOnly
}: {
  layer: TemplateLayer
  selected: boolean
  onSelect: () => void
  onDelete: () => void
  onDuplicate: () => void
  readOnly?: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ 
    id: layer.id || '',
    disabled: readOnly
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-1.5 p-1.5 rounded-lg border transition-all cursor-pointer ${
        selected
          ? 'border-[#ddfc7b] bg-zinc-800'
          : 'border-transparent hover:border-zinc-700 hover:bg-zinc-800/50'
      }`}
      onClick={onSelect}
    >
      <div
        {...(readOnly ? {} : { ...attributes, ...listeners })}
        className={cn(
          "text-[#dbdbdb]/60 hover:text-[#dbdbdb]",
          readOnly ? "cursor-default" : "cursor-grab active:cursor-grabbing"
        )}
      >
        <GripVertical className="size-3" />
      </div>
      {layer.type === 'text' ? (
        <Type className="size-3.5 text-[#dbdbdb]/60" />
      ) : (
        <ImageIcon className="size-3.5 text-[#dbdbdb]/60" />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-bold text-[#dbdbdb] truncate">
          {layer.type === 'text' ? (layer.text_content || 'Text Layer') : 'Image Layer'}
        </div>
      </div>
      {!readOnly && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-[#dbdbdb]/60 hover:text-[#dbdbdb]"
            onClick={(e) => {
              e.stopPropagation()
              onDuplicate()
            }}
            title="Duplicate layer"
          >
            <Copy className="size-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-red-500 hover:text-red-600"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      )}
    </div>
  )
}

export function LayerPanel({
  layers,
  selectedLayerId,
  onSelectLayer,
  onAddTextLayer,
  onAddImageLayer,
  onUpdateLayer,
  onDeleteLayer,
  onDuplicateLayer,
  onReorderLayers,
  selectedLayer,
  currentSlide,
  templateType = 'carousel',
  onUpdateSlide,
  organizationId,
  readOnly
}: LayerPanelProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: readOnly ? { distance: 9999 } : undefined
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const sortedLayers = [...layers].sort((a, b) => b.position - a.position)
    const oldIndex = sortedLayers.findIndex(l => l.id === active.id)
    const newIndex = sortedLayers.findIndex(l => l.id === over.id)
    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(sortedLayers, oldIndex, newIndex)
      const layerIds = reordered.map(l => l.id).filter(Boolean) as string[]
      onReorderLayers(layerIds)
    }
  }
  }

  return (
    <div className="w-full h-full bg-transparent flex flex-col">
      {!readOnly && (
        <div className="p-4 border-b border-zinc-800 space-y-3 bg-zinc-900/30">
          <div className="text-[10px] font-bold text-[#dbdbdb]/60 uppercase tracking-widest mb-1.5 px-0.5">
            Components
          </div>
          <div className="flex gap-2">
            <Button
              onClick={onAddTextLayer}
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-[11px] font-bold border-zinc-700 bg-zinc-900 text-[#dbdbdb] hover:bg-zinc-700 rounded-lg"
            >
              <Type className="size-3.5 mr-1.5" />
              Text
            </Button>
            <Button
              onClick={onAddImageLayer}
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-[11px] font-bold border-zinc-700 bg-zinc-900 text-[#dbdbdb] hover:bg-zinc-700 rounded-lg"
            >
              <ImageIcon className="size-3.5 mr-1.5" />
              Image
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
        <div className="text-[10px] font-bold text-[#dbdbdb]/60 uppercase tracking-widest mb-3 px-1">
          Layers
        </div>
        {!layers || layers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed border-zinc-800 rounded-xl mx-1">
            <div className="text-[#dbdbdb]/20 mb-2 font-bold text-[10px] uppercase tracking-tighter italic">
              Empty Canvas
            </div>
            <div className="text-[#dbdbdb]/40 text-[9px] leading-relaxed">
              Add text or images from the components above to start building your slide.
            </div>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={[...layers].sort((a, b) => b.position - a.position).map(l => l.id || '')}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1">
                {[...layers]
                  .sort((a, b) => b.position - a.position)
                  .map((layer, index) => (
                    <SortableLayerItem
                      key={layer.id || `layer-${index}`}
                      layer={layer}
                      selected={layer.id === selectedLayerId}
                      onSelect={() => onSelectLayer(layer.id || null)}
                      onDelete={() => layer.id && onDeleteLayer(layer.id)}
                      onDuplicate={() => layer.id && onDuplicateLayer(layer.id)}
                    />
                  ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <div className="mt-auto border-t border-zinc-700 bg-zinc-900/30">
        {/* Slide Background Controls */}
        {!selectedLayer && currentSlide && onUpdateSlide && !readOnly && (
          <div className="p-3 overflow-y-auto max-h-[450px] scrollbar-hide pb-20">
            <div className="text-[10px] font-bold text-[#dbdbdb]/60 uppercase tracking-widest mb-2.5 px-0.5">
              Slide Settings
            </div>
            <SlideBackgroundControls
              slide={currentSlide}
              templateType={templateType}
              onUpdate={onUpdateSlide}
              organizationId={organizationId}
            />
          </div>
        )}

        {/* Layer Properties */}
        {selectedLayer && !readOnly && (
          <div className="p-3 overflow-y-auto max-h-[450px] scrollbar-hide pb-20">
            <div className="text-[10px] font-bold text-[#dbdbdb]/60 uppercase tracking-widest mb-2.5 px-0.5">
              Layer Properties
            </div>
            {selectedLayer.type === 'text' ? (
              <TextLayerControls
                layer={selectedLayer}
                onUpdate={(updates) => selectedLayer.id && onUpdateLayer(selectedLayer.id, updates)}
              />
            ) : (
              <ImageLayerControls
                layer={selectedLayer}
                onUpdate={(updates) => selectedLayer.id && onUpdateLayer(selectedLayer.id, updates)}
                organizationId={organizationId}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
