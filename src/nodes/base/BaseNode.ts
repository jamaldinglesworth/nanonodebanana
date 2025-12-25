import type { LGraphNode, LGraphCanvas } from 'litegraph.js'
import type { NodeCategory, ExecutionStatus } from '../../types/nodes'

/**
 * Node class with metadata exposed as static properties.
 * Used for dynamic UI generation in NodePanel.
 */
export interface NodeClassWithMetadata {
  title: string
  desc: string
  nodeCategory: NodeCategory
  nodeColour: string
  nodeDescription: string
}

/**
 * Configuration for creating a custom node.
 */
export interface NodeConfig {
  title: string
  category: NodeCategory
  colour: string
  /** Short description of what this node does (for UI tooltips) */
  description?: string
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
  /** Widget name to use for dynamic preview height (overrides previewHeight) */
  dynamicPreviewHeight?: string

  /** Enable node resizing (default: false, automatically true for image preview nodes) */
  resizable?: boolean

  /** Resize constraints for the node */
  resizeConstraints?: {
    minWidth?: number
    minHeight?: number
    maxWidth?: number
    maxHeight?: number
  }

  /** Show progress indicator bar below title (for generator nodes) */
  showProgressIndicator?: boolean
}

/**
 * LRU (Least Recently Used) cache for images.
 * Prevents memory leaks by evicting old entries when the cache is full.
 */
class LRUImageCache {
  private cache = new Map<string, HTMLImageElement>()
  private readonly maxSize: number

  constructor(maxSize = 50) {
    this.maxSize = maxSize
  }

  get(key: string): HTMLImageElement | undefined {
    const value = this.cache.get(key)
    if (value !== undefined) {
      // Move to end (most recently used) by re-inserting
      this.cache.delete(key)
      this.cache.set(key, value)
    }
    return value
  }

  set(key: string, value: HTMLImageElement): void {
    // Delete if exists to update position
    if (this.cache.has(key)) {
      this.cache.delete(key)
    }
    // Evict oldest entries if at capacity
    while (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) {
        this.cache.delete(oldestKey)
      }
    }
    this.cache.set(key, value)
  }

  has(key: string): boolean {
    return this.cache.has(key)
  }

  get size(): number {
    return this.cache.size
  }

  clear(): void {
    this.cache.clear()
  }
}

// Image cache with LRU eviction (max 50 images)
const imageCache = new LRUImageCache(50)
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
 * Node mode values (following LiteGraph/ComfyUI conventions).
 * - NORMAL (0): Execute normally
 * - MUTED (2): Skip execution, output null
 * - BYPASSED (4): Skip execution, pass input through to output
 */
export const NODE_MODE = {
  NORMAL: 0,
  MUTED: 2,
  BYPASSED: 4,
} as const

export type NodeMode = typeof NODE_MODE[keyof typeof NODE_MODE]

/**
 * Extended node interface with execution capabilities.
 * Note: mode property is inherited from LGraphNode (0 = normal, 2 = muted, 4 = bypassed)
 */
export interface ExecutableNode extends LGraphNode {
  executionStatus?: ExecutionStatus
  executionProgress?: number
  executionError?: Error
  executionResult?: unknown
  resizable?: boolean
  onResize?: (size: [number, number]) => void

  /** Timestamp when execution started (for elapsed time display) */
  executionStartTime?: number
  /** Timestamp when execution completed (for total time display) */
  executionEndTime?: number

  /** Internal flag to prevent circular updates between resize and widget sync */
  _isResizing?: boolean

  /** Minimum size calculated from content (slots + widgets) */
  _minSize?: [number, number]

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
            this.addWidget('text', widget.name, widget.defaultValue ?? '', () => { }, widget.options)
            break
          case 'textarea':
            this.addWidget('text', widget.name, widget.defaultValue ?? '', () => { }, {
              ...widget.options,
              multiline: true,
            })
            break
          case 'number':
            this.addWidget('number', widget.name, widget.defaultValue ?? 0, () => { }, widget.options)
            break
          case 'combo':
            this.addWidget(
              'combo',
              widget.name,
              widget.defaultValue ?? '',
              () => { },
              { values: widget.options?.values ?? [] }
            )
            break
          case 'toggle':
            this.addWidget('toggle', widget.name, widget.defaultValue ?? false, () => { }, widget.options)
            break
          case 'slider':
            this.addWidget(
              'slider',
              widget.name,
              widget.defaultValue ?? 0,
              () => { },
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

    // Add visual rendering for muted/bypassed states and execution glow
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const modeNodeRef = this
    const originalOnDrawBackground = this.onDrawBackground
    this.onDrawBackground = function(ctx: CanvasRenderingContext2D, graphCanvas: LGraphCanvas) {
      // Call original if exists
      if (originalOnDrawBackground) {
        originalOnDrawBackground.call(this, ctx, graphCanvas)
      }

      const mode = (modeNodeRef as unknown as { mode?: number }).mode ?? NODE_MODE.NORMAL

      // Draw pulsing glow effect during execution
      if (modeNodeRef.executionStatus === 'running') {
        const time = Date.now() / 1000
        const pulse = (Math.sin(time * 4) + 1) / 2 // 0 to 1, pulsing
        const glowIntensity = 0.3 + pulse * 0.4 // 0.3 to 0.7

        ctx.save()
        ctx.strokeStyle = `rgba(59, 130, 246, ${glowIntensity})` // Blue glow
        ctx.lineWidth = 2
        ctx.shadowColor = '#3b82f6'
        ctx.shadowBlur = 8 + pulse * 8 // 8 to 16px blur
        ctx.strokeRect(-1, -27, modeNodeRef.size[0] + 2, modeNodeRef.size[1] + 28)
        ctx.restore()

        // Request redraw for animation
        modeNodeRef.setDirtyCanvas?.(true, false)
      } else if (modeNodeRef.executionStatus === 'completed') {
        // Subtle green border for completed nodes
        ctx.save()
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.6)' // Green
        ctx.lineWidth = 2
        ctx.strokeRect(-1, -27, modeNodeRef.size[0] + 2, modeNodeRef.size[1] + 28)
        ctx.restore()
      } else if (modeNodeRef.executionStatus === 'error') {
        // Red border for error nodes
        ctx.save()
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)' // Red
        ctx.lineWidth = 2
        ctx.strokeRect(-1, -27, modeNodeRef.size[0] + 2, modeNodeRef.size[1] + 28)
        ctx.restore()
      }

      if (mode === NODE_MODE.MUTED) {
        // Draw semi-transparent overlay for muted nodes
        ctx.save()
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
        ctx.fillRect(0, -26, modeNodeRef.size[0], modeNodeRef.size[1] + 26)

        // Draw "MUTED" text
        ctx.fillStyle = '#ff6b6b'
        ctx.font = 'bold 10px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('MUTED', modeNodeRef.size[0] / 2, -10)
        ctx.restore()
      } else if (mode === NODE_MODE.BYPASSED) {
        // Draw diagonal stripes for bypassed nodes
        ctx.save()
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
        ctx.fillRect(0, -26, modeNodeRef.size[0], modeNodeRef.size[1] + 26)

        // Draw "BYPASS" text
        ctx.fillStyle = '#ffd93d'
        ctx.font = 'bold 10px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('BYPASS', modeNodeRef.size[0] / 2, -10)

        // Draw pass-through arrow
        ctx.strokeStyle = '#ffd93d'
        ctx.lineWidth = 2
        ctx.beginPath()
        const arrowY = modeNodeRef.size[1] / 2
        ctx.moveTo(5, arrowY)
        ctx.lineTo(modeNodeRef.size[0] - 15, arrowY)
        ctx.lineTo(modeNodeRef.size[0] - 25, arrowY - 8)
        ctx.moveTo(modeNodeRef.size[0] - 15, arrowY)
        ctx.lineTo(modeNodeRef.size[0] - 25, arrowY + 8)
        ctx.stroke()
        ctx.restore()
      }
    }

    // Calculate minimum size from content (title height + slots + widgets + padding)
    const NODE_TITLE_HEIGHT = 26
    const NODE_SLOT_HEIGHT = 20
    const NODE_WIDGET_HEIGHT = 30
    const inputCount = config.inputs?.length ?? 0
    const outputCount = config.outputs?.length ?? 0
    const widgetCount = config.widgets?.length ?? 0
    const slotCount = Math.max(inputCount, outputCount)

    const calculatedMinHeight = NODE_TITLE_HEIGHT + (slotCount * NODE_SLOT_HEIGHT) + (widgetCount * NODE_WIDGET_HEIGHT) + 20
    const calculatedMinWidth = 180 // Minimum width for readability

    // Apply configured constraints or use calculated values
    const minWidth = config.resizeConstraints?.minWidth ?? calculatedMinWidth
    const minHeight = config.resizeConstraints?.minHeight ?? calculatedMinHeight
    const maxWidth = config.resizeConstraints?.maxWidth ?? 1200
    const maxHeight = config.resizeConstraints?.maxHeight ?? 1200

    // Store minimum size on node for reference
    this._minSize = [minWidth, minHeight]
    this._isResizing = false

    // Enable resize if explicitly set or if using image preview
    if (config.resizable || config.showImagePreview) {
      this.resizable = true

      // Add resize handler with constraint enforcement (unless overridden by image preview)
      if (!config.showImagePreview) {
        this.onResize = function (size: [number, number]) {
          // Prevent circular updates
          if (this._isResizing) return
          this._isResizing = true

          // Enforce constraints
          if (size[0] < minWidth) size[0] = minWidth
          if (size[1] < minHeight) size[1] = minHeight
          if (size[0] > maxWidth) size[0] = maxWidth
          if (size[1] > maxHeight) size[1] = maxHeight

          this._isResizing = false
          this.setDirtyCanvas?.(true, true)
        }
      }
    }

    // Add execute function if provided
    if (executeFunction) {
      this.onExecute = async () => {
        this.executionStatus = 'running'
        this.executionProgress = 0
        this.executionError = undefined
        this.executionStartTime = Date.now()
        this.executionEndTime = undefined

        try {
          const result = await executeFunction(this)
          this.executionStatus = 'completed'
          this.executionProgress = 100
          this.executionEndTime = Date.now()
          this.executionResult = result
          return result
        } catch (error) {
          this.executionStatus = 'error'
          this.executionEndTime = Date.now()
          this.executionError = error instanceof Error ? error : new Error(String(error))
          throw error
        }
      }
    }

    // Add progress indicator for generator nodes (when not using image preview)
    if (config.showProgressIndicator && !config.showImagePreview) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const progressNodeRef = this

      this.onDrawForeground = function (ctx: CanvasRenderingContext2D) {
        // Don't draw progress indicator when node is collapsed
        if (this.flags?.collapsed) return

        const status = progressNodeRef.executionStatus
        if (!status || status === 'idle') return

        // Progress bar dimensions - thin bar just below title
        const barHeight = 3
        const barY = 24 // Just below the title bar
        const barWidth = progressNodeRef.size[0] - 4
        const barX = 2

        // Draw background track
        ctx.fillStyle = '#333'
        ctx.beginPath()
        ctx.roundRect(barX, barY, barWidth, barHeight, 1.5)
        ctx.fill()

        // Determine color and progress based on status
        let progressColor = '#3b82f6' // Blue for running

        if (status === 'running') {
          progressColor = '#3b82f6' // Blue
          // Animate progress for running state (indeterminate)
          const time = Date.now() / 1000
          const offset = (Math.sin(time * 3) + 1) / 2 // 0 to 1
          const progressWidth = barWidth * 0.3
          const progressX = barX + (barWidth - progressWidth) * offset
          ctx.fillStyle = progressColor
          ctx.beginPath()
          ctx.roundRect(progressX, barY, progressWidth, barHeight, 1.5)
          ctx.fill()

          // Show elapsed time during execution
          if (progressNodeRef.executionStartTime) {
            const elapsed = (Date.now() - progressNodeRef.executionStartTime) / 1000
            const timeText = elapsed >= 60
              ? `${Math.floor(elapsed / 60)}m ${(elapsed % 60).toFixed(0)}s`
              : `${elapsed.toFixed(1)}s`

            ctx.save()
            ctx.font = '9px sans-serif'
            ctx.textAlign = 'right'
            ctx.fillStyle = '#3b82f6'
            ctx.fillText(timeText, progressNodeRef.size[0] - 4, 20)
            ctx.restore()
          }

          // Request redraw for animation
          progressNodeRef.setDirtyCanvas?.(true, false)
        } else if (status === 'completed') {
          progressColor = '#22c55e' // Green
          ctx.fillStyle = progressColor
          ctx.beginPath()
          ctx.roundRect(barX, barY, barWidth, barHeight, 1.5)
          ctx.fill()

          // Show total execution time
          if (progressNodeRef.executionStartTime && progressNodeRef.executionEndTime) {
            const totalTime = (progressNodeRef.executionEndTime - progressNodeRef.executionStartTime) / 1000
            const timeText = totalTime >= 60
              ? `${Math.floor(totalTime / 60)}m ${(totalTime % 60).toFixed(1)}s`
              : `${totalTime.toFixed(2)}s`

            ctx.save()
            ctx.font = '9px sans-serif'
            ctx.textAlign = 'right'
            ctx.fillStyle = '#22c55e'
            ctx.fillText(timeText, progressNodeRef.size[0] - 4, 20)
            ctx.restore()
          }
        } else if (status === 'error') {
          progressColor = '#ef4444' // Red
          ctx.fillStyle = progressColor
          ctx.beginPath()
          ctx.roundRect(barX, barY, barWidth, barHeight, 1.5)
          ctx.fill()

          // Show error indicator with timing
          ctx.save()
          ctx.font = '9px sans-serif'
          ctx.textAlign = 'right'
          ctx.fillStyle = '#ef4444'

          // Show execution time if available
          if (progressNodeRef.executionStartTime && progressNodeRef.executionEndTime) {
            const totalTime = (progressNodeRef.executionEndTime - progressNodeRef.executionStartTime) / 1000
            ctx.fillText(`✕ ${totalTime.toFixed(2)}s`, progressNodeRef.size[0] - 4, 20)
          } else {
            ctx.fillText('✕ Error', progressNodeRef.size[0] - 4, 20)
          }
          ctx.restore()

          // Show truncated error message below the node
          if (progressNodeRef.executionError) {
            const errorMsg = progressNodeRef.executionError.message || 'Unknown error'
            const truncatedMsg = errorMsg.length > 40 ? errorMsg.slice(0, 37) + '...' : errorMsg
            const nodeBottom = progressNodeRef.size[1]

            ctx.save()
            ctx.font = '9px sans-serif'
            ctx.textAlign = 'center'
            ctx.fillStyle = 'rgba(239, 68, 68, 0.9)'
            ctx.fillText(truncatedMsg, progressNodeRef.size[0] / 2, nodeBottom + 12)
            ctx.restore()
          }
        }
      }
    }

    // Add image preview support
    if (config.showImagePreview) {
      const staticPreviewHeight = config.previewHeight ?? 150
      const dynamicHeightWidget = config.dynamicPreviewHeight
      const imageProperty = config.imageProperty ?? 'url'
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const nodeRef = this

      // Store original size calculation
      const baseHeight = 26 + (config.inputs?.length ?? 0) * 20 + (config.widgets?.length ?? 0) * 30

      // Override onDrawForeground to render images
      this.onDrawForeground = function (ctx: CanvasRenderingContext2D) {
        // Don't draw preview when node is collapsed
        if (this.flags?.collapsed) return

        // Get preview height from widget or use static value
        let previewHeight = staticPreviewHeight
        if (dynamicHeightWidget) {
          const widget = nodeRef.widgets?.find(w => w.name === dynamicHeightWidget)
          if (widget && typeof widget.value === 'number') {
            previewHeight = widget.value
          }
        }

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
            nodeRef.setDirtyCanvas?.(true, true)
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

          // Ensure node height is at least enough for content
          const requiredHeight = baseHeight + previewHeight + 20
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
            nodeRef.setDirtyCanvas?.(true, true)
          }
        }
      }

      // Add onResize handler to sync widgets when manual resizing happens
      this.onResize = function (size: [number, number]) {
        // Prevent circular updates
        if (this._isResizing) return
        this._isResizing = true

        // Enforce constraints
        const nodeMinWidth = config.resizeConstraints?.minWidth ?? 180
        const nodeMinHeight = config.resizeConstraints?.minHeight ?? baseHeight + 50
        const nodeMaxWidth = config.resizeConstraints?.maxWidth ?? 1200
        const nodeMaxHeight = config.resizeConstraints?.maxHeight ?? 1200

        if (size[0] < nodeMinWidth) size[0] = nodeMinWidth
        if (size[1] < nodeMinHeight) size[1] = nodeMinHeight
        if (size[0] > nodeMaxWidth) size[0] = nodeMaxWidth
        if (size[1] > nodeMaxHeight) size[1] = nodeMaxHeight

        if (dynamicHeightWidget) {
          const currentPreviewHeight = Math.max(10, Math.floor(size[1] - baseHeight - 20))
          const widget = this.widgets?.find(w => w.name === dynamicHeightWidget)
          if (widget && typeof widget.value === 'number' && Math.abs(widget.value - currentPreviewHeight) > 2) {
            widget.value = currentPreviewHeight
            if (this.properties && dynamicHeightWidget in this.properties) {
              this.setProperty(dynamicHeightWidget, currentPreviewHeight)
            }

            // Also trigger update on various node events (accessing internal LiteGraph property)
            const canvas = (this as unknown as { graph?: { list_of_graphcanvas?: Array<{ selected_nodes?: Record<number, unknown>; onNodeSelected?: (node: unknown) => void }> } }).graph?.list_of_graphcanvas?.[0]
            if (canvas && canvas.selected_nodes && canvas.selected_nodes[this.id]) {
              canvas.onNodeSelected?.(this)
            }
          }
        }

        this._isResizing = false
        this.setDirtyCanvas?.(true, true)
      }

      // Explicitly allow resizing for image preview nodes
      this.resizable = true

      // Sync widget with property if it changes externally (e.g. from property panel)
      const originalOnPropertyChanged = this.onPropertyChanged
      this.onPropertyChanged = function (name, value, prev_value) {
        if (originalOnPropertyChanged) {
          originalOnPropertyChanged.call(this, name, value, prev_value)
        }
        if (name === dynamicHeightWidget) {
          const widget = this.widgets?.find(w => w.name === dynamicHeightWidget)
          if (widget && widget.value !== value) {
            widget.value = value
          }
          this.setDirtyCanvas?.(true, true)
        }
      }

      // Add double-click handler to open fullscreen image modal
      this.onDblClick = function (_e: MouseEvent, pos: [number, number]) {
        // Check if double-click is on the image preview area
        const previewY = baseHeight + 10
        let previewHeight = staticPreviewHeight
        if (dynamicHeightWidget) {
          const widget = nodeRef.widgets?.find(w => w.name === dynamicHeightWidget)
          if (widget && typeof widget.value === 'number') {
            previewHeight = widget.value
          }
        }

        // Check if click is within preview area bounds
        if (pos[1] >= previewY && pos[1] <= previewY + previewHeight) {
          const url = nodeRef.properties?.[imageProperty] as string
          if (url) {
            // Dispatch custom event to open image modal
            const event = new CustomEvent('show-image-modal', {
              detail: {
                url,
                title: nodeRef.title,
                metadata: nodeRef.properties,
              },
            })
            window.dispatchEvent(event)
            return true
          }
        }
        return false
      }
    }
  }

  // Set static properties for node registration and UI discovery
  CustomNode.title = config.title
  CustomNode.desc = config.description ?? `${config.category} node`
  // Expose additional metadata for dynamic UI generation
  ;(CustomNode as unknown as Record<string, unknown>).nodeCategory = config.category
  ;(CustomNode as unknown as Record<string, unknown>).nodeColour = config.colour
  ;(CustomNode as unknown as Record<string, unknown>).nodeDescription = config.description ?? `${config.category} node`

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
