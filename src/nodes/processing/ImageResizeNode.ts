import { createNodeClass, getInputValue, getWidgetValue, type ExecutableNode } from '../base/BaseNode'
import { NODE_TYPE_COLOURS } from '../../types/nodes'

/**
 * ImageResizeNode - Resizes or crops input images.
 * Supports various resize modes and aspect ratios.
 */
export const ImageResizeNode = createNodeClass(
  {
    title: 'Image Resize',
    category: 'processing',
    colour: NODE_TYPE_COLOURS.imageResize,
    description: 'Resize or crop images',
    inputs: [
      { name: 'image', type: 'image' },
    ],
    outputs: [
      { name: 'resized', type: 'image' },
    ],
    widgets: [
      {
        name: 'width',
        type: 'number',
        defaultValue: 512,
        options: {
          min: 64,
          max: 4096,
          step: 64,
        },
      },
      {
        name: 'height',
        type: 'number',
        defaultValue: 512,
        options: {
          min: 64,
          max: 4096,
          step: 64,
        },
      },
      {
        name: 'mode',
        type: 'combo',
        defaultValue: 'contain',
        options: {
          values: ['contain', 'cover', 'fill', 'none'],
        },
      },
    ],
    properties: {
      width: 512,
      height: 512,
      mode: 'contain',
    },
    resizable: true,
  },
  async (node: ExecutableNode) => {
    const imageBase64 = getInputValue<string>(node, 'image')
    const width = getWidgetValue<number>(node, 'width') ?? 512
    const height = getWidgetValue<number>(node, 'height') ?? 512
    const mode = getWidgetValue<string>(node, 'mode') ?? 'contain'

    if (!imageBase64) {
      throw new Error('No input image provided')
    }

    // Resize image using canvas
    const resizedBase64 = await resizeImage(imageBase64, width, height, mode)

    // Set output
    node.setOutputData(0, resizedBase64)

    return { resized: resizedBase64 }
  }
)

/**
 * Resizes an image using canvas.
 */
async function resizeImage(
  base64: string,
  targetWidth: number,
  targetHeight: number,
  mode: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()

    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }

      canvas.width = targetWidth
      canvas.height = targetHeight

      // Calculate draw dimensions based on mode
      let dx = 0, dy = 0, dw = targetWidth, dh = targetHeight

      if (mode === 'contain') {
        const scale = Math.min(targetWidth / img.width, targetHeight / img.height)
        dw = img.width * scale
        dh = img.height * scale
        dx = (targetWidth - dw) / 2
        dy = (targetHeight - dh) / 2
      } else if (mode === 'cover') {
        const scale = Math.max(targetWidth / img.width, targetHeight / img.height)
        dw = img.width * scale
        dh = img.height * scale
        dx = (targetWidth - dw) / 2
        dy = (targetHeight - dh) / 2
      }
      // 'fill' uses default values, 'none' would need different handling

      ctx.drawImage(img, dx, dy, dw, dh)

      // Convert to base64
      const dataUrl = canvas.toDataURL('image/png')
      const base64Result = dataUrl.split(',')[1] ?? ''
      resolve(base64Result)
    }

    img.onerror = () => reject(new Error('Failed to load image'))

    // Load image from base64
    img.src = `data:image/png;base64,${base64}`
  })
}
