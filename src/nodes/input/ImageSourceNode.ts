import type { LGraphNode, IWidget } from 'litegraph.js'
import { NODE_TYPE_COLOURS } from '../../types/nodes'
import { extractWorkflowFromPngFile, type WorkflowMetadata } from '../../lib/png-metadata'

// Extend LGraphNode type for our custom properties
interface ImageSourceNodeType extends LGraphNode {
  resizable?: boolean
  onResize?: (size: [number, number]) => void
  _dropZoneRect?: { x: number; y: number; width: number; height: number }
  _browseButtonRect?: { x: number; y: number; width: number; height: number }
  _isDragOver?: boolean
  _imageLoaded?: HTMLImageElement | null
  _fileInput?: HTMLInputElement
}

/**
 * ImageSourceNode - Image upload/URL input node.
 * Allows users to upload images or provide image URLs.
 * Supports drag-and-drop and clipboard paste.
 */
export function ImageSourceNode(this: ImageSourceNodeType) {
  // Add output
  this.addOutput('image', 'image')

  // Add widgets
  this.addWidget('text', 'url', '', () => {}, { placeholder: 'Image URL or drop file' })

  // Initialize properties
  this.properties = {
    url: '',
    base64: '',
    fileName: '',
  }

  // Set node appearance
  this.title = 'Image Source'
  this.size = [280, 250]
  this.resizable = true
  this.color = NODE_TYPE_COLOURS.imageSource
  this.bgcolor = adjustBrightness(NODE_TYPE_COLOURS.imageSource, -40)

  // Handle resize - skip constraints when collapsed to allow LiteGraph collapse
  this.onResize = function (size: [number, number]) {
    // Don't enforce constraints when node is collapsed
    if (this.flags?.collapsed) return

    // Enforce minimum size for usability
    const minWidth = 200
    const minHeight = 150
    if (size[0] < minWidth) size[0] = minWidth
    if (size[1] < minHeight) size[1] = minHeight
  }

  // Store reference for callbacks
  // eslint-disable-next-line @typescript-eslint/no-this-alias
  const nodeRef = this

  // Create hidden file input for browse functionality
  const fileInput = document.createElement('input')
  fileInput.type = 'file'
  fileInput.accept = 'image/*'
  fileInput.style.display = 'none'
  document.body.appendChild(fileInput)
  nodeRef._fileInput = fileInput

  // Image cache
  let cachedImage: HTMLImageElement | null = null
  let cachedUrl = ''

  // Helper to load image from URL or base64
  const loadImagePreview = (src: string) => {
    if (!src || src === cachedUrl) return

    cachedUrl = src
    const img = new Image()
    img.crossOrigin = 'anonymous'

    // Handle both URLs and base64
    if (src.startsWith('http') || src.startsWith('data:') || src.startsWith('blob:')) {
      img.src = src
    } else {
      // Assume base64 - detect format
      if (src.startsWith('/9j/')) {
        img.src = `data:image/jpeg;base64,${src}`
      } else if (src.startsWith('iVBORw')) {
        img.src = `data:image/png;base64,${src}`
      } else if (src.startsWith('R0lGOD')) {
        img.src = `data:image/gif;base64,${src}`
      } else if (src.startsWith('UklGR')) {
        img.src = `data:image/webp;base64,${src}`
      } else {
        img.src = `data:image/png;base64,${src}`
      }
    }

    img.onload = () => {
      cachedImage = img
      nodeRef.setDirtyCanvas(true, true)
    }
  }

  // Process dropped or pasted file
  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      console.warn('Not an image file:', file.type)
      return
    }

    // Check for workflow metadata in PNG files
    if (file.type === 'image/png') {
      const metadata = await extractWorkflowFromPngFile(file)
      if (metadata) {
        handleWorkflowMetadata(metadata, file.name)
      }
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      if (dataUrl) {
        // Extract base64 from data URL
        const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl

        // Update widget and properties
        const urlWidget = nodeRef.widgets?.find((w: IWidget) => w.name === 'url')
        if (urlWidget) {
          urlWidget.value = file.name
        }

        nodeRef.properties.url = file.name
        nodeRef.properties.base64 = base64
        nodeRef.properties.fileName = file.name

        // Load preview
        loadImagePreview(dataUrl)
        nodeRef.setDirtyCanvas(true, true)
      }
    }
    reader.readAsDataURL(file)
  }

  // Handle file input change (browse button)
  fileInput.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement
    const file = target.files?.[0]
    if (file) {
      processFile(file)
    }
    // Reset input so same file can be selected again
    target.value = ''
  })

  // Handle detected workflow metadata
  const handleWorkflowMetadata = (metadata: WorkflowMetadata, fileName: string) => {
    // Dispatch custom event for App to handle
    const event = new CustomEvent('workflow-detected', {
      detail: {
        metadata,
        fileName,
        graph: nodeRef.graph,
      },
    })
    window.dispatchEvent(event)
  }

  // Custom foreground drawing - draws image preview and drop zone
  this.onDrawForeground = function (ctx: CanvasRenderingContext2D) {
    // Don't draw content when node is collapsed
    if (this.flags?.collapsed) return

    const titleHeight = 26
    const slotHeight = 20
    const widgetHeight = 30
    const padding = 10
    const dropZoneY = titleHeight + slotHeight + widgetHeight + 10
    const dropZoneHeight = Math.max(100, nodeRef.size[1] - dropZoneY - padding)
    const dropZoneWidth = nodeRef.size[0] - padding * 2

    // Store drop zone rect for reference
    nodeRef._dropZoneRect = {
      x: padding,
      y: dropZoneY,
      width: dropZoneWidth,
      height: dropZoneHeight,
    }

    // Draw drop zone background
    ctx.fillStyle = nodeRef._isDragOver ? '#2a4a6a' : '#222'
    ctx.beginPath()
    ctx.roundRect(padding, dropZoneY, dropZoneWidth, dropZoneHeight, 4)
    ctx.fill()

    // Draw border (highlight when dragging)
    ctx.strokeStyle = nodeRef._isDragOver ? '#4a9eff' : '#444'
    ctx.lineWidth = nodeRef._isDragOver ? 2 : 1
    ctx.setLineDash(nodeRef._isDragOver ? [] : [5, 5])
    ctx.beginPath()
    ctx.roundRect(padding, dropZoneY, dropZoneWidth, dropZoneHeight, 4)
    ctx.stroke()
    ctx.setLineDash([])

    // Check if we have an image to display
    const base64 = nodeRef.properties?.base64 as string
    const url = nodeRef.properties?.url as string

    if (base64 || (url && url.startsWith('http'))) {
      // Load image if needed
      const imageSrc = base64
        ? (base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`)
        : url
      if (imageSrc !== cachedUrl) {
        loadImagePreview(imageSrc)
      }

      if (cachedImage && cachedImage.complete) {
        // Calculate aspect-ratio-preserving dimensions
        const aspectRatio = cachedImage.width / cachedImage.height
        let drawWidth = dropZoneWidth - 10
        let drawHeight = drawWidth / aspectRatio

        if (drawHeight > dropZoneHeight - 10) {
          drawHeight = dropZoneHeight - 10
          drawWidth = drawHeight * aspectRatio
        }

        const drawX = padding + (dropZoneWidth - drawWidth) / 2
        const drawY = dropZoneY + (dropZoneHeight - drawHeight) / 2

        // Draw image with rounded corners
        ctx.save()
        ctx.beginPath()
        ctx.roundRect(drawX, drawY, drawWidth, drawHeight, 4)
        ctx.clip()
        ctx.drawImage(cachedImage, drawX, drawY, drawWidth, drawHeight)
        ctx.restore()

        // Draw border around image
        ctx.strokeStyle = '#444'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.roundRect(drawX, drawY, drawWidth, drawHeight, 4)
        ctx.stroke()

        // Draw file name if available
        const fileName = nodeRef.properties?.fileName as string
        if (fileName) {
          ctx.fillStyle = '#888'
          ctx.font = '10px Arial'
          ctx.textAlign = 'center'
          ctx.fillText(fileName, nodeRef.size[0] / 2, dropZoneY + dropZoneHeight - 5)
          ctx.textAlign = 'left'
        }
      } else {
        // Loading indicator
        ctx.fillStyle = '#888'
        ctx.font = '12px Arial'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('Loading...', nodeRef.size[0] / 2, dropZoneY + dropZoneHeight / 2)
        ctx.textAlign = 'left'
      }
    } else {
      // Draw placeholder text
      ctx.fillStyle = '#666'
      ctx.font = '12px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      ctx.fillText('Drop image, paste,', nodeRef.size[0] / 2, dropZoneY + dropZoneHeight / 2 - 25)
      ctx.fillText('or use Browse button', nodeRef.size[0] / 2, dropZoneY + dropZoneHeight / 2 - 5)

      ctx.textAlign = 'left'
    }

    // Draw Browse button at the bottom of drop zone
    const buttonWidth = 80
    const buttonHeight = 26
    const buttonX = (nodeRef.size[0] - buttonWidth) / 2
    const buttonY = dropZoneY + dropZoneHeight - buttonHeight - 10

    // Store button rect for click detection
    nodeRef._browseButtonRect = {
      x: buttonX,
      y: buttonY,
      width: buttonWidth,
      height: buttonHeight,
    }

    // Draw button background
    ctx.fillStyle = '#3b82f6'
    ctx.beginPath()
    ctx.roundRect(buttonX, buttonY, buttonWidth, buttonHeight, 4)
    ctx.fill()

    // Draw button border
    ctx.strokeStyle = '#60a5fa'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(buttonX, buttonY, buttonWidth, buttonHeight, 4)
    ctx.stroke()

    // Draw button text
    ctx.fillStyle = '#fff'
    ctx.font = '12px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('Browse', nodeRef.size[0] / 2, buttonY + buttonHeight / 2)
    ctx.textAlign = 'left'

    // Ensure minimum height
    const requiredHeight = dropZoneY + dropZoneHeight + padding
    if (nodeRef.size[1] < requiredHeight) {
      nodeRef.size[1] = requiredHeight
    }
  }

  // Handle file drop (LiteGraph callback)
  this.onDropFile = function (file: File) {
    processFile(file)
    nodeRef._isDragOver = false
    nodeRef.setDirtyCanvas(true, true)
    return true
  }

  // Handle mouse click on browse button
  this.onMouseDown = function (_e: MouseEvent, pos: [number, number]) {
    // Check if click is on the browse button
    const buttonRect = nodeRef._browseButtonRect
    if (buttonRect) {
      const isInButton =
        pos[0] >= buttonRect.x &&
        pos[0] <= buttonRect.x + buttonRect.width &&
        pos[1] >= buttonRect.y &&
        pos[1] <= buttonRect.y + buttonRect.height

      if (isInButton) {
        // Trigger file input click
        nodeRef._fileInput?.click()
        return true // Consume the event
      }
    }
    return false
  }

  // Handle paste event when node is selected
  const handlePaste = (e: ClipboardEvent) => {
    // Only process if this node is selected
    const canvas = (nodeRef as unknown as { graph?: { list_of_graphcanvas?: Array<{ selected_nodes?: Record<number, unknown> }> } }).graph?.list_of_graphcanvas?.[0]
    if (!canvas || !canvas.selected_nodes || !canvas.selected_nodes[nodeRef.id]) {
      return
    }

    const items = e.clipboardData?.items
    if (!items) return

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) {
          processFile(file)
        }
        break
      }
    }
  }

  // Add paste listener when node is added to graph
  this.onAdded = function () {
    document.addEventListener('paste', handlePaste)
  }

  // Remove paste listener and file input when node is removed
  this.onRemoved = function () {
    document.removeEventListener('paste', handlePaste)
    // Clean up the hidden file input
    if (nodeRef._fileInput && nodeRef._fileInput.parentNode) {
      nodeRef._fileInput.parentNode.removeChild(nodeRef._fileInput)
    }
  }

  // Execute function - outputs the image
  this.onExecute = function () {
    const base64 = nodeRef.properties?.base64 as string
    const url = (nodeRef.widgets?.find((w: IWidget) => w.name === 'url')?.value as string) ?? ''

    // If URL changed and is a real URL, clear base64 to trigger fetch
    if (url && url.startsWith('http')) {
      nodeRef.setOutputData(0, url)
    } else if (base64) {
      nodeRef.setOutputData(0, base64)
    } else {
      nodeRef.setOutputData(0, '')
    }
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
ImageSourceNode.title = 'Image Source'
ImageSourceNode.desc = 'Image upload with browse, drag-and-drop and clipboard paste'
// Additional metadata for dynamic UI generation
;(ImageSourceNode as unknown as Record<string, unknown>).nodeCategory = 'input'
;(ImageSourceNode as unknown as Record<string, unknown>).nodeColour = NODE_TYPE_COLOURS.imageSource
;(ImageSourceNode as unknown as Record<string, unknown>).nodeDescription = 'Image upload or URL'
