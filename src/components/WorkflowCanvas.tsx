import { useEffect, useRef, useCallback, useState } from 'react'
import type { LGraph, LGraphCanvas, LiteGraph as LiteGraphType } from 'litegraph.js'
import { useGraph } from '../hooks/useGraph'
import { registerAllNodes } from '../nodes'

interface WorkflowCanvasProps {
  onCanvasReady?: (canvas: LGraphCanvas) => void
}

/**
 * Main canvas component that wraps the Litegraph editor.
 * Handles graph initialisation, node drag-and-drop, and canvas interactions.
 */
export function WorkflowCanvas({ onCanvasReady }: WorkflowCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<LGraph | null>(null)
  const canvasInstanceRef = useRef<LGraphCanvas | null>(null)
  const liteGraphRef = useRef<typeof LiteGraphType | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  const { setGraph, setSelectedNode } = useGraph()

  // Initialise Litegraph when component mounts
  useEffect(() => {
    let mounted = true
    let animationFrame: number

    const initGraph = async () => {
      if (!canvasRef.current || !containerRef.current) return

      // Import litegraph.js dynamically
      const LiteGraphModule = await import('litegraph.js')
      const { LGraph, LGraphCanvas, LiteGraph } = LiteGraphModule

      if (!mounted) return

      // Store LiteGraph reference for node creation
      liteGraphRef.current = LiteGraph

      // Configure LiteGraph defaults to match ComfyUI style
      LiteGraph.NODE_DEFAULT_COLOR = '#333'
      LiteGraph.NODE_DEFAULT_BGCOLOR = '#353535'
      LiteGraph.NODE_DEFAULT_BOXCOLOR = '#666'
      LiteGraph.NODE_TITLE_COLOR = '#999'
      LiteGraph.NODE_SELECTED_TITLE_COLOR = '#FFF'
      LiteGraph.NODE_TEXT_COLOR = '#AAA'
      LiteGraph.NODE_BOX_OUTLINE_COLOR = '#FFF'
      LiteGraph.WIDGET_BGCOLOR = '#222'
      LiteGraph.WIDGET_OUTLINE_COLOR = '#666'
      LiteGraph.WIDGET_TEXT_COLOR = '#DDD'
      LiteGraph.WIDGET_SECONDARY_TEXT_COLOR = '#999'
      LiteGraph.LINK_COLOR = '#9A9'
      LiteGraph.EVENT_LINK_COLOR = '#A86'
      LiteGraph.CONNECTING_LINK_COLOR = '#AFA'
      LiteGraph.DEFAULT_SHADOW_COLOR = 'rgba(0,0,0,0.5)'
      LiteGraph.NODE_TITLE_HEIGHT = 30
      LiteGraph.NODE_SLOT_HEIGHT = 20
      LiteGraph.NODE_WIDGET_HEIGHT = 20
      LiteGraph.NODE_WIDTH = 140
      LiteGraph.NODE_MIN_WIDTH = 50
      LiteGraph.DEFAULT_GROUP_FONT = 24

      // Configure slot type colors (ComfyUI style)
      LiteGraph.registerNodeType = ((original) => {
        return function(...args: Parameters<typeof LiteGraph.registerNodeType>) {
          return original.apply(LiteGraph, args)
        }
      })(LiteGraph.registerNodeType.bind(LiteGraph))

      // Set slot colors for different data types
      if (LiteGraph.slot_types_default_out) {
        Object.assign(LiteGraph.slot_types_default_out, {
          string: '#9F9',
          number: '#99F',
          image: '#64B5F6',
          boolean: '#F99',
        })
      }

      if (LiteGraph.slot_types_default_in) {
        Object.assign(LiteGraph.slot_types_default_in, {
          string: '#9F9',
          number: '#99F',
          image: '#64B5F6',
          boolean: '#F99',
        })
      }

      // Register all custom nodes before creating the graph
      registerAllNodes()

      // Wait a bit for nodes to register
      await new Promise(resolve => setTimeout(resolve, 100))

      if (!mounted) return

      // Create new graph instance
      const newGraph = new LGraph()
      graphRef.current = newGraph
      setGraph(newGraph)

      // Create canvas instance
      const canvas = new LGraphCanvas(canvasRef.current, newGraph)
      canvasInstanceRef.current = canvas

      // Configure canvas options for dark theme
      canvas.background_image = ''
      canvas.clear_background = true
      canvas.render_shadows = false
      canvas.render_connection_arrows = false
      canvas.render_curved_connections = true
      canvas.render_connections_border = true
      canvas.highquality_render = true

      // Handle node selection
      canvas.onNodeSelected = (node) => {
        setSelectedNode(node)
      }

      canvas.onNodeDeselected = () => {
        setSelectedNode(null)
      }

      // Handle resize
      const handleResize = () => {
        if (canvasRef.current && containerRef.current) {
          canvasRef.current.width = containerRef.current.clientWidth
          canvasRef.current.height = containerRef.current.clientHeight
          canvas.resize()
        }
      }

      // Initial resize
      handleResize()

      // Add resize observer
      const resizeObserver = new ResizeObserver(handleResize)
      resizeObserver.observe(containerRef.current)

      // Start rendering loop
      const animate = () => {
        if (!mounted) return
        canvas.draw(true, true)
        animationFrame = requestAnimationFrame(animate)
      }
      animate()

      // Notify parent that canvas is ready
      onCanvasReady?.(canvas)
      setIsInitialized(true)

      return () => {
        mounted = false
        resizeObserver.disconnect()
        if (animationFrame) {
          cancelAnimationFrame(animationFrame)
        }
      }
    }

    initGraph()

    return () => {
      mounted = false
      if (animationFrame) {
        cancelAnimationFrame(animationFrame)
      }
    }
  }, [setGraph, setSelectedNode, onCanvasReady])

  // Handle node drop from the node panel
  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault()

    const nodeType = event.dataTransfer.getData('node-type')
    if (!nodeType || !graphRef.current || !canvasInstanceRef.current || !liteGraphRef.current) {
      console.warn('Cannot create node: missing dependencies', { nodeType, graph: !!graphRef.current, canvas: !!canvasInstanceRef.current, liteGraph: !!liteGraphRef.current })
      return
    }

    // Calculate drop position on canvas
    const canvas = canvasInstanceRef.current
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    // Transform screen coordinates to canvas coordinates
    const x = (event.clientX - rect.left - canvas.ds.offset[0]) / canvas.ds.scale
    const y = (event.clientY - rect.top - canvas.ds.offset[1]) / canvas.ds.scale

    // Create node using LiteGraph
    const LiteGraph = liteGraphRef.current
    const node = LiteGraph.createNode(nodeType)

    if (node) {
      node.pos = [x, y]
      graphRef.current.add(node)
      canvas.setDirty(true, true)

      // Select the newly created node
      canvas.selectNode(node)
      setSelectedNode(node)
    } else {
      console.warn(`Failed to create node of type: ${nodeType}`)
    }
  }, [setSelectedNode])

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }, [])

  // Handle file drops
  const handleFileDrop = useCallback((event: React.DragEvent) => {
    const files = event.dataTransfer.files
    if (files.length === 0) return

    // Check if it's an image file
    const file = files[0]
    if (!file || !file.type.startsWith('image/')) return

    event.preventDefault()

    // Create an ImageSource node at drop position
    if (!graphRef.current || !canvasInstanceRef.current || !liteGraphRef.current) return

    const canvas = canvasInstanceRef.current
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = (event.clientX - rect.left - canvas.ds.offset[0]) / canvas.ds.scale
    const y = (event.clientY - rect.top - canvas.ds.offset[1]) / canvas.ds.scale

    const LiteGraph = liteGraphRef.current
    const node = LiteGraph.createNode('input/image')

    if (node) {
      node.pos = [x, y]
      graphRef.current.add(node)
      canvas.setDirty(true, true)

      // Upload the file and set it on the node
      const formData = new FormData()
      formData.append('file', file)

      fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
        .then(res => res.json())
        .then(data => {
          if (data.url && node.properties) {
            node.properties.url = data.url
            canvas.setDirty(true, true)
          }
        })
        .catch(err => console.error('Failed to upload image:', err))
    }
  }, [])

  // Combined drop handler
  const handleCombinedDrop = useCallback((event: React.DragEvent) => {
    // Check if it's a file drop
    if (event.dataTransfer.files.length > 0) {
      handleFileDrop(event)
    } else {
      handleDrop(event)
    }
  }, [handleDrop, handleFileDrop])

  return (
    <div
      ref={containerRef}
      className="h-full w-full relative"
      onDrop={handleCombinedDrop}
      onDragOver={handleDragOver}
    >
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        tabIndex={0}
      />

      {/* Loading overlay */}
      {!isInitialized && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-blue-500" />
            <p className="text-sm text-zinc-400">Loading workflow editor...</p>
          </div>
        </div>
      )}

      {/* Minimap placeholder */}
      <div className="absolute bottom-4 left-4 h-32 w-48 rounded-lg border border-zinc-700 bg-zinc-800/80 opacity-50 hover:opacity-100 transition-opacity">
        <div className="flex h-full items-center justify-center text-xs text-zinc-500">
          Minimap (coming soon)
        </div>
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1">
        <button
          onClick={() => {
            if (canvasInstanceRef.current) {
              canvasInstanceRef.current.setZoom(canvasInstanceRef.current.ds.scale * 1.2)
              canvasInstanceRef.current.setDirty(true, true)
            }
          }}
          className="rounded bg-zinc-800/90 p-2 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
          title="Zoom in"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
          </svg>
        </button>
        <button
          onClick={() => {
            if (canvasInstanceRef.current) {
              canvasInstanceRef.current.setZoom(canvasInstanceRef.current.ds.scale / 1.2)
              canvasInstanceRef.current.setDirty(true, true)
            }
          }}
          className="rounded bg-zinc-800/90 p-2 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
          title="Zoom out"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
          </svg>
        </button>
        <button
          onClick={() => {
            if (canvasInstanceRef.current) {
              canvasInstanceRef.current.ds.scale = 1
              canvasInstanceRef.current.ds.offset[0] = 0
              canvasInstanceRef.current.ds.offset[1] = 0
              canvasInstanceRef.current.setDirty(true, true)
            }
          }}
          className="rounded bg-zinc-800/90 p-2 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
          title="Reset view"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
      </div>
    </div>
  )
}
