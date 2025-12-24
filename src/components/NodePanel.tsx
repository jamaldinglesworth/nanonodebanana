import { useState, useCallback, useMemo } from 'react'
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

  return (
    <aside className="w-56 overflow-y-auto border-r border-zinc-700 bg-zinc-800">
      <div className="p-3">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Node Library
        </h2>

        <div className="space-y-1">
          {nodeCategories.map(category => (
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
      </div>
    </aside>
  )
}
