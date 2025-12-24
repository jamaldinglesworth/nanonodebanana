import type { LGraphNode, LGraphCanvas, SerializedLGraphNode } from 'litegraph.js'

// Extend LGraphNode type for our custom properties
interface PromptNodeType extends LGraphNode {
  _text: string
  _textarea?: HTMLTextAreaElement
  _editing: boolean
  resizable?: boolean
}

/**
 * PromptNode - Text prompt input node with inline editable textarea.
 * Click the textarea to edit directly - ComfyUI style.
 */
export function PromptNode(this: PromptNodeType) {
  // Add output
  this.addOutput('prompt', 'string')

  // Initialize text storage
  this._text = ''
  this._editing = false

  // Initialize properties
  this.properties = {
    text: '',
  }

  // Set node appearance
  this.title = 'Prompt'
  this.size = [280, 180]
  this.resizable = true

  // Store reference for callbacks
  // eslint-disable-next-line @typescript-eslint/no-this-alias
  const nodeRef = this

  // Get textarea bounds
  const getTextareaBounds = () => {
    const padding = 10
    const titleHeight = 26
    const slotHeight = 20
    const bottomPadding = 10

    return {
      x: padding,
      y: titleHeight + slotHeight,
      width: nodeRef.size[0] - padding * 2,
      height: nodeRef.size[1] - (titleHeight + slotHeight) - bottomPadding,
    }
  }

  // Custom foreground drawing - draws the textarea that fills the node
  this.onDrawForeground = function (ctx: CanvasRenderingContext2D) {
    const bounds = getTextareaBounds()

    if (bounds.height < 20) return

    // Draw textarea background
    ctx.fillStyle = '#222'
    ctx.beginPath()
    ctx.roundRect(bounds.x, bounds.y, bounds.width, bounds.height, 4)
    ctx.fill()

    // Draw border (highlight when editing)
    ctx.strokeStyle = nodeRef._editing ? '#666' : '#444'
    ctx.lineWidth = nodeRef._editing ? 2 : 1
    ctx.beginPath()
    ctx.roundRect(bounds.x, bounds.y, bounds.width, bounds.height, 4)
    ctx.stroke()

    // Don't draw text if editing (the DOM textarea is visible)
    if (nodeRef._editing) return

    // Draw text content
    const text = nodeRef._text || ''
    ctx.fillStyle = text ? '#ddd' : '#666'
    ctx.font = '13px Arial'
    ctx.textBaseline = 'top'

    if (text) {
      // Word wrap and draw text
      const maxWidth = bounds.width - 16
      const lineHeight = 18
      const lines = wrapText(ctx, text, maxWidth)
      const maxLines = Math.floor((bounds.height - 16) / lineHeight)

      for (let i = 0; i < Math.min(lines.length, maxLines); i++) {
        const line = lines[i]
        if (line !== undefined) {
          ctx.fillText(line, bounds.x + 8, bounds.y + 8 + i * lineHeight)
        }
      }

      // Show ellipsis if text is truncated
      if (lines.length > maxLines) {
        ctx.fillStyle = '#666'
        ctx.fillText('...', bounds.x + 8, bounds.y + 8 + (maxLines - 1) * lineHeight)
      }
    } else {
      ctx.fillText('Click to edit...', bounds.x + 8, bounds.y + 8)
    }

    // Draw character count in bottom-right corner
    const charCount = text.length
    const countText = `${charCount} chars`
    ctx.font = '10px Arial'
    ctx.textBaseline = 'bottom'
    ctx.textAlign = 'right'

    // Color coding: gray < 500, yellow 500-1500, red > 1500
    if (charCount > 1500) {
      ctx.fillStyle = '#f87171' // Red
    } else if (charCount > 500) {
      ctx.fillStyle = '#fbbf24' // Yellow/Amber
    } else {
      ctx.fillStyle = '#666' // Gray
    }

    ctx.fillText(countText, bounds.x + bounds.width - 8, bounds.y + bounds.height - 4)
    ctx.textAlign = 'left' // Reset alignment
  }

  // Check if position is in textarea area
  const isInTextarea = (localPos: [number, number]): boolean => {
    const bounds = getTextareaBounds()
    return (
      localPos[0] >= bounds.x &&
      localPos[0] <= bounds.x + bounds.width &&
      localPos[1] >= bounds.y &&
      localPos[1] <= bounds.y + bounds.height
    )
  }

  // Create and show inline textarea
  const showInlineTextarea = (canvas: LGraphCanvas) => {
    if (nodeRef._editing) return

    nodeRef._editing = true

    // Get node position on screen
    const canvasEl = canvas.canvas
    const rect = canvasEl.getBoundingClientRect()
    const bounds = getTextareaBounds()

    // Calculate screen position of the textarea
    const nodePos = nodeRef.pos
    const scale = canvas.ds.scale
    const offset = canvas.ds.offset

    const screenX = rect.left + (nodePos[0] + bounds.x) * scale + offset[0] * scale
    const screenY = rect.top + (nodePos[1] + bounds.y) * scale + offset[1] * scale
    const screenWidth = bounds.width * scale
    const screenHeight = bounds.height * scale

    // Create textarea element
    const textarea = document.createElement('textarea')
    textarea.value = nodeRef._text || ''
    textarea.style.cssText = `
      position: fixed;
      left: ${screenX}px;
      top: ${screenY}px;
      width: ${screenWidth}px;
      height: ${screenHeight}px;
      background-color: #222;
      color: #ddd;
      border: 2px solid #666;
      border-radius: 4px;
      padding: 6px 8px;
      font-family: Arial, sans-serif;
      font-size: ${13 * scale}px;
      line-height: 1.4;
      resize: none;
      outline: none;
      z-index: 10000;
      box-sizing: border-box;
    `

    // Handle blur (click outside)
    const handleBlur = () => {
      finishEditing()
    }

    // Handle escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Cancel editing, restore original value
        textarea.value = nodeRef._text || ''
        finishEditing()
      } else if (e.key === 'Enter' && e.ctrlKey) {
        // Ctrl+Enter to confirm
        finishEditing()
      }
    }

    // Finish editing and save
    const finishEditing = () => {
      nodeRef._text = textarea.value
      nodeRef.properties.text = textarea.value
      nodeRef.setOutputData(0, textarea.value)
      nodeRef._editing = false

      textarea.removeEventListener('blur', handleBlur)
      textarea.removeEventListener('keydown', handleKeyDown)
      textarea.remove()
      nodeRef._textarea = undefined

      nodeRef.setDirtyCanvas(true, true)
    }

    textarea.addEventListener('blur', handleBlur)
    textarea.addEventListener('keydown', handleKeyDown)

    document.body.appendChild(textarea)
    nodeRef._textarea = textarea

    // Focus and select all text
    textarea.focus()
    textarea.select()

    nodeRef.setDirtyCanvas(true, true)
  }

  // Hide textarea when node is deselected or moved
  const hideTextarea = () => {
    if (nodeRef._textarea) {
      nodeRef._text = nodeRef._textarea.value
      nodeRef.properties.text = nodeRef._textarea.value
      nodeRef.setOutputData(0, nodeRef._textarea.value)
      nodeRef._textarea.remove()
      nodeRef._textarea = undefined
      nodeRef._editing = false
      nodeRef.setDirtyCanvas(true, true)
    }
  }

  // Handle mouse click to start editing
  this.onMouseDown = function (_e: MouseEvent, pos: [number, number], canvas: LGraphCanvas) {
    if (isInTextarea(pos) && !nodeRef._editing) {
      // Delay to avoid conflicts with node selection
      setTimeout(() => showInlineTextarea(canvas), 50)
      return true
    }
    return false
  }

  // Handle node being deselected
  this.onDeselected = function () {
    hideTextarea()
  }

  // Handle node being removed
  this.onRemoved = function () {
    hideTextarea()
  }

  // Execute function
  this.onExecute = function () {
    nodeRef.setOutputData(0, nodeRef._text || '')
  }

  // Serialize text with the node
  this.onSerialize = function (data: SerializedLGraphNode & { text?: string }) {
    data.text = nodeRef._text
  }

  // Restore text when loading
  this.onConfigure = function (data: SerializedLGraphNode & { text?: string }) {
    if (data.text !== undefined) {
      nodeRef._text = data.text
      nodeRef.properties.text = nodeRef._text
    }
  }
}

/**
 * Word wrap helper function
 */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = []
  const paragraphs = text.split('\n')

  for (const paragraph of paragraphs) {
    if (!paragraph) {
      lines.push('')
      continue
    }

    const words = paragraph.split(' ')
    let currentLine = ''

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const metrics = ctx.measureText(testLine)

      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine)
        currentLine = word
      } else {
        currentLine = testLine
      }
    }

    if (currentLine) {
      lines.push(currentLine)
    }
  }

  return lines
}

// Static properties for LiteGraph registration
PromptNode.title = 'Prompt'
PromptNode.desc = 'Text prompt input with inline editable textarea'
// Additional metadata for dynamic UI generation
;(PromptNode as unknown as Record<string, unknown>).nodeCategory = 'input'
;(PromptNode as unknown as Record<string, unknown>).nodeColour = '#333'
;(PromptNode as unknown as Record<string, unknown>).nodeDescription = 'Text prompt input'
