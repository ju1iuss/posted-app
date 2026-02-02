import html2canvas from 'html2canvas'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { Template, TemplateSlide } from '@/components/template-editor/types'

interface ExportOptions {
  renderText: boolean
  includeTextFile: boolean
  firstSlideNoText: boolean
}

export async function exportTemplate(
  template: Template,
  slides: TemplateSlide[],
  layers: Record<string, any[]>,
  options: ExportOptions
) {
  const zip = new JSZip()
  const textContent: string[] = []

  // Sort slides by position
  const sortedSlides = [...slides].sort((a, b) => a.position - b.position)

  for (let i = 0; i < sortedSlides.length; i++) {
    const slide = sortedSlides[i]
    const slideLayers = layers[slide.id || ''] || []
    const shouldRenderText = options.renderText && !(options.firstSlideNoText && i === 0)

    if (shouldRenderText) {
      // Render slide with text using html2canvas
      // Note: This requires the actual DOM element - we'll need to pass a ref or render function
      // For now, we'll create a placeholder
      const canvas = document.createElement('canvas')
      canvas.width = template.width
      canvas.height = template.height
      const ctx = canvas.getContext('2d')
      
      if (ctx) {
        // Fill background
        if (slide.background_type === 'color' && slide.background_color) {
          ctx.fillStyle = slide.background_color
          ctx.fillRect(0, 0, canvas.width, canvas.height)
        } else {
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
        }

        // Render layers
        for (const layer of slideLayers.sort((a, b) => a.position - b.position)) {
          if (layer.type === 'text' && layer.text_content) {
            ctx.save()
            ctx.font = `${layer.font_weight || 'bold'} ${layer.font_size || 48}px ${layer.font_family || 'TikTok Sans'}`
            ctx.fillStyle = layer.text_color || '#ffffff'
            ctx.textAlign = (layer.text_align || 'center') as CanvasTextAlign
            
            const x = (layer.x / 100) * canvas.width
            const y = (layer.y / 100) * canvas.height
            const maxWidth = (layer.width / 100) * canvas.width

            // Handle text wrapping
            const words = layer.text_content.split(' ')
            let line = ''
            let yPos = y

            for (let n = 0; n < words.length; n++) {
              const testLine = line + words[n] + ' '
              const metrics = ctx.measureText(testLine)
              if (metrics.width > maxWidth && n > 0) {
                ctx.fillText(line, x, yPos)
                line = words[n] + ' '
                yPos += (layer.font_size || 48) * 1.2
              } else {
                line = testLine
              }
            }
            ctx.fillText(line, x, yPos)
            ctx.restore()
          }
        }
      }

      canvas.toBlob((blob) => {
        if (blob) {
          zip.file(`slide_${i + 1}.png`, blob)
        }
      }, 'image/png')
    } else {
      // Export just background image
      if (slide.background_type === 'image' && slide.background_image_id) {
        // Fetch and add image
        // TODO: Fetch actual image from Supabase storage
        const placeholder = `Background image for slide ${i + 1}`
        zip.file(`slide_${i + 1}.txt`, placeholder)
      }
    }

    // Collect text content for text file
    if (options.includeTextFile) {
      const slideTexts: string[] = []
      for (const layer of slideLayers) {
        if (layer.type === 'text' && layer.text_content) {
          slideTexts.push(`Text ${slideLayers.indexOf(layer) + 1}: ${layer.text_content}`)
        }
      }
      if (slideTexts.length > 0) {
        textContent.push(`Slide ${i + 1}:`)
        textContent.push(...slideTexts)
        textContent.push('')
      }
    }
  }

  // Add text file if needed
  if (options.includeTextFile && textContent.length > 0) {
    zip.file('text_content.txt', textContent.join('\n'))
  }

  // Generate and download zip
  const content = await zip.generateAsync({ type: 'blob' })
  saveAs(content, `${template.name.replace(/\s+/g, '_')}.zip`)
}
