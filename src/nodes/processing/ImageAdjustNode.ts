import { createNodeClass, getInputValue, getWidgetValue, type ExecutableNode } from '../base/BaseNode'
import { NODE_TYPE_COLOURS } from '../../types/nodes'

/**
 * ImageAdjustNode - Adjusts brightness, contrast, and saturation.
 * Uses CSS filter-like adjustments via canvas.
 */
export const ImageAdjustNode = createNodeClass(
  {
    title: 'Image Adjust',
    category: 'processing',
    colour: NODE_TYPE_COLOURS.imageAdjust,
    description: 'Adjust colors',
    inputs: [
      { name: 'image', type: 'image' },
    ],
    outputs: [
      { name: 'adjusted', type: 'image' },
    ],
    widgets: [
      {
        name: 'brightness',
        type: 'slider',
        defaultValue: 100,
        options: {
          min: 0,
          max: 200,
          step: 1,
        },
      },
      {
        name: 'contrast',
        type: 'slider',
        defaultValue: 100,
        options: {
          min: 0,
          max: 200,
          step: 1,
        },
      },
      {
        name: 'saturation',
        type: 'slider',
        defaultValue: 100,
        options: {
          min: 0,
          max: 200,
          step: 1,
        },
      },
      {
        name: 'hue_rotate',
        type: 'slider',
        defaultValue: 0,
        options: {
          min: 0,
          max: 360,
          step: 1,
        },
      },
    ],
    properties: {
      brightness: 100,
      contrast: 100,
      saturation: 100,
      hue_rotate: 0,
    },
    resizable: true,
  },
  async (node: ExecutableNode) => {
    const imageBase64 = getInputValue<string>(node, 'image')
    const brightness = getWidgetValue<number>(node, 'brightness') ?? 100
    const contrast = getWidgetValue<number>(node, 'contrast') ?? 100
    const saturation = getWidgetValue<number>(node, 'saturation') ?? 100
    const hueRotate = getWidgetValue<number>(node, 'hue_rotate') ?? 0

    if (!imageBase64) {
      throw new Error('No input image provided')
    }

    const adjustedBase64 = await adjustImage(imageBase64, brightness, contrast, saturation, hueRotate)
    node.setOutputData(0, adjustedBase64)

    return { adjusted: adjustedBase64 }
  }
)

/**
 * Adjusts image using CSS filters via canvas.
 */
async function adjustImage(
  base64: string,
  brightness: number,
  contrast: number,
  saturation: number,
  hueRotate: number
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

      canvas.width = img.width
      canvas.height = img.height

      // Apply CSS filters
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) hue-rotate(${hueRotate}deg)`
      ctx.drawImage(img, 0, 0)

      const dataUrl = canvas.toDataURL('image/png')
      const base64Result = dataUrl.split(',')[1] ?? ''
      resolve(base64Result)
    }

    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = `data:image/png;base64,${base64}`
  })
}
