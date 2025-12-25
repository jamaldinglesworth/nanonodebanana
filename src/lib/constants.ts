/**
 * Central constants file for the NanoNodeBanana application.
 * All magic strings and repeated values should be defined here.
 */

// ============================================================================
// LOCAL STORAGE KEYS
// ============================================================================

export const STORAGE_KEYS = {
  CURRENT_WORKFLOW: 'nanonodebanana_current_workflow',
  AUTOSAVE: 'nanonodebanana_autosave',
  PROMPT_TEMPLATES: 'nanonodebanana_prompt_templates',
  SETTINGS: 'nanonodebanana_settings',
  IMAGE_HISTORY: 'nanonodebanana_image_history',
} as const

export const PNG_WORKFLOW_KEY = 'nanonodebanana:workflow'

// ============================================================================
// NODE TYPE PATHS
// ============================================================================

export const NODE_PATHS = {
  // Input nodes
  PROMPT: 'input/prompt',
  IMAGE_SOURCE: 'input/image',
  SEED: 'input/seed',
  NUMBER: 'input/number',

  // Processing nodes
  COMBINE_PROMPTS: 'processing/combine',
  STYLE_PRESET: 'processing/style',
  NEGATIVE_PROMPT: 'processing/negative',
  IMAGE_RESIZE: 'processing/resize',
  IMAGE_CROP: 'processing/crop',
  IMAGE_BLEND: 'processing/blend',
  IMAGE_ADJUST: 'processing/adjust',
  IMAGE_FILTER: 'processing/filter',
  ANNOTATION: 'processing/annotate',
  SPLIT_GRID: 'processing/split-grid',

  // Generation nodes
  GEMINI: 'generation/gemini',
  FAL_FLUX: 'generation/fal-flux',
  FAL_VIDEO: 'generation/fal-video',
  NANO_BANANA: 'generation/nano-banana',
  NANO_BANANA_EDIT: 'generation/nano-banana-edit',
  NANO_BANANA_PRO: 'generation/nano-banana-pro',
  NANO_BANANA_PRO_EDIT: 'generation/nano-banana-pro-edit',

  // Output nodes
  IMAGE_OUTPUT: 'output/image',
  SAVE_IMAGE: 'output/save',
  GALLERY: 'output/gallery',
} as const

export type NodePath = (typeof NODE_PATHS)[keyof typeof NODE_PATHS]

// ============================================================================
// IMAGE FORMATS AND MIME TYPES
// ============================================================================

export const MIME_TYPES = {
  PNG: 'image/png',
  JPEG: 'image/jpeg',
  WEBP: 'image/webp',
  GIF: 'image/gif',
  BMP: 'image/bmp',
  SVG: 'image/svg+xml',
} as const

export const ALLOWED_UPLOAD_TYPES = [
  MIME_TYPES.PNG,
  MIME_TYPES.JPEG,
  MIME_TYPES.WEBP,
  MIME_TYPES.GIF,
] as const

export const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'] as const

/**
 * Creates a data URI from base64 content.
 */
export function createDataUri(base64: string, mimeType: string = MIME_TYPES.PNG): string {
  return `data:${mimeType};base64,${base64}`
}

/**
 * Extracts base64 content from a data URI.
 */
export function extractBase64FromDataUri(dataUri: string): string | null {
  const match = dataUri.match(/^data:image\/\w+;base64,(.+)$/)
  return match ? match[1] ?? null : null
}

/**
 * Checks if a string is a valid data URI.
 */
export function isDataUri(value: string): boolean {
  return value.startsWith('data:')
}

/**
 * Gets the MIME type from a data URI.
 */
export function getMimeTypeFromDataUri(dataUri: string): string | null {
  const match = dataUri.match(/^data:(image\/\w+);base64,/)
  return match ? match[1] ?? null : null
}

// ============================================================================
// ASPECT RATIOS
// ============================================================================

export const ASPECT_RATIOS = [
  '1:1',
  '16:9',
  '9:16',
  '4:3',
  '3:4',
  '21:9',
  '9:21',
  '3:2',
  '2:3',
] as const

export type AspectRatio = (typeof ASPECT_RATIOS)[number]

// ============================================================================
// MODEL NAMES
// ============================================================================

export const GEMINI_MODELS = {
  IMAGEN_3: 'imagen-3',
  FLASH: 'gemini-2.0-flash',
} as const

export const FAL_MODELS = {
  FLUX_PRO: 'flux-pro',
  FLUX_DEV: 'flux-dev',
  FLUX_SCHNELL: 'flux-schnell',
} as const

export const NANO_BANANA_MODELS = {
  NANO_BANANA: 'nano-banana',
  NANO_BANANA_PRO: 'nano-banana-pro',
} as const

// ============================================================================
// DRAG AND DROP DATA TRANSFER TYPES
// ============================================================================

export const DRAG_DATA_TYPES = {
  NODE_TYPE: 'node-type',
  IMAGE_URL: 'image-url',
  IMAGE_HISTORY_ID: 'image-history-id',
  PROMPT_TEMPLATE: 'application/x-prompt-template',
} as const

// ============================================================================
// SIZE LIMITS
// ============================================================================

export const SIZE_LIMITS = {
  MAX_UPLOAD_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_BASE64_LENGTH: 14 * 1024 * 1024, // ~10MB after base64 encoding
  MAX_AUTOSAVE_SIZE: 2 * 1024 * 1024, // 2MB
  LARGE_STRING_THRESHOLD: 10000, // 10KB - threshold for "large" base64 strings
} as const

// ============================================================================
// ERROR MESSAGES
// ============================================================================

export const ERROR_MESSAGES = {
  NO_IMAGES_GENERATED: 'No images generated',
  NODE_NOT_FOUND: (nodeId: number) => `Node ${nodeId} not found in graph`,
  MISSING_FAL_KEY: 'FAL_KEY environment variable is not set',
  MISSING_GEMINI_KEY: 'GEMINI_API_KEY environment variable is not set',
  INVALID_WORKFLOW_FILE: 'Invalid workflow file: missing graph data',
  QUOTA_EXCEEDED: (key: string) => `localStorage quota exceeded for key: ${key}`,
} as const

// ============================================================================
// AUTOSAVE PLACEHOLDERS
// ============================================================================

export const AUTOSAVE_PLACEHOLDER = '[IMAGE_DATA_STRIPPED_FOR_AUTOSAVE]'
