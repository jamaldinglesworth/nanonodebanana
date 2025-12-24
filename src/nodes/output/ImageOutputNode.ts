import { createNodeClass, getInputValue, type ExecutableNode } from '../base/BaseNode'
import { NODE_TYPE_COLOURS } from '../../types/nodes'

/**
 * ImageOutputNode - Displays generated images.
 * Provides a preview of the generated image with options to view fullscreen,
 * copy to clipboard, or save.
 */
export const ImageOutputNode = createNodeClass(
  {
    title: 'Image Output',
    category: 'output',
    colour: NODE_TYPE_COLOURS.imageOutput,
    description: 'Display generated image',
    inputs: [
      { name: 'image', type: 'image' },
    ],
    outputs: [],
    widgets: [
      {
        name: 'preview_size',
        type: 'slider',
        defaultValue: 200,
        options: {
          min: 100,
          max: 1024,
          step: 10,
        },
      },
    ],
    properties: {
      imageData: '',
      preview_size: 200,
    },
    // Enable image preview - shows output result
    showImagePreview: true,
    imageProperty: 'imageData',
    // Use dynamic preview height from widget
    dynamicPreviewHeight: 'preview_size',
  },
  async (node: ExecutableNode) => {
    const image = getInputValue<string>(node, 'image')

    if (!image) {
      throw new Error('No image input')
    }

    // Store image for display
    node.setProperty('imageData', image)

    // Trigger visual update
    node.setDirtyCanvas(true, true)

    return { displayed: true }
  }
)
