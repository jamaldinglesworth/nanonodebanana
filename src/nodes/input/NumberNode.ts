import { createNodeClass, getWidgetValue, type ExecutableNode } from '../base/BaseNode'
import { NODE_TYPE_COLOURS } from '../../types/nodes'

/**
 * NumberNode - Numeric value input node.
 * Provides a number input for configuration values.
 */
export const NumberNode = createNodeClass(
  {
    title: 'Number',
    category: 'input',
    colour: NODE_TYPE_COLOURS.number,
    outputs: [
      { name: 'value', type: 'number' },
    ],
    widgets: [
      {
        name: 'value',
        type: 'number',
        defaultValue: 0,
        options: {
          step: 1,
        },
      },
    ],
    properties: {
      value: 0,
    },
    resizable: true,
  },
  async (node: ExecutableNode) => {
    const value = getWidgetValue<number>(node, 'value') ?? 0

    // Set output
    node.setOutputData(0, value)

    return { value }
  }
)
