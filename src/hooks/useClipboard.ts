import { useEffect, useCallback, useRef } from 'react'
import type { LGraph, LGraphCanvas, LiteGraph as LiteGraphType } from 'litegraph.js'
import { NODE_PATHS } from '../lib/constants'

interface ClipboardOptions {
  graph: LGraph | null
  canvas: LGraphCanvas | null
  liteGraph: typeof LiteGraphType | null
  onNodeCreated?: (nodeId: number) => void
}

/**
 * Hook for handling clipboard operations in the workflow editor.
 * Supports pasting images, text prompts, and workflow JSON.
 */
export function useClipboard({ graph, canvas, liteGraph, onNodeCreated }: ClipboardOptions) {
  const isHandling = useRef(false)

  // Store refs to latest props to avoid stale closures
  const propsRef = useRef({ graph, canvas, liteGraph, onNodeCreated })
  propsRef.current = { graph, canvas, liteGraph, onNodeCreated }

  /**
   * Handle pasting an image from clipboard.
   * Creates an ImageSource node and uploads the image.
   */
  const handleImagePaste = useCallback(async (item: ClipboardItem) => {
    const { graph, canvas, liteGraph, onNodeCreated } = propsRef.current
    if (!graph || !canvas || !liteGraph) return

    const imageType = item.types[0]
    if (!imageType) return

    const blob = await item.getType(imageType)
    const file = new File([blob], 'pasted-image.png', { type: blob.type })

    // Get center of viewport for node placement
    const centerX = (canvas.canvas.width / 2 - canvas.ds.offset[0]) / canvas.ds.scale
    const centerY = (canvas.canvas.height / 2 - canvas.ds.offset[1]) / canvas.ds.scale

    // Create ImageSource node
    const node = liteGraph.createNode(NODE_PATHS.IMAGE_SOURCE)
    if (!node) return

    node.pos = [centerX - 100, centerY - 75]
    graph.add(node)

    // Upload the image
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()

      if (data.url && node.properties) {
        node.properties.url = data.url
        node.properties.source = 'url'
      }
    } catch (error) {
      console.error('Failed to upload pasted image:', error)
    }

    canvas.setDirty(true, true)
    canvas.selectNode(node)
    onNodeCreated?.(node.id)
  }, [])

  /**
   * Handle pasting text from clipboard.
   * Could be a workflow JSON, URL, or prompt text.
   */
  const handleTextPaste = useCallback(async (text: string) => {
    const { graph, canvas, liteGraph, onNodeCreated } = propsRef.current
    if (!graph || !canvas || !liteGraph) return

    const trimmed = text.trim()

    // Try to parse as workflow JSON
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const data = JSON.parse(trimmed)

        // Check if it's a full workflow
        if (data.nodes && data.links) {
          graph.configure(data)
          canvas.setDirty(true, true)
          return
        }

        // Check if it's a single node
        if (data.type && data.pos) {
          const node = liteGraph.createNode(data.type)
          if (node) {
            node.configure(data)
            // Offset position slightly to show it's pasted
            node.pos[0] += 20
            node.pos[1] += 20
            graph.add(node)
            canvas.setDirty(true, true)
            canvas.selectNode(node)
            onNodeCreated?.(node.id)
          }
          return
        }
      } catch {
        // Not valid JSON, continue to text handling
      }
    }

    // Check if it's an image URL
    if (isImageUrl(trimmed)) {
      const centerX = (canvas.canvas.width / 2 - canvas.ds.offset[0]) / canvas.ds.scale
      const centerY = (canvas.canvas.height / 2 - canvas.ds.offset[1]) / canvas.ds.scale

      const node = liteGraph.createNode(NODE_PATHS.IMAGE_SOURCE)
      if (node) {
        node.pos = [centerX - 100, centerY - 75]
        node.properties = { ...node.properties, url: trimmed, source: 'url' }
        graph.add(node)
        canvas.setDirty(true, true)
        canvas.selectNode(node)
        onNodeCreated?.(node.id)
      }
      return
    }

    // Treat as prompt text
    const centerX = (canvas.canvas.width / 2 - canvas.ds.offset[0]) / canvas.ds.scale
    const centerY = (canvas.canvas.height / 2 - canvas.ds.offset[1]) / canvas.ds.scale

    const node = liteGraph.createNode(NODE_PATHS.PROMPT)
    if (node) {
      node.pos = [centerX - 150, centerY - 60]
      node.properties = { ...node.properties, text: trimmed }
      graph.add(node)
      canvas.setDirty(true, true)
      canvas.selectNode(node)
      onNodeCreated?.(node.id)
    }
  }, [])

  /**
   * Handle paste from clipboard.
   * Supports images, text, and workflow JSON.
   */
  const handlePaste = useCallback(async (e?: ClipboardEvent) => {
    const { graph, canvas, liteGraph } = propsRef.current
    if (!graph || !canvas || !liteGraph || isHandling.current) return

    isHandling.current = true

    try {
      // Get clipboard items
      const items = e?.clipboardData?.items || await getClipboardItems()
      if (!items) return

      // Check for images first
      for (const item of items) {
        // Handle both DataTransferItem (from paste event) and ClipboardItem (from Clipboard API)
        const itemType = 'type' in item ? (item as DataTransferItem).type : (item as ClipboardItem).types[0]
        if (itemType?.startsWith('image/')) {
          e?.preventDefault()
          await handleImagePaste(item as unknown as ClipboardItem)
          return
        }
      }

      // Check for text (could be JSON workflow or prompt)
      for (const item of items) {
        const itemType = 'type' in item ? (item as DataTransferItem).type : (item as ClipboardItem).types[0]
        if (itemType === 'text/plain') {
          const text = e?.clipboardData
            ? e.clipboardData.getData('text/plain')
            : await (item as ClipboardItem).getType('text/plain').then(blob => blob.text())

          if (text) {
            e?.preventDefault()
            await handleTextPaste(text)
            return
          }
        }
      }
    } catch (error) {
      console.error('Paste error:', error)
    } finally {
      isHandling.current = false
    }
  }, [handleImagePaste, handleTextPaste])

  /**
   * Get clipboard items using Clipboard API.
   */
  async function getClipboardItems(): Promise<ClipboardItems | null> {
    try {
      return await navigator.clipboard.read()
    } catch {
      return null
    }
  }

  /**
   * Check if a string is likely an image URL.
   */
  function isImageUrl(text: string): boolean {
    try {
      const url = new URL(text)
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg']
      return imageExtensions.some(ext => url.pathname.toLowerCase().endsWith(ext))
    } catch {
      return false
    }
  }

  /**
   * Copy selected nodes to clipboard.
   */
  const copySelected = useCallback(async () => {
    if (!canvas) return

    const selectedNodes = Object.values(canvas.selected_nodes)
    if (selectedNodes.length === 0) return

    if (selectedNodes.length === 1) {
      // Single node - copy as JSON
      const node = selectedNodes[0]
      if (!node) return
      const serialized = node.serialize()
      await navigator.clipboard.writeText(JSON.stringify(serialized, null, 2))
    } else {
      // Multiple nodes - copy as mini-workflow
      const nodes = selectedNodes.map(n => n.serialize())
      // TODO: Include relevant links between selected nodes
      await navigator.clipboard.writeText(JSON.stringify({ nodes }, null, 2))
    }
  }, [canvas])

  /**
   * Cut selected nodes (copy and delete).
   */
  const cutSelected = useCallback(async () => {
    await copySelected()
    canvas?.deleteSelectedNodes()
  }, [copySelected, canvas])

  // Listen for paste events
  useEffect(() => {
    const listener = (e: ClipboardEvent) => {
      // Only handle paste if not in an input field
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      handlePaste(e)
    }

    document.addEventListener('paste', listener)
    return () => document.removeEventListener('paste', listener)
  }, [handlePaste])

  return {
    paste: handlePaste,
    copy: copySelected,
    cut: cutSelected,
  }
}
