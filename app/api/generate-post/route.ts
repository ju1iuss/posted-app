import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface GeneratePostRequest {
  accountId: string
  templateId: string
}

interface PostContent {
  template_id: string
  title?: string
  caption?: string
  slides: {
    slide_id: string
    position: number
    background_image_url?: string | null
    layers: {
      layer_id: string
      text_content?: string
      image_url?: string | null
    }[]
  }[]
}

export async function POST(request: NextRequest) {
  try {
    const body: GeneratePostRequest = await request.json()
    const { accountId, templateId } = body

    console.log('[generate-post] Starting generation for account:', accountId, 'template:', templateId)

    if (!accountId || !templateId) {
      return NextResponse.json(
        { error: 'accountId and templateId are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Fetch account with prompt and check credits
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('prompt, organization_id, organizations(credits)')
      .eq('id', accountId)
      .single()

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    const org = account.organizations as any
    if (!org || org.credits <= 0) {
      return NextResponse.json(
        { error: 'Insufficient credits' },
        { status: 402 }
      )
    }

    // Deduct one credit
    const { error: updateError } = await supabase
      .from('organizations')
      .update({ credits: org.credits - 1 })
      .eq('id', account.organization_id)

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to deduct credits' },
        { status: 500 }
      )
    }

    // Fetch template with slides and layers
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .select('id, type, name')
      .eq('id', templateId)
      .single()

    if (templateError || !template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Fetch slides ordered by position
    const { data: slides, error: slidesError } = await supabase
      .from('template_slides')
      .select('id, position')
      .eq('template_id', templateId)
      .order('position', { ascending: true })

    if (slidesError || !slides || slides.length === 0) {
      return NextResponse.json(
        { error: 'Template has no slides' },
        { status: 400 }
      )
    }

    // Fetch all layers for all slides with image information
    const slideIds = slides.map(s => s.id)
    const { data: layers, error: layersError } = await supabase
      .from('template_layers')
      .select(`
        id,
        slide_id,
        type,
        text_content,
        image_id,
        image_collection_id,
        image_source_type,
        is_fixed
      `)
      .in('slide_id', slideIds)
      .order('position', { ascending: true })

    if (layersError) {
      return NextResponse.json(
        { error: 'Failed to fetch template layers' },
        { status: 500 }
      )
    }

    // Fetch slide backgrounds with image information
    const { data: slidesWithBg, error: slidesBgError } = await supabase
      .from('template_slides')
      .select(`
        id,
        background_type,
        background_image_id,
        background_image_url,
        background_collection_id
      `)
      .in('id', slideIds)

    if (slidesBgError) {
      return NextResponse.json(
        { error: 'Failed to fetch slide backgrounds' },
        { status: 500 }
      )
    }

    // Create map of slide backgrounds
    const slideBackgrounds = new Map<string, any>()
    slidesWithBg?.forEach(slide => {
      slideBackgrounds.set(slide.id, slide)
    })

    console.log('[generate-post] Slide backgrounds:', JSON.stringify(slidesWithBg, null, 2))

    // Fetch image URLs for specific images
    const imageIds = new Set<string>()
    layers?.forEach(layer => {
      if (layer.image_id) {
        imageIds.add(layer.image_id)
        console.log('[generate-post] Found layer with specific image_id:', layer.image_id)
      }
    })
    slidesWithBg?.forEach(slide => {
      if (slide.background_image_id) {
        imageIds.add(slide.background_image_id)
        console.log('[generate-post] Found slide with specific background_image_id:', slide.background_image_id)
      }
    })

    const imageUrlMap = new Map<string, string>()
    if (imageIds.size > 0) {
      const { data: imagesData, error: imagesError } = await supabase
        .from('images')
        .select('id, url')
        .in('id', Array.from(imageIds))

      console.log('[generate-post] Fetched images:', imagesData, 'error:', imagesError)

      imagesData?.forEach(img => {
        imageUrlMap.set(img.id, img.url)
      })
    }

    // Handle collection_random images - pick random image for EACH slide/layer individually
    // Map: (slide_id or layer_id) -> image_url
    const randomSlideBackgrounds = new Map<string, string>() // slide_id -> image_url
    const randomLayerImages = new Map<string, string>() // layer_id -> image_url
    
    // Get unique collection IDs to fetch
    const collectionIds = new Set<string>()
    layers?.forEach(layer => {
      if (layer.image_source_type === 'collection_random' && layer.image_collection_id) {
        collectionIds.add(layer.image_collection_id)
        console.log('[generate-post] Found layer with collection_random, layer_id:', layer.id, 'collection_id:', layer.image_collection_id)
      }
    })
    slidesWithBg?.forEach(slide => {
      if (slide.background_type === 'collection_random' && slide.background_collection_id) {
        collectionIds.add(slide.background_collection_id)
        console.log('[generate-post] Found slide with collection_random background, slide_id:', slide.id, 'collection_id:', slide.background_collection_id)
      }
    })

    console.log('[generate-post] Collection IDs to fetch:', Array.from(collectionIds))

    // Fetch all images for each collection
    const collectionImagesMap = new Map<string, any[]>() // collection_id -> images[]
    if (collectionIds.size > 0) {
      for (const collectionId of collectionIds) {
        const { data: collectionImages, error: collError } = await supabase
          .from('collection_images')
          .select('image_id, images(url)')
          .eq('collection_id', collectionId)

        console.log('[generate-post] Collection', collectionId, 'has', collectionImages?.length, 'images, error:', collError)

        if (collectionImages && collectionImages.length > 0) {
          collectionImagesMap.set(collectionId, collectionImages)
        }
      }
    }

    // Randomly select image for each slide background
    slidesWithBg?.forEach(slide => {
      if (slide.background_type === 'collection_random' && slide.background_collection_id) {
        const images = collectionImagesMap.get(slide.background_collection_id)
        if (images && images.length > 0) {
          const randomIndex = Math.floor(Math.random() * images.length)
          const selected = images[randomIndex]
          const imageUrl = (selected.images as any)?.url
          if (imageUrl) {
            randomSlideBackgrounds.set(slide.id, imageUrl)
            console.log('[generate-post] Selected random background for slide', slide.id, 'url:', imageUrl)
          }
        }
      }
    })

    // Randomly select image for each layer
    layers?.forEach(layer => {
      if (layer.image_source_type === 'collection_random' && layer.image_collection_id) {
        const images = collectionImagesMap.get(layer.image_collection_id)
        if (images && images.length > 0) {
          const randomIndex = Math.floor(Math.random() * images.length)
          const selected = images[randomIndex]
          const imageUrl = (selected.images as any)?.url
          if (imageUrl) {
            randomLayerImages.set(layer.id, imageUrl)
            console.log('[generate-post] Selected random image for layer', layer.id, 'url:', imageUrl)
          }
        }
      }
    })

    console.log('[generate-post] Image URL map size:', imageUrlMap.size)
    console.log('[generate-post] Random slide backgrounds:', Object.fromEntries(randomSlideBackgrounds))
    console.log('[generate-post] Random layer images:', Object.fromEntries(randomLayerImages))

    // Filter to only text layers and group by slide
    const textLayersBySlide: Record<string, typeof layers> = {}
    layers?.forEach(layer => {
      if (layer.type === 'text' && layer.slide_id) {
        if (!textLayersBySlide[layer.slide_id]) {
          textLayersBySlide[layer.slide_id] = []
        }
        textLayersBySlide[layer.slide_id].push(layer)
      }
    })

    // Build AI prompt
    const accountPrompt = account.prompt || 'Create engaging social media content.'
    
    const systemPrompt = `You are a content creator generating text for social media posts. Your task is to fill in text layers for a ${template.type} template based on the user's content direction.

IMPORTANT RULES:
1. Text content for images (text_content fields): NO hashtags allowed, just engaging text
2. Title: Short, punchy line (max 10 words) that captures attention
3. Caption: Social media caption with max 3 relevant hashtags at the end

Return ONLY valid JSON - no markdown, no code blocks, no explanations, just the JSON object.`

    let promptText = `Content direction: ${accountPrompt}\n\n`
    promptText += `Template: ${template.name}\n\n`
    promptText += `This template has ${slides.length} slide(s). Each slide contains text layers that need to be filled:\n\n`

    const slidesWithText: typeof slides = []
    slides.forEach((slide, idx) => {
      const slideLayers = (textLayersBySlide[slide.id] || []).filter(l => !l.is_fixed)
      if (slideLayers.length > 0) {
        slidesWithText.push(slide)
        promptText += `Slide ${idx + 1} (position ${slide.position}):\n`
        slideLayers.forEach((layer, layerIdx) => {
          const placeholder = layer.text_content || `Text layer ${layerIdx + 1}`
          promptText += `  - Layer ID "${layer.id}": ${placeholder}\n`
        })
        promptText += '\n'
      }
    })

    promptText += `\nReturn ONLY valid JSON in this exact format:\n`
    promptText += `{\n`
    promptText += `  "title": "Short punchy title here (no hashtags)",\n`
    promptText += `  "caption": "Engaging caption text here #hashtag1 #hashtag2 #hashtag3",\n`
    promptText += `  "slides": [\n`
    slidesWithText.forEach((slide, idx) => {
      const slideLayers = (textLayersBySlide[slide.id] || []).filter(l => !l.is_fixed)
      promptText += `    {\n`
      promptText += `      "slide_id": "${slide.id}",\n`
      promptText += `      "position": ${slide.position},\n`
      promptText += `      "layers": [\n`
      slideLayers.forEach((layer, layerIdx) => {
        promptText += `        {\n`
        promptText += `          "layer_id": "${layer.id}",\n`
        promptText += `          "text_content": "your generated text here (NO HASHTAGS)"\n`
        promptText += `        }${layerIdx < slideLayers.length - 1 ? ',' : ''}\n`
      })
      promptText += `      ]\n`
      promptText += `    }${idx < slidesWithText.length - 1 ? ',' : ''}\n`
    })
    promptText += `  ]\n`
    promptText += `}\n\n`
    promptText += `Remember: text_content must NOT contain any hashtags. Title should be short and punchy. Caption should have max 3 hashtags at the end.`

    // Call fal.ai OpenRouter
    const falKey = process.env.FAL_KEY
    if (!falKey) {
      return NextResponse.json(
        { error: 'FAL_KEY not configured' },
        { status: 500 }
      )
    }

    const falResponse = await fetch('https://fal.run/openrouter/router', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: promptText,
        system_prompt: systemPrompt,
        model: 'google/gemini-2.5-flash',
        temperature: 0.7,
        max_tokens: 2000,
      }),
    })

    if (!falResponse.ok) {
      const errorText = await falResponse.text()
      console.error('fal.ai error:', errorText)
      return NextResponse.json(
        { error: 'Failed to generate content', details: errorText },
        { status: 500 }
      )
    }

    const falData = await falResponse.json()
    let generatedContent: PostContent

    // Parse the response - handle both direct JSON and text-wrapped JSON
    try {
      let jsonText = falData.output || falData.text || JSON.stringify(falData)
      
      // Remove markdown code blocks if present
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      
      // Try to extract JSON if wrapped in text
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        jsonText = jsonMatch[0]
      }

      generatedContent = JSON.parse(jsonText)
    } catch (parseError) {
      console.error('Failed to parse AI response:', falData)
      return NextResponse.json(
        { error: 'Failed to parse AI response', details: falData },
        { status: 500 }
      )
    }

    // Build complete post content with image URLs
    console.log('[generate-post] Building post content with image URLs...')
    const postContentSlides = slides.map(slide => {
      const slideBg = slideBackgrounds.get(slide.id)
      let backgroundImageUrl: string | null = null
      
      console.log('[generate-post] Processing slide:', slide.id, 'background_type:', slideBg?.background_type)
      
      // Get background image URL
      if (slideBg?.background_type === 'image') {
        if (slideBg.background_image_url) {
          backgroundImageUrl = slideBg.background_image_url
          console.log('[generate-post] Using direct background_image_url:', backgroundImageUrl)
        } else if (slideBg.background_image_id && imageUrlMap.has(slideBg.background_image_id)) {
          backgroundImageUrl = imageUrlMap.get(slideBg.background_image_id)!
          console.log('[generate-post] Using image_id lookup, url:', backgroundImageUrl)
        }
      } else if (slideBg?.background_type === 'collection_random') {
        // Each slide gets its own random image
        backgroundImageUrl = randomSlideBackgrounds.get(slide.id) || null
        console.log('[generate-post] Using collection_random for slide', slide.id, 'url:', backgroundImageUrl)
      }

      // Get layers for this slide with image URLs
      const slideLayers = layers?.filter(l => l.slide_id === slide.id) || []
      console.log('[generate-post] Slide', slide.id, 'has', slideLayers.length, 'layers')
      
      const contentLayers = slideLayers.map(layer => {
        const generatedLayer = generatedContent.slides
          ?.find(s => s.slide_id === slide.id)
          ?.layers?.find(l => l.layer_id === layer.id)

        const layerData: any = {
          layer_id: layer.id
        }

        // Add text content if it's a text layer
        if (layer.type === 'text') {
          if (layer.is_fixed) {
            layerData.text_content = layer.text_content
            console.log('[generate-post] Text layer', layer.id, 'is FIXED, using original content')
          } else if (generatedLayer?.text_content) {
            layerData.text_content = generatedLayer.text_content
            console.log('[generate-post] Text layer', layer.id, 'content:', layerData.text_content?.substring(0, 30))
          } else {
            layerData.text_content = layer.text_content
            console.log('[generate-post] Text layer', layer.id, 'NO AI CONTENT, using original content')
          }
        }

        // Add image URL if it's an image layer
        if (layer.type === 'image') {
          console.log('[generate-post] Image layer', layer.id, 'image_id:', layer.image_id, 'source_type:', layer.image_source_type, 'collection_id:', layer.image_collection_id)
          if (layer.image_id && imageUrlMap.has(layer.image_id)) {
            layerData.image_url = imageUrlMap.get(layer.image_id)!
            console.log('[generate-post] -> Using specific image_url:', layerData.image_url)
          } else if (layer.image_source_type === 'collection_random') {
            // Each layer gets its own random image
            layerData.image_url = randomLayerImages.get(layer.id) || null
            console.log('[generate-post] -> Using collection random image_url for layer', layer.id, ':', layerData.image_url)
          }
        }

        return layerData
      })

      return {
        slide_id: slide.id,
        position: slide.position,
        background_image_url: backgroundImageUrl,
        layers: contentLayers
      }
    })

    console.log('[generate-post] Final post content slides:', JSON.stringify(postContentSlides, null, 2))

    // Validate and structure the content
    const postContent: PostContent = {
      template_id: templateId,
      title: generatedContent.title || '',
      caption: generatedContent.caption || '',
      slides: postContentSlides
    }

    console.log('[generate-post] Saving post to database with content:', JSON.stringify(postContent, null, 2))

    // Create post in database with title and caption
    const { data: newPost, error: postError } = await supabase
      .from('posts')
      .insert({
        account_id: accountId,
        type: template.type,
        title: generatedContent.title || null,
        caption: generatedContent.caption || null,
        content: postContent,
        status: 'ready',
      })
      .select()
      .single()

    if (postError) {
      console.error('[generate-post] Failed to create post:', postError)
      return NextResponse.json(
        { error: 'Failed to create post', details: postError.message },
        { status: 500 }
      )
    }

    console.log('[generate-post] Post created successfully:', newPost.id)
    console.log('[generate-post] Saved content:', JSON.stringify(newPost.content, null, 2))

    return NextResponse.json({
      success: true,
      post: newPost,
      newCredits: org.credits - 1,
    })
  } catch (error: any) {
    console.error('Error generating post:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
