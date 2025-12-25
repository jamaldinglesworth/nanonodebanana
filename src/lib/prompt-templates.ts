/**
 * Prompt Templates Library
 *
 * Provides built-in and user-created prompt templates for AI image generation.
 * Templates can contain variables like {subject} that are replaced at insertion time.
 */

import { STORAGE_KEYS } from './constants'

export interface PromptTemplate {
  id: string
  name: string
  category: TemplateCategory
  content: string
  description?: string
  variables?: string[]
  isBuiltIn: boolean
  createdAt?: string
  updatedAt?: string
}

export type TemplateCategory =
  | 'photography'
  | 'art-style'
  | 'quality'
  | 'lighting'
  | 'composition'
  | 'character'
  | 'environment'
  | 'negative'
  | 'custom'

export const TEMPLATE_CATEGORIES: Record<TemplateCategory, { label: string; icon: string }> = {
  'photography': { label: 'Photography', icon: '📷' },
  'art-style': { label: 'Art Styles', icon: '🎨' },
  'quality': { label: 'Quality Boosters', icon: '✨' },
  'lighting': { label: 'Lighting', icon: '💡' },
  'composition': { label: 'Composition', icon: '🖼️' },
  'character': { label: 'Characters', icon: '👤' },
  'environment': { label: 'Environments', icon: '🌍' },
  'negative': { label: 'Negative Prompts', icon: '🚫' },
  'custom': { label: 'Custom', icon: '📝' },
}

/**
 * Extract variable names from a template string.
 * Variables are enclosed in curly braces: {variableName}
 */
export function extractVariables(content: string): string[] {
  const matches = content.match(/\{([^}]+)\}/g)
  if (!matches) return []
  return [...new Set(matches.map(m => m.slice(1, -1)))]
}

/**
 * Replace variables in a template with provided values.
 */
export function applyVariables(
  content: string,
  variables: Record<string, string>
): string {
  let result = content
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
  }
  return result
}

/**
 * Built-in prompt templates organized by category.
 */
export const BUILT_IN_TEMPLATES: PromptTemplate[] = [
  // Photography
  {
    id: 'photo-portrait',
    name: 'Portrait Photo',
    category: 'photography',
    content: 'professional portrait photography of {subject}, shot on Canon EOS R5, 85mm f/1.4 lens, shallow depth of field, studio lighting, high resolution',
    description: 'Professional portrait style photography',
    variables: ['subject'],
    isBuiltIn: true,
  },
  {
    id: 'photo-landscape',
    name: 'Landscape Photo',
    category: 'photography',
    content: 'breathtaking landscape photography of {subject}, golden hour, dramatic sky, shot on Sony A7R IV, ultra wide angle lens, high dynamic range',
    description: 'Stunning landscape photography',
    variables: ['subject'],
    isBuiltIn: true,
  },
  {
    id: 'photo-macro',
    name: 'Macro Photo',
    category: 'photography',
    content: 'extreme macro photography of {subject}, incredible detail, focus stacking, studio lighting, scientific precision, Laowa macro lens',
    description: 'Detailed macro photography',
    variables: ['subject'],
    isBuiltIn: true,
  },
  {
    id: 'photo-street',
    name: 'Street Photography',
    category: 'photography',
    content: 'candid street photography, {subject}, urban environment, natural lighting, cinematic composition, Leica M10 style, documentary aesthetic',
    description: 'Urban street photography style',
    variables: ['subject'],
    isBuiltIn: true,
  },

  // Art Styles
  {
    id: 'style-oil-painting',
    name: 'Oil Painting',
    category: 'art-style',
    content: 'oil painting of {subject}, masterful brushwork, rich colors, textured canvas, classical technique, museum quality, reminiscent of {artist}',
    description: 'Classical oil painting style',
    variables: ['subject', 'artist'],
    isBuiltIn: true,
  },
  {
    id: 'style-watercolor',
    name: 'Watercolor',
    category: 'art-style',
    content: 'delicate watercolor painting of {subject}, soft washes, flowing colors, visible paper texture, ethereal quality, fine art illustration',
    description: 'Soft watercolor illustration',
    variables: ['subject'],
    isBuiltIn: true,
  },
  {
    id: 'style-anime',
    name: 'Anime Style',
    category: 'art-style',
    content: 'anime style illustration of {subject}, vibrant colors, clean linework, expressive eyes, dynamic pose, studio quality, trending on pixiv',
    description: 'Japanese anime art style',
    variables: ['subject'],
    isBuiltIn: true,
  },
  {
    id: 'style-cyberpunk',
    name: 'Cyberpunk',
    category: 'art-style',
    content: 'cyberpunk aesthetic, {subject}, neon lights, rain-slicked streets, holographic advertisements, dystopian future, blade runner inspired',
    description: 'Futuristic cyberpunk style',
    variables: ['subject'],
    isBuiltIn: true,
  },
  {
    id: 'style-3d-render',
    name: '3D Render',
    category: 'art-style',
    content: 'photorealistic 3D render of {subject}, Octane render, 8K resolution, subsurface scattering, volumetric lighting, studio setup',
    description: 'Professional 3D rendering',
    variables: ['subject'],
    isBuiltIn: true,
  },

  // Quality Boosters
  {
    id: 'quality-high',
    name: 'High Quality',
    category: 'quality',
    content: 'masterpiece, best quality, highly detailed, 8K UHD, professional, award-winning',
    description: 'Standard quality enhancers',
    isBuiltIn: true,
  },
  {
    id: 'quality-ultra',
    name: 'Ultra Quality',
    category: 'quality',
    content: 'masterpiece, exceptional quality, extremely detailed, 16K resolution, perfect composition, trending on artstation, featured on behance',
    description: 'Maximum quality boosters',
    isBuiltIn: true,
  },
  {
    id: 'quality-photo-real',
    name: 'Photorealistic',
    category: 'quality',
    content: 'photorealistic, hyperrealistic, lifelike, RAW photo, shot on ARRI, 35mm film grain, natural skin texture',
    description: 'Photorealism enhancers',
    isBuiltIn: true,
  },

  // Lighting
  {
    id: 'light-golden-hour',
    name: 'Golden Hour',
    category: 'lighting',
    content: 'golden hour lighting, warm sunlight, long shadows, magical atmosphere, romantic mood',
    description: 'Warm sunset/sunrise lighting',
    isBuiltIn: true,
  },
  {
    id: 'light-studio',
    name: 'Studio Lighting',
    category: 'lighting',
    content: 'professional studio lighting, three-point lighting setup, soft shadows, even illumination, controlled environment',
    description: 'Professional studio setup',
    isBuiltIn: true,
  },
  {
    id: 'light-dramatic',
    name: 'Dramatic Lighting',
    category: 'lighting',
    content: 'dramatic chiaroscuro lighting, deep shadows, high contrast, cinematic mood, Rembrandt lighting',
    description: 'High contrast dramatic lighting',
    isBuiltIn: true,
  },
  {
    id: 'light-neon',
    name: 'Neon Glow',
    category: 'lighting',
    content: 'neon lighting, vibrant glow, color bleeding, cyberpunk atmosphere, RGB accents, reflective surfaces',
    description: 'Colorful neon lighting',
    isBuiltIn: true,
  },

  // Composition
  {
    id: 'comp-cinematic',
    name: 'Cinematic',
    category: 'composition',
    content: 'cinematic composition, widescreen aspect ratio, film grain, anamorphic lens flare, movie still',
    description: 'Film-like composition',
    isBuiltIn: true,
  },
  {
    id: 'comp-symmetry',
    name: 'Symmetrical',
    category: 'composition',
    content: 'perfect symmetry, centered composition, balanced framing, geometric precision, satisfying arrangement',
    description: 'Symmetrical balanced composition',
    isBuiltIn: true,
  },
  {
    id: 'comp-rule-thirds',
    name: 'Rule of Thirds',
    category: 'composition',
    content: 'rule of thirds composition, off-center subject, dynamic framing, visual interest, professional photography',
    description: 'Classic photography composition',
    isBuiltIn: true,
  },

  // Characters
  {
    id: 'char-fantasy-warrior',
    name: 'Fantasy Warrior',
    category: 'character',
    content: 'epic fantasy warrior, {gender}, ornate armor, magical weapon, battle-ready stance, heroic pose, detailed costume design',
    description: 'Fantasy warrior character',
    variables: ['gender'],
    isBuiltIn: true,
  },
  {
    id: 'char-sci-fi',
    name: 'Sci-Fi Character',
    category: 'character',
    content: 'futuristic sci-fi character, {gender}, advanced technology, sleek suit, holographic interface, cybernetic enhancements',
    description: 'Science fiction character',
    variables: ['gender'],
    isBuiltIn: true,
  },

  // Environments
  {
    id: 'env-fantasy-forest',
    name: 'Fantasy Forest',
    category: 'environment',
    content: 'enchanted fantasy forest, ancient trees, magical creatures, bioluminescent plants, mystical fog, fairy tale atmosphere',
    description: 'Magical forest environment',
    isBuiltIn: true,
  },
  {
    id: 'env-futuristic-city',
    name: 'Futuristic City',
    category: 'environment',
    content: 'futuristic cityscape, towering skyscrapers, flying vehicles, holographic billboards, advanced architecture, night scene',
    description: 'Sci-fi urban environment',
    isBuiltIn: true,
  },
  {
    id: 'env-cozy-interior',
    name: 'Cozy Interior',
    category: 'environment',
    content: 'cozy interior design, warm lighting, comfortable furniture, plants, books, hygge aesthetic, inviting atmosphere',
    description: 'Warm interior space',
    isBuiltIn: true,
  },

  // Negative Prompts
  {
    id: 'neg-standard',
    name: 'Standard Negative',
    category: 'negative',
    content: 'blurry, low quality, distorted, deformed, ugly, bad anatomy, disfigured, poorly drawn, extra limbs, missing limbs',
    description: 'Common quality issues to avoid',
    isBuiltIn: true,
  },
  {
    id: 'neg-photo',
    name: 'Photo Negative',
    category: 'negative',
    content: 'cartoon, illustration, painting, drawing, art, sketch, anime, oversaturated, overexposed, underexposed, noise',
    description: 'Avoid non-photorealistic elements',
    isBuiltIn: true,
  },
  {
    id: 'neg-portrait',
    name: 'Portrait Negative',
    category: 'negative',
    content: 'bad anatomy, deformed face, ugly, asymmetrical eyes, bad proportions, extra fingers, mutated hands, poorly drawn face',
    description: 'Portrait-specific issues to avoid',
    isBuiltIn: true,
  },
]

/**
 * Load user-created templates from localStorage.
 */
export function loadUserTemplates(): PromptTemplate[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.PROMPT_TEMPLATES)
    if (!stored) return []
    return JSON.parse(stored)
  } catch {
    console.warn('Failed to load user templates from localStorage')
    return []
  }
}

/**
 * Save user-created templates to localStorage.
 */
export function saveUserTemplates(templates: PromptTemplate[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PROMPT_TEMPLATES, JSON.stringify(templates))
  } catch (error) {
    console.error('Failed to save user templates:', error)
  }
}

/**
 * Get all templates (built-in + user-created).
 */
export function getAllTemplates(): PromptTemplate[] {
  const userTemplates = loadUserTemplates()
  return [...BUILT_IN_TEMPLATES, ...userTemplates]
}

/**
 * Get templates grouped by category.
 */
export function getTemplatesByCategory(): Map<TemplateCategory, PromptTemplate[]> {
  const templates = getAllTemplates()
  const grouped = new Map<TemplateCategory, PromptTemplate[]>()

  for (const template of templates) {
    const existing = grouped.get(template.category) || []
    existing.push(template)
    grouped.set(template.category, existing)
  }

  return grouped
}

/**
 * Create a new user template.
 */
export function createTemplate(
  name: string,
  content: string,
  category: TemplateCategory = 'custom',
  description?: string
): PromptTemplate {
  const template: PromptTemplate = {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name,
    content,
    category,
    description,
    variables: extractVariables(content),
    isBuiltIn: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const userTemplates = loadUserTemplates()
  userTemplates.push(template)
  saveUserTemplates(userTemplates)

  return template
}

/**
 * Update an existing user template.
 */
export function updateTemplate(
  id: string,
  updates: Partial<Pick<PromptTemplate, 'name' | 'content' | 'category' | 'description'>>
): PromptTemplate | null {
  const userTemplates = loadUserTemplates()
  const index = userTemplates.findIndex(t => t.id === id)

  if (index === -1) return null

  const template = userTemplates[index]!
  const updated: PromptTemplate = {
    ...template,
    ...updates,
    variables: updates.content ? extractVariables(updates.content) : template.variables,
    updatedAt: new Date().toISOString(),
  }

  userTemplates[index] = updated
  saveUserTemplates(userTemplates)

  return updated
}

/**
 * Delete a user template.
 */
export function deleteTemplate(id: string): boolean {
  const userTemplates = loadUserTemplates()
  const index = userTemplates.findIndex(t => t.id === id)

  if (index === -1) return false

  userTemplates.splice(index, 1)
  saveUserTemplates(userTemplates)

  return true
}

/**
 * Search templates by name or content.
 */
export function searchTemplates(query: string): PromptTemplate[] {
  if (!query.trim()) return getAllTemplates()

  const lowerQuery = query.toLowerCase()
  return getAllTemplates().filter(
    t =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.content.toLowerCase().includes(lowerQuery) ||
      t.description?.toLowerCase().includes(lowerQuery)
  )
}
