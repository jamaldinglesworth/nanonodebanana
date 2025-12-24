import { createNodeClass, getInputValue, getWidgetValue, type ExecutableNode } from '../base/BaseNode'
import { NODE_TYPE_COLOURS } from '../../types/nodes'

/**
 * FalVideoNode - Fal.ai video generation node.
 * Generates videos using Fal.ai's video models (Veo 3, etc.).
 *
 * Note: This is a placeholder implementation. The actual video generation
 * API integration will be added when the backend is implemented.
 */
export const FalVideoNode = createNodeClass(
  {
    title: 'Fal Video',
    category: 'generation',
    colour: NODE_TYPE_COLOURS.falVideo,
    inputs: [
      { name: 'prompt', type: 'string' },
      { name: 'reference', type: 'image', optional: true },
      { name: 'seed', type: 'number', optional: true },
    ],
    outputs: [
      { name: 'video', type: 'string' }, // Video URL
    ],
    widgets: [
      {
        name: 'model',
        type: 'combo',
        defaultValue: 'veo-3',
        options: {
          values: ['veo-3', 'runway-gen3'],
        },
      },
      {
        name: 'duration',
        type: 'combo',
        defaultValue: '4s',
        options: {
          values: ['4s', '6s', '8s'],
        },
      },
      {
        name: 'aspect_ratio',
        type: 'combo',
        defaultValue: '16:9',
        options: {
          values: ['16:9', '9:16', '1:1'],
        },
      },
    ],
    properties: {
      model: 'veo-3',
      duration: '4s',
      aspect_ratio: '16:9',
      executionTime: 0,
    },
    resizable: true,
    showProgressIndicator: true,
  },
  async (node: ExecutableNode) => {
    const prompt = getInputValue<string>(node, 'prompt')
    // These inputs will be used when video generation is implemented
    const reference = getInputValue<string>(node, 'reference')
    const seed = getInputValue<number>(node, 'seed')

    const model = getWidgetValue<string>(node, 'model') ?? 'veo-3'
    const duration = getWidgetValue<string>(node, 'duration') ?? '4s'
    const aspectRatio = getWidgetValue<string>(node, 'aspect_ratio') ?? '16:9'

    if (!prompt) {
      throw new Error('Prompt is required')
    }

    // TODO: Implement video generation API call
    // For now, log the parameters and return a placeholder
    console.warn('Video generation not yet implemented', { model, duration, aspectRatio, seed, reference })

    const videoUrl = '' // Placeholder

    // Set output
    node.setOutputData(0, videoUrl)

    return { video: videoUrl }
  }
)
