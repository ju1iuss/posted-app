import { NextRequest, NextResponse } from 'next/server'

interface EnhancePromptRequest {
  prompt: string
}

export async function POST(request: NextRequest) {
  try {
    const body: EnhancePromptRequest = await request.json()
    const { prompt } = body

    if (!prompt || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    const falKey = process.env.FAL_KEY
    if (!falKey) {
      return NextResponse.json(
        { error: 'FAL_KEY not configured' },
        { status: 500 }
      )
    }

    const systemPrompt = `You are an expert at creating prompts for AI content generation systems. Your task is to take a basic user prompt and transform it into a well-structured account prompt that will guide AI content generation but not sound like an AI is writing it.

The enhanced prompt should:
1. Maintain the core theme and intent of the original prompt
2. Add clear structure with sections (CONTENT THEME, VARIATION EXAMPLES, STYLE GUIDELINES, etc.) but not too much.
3. Include specific examples of how to vary wording while keeping the core concept
4. Provide clear guidelines for tone, style, and content direction
5. Include instructions for variation to avoid repetitive content

Use simple, natural language. Avoid marketing speak, excessive enthusiasm, or AI-sounding phrases. Keep it concise and straightforward. If the input of a user is german, reply in german, use the language of the user!
Return ONLY the enhanced prompt text - no markdown, no code blocks, no explanations, just the prompt itself.`

    const userPrompt = `Transform this basic prompt into a detailed, comprehensive account prompt:\n\n"${prompt}"\n\nMake it structured, detailed, and include examples of how to vary the wording while maintaining the core theme.`

    const falResponse = await fetch('https://fal.run/openrouter/router', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: userPrompt,
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
        { error: 'Failed to enhance prompt', details: errorText },
        { status: 500 }
      )
    }

    const falData = await falResponse.json()
    let enhancedPrompt = falData.output || falData.text || ''

    // Clean up the response - remove markdown code blocks if present
    enhancedPrompt = enhancedPrompt.replace(/```[\w]*\n?/g, '').trim()

    // If wrapped in quotes, remove them
    if ((enhancedPrompt.startsWith('"') && enhancedPrompt.endsWith('"')) ||
        (enhancedPrompt.startsWith("'") && enhancedPrompt.endsWith("'"))) {
      enhancedPrompt = enhancedPrompt.slice(1, -1)
    }

    return NextResponse.json({
      success: true,
      enhancedPrompt: enhancedPrompt.trim(),
    })
  } catch (error: any) {
    console.error('Error enhancing prompt:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
