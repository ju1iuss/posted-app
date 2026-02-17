import type { SupabaseClient } from '@supabase/supabase-js'
import html2canvas from 'html2canvas'
import JSZip from 'jszip'

interface PostContent {
  template_id: string
  title?: string
  caption?: string
  slides: {
    slide_id: string
    position: number
    background_image_url?: string | null
    layers: { layer_id: string; text_content?: string; image_url?: string | null }[]
  }[]
}

type ExportType = 'separate' | 'with-text' | 'first-slide-separate'

async function loadPostExportData(supabase: SupabaseClient, postContent: PostContent) {
  const contentSlides = Array.isArray(postContent.slides) ? postContent.slides : []

  const [templateRes, slidesRes] = await Promise.all([
    supabase.from('templates').select('*').eq('id', postContent.template_id).single(),
    supabase.from('template_slides').select('*').eq('template_id', postContent.template_id).order('position', { ascending: true }),
  ])

  if (templateRes.error || !templateRes.data) throw new Error('Template not found')
  if (slidesRes.error) throw slidesRes.error

  const template = templateRes.data as any
  const slides = (slidesRes.data || []).map((slide: any) => {
    const cs = contentSlides.find((s: any) => s.slide_id === slide.id)
    return { ...slide, background_image_url: cs?.background_image_url || slide.background_image_url }
  })

  const slideIds = slides.map((s: any) => s.id)
  if (slideIds.length === 0) throw new Error('No slides')

  const layersRes = await supabase.from('template_layers').select('*').in('slide_id', slideIds).order('position', { ascending: true })
  if (layersRes.error) throw layersRes.error

  const contentMap = new Map<string, string>()
  const imageUrlMap = new Map<string, string>()
  contentSlides.forEach((slide: any) => {
    (Array.isArray(slide.layers) ? slide.layers : []).forEach((l: any) => {
      if (l.text_content) contentMap.set(l.layer_id, l.text_content)
      if (l.image_url) imageUrlMap.set(l.layer_id, l.image_url)
    })
  })

  const layersBySlide: Record<string, any[]> = {}
  layersRes.data?.forEach((layer: any) => {
    if (!layersBySlide[layer.slide_id]) layersBySlide[layer.slide_id] = []
    if (layer.type === 'text' && contentMap.has(layer.id)) layer.text_content = contentMap.get(layer.id)
    if (layer.type === 'image' && imageUrlMap.has(layer.id)) (layer as any).image_url = imageUrlMap.get(layer.id)
    layersBySlide[layer.slide_id].push(layer)
  })

  return { template, slides: [...slides].sort((a: any, b: any) => a.position - b.position), layersBySlide, imageUrlMap }
}

function buildSlideElement(
  template: any,
  slide: any,
  exportLayers: any[],
  imageUrlMap: Map<string, string>
): { element: HTMLDivElement; imageUrls: string[] } {
  const imageUrls: string[] = []

  const el = document.createElement('div')
  el.style.cssText = `width:${template.width}px;height:${template.height}px;position:relative;overflow:hidden;`
  el.style.backgroundColor = slide.background_type === 'color' && slide.background_color ? slide.background_color : '#ffffff'

  if (slide.background_image_url && !slide.video_url) {
    const bgDiv = document.createElement('div')
    bgDiv.style.cssText = `position:absolute;top:0;left:0;width:100%;height:100%;background-image:url("${slide.background_image_url}");background-size:cover;background-position:center;background-repeat:no-repeat;`
    el.appendChild(bgDiv)
    imageUrls.push(slide.background_image_url)
  }

  for (const layer of [...exportLayers].sort((a: any, b: any) => (a.position || 0) - (b.position || 0))) {
    const ld = document.createElement('div')
    ld.style.position = 'absolute'
    ld.style.left = `${layer.x}%`
    ld.style.top = `${layer.y}%`
    ld.style.width = `${layer.width}%`
    ld.style.transform = 'translate(-50%, -50%)'
    ld.style.zIndex = String(10 + (layer.position || 0))
    if (layer.type === 'image' && layer.height) ld.style.height = `${layer.height}%`

    if (layer.type === 'text') {
      const fs = layer.font_size || 48
      const sw = layer.stroke_width || 0
      const fw = layer.font_weight === 'black' ? '900' : (layer.font_weight || 'bold')
      const td = document.createElement('div')
      td.style.fontFamily = `'TikTok Sans',${layer.font_family || 'TikTok Sans'},sans-serif`
      td.style.fontSize = `${fs}px`
      td.style.lineHeight = '1.2'
      td.style.fontWeight = String(fw)
      td.style.color = layer.text_color || '#ffffff'
      td.style.textAlign = layer.text_align || 'center'
      td.style.width = '100%'
      td.style.wordWrap = 'break-word'
      td.style.whiteSpace = 'pre-wrap'
      if (sw > 0 && layer.stroke_color) {
        td.style.setProperty('-webkit-text-stroke', `${sw}px ${layer.stroke_color}`)
        td.style.paintOrder = 'stroke fill'
      }
      if (layer.background_color) {
        const span = document.createElement('span')
        span.style.backgroundColor = layer.background_color
        span.style.padding = '6px 12px'
        span.style.borderRadius = '16px'
        span.style.display = 'inline-block'
        span.innerText = layer.text_content || ''
        td.appendChild(span)
      } else {
        td.innerText = layer.text_content || ''
      }
      ld.appendChild(td)
    } else if (layer.type === 'image') {
      const imgUrl = imageUrlMap.get(layer.id) || (layer as any).image_url
      if (imgUrl) {
        const innerDiv = document.createElement('div')
        innerDiv.style.cssText = `width:100%;height:100%;border-radius:12px;background-image:url("${imgUrl}");background-size:cover;background-position:center;background-repeat:no-repeat;`
        ld.appendChild(innerDiv)
        imageUrls.push(imgUrl)
      }
    } else if (layer.type === 'shape') {
      ld.style.backgroundColor = (layer as any).fill_color || '#cccccc'
      ld.style.borderRadius = `${(layer as any).border_radius || 0}px`
    }
    el.appendChild(ld)
  }

  return { element: el, imageUrls }
}

function preloadImages(urls: string[]): Promise<void> {
  return Promise.all(
    urls.map(url => new Promise<void>(resolve => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve()
      img.onerror = () => resolve()
      img.src = url
      setTimeout(resolve, 3000)
    }))
  ).then(() => {})
}

function getFilteredLayers(slideLayers: any[], exportType: ExportType, slideIndex: number) {
  if (exportType === 'separate') return slideLayers.filter((l: any) => l.type !== 'text')
  if (exportType === 'first-slide-separate' && slideIndex === 0) return slideLayers.filter((l: any) => !(l.type === 'text' && !l.is_fixed))
  return slideLayers
}

function getRemovedTextLayers(slideLayers: any[], exportType: ExportType, slideIndex: number) {
  if (exportType === 'separate') return slideLayers.filter((l: any) => l.type === 'text' && l.text_content)
  if (exportType === 'first-slide-separate' && slideIndex === 0) return slideLayers.filter((l: any) => l.type === 'text' && l.text_content && !l.is_fixed)
  return []
}

function buildTextFile(title: string, caption: string, slides: any[], layersBySlide: Record<string, any[]>, exportType: ExportType): string {
  const slideTexts: string[] = []
  slides.forEach((slide: any, i: number) => {
    const removed = getRemovedTextLayers(layersBySlide[slide.id] || [], exportType, i)
    if (removed.length > 0) {
      slideTexts.push(`SLIDE ${i + 1}:`)
      removed.forEach((l: any) => slideTexts.push(l.text_content!))
      slideTexts.push('')
    }
  })
  let text = `TITLE:\n${title}\n\nCAPTION:\n${caption}`
  if (slideTexts.length > 0) text += `\n\nSLIDE TEXT:\n${slideTexts.join('\n')}`
  return text
}

// Single post export — returns zip blob
export async function exportCarouselPost(
  supabase: SupabaseClient,
  postId: string,
  postContent: PostContent,
  title: string,
  caption: string,
  exportType: ExportType
): Promise<Blob> {
  const { template, slides, layersBySlide, imageUrlMap } = await loadPostExportData(supabase, postContent)

  await Promise.all([
    document.fonts.load('normal 48px "TikTok Sans"'),
    document.fonts.load('bold 48px "TikTok Sans"'),
    document.fonts.load('900 48px "TikTok Sans"'),
  ])
  await document.fonts.ready

  const zip = new JSZip()
  const imagesFolder = zip.folder('images')
  zip.file('post-text.txt', buildTextFile(title, caption, slides, layersBySlide, exportType))

  const container = document.createElement('div')
  container.style.cssText = 'position:fixed;left:-99999px;top:0;z-index:-1;'
  document.body.appendChild(container)

  try {
    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i]
      const exportLayers = getFilteredLayers(layersBySlide[slide.id] || [], exportType, i)
      const { element, imageUrls } = buildSlideElement(template, slide, exportLayers, imageUrlMap)

      await preloadImages(imageUrls)
      container.innerHTML = ''
      container.appendChild(element)
      await new Promise(r => setTimeout(r, 100))

      const canvas = await html2canvas(element, {
        width: template.width, height: template.height, scale: 1,
        useCORS: true, allowTaint: true, backgroundColor: null, logging: false,
      })
      const blob = await new Promise<Blob>(resolve => canvas.toBlob(b => resolve(b!), 'image/png', 1.0))
      imagesFolder?.file(`slide-${String(i + 1).padStart(2, '0')}.png`, blob)
    }
    return await zip.generateAsync({ type: 'blob' })
  } finally {
    document.body.removeChild(container)
  }
}

// Bulk export — writes directly to a master zip, no zip-in-zip overhead
export async function exportCarouselPostsBulk(
  supabase: SupabaseClient,
  postsToExport: { id: string; content: PostContent; title: string; caption: string }[],
  exportType: ExportType,
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  if (postsToExport.length === 0) throw new Error('No posts to export')

  // Load fonts once
  await Promise.all([
    document.fonts.load('normal 48px "TikTok Sans"'),
    document.fonts.load('bold 48px "TikTok Sans"'),
    document.fonts.load('900 48px "TikTok Sans"'),
  ])
  await document.fonts.ready

  // Cache template data to avoid re-fetching the same template
  const templateCache = new Map<string, any>()

  const masterZip = new JSZip()
  const container = document.createElement('div')
  container.style.cssText = 'position:fixed;left:-99999px;top:0;z-index:-1;'
  document.body.appendChild(container)

  try {
    for (let idx = 0; idx < postsToExport.length; idx++) {
      const post = postsToExport[idx]
      onProgress?.(idx + 1, postsToExport.length)

      // Load data with template caching
      let data: Awaited<ReturnType<typeof loadPostExportData>>
      const cacheKey = post.content.template_id
      if (templateCache.has(cacheKey)) {
        // Re-fetch only layers (they differ per post content), reuse template+slides structure
        const cached = templateCache.get(cacheKey)!
        const contentSlides = Array.isArray(post.content.slides) ? post.content.slides : []
        const slides = cached.slidesRaw.map((slide: any) => {
          const cs = contentSlides.find((s: any) => s.slide_id === slide.id)
          return { ...slide, background_image_url: cs?.background_image_url || slide.background_image_url }
        })

        const contentMap = new Map<string, string>()
        const imageUrlMap = new Map<string, string>()
        contentSlides.forEach((slide: any) => {
          (Array.isArray(slide.layers) ? slide.layers : []).forEach((l: any) => {
            if (l.text_content) contentMap.set(l.layer_id, l.text_content)
            if (l.image_url) imageUrlMap.set(l.layer_id, l.image_url)
          })
        })

        const layersRes = await supabase.from('template_layers').select('*').in('slide_id', cached.slideIds).order('position', { ascending: true })
        const layersBySlide: Record<string, any[]> = {}
        layersRes.data?.forEach((layer: any) => {
          if (!layersBySlide[layer.slide_id]) layersBySlide[layer.slide_id] = []
          if (layer.type === 'text' && contentMap.has(layer.id)) layer.text_content = contentMap.get(layer.id)
          if (layer.type === 'image' && imageUrlMap.has(layer.id)) (layer as any).image_url = imageUrlMap.get(layer.id)
          layersBySlide[layer.slide_id].push(layer)
        })

        data = { template: cached.template, slides, layersBySlide, imageUrlMap }
      } else {
        data = await loadPostExportData(supabase, post.content)
        // Cache the template and raw slides for reuse
        const slidesRes = await supabase.from('template_slides').select('*').eq('template_id', post.content.template_id).order('position', { ascending: true })
        templateCache.set(cacheKey, {
          template: data.template,
          slidesRaw: slidesRes.data || [],
          slideIds: (slidesRes.data || []).map((s: any) => s.id),
        })
      }

      const { template, slides, layersBySlide, imageUrlMap } = data
      const folderName = `post-${String(idx + 1).padStart(2, '0')}-${post.id.slice(0, 8)}`
      const postFolder = masterZip.folder(folderName)!
      const imagesFolder = postFolder.folder('images')!

      postFolder.file('post-text.txt', buildTextFile(post.title, post.caption, slides, layersBySlide, exportType))

      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i]
        const exportLayers = getFilteredLayers(layersBySlide[slide.id] || [], exportType, i)
        const { element, imageUrls } = buildSlideElement(template, slide, exportLayers, imageUrlMap)

        await preloadImages(imageUrls)
        container.innerHTML = ''
        container.appendChild(element)
        await new Promise(r => setTimeout(r, 100))

        const canvas = await html2canvas(element, {
          width: template.width, height: template.height, scale: 1,
          useCORS: true, allowTaint: true, backgroundColor: null, logging: false,
        })
        const blob = await new Promise<Blob>(resolve => canvas.toBlob(b => resolve(b!), 'image/png', 1.0))
        imagesFolder.file(`slide-${String(i + 1).padStart(2, '0')}.png`, blob)
      }
    }

    return await masterZip.generateAsync({ type: 'blob' })
  } finally {
    document.body.removeChild(container)
  }
}
