import type { LGraphNode } from 'litegraph.js'
import type { NodeCategory, ExecutionStatus } from '../../types/nodes'

/**
 * Configuration for creating a custom node.
 */
export interface NodeConfig {
  title: string
  category: NodeCategory
  colour: string
  inputs?: Array<{
    name: string
    type: string
    optional?: boolean
  }>
  outputs?: Array<{
    name: string
    type: string
  }>
  properties?: Record<string, unknown>
  widgets?: Array<{
    name: string
    type: 'text' | 'textarea' | 'number' | 'combo' | 'toggle' | 'button' | 'slider'
    defaultValue?: unknown
    options?: Record<string, unknown>
  }>
  /** Enable image preview display */
  showImagePreview?: boolean
  /** Property name containing the image URL */
  imageProperty?: string
  /** Minimum height for image preview area */
  previewHeight?: number
}

// Image cache to avoid reloading images on every render
const imageCache = new Map<string, HTMLImageElement>()
const loadingImages = new Set<string>()

/**
 * Load an image and cache it.
 * Supports URLs, data URLs, and raw base64 strings.
 */
function loadImage(url: string): HTMLImageElement | null {
  if (!url) return null

  // Convert raw base64 to data URL if needed
  let src = url
  if (!url.startsWith('http') && !url.startsWith('data:') && !url.startsWith('blob:')) {
    // Assume it's raw base64 data - detect format from magic bytes
    if (url.startsWith('/9j/')) {
      src = `data:image/jpeg;base64,${url}`
    } else if (url.startsWith('iVBORw')) {
      src = `data:image/png;base64,${url}`
    } else if (url.startsWith('R0lGOD')) {
      src = `data:image/gif;base64,${url}`
    } else if (url.startsWith('UklGR')) {
      src = `data:image/webp;base64,${url}`
    } else {
      // Default to PNG
      src = `data:image/png;base64,${url}`
    }
  }

  // Return cached image if available
  const cached = imageCache.get(src)
  if (cached && cached.complete) {
    return cached
  }

  // Skip if already loading
  if (loadingImages.has(src)) {
    return null
  }

  // Start loading the image
  loadingImages.add(src)
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => {
    imageCache.set(src, img)
    loadingImages.delete(src)
  }
  img.onerror = () => {
    loadingImages.delete(src)
  }
  img.src = src

  return null
}

/**
 * Extended node interface with execution capabilities.
 */
export interface ExecutableNode extends LGraphNode {
  executionStatus?: ExecutionStatus
  executionProgress?: number
  executionError?: Error
  executionResult?: unknown

  /**
   * Called when the node should execute its logic.
   * Override this in subclasses to implement node behaviour.
   */
  onExecute?(): Promise<Record<string, unknown>>
}

/**
 * Creates a custom node class for Litegraph.
 * This factory function generates node classes with consistent styling and behaviour.
 *
 * @param config - Node configuration
 * @param executeFunction - Function to execute when the node runs
 */
export function createNodeClass(
  config: NodeConfig,
  executeFunction?: (node: ExecutableNode) => Promise<Record<string, unknown>>
) {
  // Create the node constructor
  function CustomNode(this: ExecutableNode) {
    // Set up inputs
    if (config.inputs) {
      for (const input of config.inputs) {
        this.addInput(input.name, input.type)
      }
    }

    // Set up outputs
    if (config.outputs) {
      for (const output of config.outputs) {
        this.addOutput(output.name, output.type)
      }
    }

    // Set up properties
    if (config.properties) {
      for (const [key, value] of Object.entries(config.properties)) {
        this.addProperty(key, value)
      }
    }

    // Set up widgets
    if (config.widgets) {
      for (const widget of config.widgets) {
        switch (widget.type) {
          case 'text':
            this.addWidget('text', widget.name, widget.defaultValue ?? '', () => {}, widget.options)
            break
          case 'textarea':
            this.addWidget('text', widget.name, widget.defaultValue ?? '', () => {}, {
              ...widget.options,
              multiline: true,
            })
            break
          case 'number':
            this.addWidget('number', widget.name, widget.defaultValue ?? 0, () => {}, widget.options)
            break
          case 'combo':
            this.addWidget(
              'combo',
              widget.name,
              widget.defaultValue ?? '',
              () => {},
              { values: widget.options?.values ?? [] }
            )
            break
          case 'toggle':
            this.addWidget('toggle', widget.name, widget.defaultValue ?? false, () => {}, widget.options)
            break
          case 'slider':
            this.addWidget(
              'slider',
              widget.name,
              widget.defaultValue ?? 0,
              () => {},
              widget.options
            )
            break
          case 'button':
            this.addWidget('button', widget.name, null, () => {
              // Button callback will be set by specific nodes
            }, widget.options)
            break
        }
      }
    }

    // Set node properties
    this.title = config.title
    // Only set custom colors if not using ComfyUI default gray (#333)
    // ComfyUI uses neutral gray nodes with colorful connection slots
    if (config.colour && config.colour !== '#333') {
      this.color = config.colour
      this.bgcolor = adjustBrightness(config.colour, -40)
    }
    // Otherwise let LiteGraph defaults apply (set in WorkflowCanvas)

    // Execution state
    this.executionStatus = undefined
    this.executionProgress = undefined
    this.executionError = undefined
    this.executionResult = undefined

    // Add execute function if provided
    if (executeFunction) {
      this.onExecute = async () => {
        this.executionStatus = 'running'
        this.executionProgress = 0
        this.executionError = undefined

        try {
          const result = await executeFunction(this)
          this.executionStatus = 'completed'
          this.executionProgress = 100
          this.executionResult = result
          return result
        } catch (error) {
          this.executionStatus = 'error'
          this.executionError = error instanceof Error ? error : new Error(String(error))
          throw error
        }
      }
    }

    // Add image preview support
    if (config.showImagePreview) {
      const previewHeight = config.previewHeight ?? 150
      const imageProperty = config.imageProperty ?? 'url'
      const nodeRef = this

      // Store original size calculation
      const baseHeight = 26 + (config.inputs?.length ?? 0) * 20 + (config.widgets?.length ?? 0) * 30

      // Override onDrawForeground to render images
      this.onDrawForeground = function(ctx: CanvasRenderingContext2D) {
        const url = nodeRef.properties?.[imageProperty] as string
        if (!url) {
          // Draw placeholder
          const y = baseHeight + 10
          ctx.fillStyle = '#333'
          ctx.fillRect(10, y, nodeRef.size[0] - 20, previewHeight)
          ctx.fillStyle = '#666'
          ctx.font = '12px sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText('No image', nodeRef.size[0] / 2, y + previewHeight / 2 + 4)
          ctx.textAlign = 'left'

          // Ensure node height accommodates preview area
          const requiredHeight = baseHeight + previewHeight + 20
          if (nodeRef.size[1] < requiredHeight) {
            nodeRef.size[1] = requiredHeight
          }
          return
        }

        const img = loadImage(url)
        const y = baseHeight + 10

        if (img) {
          // Calculate aspect-ratio-preserving dimensions
          const availableWidth = nodeRef.size[0] - 20
          const aspectRatio = img.width / img.height
          let drawWidth = availableWidth
          let drawHeight = drawWidth / aspectRatio

          // Constrain to preview height
          if (drawHeight > previewHeight) {
            drawHeight = previewHeight
            drawWidth = drawHeight * aspectRatio
          }

          // Center horizontally
          const drawX = (nodeRef.size[0] - drawWidth) / 2

          // Draw image with rounded corners
          ctx.save()
          ctx.beginPath()
          const radius = 4
          ctx.moveTo(drawX + radius, y)
          ctx.lineTo(drawX + drawWidth - radius, y)
          ctx.quadraticCurveTo(drawX + drawWidth, y, drawX + drawWidth, y + radius)
          ctx.lineTo(drawX + drawWidth, y + drawHeight - radius)
          ctx.quadraticCurveTo(drawX + drawWidth, y + drawHeight, drawX + drawWidth - radius, y + drawHeight)
          ctx.lineTo(drawX + radius, y + drawHeight)
          ctx.quadraticCurveTo(drawX, y + drawHeight, drawX, y + drawHeight - radius)
          ctx.lineTo(drawX, y + radius)
          ctx.quadraticCurveTo(drawX, y, drawX + radius, y)
          ctx.closePath()
          ctx.clip()

          ctx.drawImage(img, drawX, y, drawWidth, drawHeight)
          ctx.restore()

          // Draw border
          ctx.strokeStyle = '#444'
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.roundRect(drawX, y, drawWidth, drawHeight, radius)
          ctx.stroke()

          // Update node height based on actual image
          const requiredHeight = y + drawHeight + 10
          if (nodeRef.size[1] < requiredHeight) {
            nodeRef.size[1] = requiredHeight
          }
        } else {
          // Draw loading indicator
          ctx.fillStyle = '#333'
          ctx.fillRect(10, y, nodeRef.size[0] - 20, previewHeight)
          ctx.fillStyle = '#888'
          ctx.font = '12px sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText('Loading...', nodeRef.size[0] / 2, y + previewHeight / 2 + 4)
          ctx.textAlign = 'left'

          // Ensure node height
          const requiredHeight = baseHeight + previewHeight + 20
          if (nodeRef.size[1] < requiredHeight) {
            nodeRef.size[1] = requiredHeight
          }
        }
      }
    }
  }

  // Set static properties
  CustomNode.title = config.title
  CustomNode.desc = `${config.category} node`

  return CustomNode
}

/**
 * Adjusts the brightness of a hex colour.
 */
function adjustBrightness(hex: string, amount: number): string {
  // Remove # if present
  hex = hex.replace('#', '')

  // Parse RGB values
  const r = Math.max(0, Math.min(255, parseInt(hex.substring(0, 2), 16) + amount))
  const g = Math.max(0, Math.min(255, parseInt(hex.substring(2, 4), 16) + amount))
  const b = Math.max(0, Math.min(255, parseInt(hex.substring(4, 6), 16) + amount))

  // Convert back to hex
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/**
 * Gets the input value from a node by slot name.
 */
export function getInputValue<T>(node: ExecutableNode, slotName: string): T | undefined {
  const slotIndex = node.findInputSlot(slotName)
  if (slotIndex === -1) return undefined

  return node.getInputData(slotIndex) as T | undefined
}

/**
 * Sets the output value on a node by slot name.
 */
export function setOutputValue(node: ExecutableNode, slotName: string, value: unknown): void {
  const slotIndex = node.findOutputSlot(slotName)
  if (slotIndex === -1) return

  node.setOutputData(slotIndex, value)
}

/**
 * Gets a widget value from a node by widget name.
 */
export function getWidgetValue<T>(node: ExecutableNode, widgetName: string): T | undefined {
  const widget = node.widgets?.find(w => w.name === widgetName)
  return widget?.value as T | undefined
}
