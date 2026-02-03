"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Download, Loader2 } from 'lucide-react'
import { Template, TemplateSlide } from './types'
import { exportTemplate } from '@/lib/export-utils'
import { useState } from 'react'
import { toast } from 'sonner'

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: Template
  slides: TemplateSlide[]
  layers: Record<string, any[]>
}

export function ExportDialog({
  open,
  onOpenChange,
  template,
  slides,
  layers
}: ExportDialogProps) {
  const [exportOption, setExportOption] = useState<string>('all_text')
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const options = {
        renderText: exportOption === 'all_text' || exportOption === 'first_no_text',
        includeTextFile: exportOption === 'images_only' || exportOption === 'first_no_text',
        firstSlideNoText: exportOption === 'first_no_text'
      }

      await exportTemplate(template, slides, layers, options)
      toast.success('Template exported successfully')
      onOpenChange(false)
    } catch (error: any) {
      console.error('Export error:', error)
      toast.error(error.message || 'Failed to export template')
    } finally {
      setExporting(false)
    }
  }

  const exportOptions = template.type === 'carousel' 
    ? [
        { value: 'all_text', label: 'All Text Rendered', description: 'All slides with text baked into images' },
        { value: 'images_only', label: 'Images Only', description: 'Images without text + separate text file' },
        { value: 'first_no_text', label: 'First Slide No Text', description: 'All slides with text except first + text file for hook' }
      ]
    : [
        { value: 'hook_rendered', label: 'Hook Rendered', description: 'Video with text overlay' },
        { value: 'hook_separate', label: 'Hook Separate', description: 'Video + separate text file for hook' }
      ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] rounded-2xl bg-zinc-800 border-zinc-700">
        <DialogHeader>
          <DialogTitle className="text-[#dbdbdb]">Export Template</DialogTitle>
          <DialogDescription className="text-[#dbdbdb]/60">
            Choose how you want to export this {template.type} template.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <RadioGroup value={exportOption} onValueChange={setExportOption}>
            {exportOptions.map((option) => (
              <div key={option.value} className="flex items-start space-x-3 space-y-0 py-3 border-b border-zinc-700 last:border-0">
                <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                <div className="flex-1">
                  <Label
                    htmlFor={option.value}
                    className="text-sm font-semibold cursor-pointer text-[#dbdbdb]"
                  >
                    {option.label}
                  </Label>
                  <p className="text-xs text-[#dbdbdb]/60 mt-0.5">{option.description}</p>
                </div>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="flex gap-3 pt-4 border-t border-zinc-700">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="bg-zinc-800 border-zinc-700 text-[#dbdbdb] hover:bg-zinc-700 flex-1"
            disabled={exporting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={exporting}
            className="flex-1 bg-[#ddfc7b] text-[#171717] hover:bg-[#ddfc7b]/90"
          >
            {exporting ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="size-4 mr-2" />
                Export
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
