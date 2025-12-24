import { createNodeClass, getInputValue, getWidgetValue, type ExecutableNode } from '../base/BaseNode'
import { NODE_TYPE_COLOURS } from '../../types/nodes'
import { generateApi } from '../../lib/api-client'

/**
 * GeminiGeneratorNode - Google Gemini image generation node.
 * Generates images using Google's Gemini/Imagen models.
 */
export const GeminiGeneratorNode = createNodeClass(
  {
    title: 'Gemini Generator',
    category: 'generation',
    colour: NODE_TYPE_COLOURS.gemini,
    description: 'Google Gemini image generation',
    inputs: [
      { name: 'prompt', type: 'string' },
      { name: 'negative', type: 'string', optional: true },
      { name: 'reference', type: 'image', optional: true },
      { name: 'seed', type: 'number', optional: true },
    ],
    outputs: [
      { name: 'image', type: 'image' },
    ],
    widgets: [
      {
        name: 'model',
        type: 'combo',
        defaultValue: 'imagen-3',
        options: {
          values: ['imagen-3', 'gemini-2.0-flash'],
        },
      },
      {
        name: 'aspect_ratio',
        type: 'combo',
        defaultValue: '1:1',
        options: {
          values: ['1:1', '16:9', '9:16', '4:3', '3:4'],
        },
      },
      {
        name: 'num_images',
        type: 'number',
        defaultValue: 1,
        options: {
          min: 1,
          max: 4,
          step: 1,
        },
      },
      {
        name: 'safety_filter',
        type: 'toggle',
        defaultValue: true,
      },
    ],
    properties: {
      model: 'imagen-3',
      aspect_ratio: '1:1',
      num_images: 1,
      safety_filter: true,
      executionTime: 0,
    },
    resizable: true,
    showProgressIndicator: true,
  },
  async (node: ExecutableNode) => {
    const prompt = getInputValue<string>(node, 'prompt')
    const negative = getInputValue<string>(node, 'negative')
    const reference = getInputValue<string>(node, 'reference')
    const seed = getInputValue<number>(node, 'seed')

    const model = getWidgetValue<string>(node, 'model') ?? 'imagen-3'
    const aspectRatio = getWidgetValue<string>(node, 'aspect_ratio') ?? '1:1'
    const numImages = getWidgetValue<number>(node, 'num_images') ?? 1

    if (!prompt) {
      throw new Error('Prompt is required')
    }

    // Call API
    const response = await generateApi.gemini({
      prompt,
      negativePrompt: negative,
      referenceImage: reference,
      model: model as 'imagen-3' | 'gemini-2.0-flash',
      aspectRatio: aspectRatio as '1:1' | '16:9' | '9:16' | '4:3' | '3:4',
      numberOfImages: numImages,
      seed,
    })

    // Store execution time
    node.setProperty('executionTime', response.executionTime)

    // Get first image
    const image = response.images[0] ?? ''

    // Set output
    node.setOutputData(0, image)

    return { image, allImages: response.images }
  }
)
