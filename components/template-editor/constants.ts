// Constants for template editor

import { AspectRatio } from './types'

export const ASPECT_RATIOS: Record<AspectRatio, { width: number; height: number; label: string }> = {
  '9:16': { width: 1080, height: 1920, label: 'TikTok/Reels' },
  '3:4': { width: 1500, height: 2000, label: 'Portrait' },
  '1:1': { width: 1080, height: 1080, label: 'Square' },
  '16:9': { width: 1920, height: 1080, label: 'Landscape' },
  '4:3': { width: 1440, height: 1080, label: 'Classic' }
}

export const FONT_FAMILIES = ['TikTok Sans', 'Arial', 'Georgia'] as const
export const FONT_WEIGHTS = ['normal', 'bold', 'black'] as const
export const TEXT_ALIGNS = ['left', 'center', 'right'] as const

export const MIN_FONT_SIZE = 12
export const MAX_FONT_SIZE = 200
export const DEFAULT_FONT_SIZE = 48

export const MIN_STROKE_WIDTH = 0
export const MAX_STROKE_WIDTH = 20
export const DEFAULT_STROKE_WIDTH = 8

export const MAX_TEXT_LAYERS = 5
