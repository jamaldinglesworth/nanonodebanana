import { createNodeClass, getInputValue, getWidgetValue, type ExecutableNode } from '../base/BaseNode'
import { NODE_TYPE_COLOURS } from '../../types/nodes'

/**
 * ImageFilterNode - Applies various image filters.
 * Supports blur, sharpen, grayscale, sepia, and invert.
 */
export const ImageFilterNode = createNodeClass(
  {
    title: 'Image Filter',
    category: 'processing',
    colour: NODE_TYPE_COLOURS.imageFilter,
    description: 'Apply filters',
    inputs: [
      { name: 'image', type: 'image' },
    ],
    outputs: [
      { name: 'filtered', type: 'image' },
    ],
    widgets: [
      {
        name: 'filter',
        type: 'combo',
        defaultValue: 'none',
        options: {
          values: ['none', 'blur', 'sharpen', 'grayscale', 'sepia', 'invert', 'edge_detect'],
        },
      },
      {
        name: 'intensity',
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
      filter: 'none',
      intensity: 50,
    },
    resizable: true,
  },
  async (node: ExecutableNode) => {
    const imageBase64 = getInputValue<string>(node, 'image')
    const filter = getWidgetValue<string>(node, 'filter') ?? 'none'
    const intensity = getWidgetValue<number>(node, 'intensity') ?? 50

    if (!imageBase64) {
      throw new Error('No input image provided')
    }

    const filteredBase64 = await applyFilter(imageBase64, filter, intensity)
    node.setOutputData(0, filteredBase64)

    return { filtered: filteredBase64 }
  }
)

/**
 * Applies image filter using canvas.
 */
async function applyFilter(
  base64: string,
  filter: string,
  intensity: number
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

      // Apply filter based on type
      switch (filter) {
        case 'blur':
          ctx.filter = `blur(${(intensity / 10)}px)`
          ctx.drawImage(img, 0, 0)
          break

        case 'grayscale':
          ctx.filter = `grayscale(${intensity}%)`
          ctx.drawImage(img, 0, 0)
          break

        case 'sepia':
          ctx.filter = `sepia(${intensity}%)`
          ctx.drawImage(img, 0, 0)
          break

        case 'invert':
          ctx.filter = `invert(${intensity}%)`
          ctx.drawImage(img, 0, 0)
          break

        case 'sharpen':
          ctx.drawImage(img, 0, 0)
          applySharpen(ctx, canvas.width, canvas.height, intensity / 100)
          break

        case 'edge_detect':
          ctx.drawImage(img, 0, 0)
          applyEdgeDetect(ctx, canvas.width, canvas.height, intensity / 100)
          break

        default:
          ctx.drawImage(img, 0, 0)
      }

      const dataUrl = canvas.toDataURL('image/png')
      const base64Result = dataUrl.split(',')[1] ?? ''
      resolve(base64Result)
    }

    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = `data:image/png;base64,${base64}`
  })
}

/**
 * Applies sharpen filter using convolution.
 */
function applySharpen(ctx: CanvasRenderingContext2D, width: number, height: number, amount: number): void {
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data
  const copy = new Uint8ClampedArray(data)

  // Sharpen kernel
  const kernel = [
    0, -amount, 0,
    -amount, 1 + 4 * amount, -amount,
    0, -amount, 0
  ]

  applyConvolution(data, copy, width, height, kernel)
  ctx.putImageData(imageData, 0, 0)
}

/**
 * Applies edge detection using Sobel operator.
 */
function applyEdgeDetect(ctx: CanvasRenderingContext2D, width: number, height: number, amount: number): void {
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data
  const copy = new Uint8ClampedArray(data)

  // Convert to grayscale first
  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i]! + data[i + 1]! + data[i + 2]!) / 3
    data[i] = data[i + 1] = data[i + 2] = avg
  }

  // Sobel edge detection kernel (horizontal)
  const kernel = [
    -1, -2, -1,
    0, 0, 0,
    1, 2, 1
  ]

  applyConvolution(data, copy, width, height, kernel.map(v => v * amount))
  ctx.putImageData(imageData, 0, 0)
}

/**
 * Applies a convolution kernel to image data.
 */
function applyConvolution(
  data: Uint8ClampedArray,
  copy: Uint8ClampedArray,
  width: number,
  height: number,
  kernel: number[]
): void {
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4 + c
            sum += copy[idx]! * kernel[(ky + 1) * 3 + (kx + 1)]!
          }
        }
        const idx = (y * width + x) * 4 + c
        data[idx] = Math.max(0, Math.min(255, sum))
      }
    }
  }
}
