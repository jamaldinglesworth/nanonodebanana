import { useState, useEffect, useCallback } from 'react'
import type { LGraphNode } from 'litegraph.js'

// Extend Window interface for debugging purposes
declare global {
  interface Window {
    selectedNode: LGraphNode | null
  }
}

interface PropertiesPanelProps {
  selectedNode: LGraphNode | null
}

/**
 * Right side panel displaying properties of the selected node.
 * Shows node settings, input configuration, and metadata.
 */
export function PropertiesPanel({ selectedNode }: PropertiesPanelProps) {
  // Use a state to force re-render when node internal state changes
  const [, setTick] = useState(0)
  const forceUpdate = useCallback(() => setTick(t => t + 1), [])

  // Subscribe to node changes
  useEffect(() => {
    if (!selectedNode) {
      window.selectedNode = null
      return
    }

    window.selectedNode = selectedNode

    // Store original handlers
    const originalOnPropertyChanged = selectedNode.onPropertyChanged

    // Override onPropertyChanged to trigger React update
    selectedNode.onPropertyChanged = function (name, value, prev_value) {
      if (originalOnPropertyChanged) {
        originalOnPropertyChanged.call(this, name, value, prev_value)
      }
      forceUpdate()
    }

    // Polling fallback every 200ms during selection to ensure we catch all changes
    // (Manual resizing in LiteGraph can sometimes bypass standard property hooks if not careful)
    const interval = setInterval(() => {
      forceUpdate()
    }, 200)

    return () => {
      selectedNode.onPropertyChanged = originalOnPropertyChanged
      clearInterval(interval)
    }
  }, [selectedNode, forceUpdate])

  if (!selectedNode) {
    return (
      <div className="flex-1 border-b border-zinc-700 p-4">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Properties
        </h2>
        <p className="text-sm text-zinc-500">
          Select a node to view its properties
        </p>
      </div>
    )
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    selectedNode.title = e.target.value
    forceUpdate()
    if (selectedNode.graph) {
      selectedNode.setDirtyCanvas?.(true, true)
    }
  }

  const handlePropertyChange = (key: string, value: string) => {
    // Try to parse as number if it looks like one
    let finalValue: string | number = value
    if (!isNaN(Number(value)) && value.trim() !== '') {
      finalValue = Number(value)
    }

    selectedNode.setProperty(key, finalValue)
    forceUpdate()
  }

  return (
    <div className="flex-1 overflow-y-auto border-b border-zinc-700 p-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
        Properties
      </h2>

      {/* Node title */}
      <div className="mb-4">
        <label className="mb-1 block text-xs font-medium text-zinc-400">
          Name
        </label>
        <input
          type="text"
          value={selectedNode.title || ''}
          onChange={handleTitleChange}
          className="w-full rounded-md border border-zinc-600 bg-zinc-700 px-3 py-1.5 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* Node type */}
      <div className="mb-4">
        <label className="mb-1 block text-xs font-medium text-zinc-400">
          Type
        </label>
        <p className="text-sm text-zinc-300">{selectedNode.type}</p>
      </div>

      {/* Node ID */}
      <div className="mb-4">
        <label className="mb-1 block text-xs font-medium text-zinc-400">
          ID
        </label>
        <p className="font-mono text-xs text-zinc-500">{selectedNode.id}</p>
      </div>

      {/* Inputs section */}
      {selectedNode.inputs && selectedNode.inputs.length > 0 && (
        <div className="mb-4">
          <label className="mb-2 block text-xs font-medium text-zinc-400">
            Inputs
          </label>
          <div className="space-y-1">
            {selectedNode.inputs.map((input, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-md bg-zinc-700 px-2 py-1 text-xs"
              >
                <span className="text-zinc-300">{input.name}</span>
                <span className="text-zinc-500">{String(input.type)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Outputs section */}
      {selectedNode.outputs && selectedNode.outputs.length > 0 && (
        <div className="mb-4">
          <label className="mb-2 block text-xs font-medium text-zinc-400">
            Outputs
          </label>
          <div className="space-y-1">
            {selectedNode.outputs.map((output, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-md bg-zinc-700 px-2 py-1 text-xs"
              >
                <span className="text-zinc-300">{output.name}</span>
                <span className="text-zinc-500">{String(output.type)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Properties section */}
      {selectedNode.properties && Object.keys(selectedNode.properties).length > 0 && (
        <div className="mb-4">
          <label className="mb-2 block text-xs font-medium text-zinc-400">
            Settings
          </label>
          <div className="space-y-2">
            {Object.entries(selectedNode.properties).map(([key, value]) => (
              <div key={key}>
                <label className="mb-1 block text-xs text-zinc-400">
                  {key}
                </label>
                <input
                  type="text"
                  value={String(value)}
                  onChange={(e) => handlePropertyChange(key, e.target.value)}
                  className="w-full rounded-md border border-zinc-600 bg-zinc-700 px-2 py-1 text-xs text-zinc-100 focus:border-blue-500 focus:outline-none"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
