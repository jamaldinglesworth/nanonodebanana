import { useState, useRef, useEffect } from 'react'

interface ToolbarProps {
  onNew: () => void
  onSave: () => void
  onLoad: () => void
  onSettings: () => void
  onTemplates: () => void
  onWorkflowTemplates: () => void
  onRun: () => void
  onRunFromSelected?: () => void
  onRunSelectedOnly?: () => void
  onCancel: () => void
  isExecuting: boolean
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  hasSelectedNode?: boolean
  curvedConnections?: boolean
  onToggleCurvedConnections?: () => void
}

/**
 * Top toolbar component with workflow actions.
 * Provides controls for creating, saving, loading, and executing workflows.
 */
export function Toolbar({
  onNew,
  onSave,
  onLoad,
  onSettings,
  onTemplates,
  onWorkflowTemplates,
  onRun,
  onRunFromSelected,
  onRunSelectedOnly,
  onCancel,
  isExecuting,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  hasSelectedNode = false,
  curvedConnections = true,
  onToggleCurvedConnections,
}: ToolbarProps) {
  const [showRunMenu, setShowRunMenu] = useState(false)
  const runMenuRef = useRef<HTMLDivElement>(null)

  // Close run menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (runMenuRef.current && !runMenuRef.current.contains(event.target as Node)) {
        setShowRunMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  return (
    <header className="flex items-center justify-between border-b border-zinc-700 bg-zinc-800 px-4 py-2">
      {/* Logo and title */}
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 text-lg">
          🍌
        </div>
        <h1 className="text-lg font-semibold text-zinc-50">
          Workflow Editor
        </h1>
      </div>

      {/* Centre actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={onNew}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-300 hover:bg-zinc-700 hover:text-zinc-50"
          title="New workflow (Ctrl+N)"
        >
          New
        </button>
        <button
          onClick={onSave}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-300 hover:bg-zinc-700 hover:text-zinc-50"
          title="Save workflow (Ctrl+S)"
        >
          Save
        </button>
        <button
          onClick={onLoad}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-300 hover:bg-zinc-700 hover:text-zinc-50"
          title="Load workflow (Ctrl+O)"
        >
          Load
        </button>
        <button
          onClick={onTemplates}
          className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-zinc-300 hover:bg-zinc-700 hover:text-zinc-50"
          title="Prompt Templates (T)"
        >
          <span>📝</span>
          Prompts
        </button>
        <button
          onClick={onWorkflowTemplates}
          className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-zinc-300 hover:bg-zinc-700 hover:text-zinc-50"
          title="Workflow Templates (W)"
        >
          <span>🔧</span>
          Workflows
        </button>

        <div className="mx-2 h-6 w-px bg-zinc-600" />

        {/* Undo/Redo buttons */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Undo (Ctrl+Z)"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Redo (Ctrl+Y)"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
          </svg>
        </button>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Edge style toggle */}
        {onToggleCurvedConnections && (
          <button
            onClick={onToggleCurvedConnections}
            className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-50"
            title={curvedConnections ? 'Switch to angular connections' : 'Switch to curved connections'}
          >
            {curvedConnections ? (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12c4-6 12-6 16 0" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12h8v-6h8" />
              </svg>
            )}
          </button>
        )}

        <div className="h-6 w-px bg-zinc-600" />

        {isExecuting ? (
          <button
            onClick={onCancel}
            className="flex items-center gap-2 rounded-md bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-500"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="1" />
            </svg>
            Cancel
          </button>
        ) : (
          <div className="relative" ref={runMenuRef}>
            <div className="flex">
              <button
                onClick={onRun}
                className="flex items-center gap-2 rounded-l-md bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-500"
                title="Run entire workflow"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Run
              </button>
              <button
                onClick={() => setShowRunMenu(!showRunMenu)}
                className="rounded-r-md border-l border-green-700 bg-green-600 px-2 py-1.5 text-white hover:bg-green-500"
                title="More run options"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {/* Run dropdown menu */}
            {showRunMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 rounded-md border border-zinc-600 bg-zinc-800 py-1 shadow-xl z-50">
                <button
                  onClick={() => {
                    onRun()
                    setShowRunMenu(false)
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Run All
                </button>
                <button
                  onClick={() => {
                    onRunFromSelected?.()
                    setShowRunMenu(false)
                  }}
                  disabled={!hasSelectedNode}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Re-run all nodes from selected node onwards"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                  Run from Selected
                </button>
                <button
                  onClick={() => {
                    onRunSelectedOnly?.()
                    setShowRunMenu(false)
                  }}
                  disabled={!hasSelectedNode}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Run only the selected node (uses cached inputs)"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Run Selected Only
                </button>
              </div>
            )}
          </div>
        )}
        <button
          onClick={onSettings}
          className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-50"
          aria-label="Settings"
          title="Settings"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
      </div>
    </header>
  )
}
