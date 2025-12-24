import { createNodeClass, getInputValue, getWidgetValue, type ExecutableNode } from '../base/BaseNode'
import { NODE_TYPE_COLOURS } from '../../types/nodes'
import { generateApi } from '../../lib/api-client'

/**
 * Image size presets for Fal Flux.
 */
const SIZE_PRESETS: Record<string, { width: number; height: number }> = {
  'Square (1024x1024)': { width: 1024, height: 1024 },
  'Portrait (768x1344)': { width: 768, height: 1344 },
  'Landscape (1344x768)': { width: 1344, height: 768 },
  'Wide (1536x640)': { width: 1536, height: 640 },
  'Tall (640x1536)': { width: 640, height: 1536 },
}

/**
 * FalFluxNode - Fal.ai Flux image generation node.
 * Generates images using Fal.ai's Flux models.
 */
export const FalFluxNode = createNodeClass(
  {
    title: 'Fal Flux',
    category: 'generation',
    colour: NODE_TYPE_COLOURS.falFlux,
    inputs: [
      { name: 'prompt', type: 'string' },
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
        defaultValue: 'flux-dev',
        options: {
          values: ['flux-pro', 'flux-dev', 'flux-schnell'],
        },
      },
      {
        name: 'size_preset',
        type: 'combo',
        defaultValue: 'Square (1024x1024)',
        options: {
          values: Object.keys(SIZE_PRESETS),
        },
      },
      {
        name: 'guidance',
        type: 'slider',
        defaultValue: 7.5,
        options: {
          min: 1,
          max: 20,
          step: 0.5,
        },
      },
      {
        name: 'steps',
        type: 'slider',
        defaultValue: 20,
        options: {
          min: 1,
          max: 50,
          step: 1,
        },
      },
    ],
    properties: {
      model: 'flux-dev',
      size_preset: 'Square (1024x1024)',
      guidance: 7.5,
      steps: 20,
      executionTime: 0,
      resultSeed: 0,
    },
    resizable: true,
    showProgressIndicator: true,
  },
  async (node: ExecutableNode) => {
    const prompt = getInputValue<string>(node, 'prompt')
    const reference = getInputValue<string>(node, 'reference')
    const seed = getInputValue<number>(node, 'seed')

    const model = getWidgetValue<string>(node, 'model') ?? 'flux-dev'
    const sizePreset = getWidgetValue<string>(node, 'size_preset') ?? 'Square (1024x1024)'
    const guidance = getWidgetValue<number>(node, 'guidance') ?? 7.5
    const steps = getWidgetValue<number>(node, 'steps') ?? 20

    if (!prompt) {
      throw new Error('Prompt is required')
    }

    const imageSize = SIZE_PRESETS[sizePreset] ?? { width: 1024, height: 1024 }

    // Call API
    const response = await generateApi.fal({
      prompt,
      model: model as 'flux-pro' | 'flux-dev' | 'flux-schnell',
      imageSize,
      guidanceScale: guidance,
      steps,
      seed,
      referenceImage: reference,
    })

    // Store execution info
    node.setProperty('executionTime', response.executionTime)
    node.setProperty('resultSeed', response.seed)

    // Get first image
    const image = response.images[0] ?? ''

    // Set output
    node.setOutputData(0, image)

    return { image, seed: response.seed }
  }
)
