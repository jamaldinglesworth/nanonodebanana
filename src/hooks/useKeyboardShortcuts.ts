import { useEffect, useCallback, useRef } from 'react'
import type { LGraph, LGraphCanvas } from 'litegraph.js'
import { NODE_MODE } from '../nodes/base/BaseNode'

interface KeyboardShortcutsOptions {
  graph: LGraph | null
  canvas: LGraphCanvas | null
  onSave?: () => void
  onLoad?: () => void
  onNew?: () => void
  onUndo?: () => void
  onRedo?: () => void
  onTemplates?: () => void
}

interface ShortcutAction {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  action: () => void
  description: string
}

/**
 * Hook for managing keyboard shortcuts in the workflow editor.
 * Provides standard shortcuts for common operations.
 */
export function useKeyboardShortcuts(options: KeyboardShortcutsOptions) {
  const { graph, canvas, onSave, onLoad, onNew, onUndo, onRedo, onTemplates } = options
  const undoStack = useRef<string[]>([])
  const redoStack = useRef<string[]>([])
  const lastState = useRef<string | null>(null)

  // Save current state to undo stack
  const saveState = useCallback(() => {
    if (!graph) return

    const state = JSON.stringify(graph.serialize())
    if (state !== lastState.current) {
      undoStack.current.push(state)
      redoStack.current = [] // Clear redo stack on new action
      lastState.current = state

      // Limit undo stack size
      if (undoStack.current.length > 50) {
        undoStack.current.shift()
      }
    }
  }, [graph])

  // Undo last action
  const handleUndo = useCallback(() => {
    if (!graph || undoStack.current.length === 0) return

    const currentState = JSON.stringify(graph.serialize())
    redoStack.current.push(currentState)

    const previousState = undoStack.current.pop()
    if (previousState) {
      graph.configure(JSON.parse(previousState))
      lastState.current = previousState
      canvas?.setDirty(true, true)
    }

    onUndo?.()
  }, [graph, canvas, onUndo])

  // Redo last undone action
  const handleRedo = useCallback(() => {
    if (!graph || redoStack.current.length === 0) return

    const currentState = JSON.stringify(graph.serialize())
    undoStack.current.push(currentState)

    const nextState = redoStack.current.pop()
    if (nextState) {
      graph.configure(JSON.parse(nextState))
      lastState.current = nextState
      canvas?.setDirty(true, true)
    }

    onRedo?.()
  }, [graph, canvas, onRedo])

  // Define shortcuts
  const shortcuts: ShortcutAction[] = [
    {
      key: 's',
      ctrl: true,
      action: () => onSave?.(),
      description: 'Save workflow',
    },
    {
      key: 'o',
      ctrl: true,
      action: () => onLoad?.(),
      description: 'Load workflow',
    },
    {
      key: 'n',
      ctrl: true,
      action: () => onNew?.(),
      description: 'New workflow',
    },
    {
      key: 'z',
      ctrl: true,
      action: handleUndo,
      description: 'Undo',
    },
    {
      key: 'y',
      ctrl: true,
      action: handleRedo,
      description: 'Redo',
    },
    {
      key: 'z',
      ctrl: true,
      shift: true,
      action: handleRedo,
      description: 'Redo (alternative)',
    },
    {
      key: 'd',
      ctrl: true,
      action: () => {
        if (!canvas || !graph) return
        const selectedNodes = Object.values(canvas.selected_nodes)
        selectedNodes.forEach(node => {
          const clone = node.clone()
          clone.pos[0] += 50
          clone.pos[1] += 50
          graph.add(clone)
        })
        canvas.setDirty(true, true)
      },
      description: 'Duplicate selected',
    },
    {
      key: 'Delete',
      action: () => {
        canvas?.deleteSelectedNodes()
      },
      description: 'Delete selected',
    },
    {
      key: 'Backspace',
      action: () => {
        canvas?.deleteSelectedNodes()
      },
      description: 'Delete selected',
    },
    {
      key: 'a',
      action: () => {
        canvas?.showSearchBox()
      },
      description: 'Add node menu',
    },
    {
      key: 'f',
      action: () => {
        if (!graph || !canvas) return
        // Fit view to all nodes
        const nodes = graph._nodes
        if (nodes.length === 0) return

        let minX = Infinity, minY = Infinity
        let maxX = -Infinity, maxY = -Infinity

        nodes.forEach(node => {
          minX = Math.min(minX, node.pos[0])
          minY = Math.min(minY, node.pos[1])
          maxX = Math.max(maxX, node.pos[0] + node.size[0])
          maxY = Math.max(maxY, node.pos[1] + node.size[1])
        })

        const width = maxX - minX + 100
        const height = maxY - minY + 100
        const centerX = (minX + maxX) / 2
        const centerY = (minY + maxY) / 2

        const canvasWidth = canvas.canvas.width
        const canvasHeight = canvas.canvas.height
        const scale = Math.min(canvasWidth / width, canvasHeight / height, 1)

        canvas.ds.scale = scale
        canvas.ds.offset[0] = canvasWidth / 2 - centerX * scale
        canvas.ds.offset[1] = canvasHeight / 2 - centerY * scale
        canvas.setDirty(true, true)
      },
      description: 'Fit view',
    },
    {
      key: 'a',
      ctrl: true,
      action: () => {
        if (!graph || !canvas) return
        canvas.selectNodes(graph._nodes)
      },
      description: 'Select all',
    },
    {
      key: 'Escape',
      action: () => {
        canvas?.deselectAllNodes()
      },
      description: 'Deselect all',
    },
    {
      key: 'm',
      action: () => {
        if (!canvas) return
        const selectedNodes = Object.values(canvas.selected_nodes)
        selectedNodes.forEach(node => {
          const currentMode = (node as unknown as { mode?: number }).mode ?? NODE_MODE.NORMAL
          // Toggle mute: if already muted, go back to normal, otherwise mute
          const newMode = currentMode === NODE_MODE.MUTED ? NODE_MODE.NORMAL : NODE_MODE.MUTED
          ;(node as unknown as { mode: number }).mode = newMode
        })
        canvas.setDirty(true, true)
      },
      description: 'Toggle mute selected nodes',
    },
    {
      key: 'b',
      action: () => {
        if (!canvas) return
        const selectedNodes = Object.values(canvas.selected_nodes)
        selectedNodes.forEach(node => {
          const currentMode = (node as unknown as { mode?: number }).mode ?? NODE_MODE.NORMAL
          // Toggle bypass: if already bypassed, go back to normal, otherwise bypass
          const newMode = currentMode === NODE_MODE.BYPASSED ? NODE_MODE.NORMAL : NODE_MODE.BYPASSED
          ;(node as unknown as { mode: number }).mode = newMode
        })
        canvas.setDirty(true, true)
      },
      description: 'Toggle bypass selected nodes',
    },
    {
      key: 't',
      action: () => onTemplates?.(),
      description: 'Prompt templates',
    },
  ]

  // Handle keydown events
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      const matchingShortcut = shortcuts.find(shortcut => {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase()
        const ctrlMatch = !!shortcut.ctrl === (event.ctrlKey || event.metaKey)
        const shiftMatch = !!shortcut.shift === event.shiftKey
        const altMatch = !!shortcut.alt === event.altKey

        return keyMatch && ctrlMatch && shiftMatch && altMatch
      })

      if (matchingShortcut) {
        event.preventDefault()
        matchingShortcut.action()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts])

  // Track graph changes for undo
  useEffect(() => {
    if (!graph) return

    const originalOnAfterChange = graph.onAfterChange
    graph.onAfterChange = (g, info) => {
      originalOnAfterChange?.call(graph, g, info)
      saveState()
    }

    return () => {
      graph.onAfterChange = originalOnAfterChange
    }
  }, [graph, saveState])

  return {
    shortcuts,
    undo: handleUndo,
    redo: handleRedo,
    canUndo: undoStack.current.length > 0,
    canRedo: redoStack.current.length > 0,
  }
}
