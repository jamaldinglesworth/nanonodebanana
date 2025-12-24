import { useState, useCallback } from 'react'
import { NODE_TYPE_COLOURS } from '../types/nodes'

interface NodeCategory {
  name: string
  icon: string
  nodes: NodeItem[]
}

interface NodeItem {
  type: string
  label: string
  colour: string
  description: string
}

/**
 * Node definitions organised by category.
 */
const NODE_CATEGORIES: NodeCategory[] = [
  {
    name: 'Input',
    icon: '📥',
    nodes: [
      {
        type: 'input/prompt',
        label: 'Prompt',
        colour: NODE_TYPE_COLOURS.prompt,
        description: 'Text prompt input',
      },
      {
        type: 'input/image',
        label: 'Image Source',
        colour: NODE_TYPE_COLOURS.imageSource,
        description: 'Image upload or URL',
      },
      {
        type: 'input/seed',
        label: 'Seed',
        colour: NODE_TYPE_COLOURS.seed,
        description: 'Random seed generator',
      },
      {
        type: 'input/number',
        label: 'Number',
        colour: NODE_TYPE_COLOURS.number,
        description: 'Numeric value input',
      },
    ],
  },
  {
    name: 'Processing',
    icon: '⚙️',
    nodes: [
      {
        type: 'processing/combine',
        label: 'Combine Prompts',
        colour: NODE_TYPE_COLOURS.combinePrompts,
        description: 'Merge multiple prompts',
      },
      {
        type: 'processing/style',
        label: 'Style Preset',
        colour: NODE_TYPE_COLOURS.stylePreset,
        description: 'Apply style modifiers',
      },
      {
        type: 'processing/negative',
        label: 'Negative Prompt',
        colour: NODE_TYPE_COLOURS.negativePrompt,
        description: 'Negative prompt input',
      },
      {
        type: 'processing/resize',
        label: 'Image Resize',
        colour: NODE_TYPE_COLOURS.imageResize,
        description: 'Resize or crop images',
      },
    ],
  },
  {
    name: 'Generation',
    icon: '✨',
    nodes: [
      {
        type: 'generation/gemini',
        label: 'Gemini Generator',
        colour: NODE_TYPE_COLOURS.gemini,
        description: 'Google Gemini image generation',
      },
      {
        type: 'generation/fal-flux',
        label: 'Fal Flux',
        colour: NODE_TYPE_COLOURS.falFlux,
        description: 'Fal.ai Flux model',
      },
      {
        type: 'generation/fal-video',
        label: 'Fal Video',
        colour: NODE_TYPE_COLOURS.falVideo,
        description: 'Fal.ai video generation',
      },
      {
        type: 'generation/nano-banana',
        label: 'Nano Banana',
        colour: NODE_TYPE_COLOURS.nanoBanana,
        description: 'Nano Banana image generation',
      },
    ],
  },
  {
    name: 'Output',
    icon: '📤',
    nodes: [
      {
        type: 'output/image',
        label: 'Image Output',
        colour: NODE_TYPE_COLOURS.imageOutput,
        description: 'Display generated image',
      },
      {
        type: 'output/save',
        label: 'Save Image',
        colour: NODE_TYPE_COLOURS.saveImage,
        description: 'Save to disk',
      },
      {
        type: 'output/gallery',
        label: 'Gallery',
        colour: NODE_TYPE_COLOURS.gallery,
        description: 'Multi-image gallery view',
      },
    ],
  },
]

/**
 * Left side panel listing available nodes for adding to the canvas.
 * Nodes are organised by category and can be dragged onto the canvas.
 */
export function NodePanel() {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(NODE_CATEGORIES.map(c => c.name))
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
          {NODE_CATEGORIES.map(category => (
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
