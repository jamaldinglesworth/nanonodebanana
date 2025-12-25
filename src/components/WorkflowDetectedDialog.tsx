import { useState, useEffect, useCallback } from 'react'
import type { SerializedLGraph, LGraph } from 'litegraph.js'
import type { WorkflowMetadata } from '../lib/png-metadata'

interface WorkflowDetectedDialogProps {
  onLoad: (workflow: SerializedLGraph) => void
}

interface WorkflowDetectedEvent extends CustomEvent {
  detail: {
    metadata: WorkflowMetadata
    fileName: string
    graph: LGraph
  }
}

/**
 * Dialog shown when a PNG with embedded workflow metadata is detected.
 * Allows the user to load the workflow or dismiss.
 */
export function WorkflowDetectedDialog({ onLoad }: WorkflowDetectedDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [metadata, setMetadata] = useState<WorkflowMetadata | null>(null)
  const [fileName, setFileName] = useState('')

  const handleWorkflowDetected = useCallback((event: Event) => {
    const customEvent = event as WorkflowDetectedEvent
    const { metadata, fileName } = customEvent.detail

    setMetadata(metadata)
    setFileName(fileName)
    setIsOpen(true)
  }, [])

  useEffect(() => {
    window.addEventListener('workflow-detected', handleWorkflowDetected)
    return () => {
      window.removeEventListener('workflow-detected', handleWorkflowDetected)
    }
  }, [handleWorkflowDetected])

  const handleLoad = () => {
    if (metadata?.workflow) {
      onLoad(metadata.workflow as SerializedLGraph)
    }
    setIsOpen(false)
    setMetadata(null)
  }

  const handleCancel = () => {
    setIsOpen(false)
    setMetadata(null)
  }

  if (!isOpen || !metadata) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg bg-zinc-800 p-6 shadow-xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-xl">
            📦
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-50">
              Workflow Detected
            </h2>
            <p className="text-sm text-zinc-400">
              This image contains embedded workflow data
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-lg bg-zinc-900 p-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">File:</span>
              <span className="text-zinc-200 font-mono">{fileName}</span>
            </div>
            {metadata.name && (
              <div className="flex justify-between">
                <span className="text-zinc-400">Workflow:</span>
                <span className="text-zinc-200">{metadata.name}</span>
              </div>
            )}
            {metadata.version && (
              <div className="flex justify-between">
                <span className="text-zinc-400">Version:</span>
                <span className="text-zinc-200">{metadata.version}</span>
              </div>
            )}
            {metadata.timestamp && (
              <div className="flex justify-between">
                <span className="text-zinc-400">Created:</span>
                <span className="text-zinc-200">
                  {new Date(metadata.timestamp).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>

        <p className="mb-4 text-sm text-zinc-400">
          Would you like to load this workflow? This will replace your current canvas.
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={handleCancel}
            className="rounded-md px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-700"
          >
            Keep Image Only
          </button>
          <button
            onClick={handleLoad}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            Load Workflow
          </button>
        </div>
      </div>
    </div>
  )
}
