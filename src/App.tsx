import { useState, useCallback } from 'react'
import type { SerializedLGraph } from 'litegraph.js'
import { useGraph } from './hooks/useGraph'
import { useExecution } from './hooks/useExecution'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { Toolbar } from './components/Toolbar'
import { NodePanel } from './components/NodePanel'
import { WorkflowCanvas } from './components/WorkflowCanvas'
import { PropertiesPanel } from './components/PropertiesPanel'
import { OutputPreview } from './components/OutputPreview'
import { SaveLoadDialog } from './components/SaveLoadDialog'
import { SettingsDialog } from './components/SettingsDialog'
import { ImageModal } from './components/ImageModal'
import { ErrorBoundary, CanvasErrorBoundary } from './components/ErrorBoundary'
import { GraphProvider } from './context/GraphContext'
import { ExecutionProvider } from './context/ExecutionContext'
import { workflowApi } from './lib/api-client'
import type { WorkflowData } from './types/nodes'

/**
 * Main application component that orchestrates the workflow editor layout.
 * Follows a three-panel design: node library (left), canvas (centre), properties/preview (right).
 */
function AppContent() {
  const { graph, selectedNode, canvas, setCanvas } = useGraph()
  const { isExecuting, execute, cancel } = useExecution()

  // Dialog state
  const [saveLoadDialogOpen, setSaveLoadDialogOpen] = useState(false)
  const [saveLoadMode, setSaveLoadMode] = useState<'save' | 'load'>('save')
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Keyboard shortcuts
  const { shortcuts, undo, redo, canUndo, canRedo } = useKeyboardShortcuts({
    graph,
    canvas,
    onSave: () => {
      setSaveLoadMode('save')
      setSaveLoadDialogOpen(true)
    },
    onLoad: () => {
      setSaveLoadMode('load')
      setSaveLoadDialogOpen(true)
    },
    onNew: handleNew,
    onUndo: () => console.log('Undo performed'),
    onRedo: () => console.log('Redo performed'),
  })

  // Handle new workflow
  function handleNew() {
    if (graph && graph._nodes.length > 0) {
      if (!confirm('Create a new workflow? Any unsaved changes will be lost.')) {
        return
      }
    }
    graph?.clear()
    canvas?.setDirty(true, true)
  }

  // Handle save workflow
  const handleSave = useCallback(async (name: string, description?: string) => {
    if (!graph) return

    const serialized = graph.serialize()
    await workflowApi.create({
      name,
      description,
      graph: serialized,
    })
  }, [graph])

  // Handle load workflow
  const handleLoad = useCallback((workflow: WorkflowData) => {
    if (!graph) return

    graph.configure(workflow.graph as SerializedLGraph)
    canvas?.setDirty(true, true)
  }, [graph, canvas])

  // Handle open save dialog
  const handleOpenSave = useCallback(() => {
    setSaveLoadMode('save')
    setSaveLoadDialogOpen(true)
  }, [])

  // Handle open load dialog
  const handleOpenLoad = useCallback(() => {
    setSaveLoadMode('load')
    setSaveLoadDialogOpen(true)
  }, [])

  // Handle open settings
  const handleOpenSettings = useCallback(() => {
    setSettingsOpen(true)
  }, [])

  return (
    <div className="flex h-screen flex-col bg-zinc-900 text-zinc-50">
      {/* Top toolbar */}
      <Toolbar
        onNew={handleNew}
        onSave={handleOpenSave}
        onLoad={handleOpenLoad}
        onSettings={handleOpenSettings}
        onRun={execute}
        onCancel={cancel}
        isExecuting={isExecuting}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
      />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel - Node library */}
        <NodePanel />

        {/* Centre - Canvas */}
        <div className="flex-1 relative">
          <CanvasErrorBoundary>
            <WorkflowCanvas
              onCanvasReady={setCanvas}
            />
          </CanvasErrorBoundary>
        </div>

        {/* Right panel - Properties and Output */}
        <div className="w-80 flex flex-col border-l border-zinc-700">
          <PropertiesPanel selectedNode={selectedNode} />
          <OutputPreview />
        </div>
      </div>

      {/* Dialogs */}
      <SaveLoadDialog
        isOpen={saveLoadDialogOpen}
        mode={saveLoadMode}
        onClose={() => setSaveLoadDialogOpen(false)}
        onSave={handleSave}
        onLoad={handleLoad}
      />

      <SettingsDialog
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      {/* Fullscreen image modal */}
      <ImageModal />

      {/* Keyboard shortcuts hint */}
      <div className="fixed bottom-4 right-4 opacity-0 hover:opacity-100 transition-opacity">
        <div className="bg-zinc-800 rounded-lg p-3 text-xs text-zinc-400 shadow-lg">
          <p className="font-medium text-zinc-300 mb-2">Keyboard Shortcuts</p>
          <ul className="space-y-1">
            {shortcuts.slice(0, 8).map((shortcut, i) => (
              <li key={i} className="flex justify-between gap-4">
                <span>{shortcut.description}</span>
                <kbd className="bg-zinc-700 px-1.5 rounded text-zinc-300">
                  {shortcut.ctrl ? 'Ctrl+' : ''}
                  {shortcut.shift ? 'Shift+' : ''}
                  {shortcut.key.toUpperCase()}
                </kbd>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

/**
 * Root App component that provides context wrappers.
 */
export default function App() {
  return (
    <ErrorBoundary>
      <GraphProvider>
        <ExecutionProvider>
          <AppContent />
        </ExecutionProvider>
      </GraphProvider>
    </ErrorBoundary>
  )
}
