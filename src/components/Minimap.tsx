import { useEffect, useRef, useCallback } from 'react'
import type { LGraph, LGraphCanvas } from 'litegraph.js'

interface MinimapProps {
  graph: LGraph | null
  canvas: LGraphCanvas | null
  width?: number
  height?: number
}

/**
 * Minimap component that shows a bird's-eye view of the graph.
 * Allows click-to-navigate and displays the current viewport.
 */
export function Minimap({ graph, canvas, width = 192, height = 128 }: MinimapProps) {
  const minimapRef = useRef<HTMLCanvasElement>(null)
  const isDragging = useRef(false)

  // Calculate the bounding box of all nodes
  const getGraphBounds = useCallback(() => {
    if (!graph || !graph._nodes || graph._nodes.length === 0) {
      return { minX: 0, minY: 0, maxX: 1000, maxY: 800 }
    }

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    for (const node of graph._nodes) {
      const nodeWidth = node.size?.[0] ?? 200
      const nodeHeight = node.size?.[1] ?? 100

      minX = Math.min(minX, node.pos[0])
      minY = Math.min(minY, node.pos[1])
      maxX = Math.max(maxX, node.pos[0] + nodeWidth)
      maxY = Math.max(maxY, node.pos[1] + nodeHeight)
    }

    // Add padding
    const padding = 100
    return {
      minX: minX - padding,
      minY: minY - padding,
      maxX: maxX + padding,
      maxY: maxY + padding,
    }
  }, [graph])

  // Draw the minimap
  const drawMinimap = useCallback(() => {
    const ctx = minimapRef.current?.getContext('2d')
    if (!ctx || !graph || !canvas) return

    const bounds = getGraphBounds()
    const graphWidth = bounds.maxX - bounds.minX
    const graphHeight = bounds.maxY - bounds.minY

    // Calculate scale to fit graph in minimap
    const scaleX = width / graphWidth
    const scaleY = height / graphHeight
    const scale = Math.min(scaleX, scaleY) * 0.9

    // Center offset
    const offsetX = (width - graphWidth * scale) / 2
    const offsetY = (height - graphHeight * scale) / 2

    // Clear canvas
    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(0, 0, width, height)

    // Draw grid
    ctx.strokeStyle = '#2a2a2a'
    ctx.lineWidth = 0.5
    const gridSize = 50 * scale
    for (let x = offsetX % gridSize; x < width; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    for (let y = offsetY % gridSize; y < height; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }

    // Draw connections
    ctx.strokeStyle = '#4a5568'
    ctx.lineWidth = 1
    for (const node of graph._nodes) {
      if (!node.outputs) continue

      for (let i = 0; i < node.outputs.length; i++) {
        const output = node.outputs[i]
        if (!output?.links) continue

        for (const linkId of output.links) {
          const link = graph.links[linkId]
          if (!link) continue

          const targetNode = graph.getNodeById(link.target_id)
          if (!targetNode) continue

          const startX = offsetX + (node.pos[0] + (node.size?.[0] ?? 200) - bounds.minX) * scale
          const startY = offsetY + (node.pos[1] + 15 + i * 20 - bounds.minY) * scale
          const endX = offsetX + (targetNode.pos[0] - bounds.minX) * scale
          const endY = offsetY + (targetNode.pos[1] + 15 + (link.target_slot ?? 0) * 20 - bounds.minY) * scale

          ctx.beginPath()
          ctx.moveTo(startX, startY)
          ctx.bezierCurveTo(
            startX + 20 * scale,
            startY,
            endX - 20 * scale,
            endY,
            endX,
            endY
          )
          ctx.stroke()
        }
      }
    }

    // Draw nodes
    for (const node of graph._nodes) {
      const nodeX = offsetX + (node.pos[0] - bounds.minX) * scale
      const nodeY = offsetY + (node.pos[1] - bounds.minY) * scale
      const nodeW = (node.size?.[0] ?? 200) * scale
      const nodeH = (node.size?.[1] ?? 100) * scale

      // Node background
      ctx.fillStyle = node.bgcolor ?? '#353535'
      ctx.fillRect(nodeX, nodeY, nodeW, nodeH)

      // Node border
      ctx.strokeStyle = node.color ?? '#666'
      ctx.lineWidth = 1
      ctx.strokeRect(nodeX, nodeY, nodeW, nodeH)

      // Node title bar
      ctx.fillStyle = node.color ?? '#666'
      ctx.fillRect(nodeX, nodeY, nodeW, Math.min(4, nodeH))
    }

    // Draw viewport rectangle
    const viewportX = offsetX + (-canvas.ds.offset[0] / canvas.ds.scale - bounds.minX) * scale
    const viewportY = offsetY + (-canvas.ds.offset[1] / canvas.ds.scale - bounds.minY) * scale
    const viewportW = (canvas.canvas.width / canvas.ds.scale) * scale
    const viewportH = (canvas.canvas.height / canvas.ds.scale) * scale

    ctx.strokeStyle = '#60a5fa'
    ctx.lineWidth = 2
    ctx.strokeRect(viewportX, viewportY, viewportW, viewportH)

    // Semi-transparent fill for viewport
    ctx.fillStyle = 'rgba(96, 165, 250, 0.1)'
    ctx.fillRect(viewportX, viewportY, viewportW, viewportH)

    // Store scale info for click handling
    ;(minimapRef.current as HTMLCanvasElement & { _minimapData?: unknown })._minimapData = {
      bounds,
      scale,
      offsetX,
      offsetY,
    }
  }, [graph, canvas, width, height, getGraphBounds])

  // Handle click to navigate
  const handleMinimapClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!canvas || !minimapRef.current) return

      const rect = minimapRef.current.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top

      const data = (minimapRef.current as HTMLCanvasElement & { _minimapData?: {
        bounds: { minX: number; minY: number }
        scale: number
        offsetX: number
        offsetY: number
      } })._minimapData

      if (!data) return

      // Convert minimap coordinates to graph coordinates
      const graphX = (x - data.offsetX) / data.scale + data.bounds.minX
      const graphY = (y - data.offsetY) / data.scale + data.bounds.minY

      // Center viewport on clicked position
      canvas.ds.offset[0] = -graphX * canvas.ds.scale + canvas.canvas.width / 2
      canvas.ds.offset[1] = -graphY * canvas.ds.scale + canvas.canvas.height / 2
      canvas.setDirty(true, true)
    },
    [canvas]
  )

  // Handle drag to pan
  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    isDragging.current = true
    handleMinimapClick(event)
  }, [handleMinimapClick])

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (isDragging.current) {
        handleMinimapClick(event)
      }
    },
    [handleMinimapClick]
  )

  const handleMouseUp = useCallback(() => {
    isDragging.current = false
  }, [])

  // Draw minimap on animation frame
  useEffect(() => {
    let animationFrame: number

    const animate = () => {
      drawMinimap()
      animationFrame = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame)
      }
    }
  }, [drawMinimap])

  return (
    <canvas
      ref={minimapRef}
      width={width}
      height={height}
      className="rounded-lg cursor-crosshair"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      title="Click or drag to navigate"
    />
  )
}
