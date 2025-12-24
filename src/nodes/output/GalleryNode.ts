import { createNodeClass, getInputValue, type ExecutableNode } from '../base/BaseNode'
import { NODE_TYPE_COLOURS } from '../../types/nodes'

/**
 * GalleryNode - Multi-image gallery view.
 * Displays multiple generated images in a grid layout.
 */
export const GalleryNode = createNodeClass(
  {
    title: 'Gallery',
    category: 'output',
    colour: NODE_TYPE_COLOURS.gallery,
    description: 'Multi-image gallery view',
    inputs: [
      { name: 'image_1', type: 'image', optional: true },
      { name: 'image_2', type: 'image', optional: true },
      { name: 'image_3', type: 'image', optional: true },
      { name: 'image_4', type: 'image', optional: true },
    ],
    outputs: [
      { name: 'selected', type: 'image' },
    ],
    widgets: [
      {
        name: 'columns',
        type: 'number',
        defaultValue: 2,
        options: {
          min: 1,
          max: 4,
          step: 1,
        },
      },
    ],
    properties: {
      images: [] as string[],
      selectedIndex: 0,
      columns: 2,
    },
    resizable: true,
  },
  async (node: ExecutableNode) => {
    const image1 = getInputValue<string>(node, 'image_1')
    const image2 = getInputValue<string>(node, 'image_2')
    const image3 = getInputValue<string>(node, 'image_3')
    const image4 = getInputValue<string>(node, 'image_4')

    // Collect all non-null images
    const images = [image1, image2, image3, image4].filter(
      (img): img is string => !!img
    )

    // Store images for display
    node.setProperty('images', images)

    // Get selected image (default to first)
    const selectedIndex = (node.properties?.selectedIndex as number) ?? 0
    const selected = images[selectedIndex] ?? images[0] ?? ''

    // Set output
    node.setOutputData(0, selected)

    // Trigger visual update
    node.setDirtyCanvas(true, true)

    return { images, selected }
  }
)
