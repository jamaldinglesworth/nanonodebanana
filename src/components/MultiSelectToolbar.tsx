import { useCallback, useEffect, useState } from 'react'
import type { LGraph, LGraphNode, LGraphCanvas } from 'litegraph.js'

// LGraphGroup exists at runtime but isn't in the type definitions
interface LGraphGroup {
  title: string
  pos: [number, number]
  size: [number, number]
  color: string
}

interface LiteGraphGlobal {
  LGraphGroup: new () => LGraphGroup
}

interface MultiSelectToolbarProps {
  graph: LGraph | null
  canvas: LGraphCanvas | null
}

interface SelectedNodes {
  nodes: LGraphNode[]
  count: number
}

/**
 * Floating toolbar that appears when multiple nodes are selected.
 * Provides layout actions and group operations.
 */
export function MultiSelectToolbar({ graph, canvas }: MultiSelectToolbarProps) {
  const [selection, setSelection] = useState<SelectedNodes>({ nodes: [], count: 0 })

  // Poll for selection changes (LiteGraph doesn't fire events for multi-select)
  useEffect(() => {
    if (!canvas) return

    const checkSelection = () => {
      const selectedNodes = canvas.selected_nodes
        ? Object.values(canvas.selected_nodes)
        : []

      if (selectedNodes.length !== selection.count) {
        setSelection({ nodes: selectedNodes, count: selectedNodes.length })
      }
    }

    // Check on mouse up and key up (common selection triggers)
    const interval = setInterval(checkSelection, 100)

    return () => clearInterval(interval)
  }, [canvas, selection.count])

  // Stack nodes horizontally with consistent spacing
  const stackHorizontally = useCallback(() => {
    if (!canvas || selection.nodes.length < 2) return

    const nodes = [...selection.nodes].sort((a, b) => a.pos[0] - b.pos[0])
    const spacing = 20
    let currentX = nodes[0]!.pos[0]

    for (const node of nodes) {
      node.pos[0] = currentX
      node.pos[1] = nodes[0]!.pos[1] // Align to first node's Y
      currentX += (node.size?.[0] ?? 200) + spacing
    }

    canvas.setDirty(true, true)
  }, [canvas, selection.nodes])

  // Stack nodes vertically with consistent spacing
  const stackVertically = useCallback(() => {
    if (!canvas || selection.nodes.length < 2) return

    const nodes = [...selection.nodes].sort((a, b) => a.pos[1] - b.pos[1])
    const spacing = 20
    let currentY = nodes[0]!.pos[1]

    for (const node of nodes) {
      node.pos[0] = nodes[0]!.pos[0] // Align to first node's X
      node.pos[1] = currentY
      currentY += (node.size?.[1] ?? 100) + spacing
    }

    canvas.setDirty(true, true)
  }, [canvas, selection.nodes])

  // Arrange nodes in a grid layout
  const arrangeAsGrid = useCallback(() => {
    if (!canvas || selection.nodes.length < 2) return

    const nodes = [...selection.nodes]
    const cols = Math.ceil(Math.sqrt(nodes.length))
    const spacing = 30
    const nodeWidth = 200
    const nodeHeight = 120

    // Find top-left starting position
    const startX = Math.min(...nodes.map(n => n.pos[0]))
    const startY = Math.min(...nodes.map(n => n.pos[1]))

    nodes.forEach((node, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      node.pos[0] = startX + col * (nodeWidth + spacing)
      node.pos[1] = startY + row * (nodeHeight + spacing)
    })

    canvas.setDirty(true, true)
  }, [canvas, selection.nodes])

  // Create a group from selected nodes
  const createGroup = useCallback(() => {
    if (!graph || !canvas || selection.nodes.length < 1) return

    // Get LiteGraph constructor from window (it's globally available)
    const LiteGraph = (window as unknown as { LiteGraph?: LiteGraphGlobal }).LiteGraph
    if (!LiteGraph?.LGraphGroup) return

    // Calculate bounding box
    const padding = 40
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

    for (const node of selection.nodes) {
      minX = Math.min(minX, node.pos[0])
      minY = Math.min(minY, node.pos[1])
      maxX = Math.max(maxX, node.pos[0] + (node.size?.[0] ?? 200))
      maxY = Math.max(maxY, node.pos[1] + (node.size?.[1] ?? 100))
    }

    // Create group
    const group = new LiteGraph.LGraphGroup()
    group.title = `Group (${selection.nodes.length} nodes)`
    group.pos = [minX - padding, minY - padding - 30] // Extra for title
    group.size = [maxX - minX + padding * 2, maxY - minY + padding * 2 + 30]
    group.color = '#335'

    // LGraph.add() accepts groups at runtime but types only show LGraphNode
    ;(graph as unknown as { add: (group: LGraphGroup) => void }).add(group)
    canvas.setDirty(true, true)
  }, [graph, canvas, selection.nodes])

  // Delete selected nodes
  const deleteSelected = useCallback(() => {
    if (!graph || !canvas || selection.nodes.length < 1) return

    for (const node of selection.nodes) {
      graph.remove(node)
    }

    canvas.selected_nodes = {}
    canvas.setDirty(true, true)
    setSelection({ nodes: [], count: 0 })
  }, [graph, canvas, selection.nodes])

  // Align all selected nodes to the leftmost position
  const alignLeft = useCallback(() => {
    if (!canvas || selection.nodes.length < 2) return

    const minX = Math.min(...selection.nodes.map(n => n.pos[0]))
    for (const node of selection.nodes) {
      node.pos[0] = minX
    }
    canvas.setDirty(true, true)
  }, [canvas, selection.nodes])

  // Align all selected nodes to the topmost position
  const alignTop = useCallback(() => {
    if (!canvas || selection.nodes.length < 2) return

    const minY = Math.min(...selection.nodes.map(n => n.pos[1]))
    for (const node of selection.nodes) {
      node.pos[1] = minY
    }
    canvas.setDirty(true, true)
  }, [canvas, selection.nodes])

  // Don't render if less than 2 nodes selected
  if (selection.count < 2) return null

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-1 rounded-lg border border-zinc-600 bg-zinc-800/95 px-2 py-1.5 shadow-xl backdrop-blur-sm">
        {/* Selection count */}
        <span className="px-2 text-sm font-medium text-zinc-300">
          {selection.count} selected
        </span>

        <div className="h-5 w-px bg-zinc-600" />

        {/* Layout actions */}
        <button
          onClick={stackHorizontally}
          className="rounded p-1.5 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
          title="Stack horizontally"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h4m4 0h4m4 0h4M4 12h16M4 18h4m4 0h4m4 0h4" />
          </svg>
        </button>
        <button
          onClick={stackVertically}
          className="rounded p-1.5 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
          title="Stack vertically"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v4m0 4v4m0 4v4M12 4v16M20 4v4m0 4v4m0 4v4" />
          </svg>
        </button>
        <button
          onClick={arrangeAsGrid}
          className="rounded p-1.5 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
          title="Arrange as grid"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
          </svg>
        </button>

        <div className="h-5 w-px bg-zinc-600" />

        {/* Alignment */}
        <button
          onClick={alignLeft}
          className="rounded p-1.5 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
          title="Align left"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v16M8 8h12M8 12h8M8 16h12" />
          </svg>
        </button>
        <button
          onClick={alignTop}
          className="rounded p-1.5 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
          title="Align top"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h16M8 8v12M12 8v8M16 8v12" />
          </svg>
        </button>

        <div className="h-5 w-px bg-zinc-600" />

        {/* Group action */}
        <button
          onClick={createGroup}
          className="flex items-center gap-1 rounded px-2 py-1 text-sm text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
          title="Create group"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Group
        </button>

        <div className="h-5 w-px bg-zinc-600" />

        {/* Delete action */}
        <button
          onClick={deleteSelected}
          className="rounded p-1.5 text-red-400 hover:bg-red-900/50 hover:text-red-300"
          title="Delete selected (Del)"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  )
}
