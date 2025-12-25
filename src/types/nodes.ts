import type { LGraphNode, LGraph } from 'litegraph.js'

/**
 * Node categories for organisation and colour-coding.
 */
export type NodeCategory = 'input' | 'processing' | 'generation' | 'output'

/**
 * Execution status for a single node.
 */
export type ExecutionStatus = 'idle' | 'pending' | 'running' | 'completed' | 'error'

/**
 * Node execution status with additional metadata.
 */
export interface NodeExecutionStatus {
  status: ExecutionStatus
  progress?: number
  error?: string
  result?: unknown
  startTime?: number
  endTime?: number
}

/**
 * Context passed during node execution.
 */
export interface ExecutionContext {
  nodeId: string
  status: ExecutionStatus
  progress?: number
  result?: unknown
  error?: Error
}

/**
 * Execution engine interface for running workflows.
 */
export interface ExecutionEngine {
  execute(graph: LGraph): AsyncGenerator<ExecutionContext>
  executeFromNode(graph: LGraph, startNodeId: number): AsyncGenerator<ExecutionContext>
  executeNodeOnly(graph: LGraph, nodeId: number): AsyncGenerator<ExecutionContext>
  cancel(): void
  getResults(): Map<string, unknown>
}

/**
 * Base properties all custom nodes share.
 */
export interface BaseNodeProperties {
  title: string
  category: NodeCategory
  colour: string
}

/**
 * Slot type definitions for node inputs and outputs.
 */
export type SlotType = 'string' | 'number' | 'image' | 'boolean'

/**
 * Input slot definition.
 */
export interface InputSlotDef {
  name: string
  type: SlotType
  optional?: boolean
}

/**
 * Output slot definition.
 */
export interface OutputSlotDef {
  name: string
  type: SlotType
}

/**
 * Widget types supported in nodes.
 */
export type WidgetType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'slider'
  | 'toggle'
  | 'combo'
  | 'button'
  | 'image'

/**
 * Widget definition for node properties.
 */
export interface WidgetDef {
  name: string
  type: WidgetType
  defaultValue?: unknown
  options?: Record<string, unknown>
}

/**
 * Extended LGraphNode with custom workflow properties.
 */
export interface WorkflowNode extends LGraphNode {
  category: NodeCategory
  executionStatus?: ExecutionStatus
  executionProgress?: number
  executionError?: Error
  executionResult?: unknown

  /**
   * Called when the node should execute its logic.
   * @returns Promise resolving to the node's output values
   */
  onExecute?(): Promise<Record<string, unknown>>
}

/**
 * Workflow data structure for saving/loading.
 */
export interface WorkflowData {
  id: string
  name: string
  description?: string
  graph: object // Serialised LGraph data
  createdAt: string
  updatedAt: string
  thumbnail?: string
}

/**
 * API request types for image generation.
 */
export interface GeminiRequest {
  prompt: string
  negativePrompt?: string
  referenceImage?: string
  model: 'imagen-3' | 'gemini-2.0-flash'
  aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4'
  numberOfImages: number
  seed?: number
}

export interface GeminiResponse {
  images: string[]
  executionTime: number
}

export interface FalRequest {
  prompt: string
  model: 'flux-pro' | 'flux-dev' | 'flux-schnell'
  imageSize: { width: number; height: number }
  guidanceScale: number
  steps: number
  seed?: number
  referenceImage?: string
}

export interface FalResponse {
  images: string[]
  seed: number
  executionTime: number
}

export interface NanoBananaRequest {
  prompt: string
  numImages: number
  aspectRatio: '21:9' | '16:9' | '3:2' | '4:3' | '5:4' | '1:1' | '4:5' | '3:4' | '2:3' | '9:16'
  outputFormat: 'jpeg' | 'png' | 'webp'
}

export interface NanoBananaResponse {
  images: string[]
  description?: string
  executionTime: number
}

export interface NanoBananaEditRequest {
  prompt: string
  imageUrl: string
  numImages: number
  aspectRatio: 'auto' | '21:9' | '16:9' | '3:2' | '4:3' | '5:4' | '1:1' | '4:5' | '3:4' | '2:3' | '9:16'
  outputFormat: 'jpeg' | 'png' | 'webp'
}

export interface NanoBananaEditResponse {
  images: string[]
  description?: string
  executionTime: number
}

export interface NanoBananaProRequest {
  prompt: string
  numImages: number
  resolution: '1K' | '2K' | '4K'
  aspectRatio: '21:9' | '16:9' | '3:2' | '4:3' | '5:4' | '1:1' | '4:5' | '3:4' | '2:3' | '9:16'
  outputFormat: 'jpeg' | 'png' | 'webp'
  enableWebSearch: boolean
  limitGenerations: boolean
}

export interface NanoBananaProResponse {
  images: string[]
  description?: string
  executionTime: number
}

export interface NanoBananaProEditRequest {
  prompt: string
  imageUrls: string[]
  numImages: number
  resolution: '1K' | '2K' | '4K'
  aspectRatio: 'auto' | '21:9' | '16:9' | '3:2' | '4:3' | '5:4' | '1:1' | '4:5' | '3:4' | '2:3' | '9:16'
  outputFormat: 'jpeg' | 'png' | 'webp'
  enableWebSearch: boolean
  limitGenerations: boolean
}

export interface NanoBananaProEditResponse {
  images: string[]
  description?: string
  executionTime: number
}

/**
 * Node colour definitions by category (ComfyUI style - neutral grays).
 * ComfyUI uses uniform gray nodes with colorful connection slots.
 */
export const NODE_COLOURS: Record<NodeCategory, string> = {
  input: '#333',
  processing: '#333',
  generation: '#333',
  output: '#333',
}

/**
 * Individual node type colours (ComfyUI style - all use neutral gray).
 * The differentiation comes from slot colors, not node backgrounds.
 */
export const NODE_TYPE_COLOURS = {
  // Input nodes - neutral gray
  prompt: '#333',
  imageSource: '#333',
  seed: '#333',
  number: '#333',

  // Processing nodes - neutral gray
  combinePrompts: '#333',
  stylePreset: '#333',
  negativePrompt: '#333',
  imageResize: '#333',
  imageCrop: '#333',
  imageBlend: '#333',
  imageAdjust: '#333',
  imageFilter: '#333',
  splitGrid: '#333',

  // Generation nodes - neutral gray
  gemini: '#333',
  falFlux: '#333',
  falVideo: '#333',
  nanoBanana: '#333',
  nanoBananaEdit: '#333',
  nanoBananaPro: '#333',
  nanoBananaProEdit: '#333',

  // Output nodes - neutral gray
  imageOutput: '#333',
  saveImage: '#333',
  gallery: '#333',
} as const

/**
 * Slot type colors (ComfyUI style).
 * These colors differentiate connection types visually.
 */
export const SLOT_TYPE_COLOURS = {
  string: '#9F9',      // Green for text
  number: '#99F',      // Blue for numbers
  image: '#64B5F6',    // Light blue for images
  boolean: '#F99',     // Red/pink for booleans
  any: '#AAA',         // Gray for generic
} as const
