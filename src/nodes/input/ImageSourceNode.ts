import type { LGraphNode, IWidget } from 'litegraph.js'
import { NODE_TYPE_COLOURS } from '../../types/nodes'

// Extend LGraphNode type for our custom properties
interface ImageSourceNodeType extends LGraphNode {
  resizable?: boolean
  _dropZoneRect?: { x: number; y: number; width: number; height: number }
  _isDragOver?: boolean
  _imageLoaded?: HTMLImageElement | null
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

  // Store reference for callbacks
  // eslint-disable-next-line @typescript-eslint/no-this-alias
  const nodeRef = this

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
  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      console.warn('Not an image file:', file.type)
      return
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

  // Custom foreground drawing - draws image preview and drop zone
  this.onDrawForeground = function (ctx: CanvasRenderingContext2D) {
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

      ctx.fillText('Drop image here', nodeRef.size[0] / 2, dropZoneY + dropZoneHeight / 2 - 10)
      ctx.fillText('or paste from clipboard', nodeRef.size[0] / 2, dropZoneY + dropZoneHeight / 2 + 10)

      ctx.textAlign = 'left'
    }

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

  // Remove paste listener when node is removed
  this.onRemoved = function () {
    document.removeEventListener('paste', handlePaste)
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
ImageSourceNode.desc = 'Image upload with drag-and-drop and clipboard paste'
// Additional metadata for dynamic UI generation
;(ImageSourceNode as unknown as Record<string, unknown>).nodeCategory = 'input'
;(ImageSourceNode as unknown as Record<string, unknown>).nodeColour = NODE_TYPE_COLOURS.imageSource
;(ImageSourceNode as unknown as Record<string, unknown>).nodeDescription = 'Image upload or URL'
