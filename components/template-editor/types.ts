// TypeScript types for template editor

export type TemplateType = 'carousel' | 'video'
export type AspectRatio = '9:16' | '3:4' | '1:1' | '16:9' | '4:3'
export type BackgroundType = 'none' | 'color' | 'image' | 'collection_random' | 'collection_specific'
export type LayerType = 'text' | 'image'
export type ImageSourceType = 'specific' | 'collection_random' | 'upload'
export type FontFamily = 'TikTok Sans' | 'Arial' | 'Georgia'
export type FontWeight = 'normal' | 'bold' | 'black'
export type TextAlign = 'left' | 'center' | 'right'

export interface Template {
  id?: string
  organization_id?: string | null
  name: string
  description?: string | null
  type: TemplateType
  aspect_ratio: AspectRatio
  width: number
  height: number
  prompt?: string | null
  is_premade?: boolean
  created_at?: string
  updated_at?: string
}

export interface TemplateSlide {
  id?: string
  template_id?: string
  position: number
  background_type: BackgroundType | null
  background_color?: string | null
  background_image_id?: string | null
  background_image_url?: string | null
  background_collection_id?: string | null
  video_url?: string | null
  video_collection_id?: string | null
  created_at?: string
}

export interface TemplateLayer {
  id?: string
  slide_id?: string
  type: LayerType
  position: number // z-index
  x: number // 0-100, percentage
  y: number // 0-100, percentage
  width: number // 0-100, percentage of canvas width
  height: number // 0-100, percentage of canvas height
  
  // Text layer properties
  text_content?: string | null
  font_family?: FontFamily | null
  font_size?: number | null
  font_weight?: FontWeight | null
  text_color?: string | null
  text_align?: TextAlign | null
  background_color?: string | null
  stroke_color?: string | null
  stroke_width?: number | null
  
  // Image layer properties
  image_id?: string | null
  image_collection_id?: string | null
  image_source_type?: ImageSourceType | null
  
  created_at?: string
}

export interface EditorState {
  template: Template
  slides: TemplateSlide[]
  layers: Record<string, TemplateLayer[]> // slideId -> layers
  selectedSlideId: string | null
  selectedLayerId: string | null
  isDirty: boolean
  zoom: number // 0.1 to 2.0 (10% to 200%)
}

export type EditorAction =
  | { type: 'SET_TEMPLATE'; template: Template }
  | { type: 'SET_SLIDES'; slides: TemplateSlide[] }
  | { type: 'SET_LAYERS'; slideId: string; layers: TemplateLayer[] }
  | { type: 'ADD_SLIDE'; slide: TemplateSlide }
  | { type: 'DELETE_SLIDE'; slideId: string }
  | { type: 'DUPLICATE_SLIDE'; slideId: string }
  | { type: 'UPDATE_SLIDE'; slideId: string; updates: Partial<TemplateSlide> }
  | { type: 'REORDER_SLIDES'; slideIds: string[] }
  | { type: 'ADD_LAYER'; slideId: string; layer: TemplateLayer }
  | { type: 'UPDATE_LAYER'; layerId: string; updates: Partial<TemplateLayer> }
  | { type: 'DELETE_LAYER'; layerId: string }
  | { type: 'REORDER_LAYERS'; slideId: string; layerIds: string[] }
  | { type: 'SELECT_SLIDE'; slideId: string | null }
  | { type: 'SELECT_LAYER'; layerId: string | null }
  | { type: 'SET_DIRTY'; isDirty: boolean }
  | { type: 'SET_ASPECT_RATIO'; aspectRatio: AspectRatio; width: number; height: number }
  | { type: 'SET_ZOOM'; zoom: number }
  | { type: 'RESET'; template?: Template }

export interface ExportOptions {
  renderText: boolean
  includeTextFile: boolean
  firstSlideNoText: boolean
}
