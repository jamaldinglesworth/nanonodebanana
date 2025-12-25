import { createNodeClass, getInputValue, type ExecutableNode } from '../base/BaseNode'

/**
 * AnnotationNode - Allows drawing annotations on images.
 *
 * Input: image - The image to annotate
 * Output: image - The annotated image
 *
 * Double-click the image preview to open the annotation modal.
 * Drawing tools: Rectangle, Circle, Arrow, Freehand, Text
 */
export const AnnotationNode = createNodeClass(
  {
    title: 'Annotate',
    category: 'processing',
    colour: '#333',
    description: 'Draw annotations on images (shapes, arrows, text)',
    inputs: [{ name: 'image', type: 'image' }],
    outputs: [{ name: 'image', type: 'image' }],
    properties: {
      url: '',
      annotatedUrl: '',
    },
    widgets: [
      {
        name: 'previewHeight',
        type: 'slider',
        defaultValue: 200,
        options: { min: 100, max: 600, step: 10 },
      },
    ],
    showImagePreview: true,
    imageProperty: 'url',
    dynamicPreviewHeight: 'previewHeight',
    resizable: true,
  },
  async (node: ExecutableNode) => {
    // Get input image
    const inputImage = getInputValue<string>(node, 'image')

    if (inputImage) {
      // Store input image URL for preview
      node.setProperty('url', inputImage)
    }

    // Return the annotated image if available, otherwise the input
    const annotatedUrl = node.properties?.annotatedUrl as string
    const outputImage = annotatedUrl || inputImage || ''

    return { image: outputImage }
  }
)

// Override the double-click handler to open annotation modal instead of image modal
const originalConstructor = AnnotationNode
const AnnotationNodeWithModal = function (this: ExecutableNode) {
  // Call original constructor
  originalConstructor.call(this)

  // Store reference
  // eslint-disable-next-line @typescript-eslint/no-this-alias
  const nodeRef = this

  // Override double-click to open annotation modal
  this.onDblClick = function (_e: MouseEvent, pos: [number, number]) {
    // Check if double-click is on the image preview area
    const baseHeight = 26 + 20 + 30 // title + input slot + widget
    const previewY = baseHeight + 10
    const previewHeight = (nodeRef.properties?.previewHeight as number) ?? 200

    // Check if click is within preview area bounds
    if (pos[1] >= previewY && pos[1] <= previewY + previewHeight) {
      const url = nodeRef.properties?.url as string
      if (url) {
        // Dispatch custom event to open annotation modal
        const event = new CustomEvent('open-annotation-modal', {
          detail: {
            nodeId: nodeRef.id,
            imageUrl: url,
            onSave: (annotatedUrl: string) => {
              // Store annotated image
              nodeRef.setProperty('annotatedUrl', annotatedUrl)
              // Update preview to show annotated image
              nodeRef.setProperty('url', annotatedUrl)
              nodeRef.setDirtyCanvas?.(true, true)
            },
          },
        })
        window.dispatchEvent(event)
        return true
      }
    }
    return false
  }

  // Add indicator that this node supports annotation
  const originalOnDrawForeground = this.onDrawForeground as ((ctx: CanvasRenderingContext2D) => void) | undefined
  this.onDrawForeground = function (ctx: CanvasRenderingContext2D) {
    // Call original (image preview)
    if (originalOnDrawForeground) {
      originalOnDrawForeground.call(this, ctx)
    }

    // Draw "Double-click to annotate" hint at bottom of preview
    const url = nodeRef.properties?.url as string
    if (url) {
      ctx.save()
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
      ctx.fillText('Double-click to annotate', nodeRef.size[0] / 2, nodeRef.size[1] - 8)
      ctx.restore()
    }
  }
}

// Copy static properties
AnnotationNodeWithModal.title = AnnotationNode.title
AnnotationNodeWithModal.desc = AnnotationNode.desc
;(AnnotationNodeWithModal as unknown as Record<string, unknown>).nodeCategory = (AnnotationNode as unknown as Record<string, unknown>).nodeCategory
;(AnnotationNodeWithModal as unknown as Record<string, unknown>).nodeColour = (AnnotationNode as unknown as Record<string, unknown>).nodeColour
;(AnnotationNodeWithModal as unknown as Record<string, unknown>).nodeDescription = (AnnotationNode as unknown as Record<string, unknown>).nodeDescription

export { AnnotationNodeWithModal as AnnotationNodeFinal }
