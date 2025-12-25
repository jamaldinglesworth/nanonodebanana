import { createNodeClass, getInputValue, getWidgetValue, type ExecutableNode } from '../base/BaseNode'
import { NODE_TYPE_COLOURS } from '../../types/nodes'

/**
 * ImageBlendNode - Blends two images together.
 * Supports various blend modes and opacity control.
 */
export const ImageBlendNode = createNodeClass(
  {
    title: 'Image Blend',
    category: 'processing',
    colour: NODE_TYPE_COLOURS.imageBlend,
    description: 'Blend two images',
    inputs: [
      { name: 'image_a', type: 'image' },
      { name: 'image_b', type: 'image' },
    ],
    outputs: [
      { name: 'blended', type: 'image' },
    ],
    widgets: [
      {
        name: 'blend_mode',
        type: 'combo',
        defaultValue: 'normal',
        options: {
          values: ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'difference', 'exclusion'],
        },
      },
      {
        name: 'opacity',
        type: 'slider',
        defaultValue: 50,
        options: {
          min: 0,
          max: 100,
          step: 1,
        },
      },
    ],
    properties: {
      blend_mode: 'normal',
      opacity: 50,
    },
    resizable: true,
  },
  async (node: ExecutableNode) => {
    const imageA = getInputValue<string>(node, 'image_a')
    const imageB = getInputValue<string>(node, 'image_b')
    const blendMode = getWidgetValue<string>(node, 'blend_mode') ?? 'normal'
    const opacity = (getWidgetValue<number>(node, 'opacity') ?? 50) / 100

    if (!imageA) {
      throw new Error('No first image provided')
    }
    if (!imageB) {
      throw new Error('No second image provided')
    }

    const blendedBase64 = await blendImages(imageA, imageB, blendMode, opacity)
    node.setOutputData(0, blendedBase64)

    return { blended: blendedBase64 }
  }
)

/**
 * Blends two images using canvas composite operations.
 */
async function blendImages(
  base64A: string,
  base64B: string,
  blendMode: string,
  opacity: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const imgA = new Image()
    const imgB = new Image()
    let loadedCount = 0

    const onBothLoaded = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }

      // Use dimensions of first image
      canvas.width = imgA.width
      canvas.height = imgB.height

      // Draw first image
      ctx.drawImage(imgA, 0, 0)

      // Set blend mode and opacity
      ctx.globalCompositeOperation = blendMode as GlobalCompositeOperation
      ctx.globalAlpha = opacity

      // Draw second image on top
      ctx.drawImage(imgB, 0, 0, canvas.width, canvas.height)

      const dataUrl = canvas.toDataURL('image/png')
      const base64Result = dataUrl.split(',')[1] ?? ''
      resolve(base64Result)
    }

    imgA.onload = () => {
      loadedCount++
      if (loadedCount === 2) onBothLoaded()
    }
    imgB.onload = () => {
      loadedCount++
      if (loadedCount === 2) onBothLoaded()
    }

    imgA.onerror = () => reject(new Error('Failed to load first image'))
    imgB.onerror = () => reject(new Error('Failed to load second image'))

    imgA.src = `data:image/png;base64,${base64A}`
    imgB.src = `data:image/png;base64,${base64B}`
  })
}
