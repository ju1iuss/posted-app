"use client"

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { TemplateLayer, FontFamily, FontWeight, TextAlign } from './types'
import { FONT_FAMILIES, FONT_WEIGHTS, TEXT_ALIGNS, MIN_FONT_SIZE, MAX_FONT_SIZE, MIN_STROKE_WIDTH, MAX_STROKE_WIDTH } from './constants'

interface TextLayerControlsProps {
  layer: TemplateLayer
  onUpdate: (updates: Partial<TemplateLayer>) => void
  readOnly?: boolean
}

export function TextLayerControls({ layer, onUpdate, readOnly }: TextLayerControlsProps) {
  const applyPreset = (preset: 'basic' | 'border' | 'pill') => {
    if (preset === 'basic') {
      onUpdate({ text_color: '#ffffff', stroke_width: 0, background_color: null })
    } else if (preset === 'border') {
      onUpdate({ text_color: '#ffffff', stroke_width: 4, stroke_color: '#000000', background_color: null })
    } else if (preset === 'pill') {
      onUpdate({ text_color: '#000000', background_color: '#ffffff', stroke_width: 0 })
    }
  }

  return (
    <div className="space-y-3">
      {/* Style Presets */}
      <div className="space-y-2">
        <Label className="text-[10px] font-bold uppercase tracking-widest text-[#dbdbdb]/40">Style Presets</Label>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => applyPreset('basic')}
            className={cn(
              "flex flex-col items-center justify-center gap-2 p-2 rounded-xl border-2 transition-all hover:scale-[1.05] active:scale-95",
              layer.stroke_width === 0 && !layer.background_color
                ? "border-[#ddfc7b] bg-zinc-800"
                : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
            )}
          >
            <div className="w-full aspect-square bg-zinc-900 rounded-lg flex items-center justify-center border border-zinc-800 shadow-inner">
              <span className="text-[12px] font-bold text-white font-['TikTok_Sans']">Aa</span>
            </div>
            <span className="text-[9px] font-bold text-[#dbdbdb]/60">Basic</span>
          </button>

          <button
            onClick={() => applyPreset('border')}
            className={cn(
              "flex flex-col items-center justify-center gap-2 p-2 rounded-xl border-2 transition-all hover:scale-[1.05] active:scale-95",
              layer.stroke_width && layer.stroke_width > 0
                ? "border-[#ddfc7b] bg-zinc-800"
                : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
            )}
          >
            <div className="w-full aspect-square bg-zinc-900 rounded-lg flex items-center justify-center border border-zinc-800 shadow-inner">
              <span 
                className="text-[12px] font-bold text-white font-['TikTok_Sans']"
                style={{ textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000' }}
              >
                Aa
              </span>
            </div>
            <span className="text-[9px] font-bold text-[#dbdbdb]/60">Border</span>
          </button>

          <button
            onClick={() => applyPreset('pill')}
            className={cn(
              "flex flex-col items-center justify-center gap-2 p-2 rounded-xl border-2 transition-all hover:scale-[1.05] active:scale-95",
              layer.background_color
                ? "border-[#ddfc7b] bg-zinc-800"
                : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
            )}
          >
            <div className="w-full aspect-square bg-zinc-900 rounded-lg flex items-center justify-center border border-zinc-800 shadow-inner">
              <span className="px-1.5 py-0.5 bg-white text-[#000] rounded-sm text-[10px] font-bold font-['TikTok_Sans'] leading-none">Aa</span>
            </div>
            <span className="text-[9px] font-bold text-[#dbdbdb]/60">Pill</span>
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-[10px] font-bold uppercase tracking-widest text-[#dbdbdb]/60">Content</Label>
        <Textarea
          value={layer.text_content || ''}
          onChange={(e) => onUpdate({ text_content: e.target.value })}
          className="min-h-[60px] text-[11px] font-bold resize-none bg-zinc-900 border-zinc-700 text-[#dbdbdb]"
          placeholder="Enter text..."
          readOnly={readOnly}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-[#dbdbdb]/60">Font</Label>
          <Select
            value={layer.font_family || 'TikTok Sans'}
            onValueChange={(val) => onUpdate({ font_family: val as FontFamily })}
            disabled={readOnly}
          >
            <SelectTrigger className="h-7 text-[10px] font-bold bg-zinc-900 border-zinc-700 text-[#dbdbdb]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-lg bg-zinc-800 border-zinc-700">
              {FONT_FAMILIES.map((font) => (
                <SelectItem key={font} value={font} className="text-[11px] text-[#dbdbdb]">
                  {font}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-[#dbdbdb]/60">Weight</Label>
          <Select
            value={layer.font_weight || 'bold'}
            onValueChange={(val) => onUpdate({ font_weight: val as FontWeight })}
            disabled={readOnly}
          >
            <SelectTrigger className="h-7 text-[10px] font-bold bg-zinc-900 border-zinc-700 text-[#dbdbdb]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-lg bg-zinc-800 border-zinc-700">
              {FONT_WEIGHTS.map((weight) => (
                <SelectItem key={weight} value={weight} className="text-[11px] text-[#dbdbdb]">
                  {weight}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-[#dbdbdb]/60">Size</Label>
          <span className="text-[10px] font-bold text-[#dbdbdb]">{layer.font_size || 48}px</span>
        </div>
        <Slider
          value={[layer.font_size || 48]}
          onValueChange={([value]) => onUpdate({ font_size: value })}
          min={MIN_FONT_SIZE}
          max={MAX_FONT_SIZE}
          step={1}
          className="py-1"
          disabled={readOnly}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-[#dbdbdb]/60">Color</Label>
          <div className="flex items-center gap-1.5">
            <Input
              type="color"
              value={layer.text_color || '#ffffff'}
              onChange={(e) => onUpdate({ text_color: e.target.value })}
              className="h-7 w-10 p-0.5 cursor-pointer bg-zinc-900 border-zinc-700"
              disabled={readOnly}
            />
            <Input
              type="text"
              value={layer.text_color || '#ffffff'}
              onChange={(e) => onUpdate({ text_color: e.target.value })}
              className="flex-1 h-7 text-[9px] font-mono font-bold bg-zinc-900 border-zinc-700 text-[#dbdbdb]"
              placeholder="#FFF"
              disabled={readOnly}
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-[#dbdbdb]/60">Align</Label>
          <Select
            value={layer.text_align || 'center'}
            onValueChange={(val) => onUpdate({ text_align: val as TextAlign })}
            disabled={readOnly}
          >
            <SelectTrigger className="h-7 text-[10px] font-bold bg-zinc-900 border-zinc-700 text-[#dbdbdb]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-lg bg-zinc-800 border-zinc-700">
              {TEXT_ALIGNS.map((align) => (
                <SelectItem key={align} value={align} className="text-[11px] text-[#dbdbdb]">
                  {align}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-[10px] font-bold uppercase tracking-widest text-[#dbdbdb]/60">Highlight / Background</Label>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <Input
              type="color"
              value={layer.background_color || '#000000'}
              onChange={(e) => onUpdate({ background_color: e.target.value })}
              className="h-7 w-10 p-0.5 cursor-pointer bg-zinc-900 border-zinc-700"
              disabled={readOnly}
            />
            <Input
              type="text"
              value={layer.background_color || ''}
              onChange={(e) => onUpdate({ background_color: e.target.value || null })}
              className="flex-1 h-7 text-[9px] font-mono font-bold bg-zinc-900 border-zinc-700 text-[#dbdbdb]"
              placeholder="Transparent"
              disabled={readOnly}
            />
          </div>
          {/* Quick Background Colors */}
          <div className="flex gap-1.5">
            {[null, '#000000', '#ffffff', '#ddfc7b'].map((color) => (
              <button
                key={color || 'transparent'}
                onClick={() => onUpdate({ background_color: color })}
                className={cn(
                  "size-5 rounded-full border border-zinc-700 transition-transform hover:scale-110",
                  layer.background_color === color && "ring-2 ring-blue-500 ring-offset-1 ring-offset-zinc-900",
                  !color && "bg-zinc-900 flex items-center justify-center overflow-hidden"
                )}
                style={{ backgroundColor: color || 'transparent' }}
              >
                {!color && <div className="w-full h-px bg-red-500 rotate-45" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-1.5 pt-1 border-t border-zinc-700">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-[#dbdbdb]/60">Stroke / Border</Label>
          <span className="text-[10px] font-bold text-[#dbdbdb]">{layer.stroke_width || 0}px</span>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <Slider
              value={[layer.stroke_width || 0]}
              onValueChange={([value]) => onUpdate({ stroke_width: value })}
              min={MIN_STROKE_WIDTH}
              max={MAX_STROKE_WIDTH}
              step={1}
              className="flex-1 py-1"
              disabled={readOnly}
            />
            <div className="flex items-center gap-1.5">
              <Input
                type="color"
                value={layer.stroke_color || '#000000'}
                onChange={(e) => onUpdate({ stroke_color: e.target.value })}
                className="h-7 w-7 p-0 rounded-full overflow-hidden cursor-pointer border-2 border-zinc-800 shadow-sm ring-1 ring-zinc-700"
                disabled={readOnly}
              />
            </div>
          </div>
          
          {/* Quick Border Colors */}
          <div className="flex gap-1.5">
            {['#000000', '#ffffff', '#ff0000', '#ddfc7b'].map((color) => (
              <button
                key={color}
                onClick={() => onUpdate({ stroke_color: color, stroke_width: layer.stroke_width || 2 })}
                className={cn(
                  "size-5 rounded-full border border-zinc-700 transition-transform hover:scale-110",
                  layer.stroke_color === color && "ring-2 ring-blue-500 ring-offset-1 ring-offset-zinc-900"
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-1.5 pt-1 border-t border-zinc-700">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-[#dbdbdb]/60">Fixed Text</Label>
            <p className="text-[9px] text-[#dbdbdb]/40">Don't change with AI</p>
          </div>
          <Switch
            checked={!!layer.is_fixed}
            onCheckedChange={(checked) => onUpdate({ is_fixed: checked })}
            className="scale-75 data-[state=checked]:bg-[#ddfc7b]"
          />
        </div>
      </div>

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
        </div>
      </div>
    </div>
  )
}
