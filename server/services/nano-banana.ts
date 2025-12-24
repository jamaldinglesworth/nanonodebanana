import { fal } from '@fal-ai/client'

/**
 * Nano Banana generation request parameters.
 */
interface NanoBananaParams {
  prompt: string
  numImages: number
  aspectRatio: string
  outputFormat: 'jpeg' | 'png' | 'webp'
}

/**
 * Nano Banana generation result.
 */
interface NanoBananaResult {
  images: string[]
  description?: string
}

/**
 * Configure Fal.ai client.
 */
function configureClient(): void {
  const apiKey = process.env.FAL_KEY

  if (!apiKey) {
    throw new Error('FAL_KEY environment variable is not set')
  }

  fal.config({
    credentials: apiKey,
  })
}

/**
 * Generate images using Nano Banana model.
 */
export async function generateWithNanoBanana(
  params: NanoBananaParams
): Promise<NanoBananaResult> {
  configureClient()

  try {
    // Call Fal.ai API for nano-banana
    const result = await fal.subscribe('fal-ai/nano-banana', {
      input: {
        prompt: params.prompt,
        num_images: params.numImages,
        aspect_ratio: params.aspectRatio as '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '21:9' | '3:2' | '5:4' | '4:5' | '2:3',
        output_format: params.outputFormat,
      },
      logs: true,
    })

    // Extract images from result
    const images: string[] = []
    const resultData = result.data as {
      images?: Array<{ url?: string; base64?: string }>
      description?: string
    }

    if (resultData.images) {
      for (const image of resultData.images) {
        if (image.base64) {
          images.push(image.base64)
        } else if (image.url) {
          // Fetch image and convert to base64
          const response = await fetch(image.url)
          const buffer = await response.arrayBuffer()
          const base64 = Buffer.from(buffer).toString('base64')
          images.push(base64)
        }
      }
    }

    if (images.length === 0) {
      throw new Error('No images generated')
    }

    return {
      images,
      description: resultData.description,
    }
  } catch (error) {
    console.error('Nano Banana generation error:', error)
    throw new Error(
      `Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}
