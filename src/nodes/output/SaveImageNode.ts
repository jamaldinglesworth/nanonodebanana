import { createNodeClass, getInputValue, getWidgetValue, type ExecutableNode } from '../base/BaseNode'
import { NODE_TYPE_COLOURS } from '../../types/nodes'
import { embedWorkflowInPngBlob, type WorkflowMetadata } from '../../lib/png-metadata'

/**
 * SaveImageNode - Saves generated images to disk.
 * Supports various formats and quality settings.
 */
export const SaveImageNode = createNodeClass(
  {
    title: 'Save Image',
    category: 'output',
    colour: NODE_TYPE_COLOURS.saveImage,
    description: 'Save to disk',
    inputs: [
      { name: 'image', type: 'image' },
    ],
    outputs: [],
    widgets: [
      {
        name: 'filename',
        type: 'text',
        defaultValue: 'output_{timestamp}',
        options: {
          placeholder: 'Filename template',
        },
      },
      {
        name: 'format',
        type: 'combo',
        defaultValue: 'PNG',
        options: {
          values: ['PNG', 'JPEG', 'WebP'],
        },
      },
      {
        name: 'quality',
        type: 'slider',
        defaultValue: 90,
        options: {
          min: 10,
          max: 100,
          step: 5,
        },
      },
      {
        name: 'auto_save',
        type: 'toggle',
        defaultValue: false,
      },
      {
        name: 'embed_workflow',
        type: 'toggle',
        defaultValue: true,
      },
    ],
    properties: {
      filename: 'output_{timestamp}',
      format: 'PNG',
      quality: 90,
      auto_save: false,
      embed_workflow: true,
      saveCount: 0,
    },
    resizable: true,
  },
  async (node: ExecutableNode) => {
    const image = getInputValue<string>(node, 'image')
    const filenameTemplate = getWidgetValue<string>(node, 'filename') ?? 'output_{timestamp}'
    const format = getWidgetValue<string>(node, 'format') ?? 'PNG'
    const quality = getWidgetValue<number>(node, 'quality') ?? 90
    const autoSave = getWidgetValue<boolean>(node, 'auto_save') ?? false
    const embedWorkflow = getWidgetValue<boolean>(node, 'embed_workflow') ?? true

    if (!image) {
      throw new Error('No image input')
    }

    // Generate filename
    const saveCount = (node.properties?.saveCount as number ?? 0) + 1
    const timestamp = Date.now()
    const filename = filenameTemplate
      .replace('{timestamp}', String(timestamp))
      .replace('{count}', String(saveCount).padStart(4, '0'))

    // Update save count
    node.setProperty('saveCount', saveCount)

    // Get mime type
    const mimeType = getMimeType(format)

    // Convert base64 to blob with correct format
    let blob = await base64ToBlob(image, mimeType, quality)

    // Embed workflow metadata in PNG files if enabled
    if (format === 'PNG' && embedWorkflow && node.graph) {
      const metadata: WorkflowMetadata = {
        workflow: node.graph.serialize(),
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        name: filenameTemplate,
      }
      blob = await embedWorkflowInPngBlob(blob, metadata)
    }

    // Download the image (autoSave will be used for automatic saving in future)
    void autoSave // Suppress unused variable warning
    downloadBlob(blob, `${filename}.${format.toLowerCase()}`)

    return { saved: true, filename, hasWorkflow: format === 'PNG' && embedWorkflow }
  }
)

/**
 * Gets MIME type for image format.
 */
function getMimeType(format: string): string {
  switch (format.toUpperCase()) {
    case 'JPEG':
      return 'image/jpeg'
    case 'WEBP':
      return 'image/webp'
    default:
      return 'image/png'
  }
}

/**
 * Converts base64 to Blob with optional re-encoding for format/quality.
 */
async function base64ToBlob(
  base64: string,
  mimeType: string,
  quality: number
): Promise<Blob> {
  // Load image
  const img = new Image()
  await new Promise((resolve, reject) => {
    img.onload = resolve
    img.onerror = reject
    img.src = `data:image/png;base64,${base64}`
  })

  // Create canvas and draw image
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)

  // Convert to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (blob) resolve(blob)
        else reject(new Error('Failed to create blob'))
      },
      mimeType,
      quality / 100
    )
  })
}

/**
 * Triggers a download for a Blob.
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
