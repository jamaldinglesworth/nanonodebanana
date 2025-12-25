import { useEffect, useRef } from 'react'
import { useExecution } from '../hooks/useExecution'
import { useImageHistory } from '../hooks/useImageHistory'
import { useGraph } from '../hooks/useGraph'

/**
 * Maps node types to human-readable model names.
 */
const NODE_TYPE_TO_MODEL: Record<string, string> = {
  'generation/gemini': 'Gemini',
  'generation/fal-flux': 'FLUX',
  'generation/fal-video': 'Fal Video',
  'generation/nano-banana': 'NanoBanana',
  'generation/nano-banana-edit': 'NanoBanana Edit',
  'generation/nano-banana-pro': 'NanoBanana Pro',
  'generation/nano-banana-pro-edit': 'NanoBanana Pro Edit',
}

/**
 * Component that captures generated images and adds them to history.
 * Listens to execution results and extracts images with metadata.
 */
export function ImageHistoryCapture() {
  const { executionResults, isExecuting } = useExecution()
  const { addImage } = useImageHistory()
  const { graph } = useGraph()
  const processedIds = useRef<Set<string>>(new Set())

  // Monitor execution results and capture new images
  useEffect(() => {
    if (isExecuting) {
      // Reset processed IDs when a new execution starts
      processedIds.current.clear()
      return
    }

    // Process results after execution completes
    executionResults.forEach((result, nodeIdStr) => {
      const nodeId = Number(nodeIdStr)
      const resultKey = `${nodeId}-${JSON.stringify(result).slice(0, 100)}`

      // Skip if already processed
      if (processedIds.current.has(resultKey)) {
        return
      }

      // Check if result contains an image
      if (
        typeof result === 'object' &&
        result !== null &&
        'image' in result &&
        typeof (result as { image: unknown }).image === 'string'
      ) {
        const image = (result as { image: string }).image

        // Skip empty or placeholder images
        if (!image || image.length < 100) {
          return
        }

        // Get node metadata
        const node = graph?._nodes.find((n) => n.id === nodeId)
        const nodeType = node?.type || 'unknown'
        const model = NODE_TYPE_TO_MODEL[nodeType] || nodeType

        // Extract prompt from node inputs or properties
        let prompt: string | undefined
        if (node) {
          // Try to get prompt from input connections
          const promptInput = node.inputs?.find(
            (input) => input.name === 'prompt' || input.name === 'text'
          )
          if (promptInput && promptInput.link != null && graph) {
            const link = graph.links[promptInput.link]
            if (link) {
              const sourceNode = graph._nodes.find((n) => n.id === link.origin_id)
              if (sourceNode?.properties?.text) {
                prompt = String(sourceNode.properties.text).slice(0, 200)
              }
            }
          }

          // Fall back to node's own prompt property
          if (!prompt && node.properties?.prompt) {
            prompt = String(node.properties.prompt).slice(0, 200)
          }
        }

        // Convert to data URI if needed
        let imageUrl = image
        if (!image.startsWith('http') && !image.startsWith('data:') && !image.startsWith('blob:')) {
          // Detect image format from base64 prefix
          if (image.startsWith('/9j/')) {
            imageUrl = `data:image/jpeg;base64,${image}`
          } else if (image.startsWith('iVBORw')) {
            imageUrl = `data:image/png;base64,${image}`
          } else if (image.startsWith('R0lGOD')) {
            imageUrl = `data:image/gif;base64,${image}`
          } else if (image.startsWith('UklGR')) {
            imageUrl = `data:image/webp;base64,${image}`
          } else {
            imageUrl = `data:image/png;base64,${image}`
          }
        }

        // Add to history
        addImage({
          imageUrl,
          prompt,
          model,
          nodeType,
        })

        processedIds.current.add(resultKey)
      }
    })
  }, [executionResults, isExecuting, addImage, graph])

  // This component doesn't render anything
  return null
}
