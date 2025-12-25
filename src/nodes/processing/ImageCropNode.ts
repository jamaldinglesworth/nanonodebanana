import { createNodeClass, getInputValue, getWidgetValue, type ExecutableNode } from '../base/BaseNode'
import { NODE_TYPE_COLOURS } from '../../types/nodes'

/**
 * ImageCropNode - Crops images to specified dimensions.
 * Supports position-based cropping with x/y offset.
 */
export const ImageCropNode = createNodeClass(
  {
    title: 'Image Crop',
    category: 'processing',
    colour: NODE_TYPE_COLOURS.imageCrop,
    description: 'Crop images',
    inputs: [
      { name: 'image', type: 'image' },
    ],
    outputs: [
      { name: 'cropped', type: 'image' },
    ],
    widgets: [
      {
        name: 'x',
        type: 'number',
        defaultValue: 0,
        options: {
          min: 0,
          max: 4096,
          step: 1,
        },
      },
      {
        name: 'y',
        type: 'number',
        defaultValue: 0,
        options: {
          min: 0,
          max: 4096,
          step: 1,
        },
      },
      {
        name: 'width',
        type: 'number',
        defaultValue: 512,
        options: {
          min: 1,
          max: 4096,
          step: 1,
        },
      },
      {
        name: 'height',
        type: 'number',
        defaultValue: 512,
        options: {
          min: 1,
          max: 4096,
          step: 1,
        },
      },
    ],
    properties: {
      x: 0,
      y: 0,
      width: 512,
      height: 512,
    },
    resizable: true,
  },
  async (node: ExecutableNode) => {
    const imageBase64 = getInputValue<string>(node, 'image')
    const x = getWidgetValue<number>(node, 'x') ?? 0
    const y = getWidgetValue<number>(node, 'y') ?? 0
    const width = getWidgetValue<number>(node, 'width') ?? 512
    const height = getWidgetValue<number>(node, 'height') ?? 512

    if (!imageBase64) {
      throw new Error('No input image provided')
    }

    const croppedBase64 = await cropImage(imageBase64, x, y, width, height)
    node.setOutputData(0, croppedBase64)

    return { cropped: croppedBase64 }
  }
)

/**
 * Crops an image using canvas.
 */
async function cropImage(
  base64: string,
  x: number,
  y: number,
  width: number,
  height: number
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

      // Clamp crop region to image bounds
      const cropX = Math.max(0, Math.min(x, img.width - 1))
      const cropY = Math.max(0, Math.min(y, img.height - 1))
      const cropWidth = Math.min(width, img.width - cropX)
      const cropHeight = Math.min(height, img.height - cropY)

      canvas.width = cropWidth
      canvas.height = cropHeight

      ctx.drawImage(
        img,
        cropX, cropY, cropWidth, cropHeight,
        0, 0, cropWidth, cropHeight
      )

      const dataUrl = canvas.toDataURL('image/png')
      const base64Result = dataUrl.split(',')[1] ?? ''
      resolve(base64Result)
    }

    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = `data:image/png;base64,${base64}`
  })
}
