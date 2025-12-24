import type {
  GeminiRequest,
  GeminiResponse,
  FalRequest,
  FalResponse,
  NanoBananaRequest,
  NanoBananaResponse,
  NanoBananaEditRequest,
  NanoBananaEditResponse,
  NanoBananaProRequest,
  NanoBananaProResponse,
  NanoBananaProEditRequest,
  NanoBananaProEditResponse,
  WorkflowData,
} from '../types/nodes'

const API_BASE = '/api'

/**
 * Generic fetch wrapper with error handling.
 */
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message || `HTTP ${response.status}`)
  }

  return response.json()
}

/**
 * Image generation API client.
 */
export const generateApi = {
  /**
   * Generate images using Google Gemini.
   */
  async gemini(request: GeminiRequest): Promise<GeminiResponse> {
    return fetchApi<GeminiResponse>('/generate/gemini', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  },

  /**
   * Generate images using Fal.ai Flux.
   */
  async fal(request: FalRequest): Promise<FalResponse> {
    return fetchApi<FalResponse>('/generate/fal', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  },

  /**
   * Generate images using Nano Banana model.
   */
  async nanoBanana(request: NanoBananaRequest): Promise<NanoBananaResponse> {
    return fetchApi<NanoBananaResponse>('/generate/nano-banana', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  },

  /**
   * Edit images using Nano Banana Edit model.
   */
  async nanoBananaEdit(request: NanoBananaEditRequest): Promise<NanoBananaEditResponse> {
    return fetchApi<NanoBananaEditResponse>('/generate/nano-banana-edit', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  },

  /**
   * Generate images using Nano Banana Pro model.
   */
  async nanoBananaPro(request: NanoBananaProRequest): Promise<NanoBananaProResponse> {
    return fetchApi<NanoBananaProResponse>('/generate/nano-banana-pro', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  },

  /**
   * Edit images using Nano Banana Pro Edit model.
   */
  async nanoBananaProEdit(request: NanoBananaProEditRequest): Promise<NanoBananaProEditResponse> {
    return fetchApi<NanoBananaProEditResponse>('/generate/nano-banana-pro-edit', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  },
}

/**
 * Workflow management API client.
 */
export const workflowApi = {
  /**
   * List all saved workflows.
   */
  async list(): Promise<WorkflowData[]> {
    return fetchApi<WorkflowData[]>('/workflows')
  },

  /**
   * Get a single workflow by ID.
   */
  async get(id: string): Promise<WorkflowData> {
    return fetchApi<WorkflowData>(`/workflows/${id}`)
  },

  /**
   * Create a new workflow.
   */
  async create(
    data: Omit<WorkflowData, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<WorkflowData> {
    return fetchApi<WorkflowData>('/workflows', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  /**
   * Update an existing workflow.
   */
  async update(
    id: string,
    data: Partial<Omit<WorkflowData, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<WorkflowData> {
    return fetchApi<WorkflowData>(`/workflows/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  /**
   * Delete a workflow.
   */
  async delete(id: string): Promise<void> {
    await fetchApi(`/workflows/${id}`, {
      method: 'DELETE',
    })
  },
}

/**
 * File upload API client.
 */
export const uploadApi = {
  /**
   * Upload an image file.
   */
  async image(file: File): Promise<{ url: string; base64: string }> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${API_BASE}/upload/image`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }))
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    return response.json()
  },
}
