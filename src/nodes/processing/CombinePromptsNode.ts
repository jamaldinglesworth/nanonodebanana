import { createNodeClass, getInputValue, getWidgetValue, type ExecutableNode } from '../base/BaseNode'
import { NODE_TYPE_COLOURS } from '../../types/nodes'

/**
 * CombinePromptsNode - Merges multiple prompts into one.
 * Combines up to 3 input prompts with a configurable separator.
 */
export const CombinePromptsNode = createNodeClass(
  {
    title: 'Combine Prompts',
    category: 'processing',
    colour: NODE_TYPE_COLOURS.combinePrompts,
    inputs: [
      { name: 'prompt_1', type: 'string', optional: true },
      { name: 'prompt_2', type: 'string', optional: true },
      { name: 'prompt_3', type: 'string', optional: true },
    ],
    outputs: [
      { name: 'combined', type: 'string' },
    ],
    widgets: [
      {
        name: 'separator',
        type: 'combo',
        defaultValue: ', ',
        options: {
          values: [', ', '\n', ' ', ' | ', ' - '],
        },
      },
    ],
    properties: {
      separator: ', ',
    },
    resizable: true,
  },
  async (node: ExecutableNode) => {
    const prompt1 = getInputValue<string>(node, 'prompt_1') ?? ''
    const prompt2 = getInputValue<string>(node, 'prompt_2') ?? ''
    const prompt3 = getInputValue<string>(node, 'prompt_3') ?? ''
    const separator = getWidgetValue<string>(node, 'separator') ?? ', '

    // Filter out empty prompts and combine
    const prompts = [prompt1, prompt2, prompt3].filter(p => p.trim().length > 0)
    const combined = prompts.join(separator)

    // Set output
    node.setOutputData(0, combined)

    return { combined }
  }
)
