import { createNodeClass, getInputValue, getWidgetValue, type ExecutableNode } from '../base/BaseNode'
import { NODE_TYPE_COLOURS } from '../../types/nodes'

/**
 * Style presets with their token modifiers.
 */
const STYLE_PRESETS: Record<string, string> = {
  'Photorealistic': 'photorealistic, ultra-realistic, highly detailed, 8k, professional photography',
  'Anime': 'anime style, vibrant colors, detailed linework, studio quality',
  'Oil Painting': 'oil painting, textured brushstrokes, classical art style, masterpiece',
  'Watercolour': 'watercolor painting, soft edges, delicate colors, artistic',
  '3D Render': '3D render, octane render, cinema 4d, highly detailed, photorealistic lighting',
  'Pixel Art': 'pixel art, 16-bit style, retro game aesthetic, detailed sprites',
  'Comic Book': 'comic book style, bold outlines, dynamic shading, vibrant colors',
  'Cinematic': 'cinematic, dramatic lighting, film grain, movie still, widescreen',
}

/**
 * StylePresetNode - Applies style modifiers to a prompt.
 * Appends style-specific tokens to enhance the generation.
 */
export const StylePresetNode = createNodeClass(
  {
    title: 'Style Preset',
    category: 'processing',
    colour: NODE_TYPE_COLOURS.stylePreset,
    description: 'Apply style modifiers',
    inputs: [
      { name: 'prompt', type: 'string' },
    ],
    outputs: [
      { name: 'styled_prompt', type: 'string' },
    ],
    widgets: [
      {
        name: 'style',
        type: 'combo',
        defaultValue: 'Photorealistic',
        options: {
          values: Object.keys(STYLE_PRESETS),
        },
      },
      {
        name: 'position',
        type: 'combo',
        defaultValue: 'append',
        options: {
          values: ['append', 'prepend'],
        },
      },
    ],
    properties: {
      style: 'Photorealistic',
      position: 'append',
    },
    resizable: true,
  },
  async (node: ExecutableNode) => {
    const prompt = getInputValue<string>(node, 'prompt') ?? ''
    const style = getWidgetValue<string>(node, 'style') ?? 'Photorealistic'
    const position = getWidgetValue<string>(node, 'position') ?? 'append'

    const styleTokens = STYLE_PRESETS[style] ?? ''

    // Combine prompt with style tokens
    let styledPrompt: string
    if (position === 'prepend') {
      styledPrompt = styleTokens + (prompt ? ', ' + prompt : '')
    } else {
      styledPrompt = prompt + (styleTokens ? ', ' + styleTokens : '')
    }

    // Set output
    node.setOutputData(0, styledPrompt)

    return { styled_prompt: styledPrompt }
  }
)
