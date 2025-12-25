import { createNodeClass, getInputValue, getWidgetValue, type ExecutableNode } from '../base/BaseNode'
import { NODE_TYPE_COLOURS } from '../../types/nodes'
import { generateApi } from '../../lib/api-client'

/**
 * Maximum number of image inputs supported.
 */
const MAX_IMAGE_INPUTS = 14

/**
 * Aspect ratio presets for Nano Banana Pro Edit.
 * Includes 'auto' which preserves the input image's aspect ratio.
 */
const ASPECT_RATIOS = [
  'auto',    // Preserve input aspect ratio
  '1:1',     // Square
  '16:9',    // Landscape wide
  '9:16',    // Portrait tall
  '4:3',     // Classic landscape
  '3:4',     // Classic portrait
  '3:2',     // Photo landscape
  '2:3',     // Photo portrait
  '21:9',    // Ultrawide
  '5:4',     // Slight landscape
  '4:5',     // Slight portrait
] as const

/**
 * Resolution options for Nano Banana Pro Edit.
 */
const RESOLUTIONS = ['1K', '2K', '4K'] as const

/**
 * Output format options.
 */
const OUTPUT_FORMATS = ['png', 'jpeg', 'webp'] as const

/**
 * Generate image input definitions for 1 to MAX_IMAGE_INPUTS.
 */
function generateImageInputs() {
  const inputs: Array<{ name: string; type: 'image' }> = []
  for (let i = 1; i <= MAX_IMAGE_INPUTS; i++) {
    inputs.push({ name: `image_${i}`, type: 'image' })
  }
  return inputs
}

/**
 * NanoBananaProEditNode - Nano Banana Pro image editing node.
 * Edits images using Fal.ai's Nano Banana Pro Edit model with enhanced
 * resolution control, web search integration, and better realism/typography.
 *
 * Supports up to 14 input images for multi-image editing workflows.
 *
 * Combines capabilities of:
 * - NanoBananaEditNode (takes input images for editing)
 * - NanoBananaProNode (resolution control, web search)
 */
export const NanoBananaProEditNode = createNodeClass(
  {
    title: 'Nano Banana Pro Edit',
    category: 'generation',
    colour: NODE_TYPE_COLOURS.nanoBananaProEdit,
    description: 'Pro image editing with up to 14 inputs, resolution control & web search',
    inputs: [
      ...generateImageInputs(),
      { name: 'prompt', type: 'string' },
    ],
    outputs: [
      { name: 'image', type: 'image' },
      { name: 'description', type: 'string' },
    ],
    widgets: [
      {
        name: 'resolution',
        type: 'combo',
        defaultValue: '1K',
        options: {
          values: [...RESOLUTIONS],
        },
      },
      {
        name: 'aspect_ratio',
        type: 'combo',
        defaultValue: 'auto',
        options: {
          values: [...ASPECT_RATIOS],
        },
      },
      {
        name: 'num_images',
        type: 'combo',
        defaultValue: '1',
        options: {
          values: ['1', '2', '3', '4'],
        },
      },
      {
        name: 'output_format',
        type: 'combo',
        defaultValue: 'png',
        options: {
          values: [...OUTPUT_FORMATS],
        },
      },
      {
        name: 'enable_web_search',
        type: 'toggle',
        defaultValue: false,
      },
      {
        name: 'limit_generations',
        type: 'toggle',
        defaultValue: false,
      },
    ],
    properties: {
      resolution: '1K',
      aspect_ratio: 'auto',
      num_images: '1',
      output_format: 'png',
      enable_web_search: false,
      limit_generations: false,
      executionTime: 0,
      description: '',
    },
    resizable: true,
    showProgressIndicator: true,
  },
  async (node: ExecutableNode) => {
    // Collect all connected images (image_1 through image_14)
    const imageUrls: string[] = []
    for (let i = 1; i <= MAX_IMAGE_INPUTS; i++) {
      const img = getInputValue<string>(node, `image_${i}`)
      if (img) {
        imageUrls.push(img)
      }
    }

    const prompt = getInputValue<string>(node, 'prompt')

    const resolution = getWidgetValue<string>(node, 'resolution') ?? '1K'
    const aspectRatio = getWidgetValue<string>(node, 'aspect_ratio') ?? 'auto'
    const numImagesStr = getWidgetValue<string>(node, 'num_images') ?? '1'
    const outputFormat = getWidgetValue<string>(node, 'output_format') ?? 'png'
    const enableWebSearch = getWidgetValue<boolean>(node, 'enable_web_search') ?? false
    const limitGenerations = getWidgetValue<boolean>(node, 'limit_generations') ?? false

    if (imageUrls.length === 0) {
      throw new Error('At least one input image is required')
    }

    if (!prompt) {
      throw new Error('Prompt is required')
    }

    const numImages = parseInt(numImagesStr, 10)

    // Call API with all collected images
    const response = await generateApi.nanoBananaProEdit({
      prompt,
      imageUrls,
      numImages,
      resolution: resolution as '1K' | '2K' | '4K',
      aspectRatio: aspectRatio as 'auto' | '21:9' | '16:9' | '3:2' | '4:3' | '5:4' | '1:1' | '4:5' | '3:4' | '2:3' | '9:16',
      outputFormat: outputFormat as 'jpeg' | 'png' | 'webp',
      enableWebSearch,
      limitGenerations,
    })

    // Store execution info
    node.setProperty('executionTime', response.executionTime)
    node.setProperty('description', response.description ?? '')

    // Get first image
    const outputImage = response.images[0] ?? ''

    // Set outputs
    node.setOutputData(0, outputImage)
    node.setOutputData(1, response.description ?? '')

    return { image: outputImage, description: response.description }
  }
)
