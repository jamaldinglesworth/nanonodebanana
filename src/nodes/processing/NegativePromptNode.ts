import type { LGraphNode, IWidget } from 'litegraph.js'
import { NODE_TYPE_COLOURS } from '../../types/nodes'

/**
 * Common negative prompt tokens.
 */
const COMMON_NEGATIVES: Record<string, string> = {
  'Blurry': 'blurry, out of focus',
  'Low Quality': 'low quality, low resolution, jpeg artifacts',
  'Watermark': 'watermark, signature, text',
  'Deformed': 'deformed, distorted, disfigured',
  'Bad Anatomy': 'bad anatomy, extra limbs, missing limbs',
  'NSFW': 'nsfw, nude, explicit',
}

// Extend LGraphNode type for our custom properties
interface NegativePromptNodeType extends LGraphNode {
  resizable?: boolean
  _buttonRects: Array<{ x: number; y: number; width: number; height: number; label: string }>
}

/**
 * NegativePromptNode - Negative prompt input node.
 * Provides quick-add buttons for common negative prompt tokens.
 */
export function NegativePromptNode(this: NegativePromptNodeType) {
  // Add output
  this.addOutput('negative', 'string')

  // Add textarea widget
  this.addWidget('text', 'text', '', () => {}, { multiline: true })

  // Initialize properties
  this.properties = {
    text: '',
  }

  // Set node appearance
  this.title = 'Negative Prompt'
  this.size = [280, 200]
  this.resizable = true
  this.color = NODE_TYPE_COLOURS.negativePrompt
  this.bgcolor = adjustBrightness(NODE_TYPE_COLOURS.negativePrompt, -40)

  // Store button rectangles for click detection
  this._buttonRects = []

  // eslint-disable-next-line @typescript-eslint/no-this-alias
  const nodeRef = this
  const buttonLabels = Object.keys(COMMON_NEGATIVES)

  // Custom foreground drawing - draws quick-add buttons
  this.onDrawForeground = function (ctx: CanvasRenderingContext2D) {
    // Calculate button area (below the widget)
    const widgetHeight = 60 // Approximate height of textarea widget
    const titleHeight = 26
    const slotHeight = 20
    const buttonStartY = titleHeight + slotHeight + widgetHeight + 10

    const padding = 10
    const buttonHeight = 22
    const buttonSpacing = 6
    const buttonsPerRow = 3

    // Clear stored button rects
    nodeRef._buttonRects = []

    // Calculate button width
    const availableWidth = nodeRef.size[0] - padding * 2
    const buttonWidth = (availableWidth - buttonSpacing * (buttonsPerRow - 1)) / buttonsPerRow

    // Draw buttons
    for (let i = 0; i < buttonLabels.length; i++) {
      const row = Math.floor(i / buttonsPerRow)
      const col = i % buttonsPerRow

      const x = padding + col * (buttonWidth + buttonSpacing)
      const y = buttonStartY + row * (buttonHeight + buttonSpacing)

      // Store button rect for click detection
      nodeRef._buttonRects.push({
        x, y, width: buttonWidth, height: buttonHeight,
        label: buttonLabels[i] ?? '',
      })

      // Draw button background
      ctx.fillStyle = '#444'
      ctx.beginPath()
      ctx.roundRect(x, y, buttonWidth, buttonHeight, 4)
      ctx.fill()

      // Draw button border
      ctx.strokeStyle = '#666'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.roundRect(x, y, buttonWidth, buttonHeight, 4)
      ctx.stroke()

      // Draw button text
      ctx.fillStyle = '#ccc'
      ctx.font = '10px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(buttonLabels[i] ?? '', x + buttonWidth / 2, y + buttonHeight / 2)
    }

    ctx.textAlign = 'left' // Reset alignment

    // Ensure node height accommodates buttons
    const numRows = Math.ceil(buttonLabels.length / buttonsPerRow)
    const requiredHeight = buttonStartY + numRows * (buttonHeight + buttonSpacing) + padding
    if (nodeRef.size[1] < requiredHeight) {
      nodeRef.size[1] = requiredHeight
    }
  }

  // Handle mouse click on buttons
  this.onMouseDown = function (_e: MouseEvent, pos: [number, number]) {
    // Check if click is on any button
    for (const rect of nodeRef._buttonRects) {
      if (
        pos[0] >= rect.x &&
        pos[0] <= rect.x + rect.width &&
        pos[1] >= rect.y &&
        pos[1] <= rect.y + rect.height
      ) {
        // Found clicked button - append negative text
        const negativeText = COMMON_NEGATIVES[rect.label]
        if (negativeText) {
          const textWidget = nodeRef.widgets?.find((w: IWidget) => w.name === 'text')
          if (textWidget) {
            const currentText = (textWidget.value as string) || ''
            const newText = currentText
              ? `${currentText}, ${negativeText}`
              : negativeText
            textWidget.value = newText
            nodeRef.properties.text = newText
            nodeRef.setDirtyCanvas(true, true)
          }
        }
        return true // Event handled
      }
    }
    return false
  }

  // Execute function
  this.onExecute = function () {
    const textWidget = nodeRef.widgets?.find((w: IWidget) => w.name === 'text')
    const text = (textWidget?.value as string) || ''
    nodeRef.setOutputData(0, text)
  }
}

/**
 * Adjusts the brightness of a hex colour.
 */
function adjustBrightness(hex: string, amount: number): string {
  hex = hex.replace('#', '')
  const r = Math.max(0, Math.min(255, parseInt(hex.substring(0, 2), 16) + amount))
  const g = Math.max(0, Math.min(255, parseInt(hex.substring(2, 4), 16) + amount))
  const b = Math.max(0, Math.min(255, parseInt(hex.substring(4, 6), 16) + amount))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

// Static properties for LiteGraph registration
NegativePromptNode.title = 'Negative Prompt'
NegativePromptNode.desc = 'Negative prompt with quick-add buttons'

// Export for use in UI
export { COMMON_NEGATIVES }
