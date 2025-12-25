import { createNodeClass, getInputValue, getWidgetValue, type ExecutableNode } from '../base/BaseNode'
import { NODE_TYPE_COLOURS } from '../../types/nodes'

/**
 * SplitGridNode - Splits an image into a grid and extracts a specific cell.
 *
 * Input: image - The image to split
 * Output: cell - The extracted cell image
 *
 * Configure the grid size (rows x columns) and select which cell to extract.
 * Cells are indexed left-to-right, top-to-bottom starting from 0.
 *
 * Example for a 2x2 grid:
 *   [0] [1]
 *   [2] [3]
 */
export const SplitGridNode = createNodeClass(
  {
    title: 'Split Grid',
    category: 'processing',
    colour: NODE_TYPE_COLOURS.imageCrop,
    description: 'Split image into grid and extract a cell',
    inputs: [{ name: 'image', type: 'image' }],
    outputs: [{ name: 'cell', type: 'image' }],
    widgets: [
      {
        name: 'rows',
        type: 'combo',
        defaultValue: '2',
        options: {
          values: ['1', '2', '3', '4'],
        },
      },
      {
        name: 'columns',
        type: 'combo',
        defaultValue: '2',
        options: {
          values: ['1', '2', '3', '4'],
        },
      },
      {
        name: 'cellIndex',
        type: 'number',
        defaultValue: 0,
        options: {
          min: 0,
          max: 15, // Max 4x4 = 16 cells, 0-indexed
          step: 1,
        },
      },
    ],
    properties: {
      rows: '2',
      columns: '2',
      cellIndex: 0,
      url: '',
    },
    showImagePreview: true,
    imageProperty: 'url',
    resizable: true,
  },
  async (node: ExecutableNode) => {
    const imageBase64 = getInputValue<string>(node, 'image')
    const rows = parseInt(getWidgetValue<string>(node, 'rows') ?? '2', 10)
    const columns = parseInt(getWidgetValue<string>(node, 'columns') ?? '2', 10)
    const cellIndex = getWidgetValue<number>(node, 'cellIndex') ?? 0

    if (!imageBase64) {
      throw new Error('No input image provided')
    }

    // Validate cell index
    const totalCells = rows * columns
    if (cellIndex < 0 || cellIndex >= totalCells) {
      throw new Error(`Cell index ${cellIndex} is out of range for ${rows}x${columns} grid (0-${totalCells - 1})`)
    }

    // Calculate cell position
    const cellRow = Math.floor(cellIndex / columns)
    const cellCol = cellIndex % columns

    // Extract the cell
    const cellBase64 = await extractGridCell(imageBase64, rows, columns, cellRow, cellCol)

    // Update preview
    node.setProperty('url', cellBase64)

    // Set output
    node.setOutputData(0, cellBase64)

    return { cell: cellBase64 }
  }
)

/**
 * Extracts a specific cell from a grid overlay on the image.
 */
async function extractGridCell(
  base64: string,
  rows: number,
  columns: number,
  cellRow: number,
  cellCol: number
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

      // Calculate cell dimensions
      const cellWidth = Math.floor(img.width / columns)
      const cellHeight = Math.floor(img.height / rows)

      // Calculate source position
      const srcX = cellCol * cellWidth
      const srcY = cellRow * cellHeight

      // Handle edge cells that might be slightly larger due to rounding
      const actualWidth = cellCol === columns - 1 ? img.width - srcX : cellWidth
      const actualHeight = cellRow === rows - 1 ? img.height - srcY : cellHeight

      canvas.width = actualWidth
      canvas.height = actualHeight

      ctx.drawImage(
        img,
        srcX, srcY, actualWidth, actualHeight,
        0, 0, actualWidth, actualHeight
      )

      const dataUrl = canvas.toDataURL('image/png')
      const base64Result = dataUrl.split(',')[1] ?? ''
      resolve(base64Result)
    }

    img.onerror = () => reject(new Error('Failed to load image'))

    // Support both raw base64 and data URI formats
    if (base64.startsWith('data:')) {
      img.src = base64
    } else {
      img.src = `data:image/png;base64,${base64}`
    }
  })
}
