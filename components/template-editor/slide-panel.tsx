"use client"

import Image from 'next/image'
import { Plus, Trash2, Copy, GripVertical, Layout } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TemplateSlide } from './types'
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

interface SlidePanelProps {
  slides: TemplateSlide[]
  selectedSlideId: string | null
  onSelectSlide: (slideId: string | null) => void
  onAddSlide: () => void
  onDeleteSlide: (slideId: string) => void
  onDuplicateSlide: (slideId: string) => void
  onReorderSlides: (slideIds: string[]) => void
  readOnly?: boolean
}

function SortableSlideItem({
  slide,
  selected,
  onSelect,
  onDelete,
  onDuplicate,
  readOnly
}: {
  slide: TemplateSlide
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
    id: slide.id || '',
    disabled: readOnly
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.5 : 1
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex items-center gap-3 p-2 rounded-xl border-2 transition-all cursor-pointer ${
        selected
          ? 'border-[#ddfc7b] bg-zinc-800 shadow-lg scale-[1.02]'
          : 'border-transparent hover:border-zinc-700 hover:bg-zinc-800/50'
      }`}
      onClick={onSelect}
    >
      <div
        {...(readOnly ? {} : { ...attributes, ...listeners })}
        className={cn(
          "text-[#dbdbdb]/40 hover:text-[#dbdbdb] transition-colors",
          readOnly ? "cursor-default" : "cursor-grab active:cursor-grabbing"
        )}
      >
        <GripVertical className="size-4" />
      </div>
      
      <div className="relative size-14 rounded-md bg-zinc-900 overflow-hidden border border-zinc-700 shrink-0 shadow-inner">
        {slide.background_image_url ? (
          <Image
            src={slide.background_image_url}
            alt={`Slide ${slide.position + 1}`}
            fill
            className="object-cover"
            unoptimized
          />
        ) : slide.background_type === 'color' && slide.background_color ? (
          <div className="w-full h-full" style={{ backgroundColor: slide.background_color }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Layout className="size-4 text-[#dbdbdb]/60" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 pr-2">
        <div className="text-[11px] font-bold text-[#dbdbdb] leading-none truncate">Slide {slide.position + 1}</div>
        <div className="text-[9px] text-[#dbdbdb]/30 truncate uppercase font-bold tracking-widest mt-1.5">
          {slide.background_type || 'None'}
        </div>
      </div>
      {!readOnly && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation()
              onDuplicate()
            }}
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

export function SlidePanel({
  slides,
  selectedSlideId,
  onSelectSlide,
  onAddSlide,
  onDeleteSlide,
  onDuplicateSlide,
  onReorderSlides,
  readOnly
}: SlidePanelProps) {
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
      const oldIndex = slides.findIndex(s => s.id === active.id)
      const newIndex = slides.findIndex(s => s.id === over.id)
      const reordered = arrayMove(slides, oldIndex, newIndex)
      const slideIds = reordered.map(s => s.id).filter(Boolean) as string[]
      onReorderSlides(slideIds)
    }
  }

  return (
    <div className="w-full h-full bg-transparent flex flex-col">
      {!readOnly && (
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/30">
          <Button
            onClick={onAddSlide}
            variant="outline"
            className="w-full h-8 text-xs font-bold border-zinc-700 bg-zinc-900 text-[#dbdbdb] hover:bg-zinc-700 rounded-lg transition-all"
            size="sm"
          >
            <Plus className="size-3.5 mr-1.5" />
            Add Slide
          </Button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 scrollbar-hide">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={slides.map(s => s.id || '')}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2.5">
              {slides.map((slide) => (
                <SortableSlideItem
                  key={slide.id}
                  slide={slide}
                  selected={slide.id === selectedSlideId}
                  onSelect={() => onSelectSlide(slide.id || null)}
                  onDelete={() => slide.id && onDeleteSlide(slide.id)}
                  onDuplicate={() => slide.id && onDuplicateSlide(slide.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  )
}
