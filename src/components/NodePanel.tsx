import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import type { NodeClassWithMetadata } from '../nodes/base/BaseNode'

// Import all node classes from the registry
import {
  PromptNode,
  ImageSourceNode,
  SeedNode,
  NumberNode,
  CombinePromptsNode,
  StylePresetNode,
  NegativePromptNode,
  ImageResizeNode,
  ImageCropNode,
  ImageBlendNode,
  ImageAdjustNode,
  ImageFilterNode,
  AnnotationNode,
  SplitGridNode,
  GeminiGeneratorNode,
  FalFluxNode,
  FalVideoNode,
  NanoBananaNode,
  NanoBananaEditNode,
  NanoBananaProNode,
  NanoBananaProEditNode,
  ImageOutputNode,
  SaveImageNode,
  GalleryNode,
} from '../nodes'

/**
 * Node paths mapping - matches the registration in src/nodes/index.ts
 */
const NODE_PATHS: Record<string, unknown> = {
  // Input nodes
  'input/prompt': PromptNode,
  'input/image': ImageSourceNode,
  'input/seed': SeedNode,
  'input/number': NumberNode,

  // Processing nodes
  'processing/combine': CombinePromptsNode,
  'processing/style': StylePresetNode,
  'processing/negative': NegativePromptNode,
  'processing/resize': ImageResizeNode,
  'processing/crop': ImageCropNode,
  'processing/blend': ImageBlendNode,
  'processing/adjust': ImageAdjustNode,
  'processing/filter': ImageFilterNode,
  'processing/annotate': AnnotationNode,
  'processing/split-grid': SplitGridNode,

  // Generation nodes
  'generation/gemini': GeminiGeneratorNode,
  'generation/fal-flux': FalFluxNode,
  'generation/fal-video': FalVideoNode,
  'generation/nano-banana': NanoBananaNode,
  'generation/nano-banana-edit': NanoBananaEditNode,
  'generation/nano-banana-pro': NanoBananaProNode,
  'generation/nano-banana-pro-edit': NanoBananaProEditNode,

  // Output nodes
  'output/image': ImageOutputNode,
  'output/save': SaveImageNode,
  'output/gallery': GalleryNode,
}

/**
 * Category metadata with display order and icons.
 */
const CATEGORY_META: Record<string, { icon: string; order: number }> = {
  input: { icon: '📥', order: 0 },
  processing: { icon: '⚙️', order: 1 },
  generation: { icon: '✨', order: 2 },
  output: { icon: '📤', order: 3 },
}

interface NodeItem {
  type: string
  label: string
  colour: string
  description: string
}

interface NodeCategory {
  name: string
  icon: string
  nodes: NodeItem[]
}

/**
 * Builds category structure dynamically from registered nodes.
 */
function buildNodeCategories(): NodeCategory[] {
  const categoryMap = new Map<string, NodeItem[]>()

  for (const [path, NodeClass] of Object.entries(NODE_PATHS)) {
    const meta = NodeClass as unknown as NodeClassWithMetadata

    // Extract category from path (e.g., "input/prompt" -> "input")
    const category = path.split('/')[0] ?? 'unknown'

    // Get or create category array
    if (!categoryMap.has(category)) {
      categoryMap.set(category, [])
    }

    // Add node to category
    categoryMap.get(category)?.push({
      type: path,
      label: meta.title ?? path.split('/')[1] ?? 'Unknown',
      colour: (meta.nodeColour as string) ?? '#333',
      description: (meta.nodeDescription as string) ?? `${category} node`,
    })
  }

  // Convert map to sorted array
  const categories: NodeCategory[] = []

  for (const [name, nodes] of categoryMap) {
    const meta = CATEGORY_META[name]
    categories.push({
      name: name.charAt(0).toUpperCase() + name.slice(1), // Capitalize
      icon: meta?.icon ?? '📦',
      nodes,
    })
  }

  // Sort by order defined in CATEGORY_META
  categories.sort((a, b) => {
    const orderA = CATEGORY_META[a.name.toLowerCase()]?.order ?? 999
    const orderB = CATEGORY_META[b.name.toLowerCase()]?.order ?? 999
    return orderA - orderB
  })

  return categories
}

/**
 * Left side panel listing available nodes for adding to the canvas.
 * Nodes are organised by category and can be dragged onto the canvas.
 *
 * Categories and nodes are built dynamically from the node registry,
 * ensuring the sidebar always reflects all registered nodes.
 */
export function NodePanel() {
  // Build categories once on mount (memoized)
  const nodeCategories = useMemo(() => buildNodeCategories(), [])

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(nodeCategories.map(c => c.name))
  )

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Filter nodes based on search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return nodeCategories
    }

    const query = searchQuery.toLowerCase().trim()

    return nodeCategories
      .map(category => ({
        ...category,
        nodes: category.nodes.filter(
          node =>
            node.label.toLowerCase().includes(query) ||
            node.description.toLowerCase().includes(query) ||
            node.type.toLowerCase().includes(query)
        ),
      }))
      .filter(category => category.nodes.length > 0)
  }, [nodeCategories, searchQuery])

  // Flatten nodes for search results display
  const flatSearchResults = useMemo(() => {
    if (!searchQuery.trim()) return null

    const results: (NodeItem & { categoryName: string; categoryIcon: string })[] = []
    for (const category of filteredCategories) {
      for (const node of category.nodes) {
        results.push({
          ...node,
          categoryName: category.name,
          categoryIcon: category.icon,
        })
      }
    }
    return results
  }, [filteredCategories, searchQuery])

  // Keyboard shortcut: Ctrl+F or / to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.key === 'f') || (e.key === '/' && !e.ctrlKey && !e.metaKey)) {
        // Only handle if not already focused on an input
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault()
          searchInputRef.current?.focus()
        }
      }
      // Escape to clear search
      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        setSearchQuery('')
        searchInputRef.current?.blur()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const toggleCategory = useCallback((categoryName: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(categoryName)) {
        next.delete(categoryName)
      } else {
        next.add(categoryName)
      }
      return next
    })
  }, [])

  const handleDragStart = useCallback(
    (event: React.DragEvent, nodeType: string) => {
      event.dataTransfer.setData('node-type', nodeType)
      event.dataTransfer.effectAllowed = 'copy'
    },
    []
  )

  // Highlight matching text in search results
  const highlightMatch = useCallback((text: string, query: string) => {
    if (!query.trim()) return text

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)

    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-500/30 text-yellow-200 rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    )
  }, [])

  return (
    <aside className="w-56 overflow-y-auto border-r border-zinc-700 bg-zinc-800">
      <div className="p-3">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Node Library
        </h2>

        {/* Search input */}
        <div className="relative mb-3">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search nodes... (/ or Ctrl+F)"
            className="w-full rounded-md border border-zinc-600 bg-zinc-900 px-3 py-1.5 pl-8 text-sm text-zinc-200 placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <svg
            className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Search results (flat list) */}
        {flatSearchResults !== null ? (
          <div className="space-y-0.5">
            {flatSearchResults.length === 0 ? (
              <p className="py-4 text-center text-sm text-zinc-500">
                No nodes found for "{searchQuery}"
              </p>
            ) : (
              <>
                <p className="mb-2 text-xs text-zinc-500">
                  {flatSearchResults.length} node{flatSearchResults.length !== 1 ? 's' : ''} found
                </p>
                {flatSearchResults.map(node => (
                  <div
                    key={node.type}
                    draggable
                    onDragStart={e => handleDragStart(e, node.type)}
                    className="group flex cursor-grab items-center gap-2 rounded-md px-2 py-1.5 text-sm text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 active:cursor-grabbing"
                    title={node.description}
                  >
                    <span
                      className="h-2 w-2 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: node.colour }}
                    />
                    <span className="flex-1 truncate">
                      {highlightMatch(node.label, searchQuery)}
                    </span>
                    <span className="text-xs text-zinc-600">
                      {node.categoryIcon}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        ) : (
          /* Category view (default) */
          <div className="space-y-1">
            {filteredCategories.map(category => (
            <div key={category.name}>
              {/* Category header */}
              <button
                onClick={() => toggleCategory(category.name)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-medium text-zinc-300 hover:bg-zinc-700"
              >
                <span
                  className={`transition-transform ${
                    expandedCategories.has(category.name) ? 'rotate-90' : ''
                  }`}
                >
                  ▸
                </span>
                <span>{category.icon}</span>
                <span>{category.name}</span>
              </button>

              {/* Category nodes */}
              {expandedCategories.has(category.name) && (
                <div className="ml-4 mt-1 space-y-0.5">
                  {category.nodes.map(node => (
                    <div
                      key={node.type}
                      draggable
                      onDragStart={e => handleDragStart(e, node.type)}
                      className="group flex cursor-grab items-center gap-2 rounded-md px-2 py-1.5 text-sm text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 active:cursor-grabbing"
                      title={node.description}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: node.colour }}
                      />
                      <span>{node.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          </div>
        )}
      </div>
    </aside>
  )
}
