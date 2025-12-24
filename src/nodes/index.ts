/**
 * Node registration module.
 * Registers all custom nodes with Litegraph.
 */

// Import node classes
import { PromptNode } from './input/PromptNode'
import { ImageSourceNode } from './input/ImageSourceNode'
import { SeedNode } from './input/SeedNode'
import { NumberNode } from './input/NumberNode'
import { CombinePromptsNode } from './processing/CombinePromptsNode'
import { StylePresetNode } from './processing/StylePresetNode'
import { NegativePromptNode } from './processing/NegativePromptNode'
import { ImageResizeNode } from './processing/ImageResizeNode'
import { GeminiGeneratorNode } from './generation/GeminiGeneratorNode'
import { FalFluxNode } from './generation/FalFluxNode'
import { FalVideoNode } from './generation/FalVideoNode'
import { NanoBananaNode } from './generation/NanoBananaNode'
import { ImageOutputNode } from './output/ImageOutputNode'
import { SaveImageNode } from './output/SaveImageNode'
import { GalleryNode } from './output/GalleryNode'

/**
 * Node category paths for organisation in the add menu.
 */
const NODE_PATHS = {
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

  // Output nodes
  'output/image': ImageOutputNode,
  'output/save': SaveImageNode,
  'output/gallery': GalleryNode,
} as const

/**
 * Registers all custom nodes with Litegraph.
 * Must be called after Litegraph is loaded.
 */
export function registerAllNodes(): void {
  // Dynamically import Litegraph to avoid SSR issues
  import('litegraph.js').then(({ LiteGraph }) => {
    for (const [path, NodeClass] of Object.entries(NODE_PATHS)) {
      LiteGraph.registerNodeType(path, NodeClass as unknown as typeof LiteGraph.LGraphNode)
    }

    console.log(`Registered ${Object.keys(NODE_PATHS).length} custom nodes`)
  })
}

/**
 * Gets the node class for a given type path.
 */
export function getNodeClass(path: keyof typeof NODE_PATHS) {
  return NODE_PATHS[path]
}

/**
 * Lists all available node types.
 */
export function listNodeTypes(): string[] {
  return Object.keys(NODE_PATHS)
}

// Export individual node classes for direct use
export {
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
  ImageOutputNode,
  SaveImageNode,
  GalleryNode,
}
