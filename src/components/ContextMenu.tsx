import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { NODE_PATHS } from '../lib/constants'

interface ContextMenuItem {
  id: string
  label: string
  icon?: ReactNode
  shortcut?: string
  disabled?: boolean
  danger?: boolean
  separator?: boolean
  onClick?: () => void
  submenu?: ContextMenuItem[]
}

interface ContextMenuProps {
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
}

/**
 * Context menu component with nested submenu support.
 * Positioned at the specified coordinates.
 */
export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [submenuOpen, setSubmenuOpen] = useState<string | null>(null)
  const [adjustedPosition, setAdjustedPosition] = useState({ x, y })

  // Adjust position to keep menu within viewport
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect()
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
      }

      let newX = x
      let newY = y

      if (x + rect.width > viewport.width) {
        newX = viewport.width - rect.width - 8
      }

      if (y + rect.height > viewport.height) {
        newY = viewport.height - rect.height - 8
      }

      setAdjustedPosition({ x: newX, y: newY })
    }
  }, [x, y])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  const handleItemClick = useCallback((item: ContextMenuItem) => {
    if (item.disabled) return

    if (item.onClick) {
      item.onClick()
      onClose()
    }
  }, [onClose])

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[180px] rounded-lg bg-zinc-800 border border-zinc-700 py-1 shadow-xl"
      style={{ left: adjustedPosition.x, top: adjustedPosition.y }}
    >
      {items.map((item) => {
        if (item.separator) {
          return <div key={item.id} className="my-1 h-px bg-zinc-700" />
        }

        return (
          <div
            key={item.id}
            className="relative"
            onMouseEnter={() => item.submenu && setSubmenuOpen(item.id)}
            onMouseLeave={() => item.submenu && setSubmenuOpen(null)}
          >
            <button
              onClick={() => handleItemClick(item)}
              disabled={item.disabled}
              className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-sm transition-colors ${
                item.disabled
                  ? 'text-zinc-600 cursor-not-allowed'
                  : item.danger
                  ? 'text-red-400 hover:bg-red-500/20'
                  : 'text-zinc-200 hover:bg-zinc-700'
              }`}
            >
              <div className="flex items-center gap-2">
                {item.icon && <span className="w-4">{item.icon}</span>}
                <span>{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {item.shortcut && (
                  <span className="text-xs text-zinc-500">{item.shortcut}</span>
                )}
                {item.submenu && (
                  <svg className="h-4 w-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            </button>

            {/* Submenu */}
            {item.submenu && submenuOpen === item.id && (
              <div className="absolute left-full top-0 ml-1 min-w-[160px] rounded-lg bg-zinc-800 border border-zinc-700 py-1 shadow-xl">
                {item.submenu.map((subItem) => (
                  <button
                    key={subItem.id}
                    onClick={() => {
                      subItem.onClick?.()
                      onClose()
                    }}
                    disabled={subItem.disabled}
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors ${
                      subItem.disabled
                        ? 'text-zinc-600 cursor-not-allowed'
                        : 'text-zinc-200 hover:bg-zinc-700'
                    }`}
                  >
                    {subItem.icon && <span className="w-4">{subItem.icon}</span>}
                    <span>{subItem.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/**
 * Hook for managing context menu state.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useContextMenu() {
  const [menu, setMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null)

  const show = useCallback((x: number, y: number, items: ContextMenuItem[]) => {
    setMenu({ x, y, items })
  }, [])

  const hide = useCallback(() => {
    setMenu(null)
  }, [])

  return { menu, show, hide }
}

/**
 * Common context menu items for nodes.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function getNodeContextMenuItems(options: {
  onCopy?: () => void
  onCut?: () => void
  onDuplicate?: () => void
  onDelete?: () => void
  onDisconnectInputs?: () => void
  onDisconnectOutputs?: () => void
  onCollapse?: () => void
  onProperties?: () => void
}): ContextMenuItem[] {
  return [
    {
      id: 'copy',
      label: 'Copy',
      shortcut: 'Ctrl+C',
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      onClick: options.onCopy,
    },
    {
      id: 'cut',
      label: 'Cut',
      shortcut: 'Ctrl+X',
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
        </svg>
      ),
      onClick: options.onCut,
    },
    {
      id: 'duplicate',
      label: 'Duplicate',
      shortcut: 'Ctrl+D',
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
        </svg>
      ),
      onClick: options.onDuplicate,
    },
    { id: 'sep1', label: '', separator: true },
    {
      id: 'disconnect-inputs',
      label: 'Disconnect Inputs',
      onClick: options.onDisconnectInputs,
    },
    {
      id: 'disconnect-outputs',
      label: 'Disconnect Outputs',
      onClick: options.onDisconnectOutputs,
    },
    { id: 'sep2', label: '', separator: true },
    {
      id: 'collapse',
      label: 'Collapse',
      onClick: options.onCollapse,
    },
    {
      id: 'properties',
      label: 'Properties',
      onClick: options.onProperties,
    },
    { id: 'sep3', label: '', separator: true },
    {
      id: 'delete',
      label: 'Delete',
      shortcut: 'Del',
      danger: true,
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      onClick: options.onDelete,
    },
  ]
}

/**
 * Common context menu items for canvas.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function getCanvasContextMenuItems(options: {
  onPaste?: () => void
  onSelectAll?: () => void
  onFitView?: () => void
  onArrangeNodes?: () => void
  onAddNode?: (type: string) => void
}): ContextMenuItem[] {
  return [
    {
      id: 'paste',
      label: 'Paste',
      shortcut: 'Ctrl+V',
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      onClick: options.onPaste,
    },
    { id: 'sep1', label: '', separator: true },
    {
      id: 'select-all',
      label: 'Select All',
      shortcut: 'Ctrl+A',
      onClick: options.onSelectAll,
    },
    {
      id: 'fit-view',
      label: 'Fit View',
      shortcut: 'F',
      onClick: options.onFitView,
    },
    {
      id: 'arrange',
      label: 'Arrange Nodes',
      onClick: options.onArrangeNodes,
    },
    { id: 'sep2', label: '', separator: true },
    {
      id: 'add-node',
      label: 'Add Node',
      submenu: [
        { id: 'add-prompt', label: 'Prompt', onClick: () => options.onAddNode?.(NODE_PATHS.PROMPT) },
        { id: 'add-image', label: 'Image Source', onClick: () => options.onAddNode?.(NODE_PATHS.IMAGE_SOURCE) },
        { id: 'add-seed', label: 'Seed', onClick: () => options.onAddNode?.(NODE_PATHS.SEED) },
        { id: 'sep', label: '', separator: true },
        { id: 'add-fal', label: 'Fal Flux', onClick: () => options.onAddNode?.(NODE_PATHS.FAL_FLUX) },
        { id: 'add-gemini', label: 'Gemini', onClick: () => options.onAddNode?.(NODE_PATHS.GEMINI) },
        { id: 'sep2', label: '', separator: true },
        { id: 'add-output', label: 'Image Output', onClick: () => options.onAddNode?.(NODE_PATHS.IMAGE_OUTPUT) },
      ],
    },
  ]
}
