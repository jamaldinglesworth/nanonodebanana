import { createNodeClass, getInputValue, getWidgetValue, type ExecutableNode } from '../base/BaseNode'
import { NODE_TYPE_COLOURS } from '../../types/nodes'
import { generateApi } from '../../lib/api-client'

/**
 * Aspect ratio presets for Nano Banana.
 */
const ASPECT_RATIOS = [
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
 * Output format options.
 */
const OUTPUT_FORMATS = ['png', 'jpeg', 'webp'] as const

/**
 * NanoBananaNode - Nano Banana image generation node.
 * Generates images using Fal.ai's Nano Banana model.
 */
export const NanoBananaNode = createNodeClass(
  {
    title: 'Nano Banana',
    category: 'generation',
    colour: NODE_TYPE_COLOURS.nanoBanana,
    inputs: [
      { name: 'prompt', type: 'string' },
    ],
    outputs: [
      { name: 'image', type: 'image' },
      { name: 'description', type: 'string' },
    ],
    widgets: [
      {
        name: 'aspect_ratio',
        type: 'combo',
        defaultValue: '1:1',
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
    ],
    properties: {
      aspect_ratio: '1:1',
      num_images: '1',
      output_format: 'png',
      executionTime: 0,
      description: '',
    },
  },
  async (node: ExecutableNode) => {
    const prompt = getInputValue<string>(node, 'prompt')

    const aspectRatio = getWidgetValue<string>(node, 'aspect_ratio') ?? '1:1'
    const numImagesStr = getWidgetValue<string>(node, 'num_images') ?? '1'
    const outputFormat = getWidgetValue<string>(node, 'output_format') ?? 'png'

    if (!prompt) {
      throw new Error('Prompt is required')
    }

    const numImages = parseInt(numImagesStr, 10)

    // Call API
    const response = await generateApi.nanoBanana({
      prompt,
      numImages,
      aspectRatio: aspectRatio as '21:9' | '16:9' | '3:2' | '4:3' | '5:4' | '1:1' | '4:5' | '3:4' | '2:3' | '9:16',
      outputFormat: outputFormat as 'jpeg' | 'png' | 'webp',
    })

    // Store execution info
    node.setProperty('executionTime', response.executionTime)
    node.setProperty('description', response.description ?? '')

    // Get first image
    const image = response.images[0] ?? ''

    // Set outputs
    node.setOutputData(0, image)
    node.setOutputData(1, response.description ?? '')

    return { image, description: response.description }
  }
)
