import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { prompt, imageUrls, organizationId } = await request.json()

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json({ error: 'Image URLs are required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Check credits
    if (organizationId) {
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('credits')
        .eq('id', organizationId)
        .single()

      if (orgError || !org || org.credits <= 0) {
        return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 })
      }

      // Deduct one credit
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ credits: org.credits - 1 })
        .eq('id', organizationId)

      if (updateError) {
        return NextResponse.json({ error: 'Failed to deduct credits' }, { status: 500 })
      }
    }

    const falKey = process.env.FAL_KEY
    if (!falKey) {
      return NextResponse.json({ error: 'FAL_KEY not configured' }, { status: 500 })
    }

    // Call fal.ai Nano Banana Pro Edit
    // Using the queue API as recommended in the docs provided by user
    const response = await fetch('https://queue.fal.run/fal-ai/nano-banana-pro/edit', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt || "make a professional lifestyle photo with this product",
        image_urls: imageUrls,
        sync_mode: false // We will poll for the result
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('fal.ai error:', errorText)
      return NextResponse.json({ error: 'Failed to start generation', details: errorText }, { status: 500 })
    }

    const { request_id } = await response.json()

    // Poll for the result
    let result = null
    const maxAttempts = 60 // Increase timeout for slower models
    const delay = 2000 // 2 seconds

    for (let i = 0; i < maxAttempts; i++) {
      const statusResponse = await fetch(`https://queue.fal.run/fal-ai/nano-banana-pro/requests/${request_id}/status`, {
        headers: {
          'Authorization': `Key ${falKey}`,
        },
      })

      const statusData = await statusResponse.json()
      
      if (statusData.status === 'COMPLETED') {
        // Fetch the actual result
        const resultResponse = await fetch(`https://queue.fal.run/fal-ai/nano-banana-pro/requests/${request_id}`, {
          headers: {
            'Authorization': `Key ${falKey}`,
          },
        })
        result = await resultResponse.json()
        break
      } else if (statusData.status === 'FAILED') {
        console.error('Generation failed:', statusData)
        return NextResponse.json({ error: 'Generation failed on fal.ai' }, { status: 500 })
      }

      // If IN_PROGRESS or IN_QUEUE, continue polling
      await new Promise(resolve => setTimeout(resolve, delay))
    }

    if (!result || !result.images || result.images.length === 0) {
      return NextResponse.json({ error: 'Generation timed out' }, { status: 500 })
    }

    const generatedImageUrl = result.images[0].url

    // Save to Supabase
    const { data: imageData, error: imageError } = await supabase
      .from('images')
      .insert({
        organization_id: organizationId || null,
        url: generatedImageUrl,
        source: 'ai_generated',
        prompt: prompt,
        storage_path: 'ai_generated/' + request_id + '.png', // Placeholder path since it's hosted on fal.ai for now
        metadata: {
          fal_request_id: request_id,
          reference_images: imageUrls
        }
      })
      .select()
      .single()

    if (imageError) {
      console.error('Supabase error:', imageError)
      // Still return the URL even if DB save fails, but maybe log it
    }

    // Get the new credits count for the response
    let newCredits: number | undefined
    if (organizationId) {
      const { data: updatedOrg } = await supabase
        .from('organizations')
        .select('credits')
        .eq('id', organizationId)
        .single()
      newCredits = updatedOrg?.credits
    }

    return NextResponse.json({
      success: true,
      image: imageData || { url: generatedImageUrl },
      newCredits,
      organizationId
    })

  } catch (error: any) {
    console.error('Error in edit-image route:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}
