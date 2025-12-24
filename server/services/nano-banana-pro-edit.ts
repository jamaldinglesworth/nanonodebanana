import { fal } from '@fal-ai/client'

/**
 * Nano Banana Pro Edit request parameters.
 */
interface NanoBananaProEditParams {
  prompt: string
  imageUrls: string[]
  numImages: number
  resolution: '1K' | '2K' | '4K'
  aspectRatio: string
  outputFormat: 'jpeg' | 'png' | 'webp'
  enableWebSearch: boolean
  limitGenerations: boolean
}

/**
 * Nano Banana Pro Edit result.
 */
interface NanoBananaProEditResult {
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
 * Convert base64 image to data URI if needed.
 */
function toImageUrl(image: string): string {
  // Already a URL or data URI
  if (image.startsWith('http://') || image.startsWith('https://') || image.startsWith('data:')) {
    return image
  }

  // Raw base64 - detect format and convert to data URI
  if (image.startsWith('/9j/')) {
    return `data:image/jpeg;base64,${image}`
  } else if (image.startsWith('iVBORw')) {
    return `data:image/png;base64,${image}`
  } else if (image.startsWith('R0lGOD')) {
    return `data:image/gif;base64,${image}`
  } else if (image.startsWith('UklGR')) {
    return `data:image/webp;base64,${image}`
  }

  // Default to PNG
  return `data:image/png;base64,${image}`
}

/**
 * Edit images using Nano Banana Pro model.
 * Combines image editing with Pro features (resolution, web search).
 */
export async function editWithNanoBananaPro(
  params: NanoBananaProEditParams
): Promise<NanoBananaProEditResult> {
  configureClient()

  try {
    // Convert images to proper URL format (data URI for base64)
    const imageUrls = params.imageUrls.map(toImageUrl)

    const result = await fal.subscribe('fal-ai/nano-banana-pro/edit', {
      input: {
        prompt: params.prompt,
        image_urls: imageUrls,
        num_images: params.numImages,
        resolution: params.resolution,
        aspect_ratio: params.aspectRatio as
          | 'auto'
          | '1:1'
          | '16:9'
          | '9:16'
          | '4:3'
          | '3:4'
          | '21:9'
          | '3:2'
          | '5:4'
          | '4:5'
          | '2:3',
        output_format: params.outputFormat,
        enable_web_search: params.enableWebSearch,
        limit_generations: params.limitGenerations,
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
    console.error('Nano Banana Pro Edit error:', error)
    throw new Error(
      `Failed to edit image: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}
