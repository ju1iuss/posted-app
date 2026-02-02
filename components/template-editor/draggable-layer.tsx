"use client"

import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { TemplateLayer } from './types'
import { cn } from '@/lib/utils'
import { Trash2 } from 'lucide-react'

interface DraggableLayerProps {
  layer: TemplateLayer
  canvasWidth: number
  canvasHeight: number
  scaleFactor: number
  selected: boolean
  imageUrl?: string
  onSelect: () => void
  onUpdate: (updates: Partial<TemplateLayer>) => void
  onDelete?: () => void
  readOnly?: boolean
}

export function DraggableLayer({
  layer,
  canvasWidth,
  canvasHeight,
  scaleFactor,
  selected,
  imageUrl,
  onSelect,
  onUpdate,
  onDelete,
  readOnly
}: DraggableLayerProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeHandle, setResizeHandle] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(layer.text_content || '')
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, initialDistance: 0 })
  const layerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync edit text when layer changes externally
  useEffect(() => {
    if (!isEditing) {
      setEditText(layer.text_content || '')
    }
  }, [layer.text_content, isEditing])

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${layer.x}%`,
    top: `${layer.y}%`,
    width: `${layer.width}%`,
    height: layer.type === 'image' && layer.height ? `${layer.height}%` : 'auto',
    transform: 'translate(-50%, -50%)',
    zIndex: layer.position + 10,
  }

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isEditing) return
    e.stopPropagation()
    if (readOnly) return
    
    // Check if clicking on resize handle
    const target = e.target as HTMLElement
    const resizeHandleElement = target.closest('[data-resize-handle]')
    if (resizeHandleElement) {
      const handleType = resizeHandleElement.getAttribute('data-resize-handle')
      e.preventDefault()
      e.stopPropagation()
      setIsResizing(true)
      setResizeHandle(handleType)
      const layerRect = layerRef.current?.getBoundingClientRect()
      const canvasElement = layerRef.current?.closest('[data-canvas]') as HTMLElement
      if (layerRect && canvasElement) {
        canvasRef.current = canvasElement
        setResizeStart({
          x: e.clientX,
          y: e.clientY,
          width: layer.width,
          height: layer.height || layer.width, // Fallback if height not set
          initialDistance: 0 // Not used for new multi-handle logic
        } as any)
      }
      return
    }
    
    // Check if clicking on delete button
    if (target.closest('[data-delete-button]')) {
      return
    }
    
    onSelect()
    setIsDragging(true)
    
    const layerRect = layerRef.current?.getBoundingClientRect()
    const canvasElement = layerRef.current?.closest('[data-canvas]') as HTMLElement
    if (layerRect && canvasElement) {
      canvasRef.current = canvasElement
      const layerCenterX = layerRect.left + layerRect.width / 2
      const layerCenterY = layerRect.top + layerRect.height / 2
      
      setDragOffset({
        x: e.clientX - layerCenterX,
        y: e.clientY - layerCenterY
      })
    }
  }, [isEditing, readOnly, onSelect])

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (readOnly || layer.type !== 'text') return
    e.stopPropagation()
    e.preventDefault()
    setIsEditing(true)
    setEditText(layer.text_content || '')
    onSelect()
  }, [readOnly, layer.type, layer.text_content, onSelect])

  const commitEdit = useCallback(() => {
    if (editText !== layer.text_content) {
      onUpdate({ text_content: editText })
    }
    setIsEditing(false)
  }, [editText, layer.text_content, onUpdate])

  const cancelEdit = useCallback(() => {
    setEditText(layer.text_content || '')
    setIsEditing(false)
  }, [layer.text_content])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  useEffect(() => {
    if (!isDragging && !isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return
      
      const canvasRect = canvasRef.current.getBoundingClientRect()
      
      if (isResizing && resizeHandle) {
        const canvasWidth = canvasRect.width
        const canvasHeight = canvasRect.height
        
        const deltaX = ((e.clientX - resizeStart.x) / canvasWidth) * 100
        const deltaY = ((e.clientY - resizeStart.y) / canvasHeight) * 100
        
        let newWidth = layer.width
        let newHeight = layer.height || layer.width

        // Corner resizing (multiplies by 2 because we resize from center/symmetric)
        if (resizeHandle.includes('right')) {
          newWidth = resizeStart.width + deltaX * 2
        } else if (resizeHandle.includes('left')) {
          newWidth = resizeStart.width - deltaX * 2
        }

        if (resizeHandle.includes('bottom')) {
          newHeight = (resizeStart.height || resizeStart.width) + deltaY * 2
        } else if (resizeHandle.includes('top')) {
          newHeight = (resizeStart.height || resizeStart.width) - deltaY * 2
        }

        onUpdate({
          width: Math.max(5, Math.min(1000, newWidth)),
          height: Math.max(5, Math.min(1000, newHeight))
        })
      } else if (isDragging) {
        // Handle drag
        const x = ((e.clientX - dragOffset.x - canvasRect.left) / canvasRect.width) * 100
        const y = ((e.clientY - dragOffset.y - canvasRect.top) / canvasRect.height) * 100

        onUpdate({
          x: Math.max(-100, Math.min(200, x)),
          y: Math.max(-100, Math.min(200, y))
        })
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setIsResizing(false)
      setResizeHandle(null)
      canvasRef.current = null
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, isResizing, resizeHandle, dragOffset, resizeStart, onUpdate])

  // Text Layer
  if (layer.type === 'text') {
    const fontSize = (layer.font_size || 48) * scaleFactor
    const strokeWidth = (layer.stroke_width || 0) * scaleFactor
    
    const textStyle: React.CSSProperties = {
      fontFamily: layer.font_family || 'TikTok Sans',
      fontSize: `${fontSize}px`,
      lineHeight: 1.2,
      fontWeight: layer.font_weight || 'bold',
      color: layer.text_color || '#ffffff',
      textAlign: (layer.text_align || 'center') as 'left' | 'center' | 'right',
      width: '100%',
      wordWrap: 'break-word',
      whiteSpace: 'pre-wrap',
      textShadow: layer.stroke_width && layer.stroke_width > 0 && layer.stroke_color
        ? `
          -${strokeWidth}px -${strokeWidth}px 0 ${layer.stroke_color},
          ${strokeWidth}px -${strokeWidth}px 0 ${layer.stroke_color},
          -${strokeWidth}px ${strokeWidth}px 0 ${layer.stroke_color},
          ${strokeWidth}px ${strokeWidth}px 0 ${layer.stroke_color}
        `
        : 'none',
    }

    const bgStyle: React.CSSProperties = layer.background_color ? {
      backgroundColor: layer.background_color,
      padding: `${6 * scaleFactor}px ${12 * scaleFactor}px`,
      borderRadius: `${8 * scaleFactor}px`,
      display: 'inline-block',
    } : {}

    return (
      <div
        ref={layerRef}
        style={style}
        className={cn(
          "select-none",
          selected && !readOnly && "ring-2 ring-blue-500 ring-offset-2",
          isDragging && "opacity-80",
          !readOnly && !isEditing && "cursor-move hover:ring-2 hover:ring-blue-300"
        )}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
      >
        {isEditing ? (
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  commitEdit()
                }
                if (e.key === 'Escape') {
                  cancelEdit()
                }
                e.stopPropagation()
              }}
              className="w-full bg-zinc-800/95 text-[#dbdbdb] rounded-md shadow-lg border-2 border-[#ddfc7b] focus:outline-none"
              style={{
                fontFamily: layer.font_family || 'TikTok Sans',
                fontSize: `${Math.max(fontSize, 14)}px`,
                fontWeight: layer.font_weight || 'bold',
                textAlign: (layer.text_align || 'center') as 'left' | 'center' | 'right',
                padding: `${6 * scaleFactor}px ${10 * scaleFactor}px`,
              }}
            />
          </div>
        ) : (
          <div style={textStyle}>
            {layer.background_color ? (
              <span style={bgStyle}>{layer.text_content || 'Double-click to edit'}</span>
            ) : (
              layer.text_content || 'Double-click to edit'
            )}
          </div>
        )}
      </div>
    )
  }

  // Image Layer
  const handleSize = 8 * scaleFactor
  
  return (
    <div
      ref={layerRef}
      style={style}
      className={cn(
        "select-none group",
        selected && !readOnly && "ring-2 ring-[#ddfc7b] ring-offset-2",
        (isDragging || isResizing) && "opacity-80",
        !readOnly && "cursor-move hover:ring-2 hover:ring-[#ddfc7b]/50"
      )}
      onMouseDown={handleMouseDown}
    >
      <div className="relative w-full h-full">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt="Layer"
            fill
            className="object-cover pointer-events-none rounded-[inherit]"
            style={{ borderRadius: `${12 * scaleFactor}px` }}
            draggable={false}
          />
        ) : (
          <div 
            className="w-full h-full bg-zinc-700/80 border-2 border-dashed border-zinc-600 rounded flex items-center justify-center"
            style={{ 
              fontSize: `${12 * scaleFactor}px`,
              borderRadius: `${12 * scaleFactor}px`
            }}
          >
            <span className="text-[#dbdbdb]/60 font-medium text-center px-2">
              {layer.image_collection_id ? 'Random Collection' : 'No image selected'}
            </span>
          </div>
        )}
      </div>
      
      {/* Delete Button */}
      {selected && !readOnly && onDelete && (
        <button
          data-delete-button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="absolute -top-3 -right-3 z-30 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-all border-2 border-zinc-900"
          style={{ width: `${handleSize * 2.5}px`, height: `${handleSize * 2.5}px` }}
        >
          <Trash2 className="size-full" />
        </button>
      )}
      
      {/* Resize Handles */}
      {selected && !readOnly && (
        <>
          {/* Corner handles */}
          <div
            data-resize-handle="top-left"
            className="absolute -top-1 -left-1 z-30 bg-[#ddfc7b] border-2 border-[#171717] rounded-full cursor-nwse-resize shadow-md"
            style={{ width: `${handleSize}px`, height: `${handleSize}px` }}
          />
          <div
            data-resize-handle="top-right"
            className="absolute -top-1 -right-1 z-30 bg-[#ddfc7b] border-2 border-[#171717] rounded-full cursor-nesw-resize shadow-md"
            style={{ width: `${handleSize}px`, height: `${handleSize}px` }}
          />
          <div
            data-resize-handle="bottom-left"
            className="absolute -bottom-1 -left-1 z-30 bg-[#ddfc7b] border-2 border-[#171717] rounded-full cursor-nesw-resize shadow-md"
            style={{ width: `${handleSize}px`, height: `${handleSize}px` }}
          />
          <div
            data-resize-handle="bottom-right"
            className="absolute -bottom-1 -right-1 z-30 bg-[#ddfc7b] border-2 border-[#171717] rounded-full cursor-nwse-resize shadow-md"
            style={{ width: `${handleSize}px`, height: `${handleSize}px` }}
          />
          
          {/* Edge handles */}
          <div
            data-resize-handle="top"
            className="absolute -top-1 left-1/2 -translate-x-1/2 z-20 bg-[#ddfc7b] border-2 border-[#171717] rounded-full cursor-ns-resize shadow-md"
            style={{ width: `${handleSize}px`, height: `${handleSize}px` }}
          />
          <div
            data-resize-handle="bottom"
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 z-20 bg-[#ddfc7b] border-2 border-[#171717] rounded-full cursor-ns-resize shadow-md"
            style={{ width: `${handleSize}px`, height: `${handleSize}px` }}
          />
          <div
            data-resize-handle="left"
            className="absolute top-1/2 -left-1 -translate-y-1/2 z-20 bg-[#ddfc7b] border-2 border-[#171717] rounded-full cursor-ew-resize shadow-md"
            style={{ width: `${handleSize}px`, height: `${handleSize}px` }}
          />
          <div
            data-resize-handle="right"
            className="absolute top-1/2 -right-1 -translate-y-1/2 z-20 bg-[#ddfc7b] border-2 border-[#171717] rounded-full cursor-ew-resize shadow-md"
            style={{ width: `${handleSize}px`, height: `${handleSize}px` }}
          />
        </>
      )}
    </div>
  )
}
