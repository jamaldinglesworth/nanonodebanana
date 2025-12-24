# feat: Add NanoBananaPro Image Generation Node

## Overview

Add a new `NanoBananaPro` node to the visual workflow editor that leverages Fal.ai's enhanced Nano Banana Pro model (`fal-ai/nano-banana-pro`). This model provides additional features over the standard Nano Banana model, including **resolution control** (1K/2K/4K), **web search integration**, and specialized **realism and typography** capabilities.

## Problem Statement / Motivation

The existing `NanoBananaNode` uses the standard `fal-ai/nano-banana` model. The Pro version offers:
- **Higher resolution outputs**: 1K, 2K, or 4K options vs. fixed resolution
- **Web search integration**: Generates images using latest web information for current events/trends
- **Better realism and typography**: Specialized for photorealistic outputs and text rendering

Users need access to these advanced features for professional-quality image generation workflows.

## Proposed Solution

Create a complete NanoBananaPro integration following the established patterns:
1. Backend service function for Fal.ai `nano-banana-pro` endpoint
2. API route with request validation
3. Frontend API client method
4. TypeScript type definitions
5. Node class with appropriate widgets
6. Node registration

---

## Technical Approach

### API Specification (from OpenAPI)

**Endpoint**: `fal-ai/nano-banana-pro`

**Input Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `prompt` | string (3-50000 chars) | required | Text description |
| `num_images` | integer (1-4) | 1 | Number of images |
| `resolution` | enum | "1K" | "1K", "2K", "4K" |
| `aspect_ratio` | enum | "1:1" | 10 ratios from 21:9 to 9:16 |
| `output_format` | enum | "png" | "jpeg", "png", "webp" |
| `enable_web_search` | boolean | false | Use latest web info |
| `limit_generations` | boolean | false | Restrict to 1 image |

**Output**:
- `images`: Array of `{ url, content_type, file_name, file_size, width, height }`
- `description`: Generated image description text

---

## Implementation Phases

### Phase 1: Backend Service

Create `server/services/nano-banana-pro.ts`:

```typescript
// server/services/nano-banana-pro.ts
import { fal } from '@fal-ai/client'

interface NanoBananaProParams {
  prompt: string
  numImages: number
  resolution: '1K' | '2K' | '4K'
  aspectRatio: string
  outputFormat: 'jpeg' | 'png' | 'webp'
  enableWebSearch: boolean
  limitGenerations: boolean
}

interface NanoBananaProResult {
  images: string[]
  description?: string
}

function configureClient(): void {
  const apiKey = process.env.FAL_KEY
  if (!apiKey) {
    throw new Error('FAL_KEY environment variable is not set')
  }
  fal.config({ credentials: apiKey })
}

export async function generateWithNanoBananaPro(
  params: NanoBananaProParams
): Promise<NanoBananaProResult> {
  configureClient()

  try {
    const result = await fal.subscribe('fal-ai/nano-banana-pro', {
      input: {
        prompt: params.prompt,
        num_images: params.numImages,
        resolution: params.resolution,
        aspect_ratio: params.aspectRatio,
        output_format: params.outputFormat,
        enable_web_search: params.enableWebSearch,
        limit_generations: params.limitGenerations,
      },
      logs: true,
    })

    // Extract images from result
    const images: string[] = []
    const resultData = result.data as {
      images?: Array<{ url?: string; base64?: string }>
      description?: string
    }

    if (resultData.images) {
      for (const image of resultData.images) {
        if (image.base64) {
          images.push(image.base64)
        } else if (image.url) {
          const response = await fetch(image.url)
          const buffer = await response.arrayBuffer()
          const base64 = Buffer.from(buffer).toString('base64')
          images.push(base64)
        }
      }
    }

    if (images.length === 0) {
      throw new Error('No images generated')
    }

    return { images, description: resultData.description }
  } catch (error) {
    console.error('Nano Banana Pro generation error:', error)
    throw new Error(
      `Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}
```

### Phase 2: Type Definitions

Add to `src/types/nodes.ts`:

```typescript
// Add to src/types/nodes.ts

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

// Add to NODE_TYPE_COLOURS
nanoBananaPro: '#333',
```

### Phase 3: API Route

Add to `server/routes/generate.ts`:

```typescript
// Add import
import { generateWithNanoBananaPro } from '../services/nano-banana-pro'

// Add route after nano-banana-edit
.post(
  '/nano-banana-pro',
  async ({ body }) => {
    const startTime = Date.now()

    const result = await generateWithNanoBananaPro({
      prompt: body.prompt,
      numImages: body.numImages,
      resolution: body.resolution,
      aspectRatio: body.aspectRatio,
      outputFormat: body.outputFormat,
      enableWebSearch: body.enableWebSearch,
      limitGenerations: body.limitGenerations,
    })

    const executionTime = Date.now() - startTime

    return {
      images: result.images,
      description: result.description,
      executionTime,
    }
  },
  {
    body: t.Object({
      prompt: t.String({ minLength: 3, maxLength: 50000 }),
      numImages: t.Number({ minimum: 1, maximum: 4, default: 1 }),
      resolution: t.Union([
        t.Literal('1K'),
        t.Literal('2K'),
        t.Literal('4K'),
      ]),
      aspectRatio: t.Union([
        t.Literal('21:9'),
        t.Literal('16:9'),
        t.Literal('3:2'),
        t.Literal('4:3'),
        t.Literal('5:4'),
        t.Literal('1:1'),
        t.Literal('4:5'),
        t.Literal('3:4'),
        t.Literal('2:3'),
        t.Literal('9:16'),
      ]),
      outputFormat: t.Union([
        t.Literal('jpeg'),
        t.Literal('png'),
        t.Literal('webp'),
      ]),
      enableWebSearch: t.Boolean({ default: false }),
      limitGenerations: t.Boolean({ default: false }),
    }),
  }
)
```

### Phase 4: API Client

Add to `src/lib/api-client.ts`:

```typescript
// Add to import
import type {
  // ... existing imports
  NanoBananaProRequest,
  NanoBananaProResponse,
} from '../types/nodes'

// Add to generateApi object
async nanoBananaPro(request: NanoBananaProRequest): Promise<NanoBananaProResponse> {
  return fetchApi<NanoBananaProResponse>('/generate/nano-banana-pro', {
    method: 'POST',
    body: JSON.stringify(request),
  })
},
```

### Phase 5: Node Class

Create `src/nodes/generation/NanoBananaProNode.ts`:

```typescript
// src/nodes/generation/NanoBananaProNode.ts
import { createNodeClass, getInputValue, getWidgetValue, type ExecutableNode } from '../base/BaseNode'
import { NODE_TYPE_COLOURS } from '../../types/nodes'
import { generateApi } from '../../lib/api-client'

const ASPECT_RATIOS = [
  '1:1',
  '16:9',
  '9:16',
  '4:3',
  '3:4',
  '3:2',
  '2:3',
  '21:9',
  '5:4',
  '4:5',
] as const

const RESOLUTIONS = ['1K', '2K', '4K'] as const
const OUTPUT_FORMATS = ['png', 'jpeg', 'webp'] as const

export const NanoBananaProNode = createNodeClass(
  {
    title: 'Nano Banana Pro',
    category: 'generation',
    colour: NODE_TYPE_COLOURS.nanoBananaPro,
    inputs: [
      { name: 'prompt', type: 'string' },
    ],
    outputs: [
      { name: 'image', type: 'image' },
      { name: 'description', type: 'string' },
    ],
    widgets: [
      {
        name: 'resolution',
        type: 'combo',
        defaultValue: '1K',
        options: { values: [...RESOLUTIONS] },
      },
      {
        name: 'aspect_ratio',
        type: 'combo',
        defaultValue: '1:1',
        options: { values: [...ASPECT_RATIOS] },
      },
      {
        name: 'num_images',
        type: 'combo',
        defaultValue: '1',
        options: { values: ['1', '2', '3', '4'] },
      },
      {
        name: 'output_format',
        type: 'combo',
        defaultValue: 'png',
        options: { values: [...OUTPUT_FORMATS] },
      },
      {
        name: 'enable_web_search',
        type: 'toggle',
        defaultValue: false,
      },
      {
        name: 'limit_generations',
        type: 'toggle',
        defaultValue: false,
      },
    ],
    properties: {
      resolution: '1K',
      aspect_ratio: '1:1',
      num_images: '1',
      output_format: 'png',
      enable_web_search: false,
      limit_generations: false,
      executionTime: 0,
      description: '',
    },
    resizable: true,
    showProgressIndicator: true,
  },
  async (node: ExecutableNode) => {
    const prompt = getInputValue<string>(node, 'prompt')

    const resolution = getWidgetValue<string>(node, 'resolution') ?? '1K'
    const aspectRatio = getWidgetValue<string>(node, 'aspect_ratio') ?? '1:1'
    const numImagesStr = getWidgetValue<string>(node, 'num_images') ?? '1'
    const outputFormat = getWidgetValue<string>(node, 'output_format') ?? 'png'
    const enableWebSearch = getWidgetValue<boolean>(node, 'enable_web_search') ?? false
    const limitGenerations = getWidgetValue<boolean>(node, 'limit_generations') ?? false

    if (!prompt) {
      throw new Error('Prompt is required')
    }

    const numImages = parseInt(numImagesStr, 10)

    const response = await generateApi.nanoBananaPro({
      prompt,
      numImages,
      resolution: resolution as '1K' | '2K' | '4K',
      aspectRatio: aspectRatio as '21:9' | '16:9' | '3:2' | '4:3' | '5:4' | '1:1' | '4:5' | '3:4' | '2:3' | '9:16',
      outputFormat: outputFormat as 'jpeg' | 'png' | 'webp',
      enableWebSearch,
      limitGenerations,
    })

    node.setProperty('executionTime', response.executionTime)
    node.setProperty('description', response.description ?? '')

    const image = response.images[0] ?? ''

    node.setOutputData(0, image)
    node.setOutputData(1, response.description ?? '')

    return { image, description: response.description }
  }
)
```

### Phase 6: Node Registration

Update `src/nodes/index.ts`:

```typescript
// Add import
import { NanoBananaProNode } from './generation/NanoBananaProNode'

// Add to NODE_PATHS
'generation/nano-banana-pro': NanoBananaProNode,

// Add to exports
export { NanoBananaProNode }
```

---

## Acceptance Criteria

### Functional Requirements

- [ ] Node appears in generation category menu as "Nano Banana Pro"
- [ ] Node accepts prompt input via connection
- [ ] Node outputs image and description
- [ ] Resolution selector works (1K/2K/4K)
- [ ] Aspect ratio selector works (10 options)
- [ ] Num images selector works (1-4)
- [ ] Output format selector works (jpeg/png/webp)
- [ ] Web search toggle enables/disables web search
- [ ] Limit generations toggle functions correctly
- [ ] Progress indicator displays during generation
- [ ] Node is resizable

### Non-Functional Requirements

- [ ] Type safety: All TypeScript types properly defined
- [ ] Error handling: Descriptive errors on failure
- [ ] Code style: Follows existing patterns exactly
- [ ] No regressions: Existing nodes unaffected

### Quality Gates

- [ ] `bun run typecheck` passes
- [ ] `bun run lint` passes
- [ ] Manual testing with workflow execution

---

## Files to Create/Modify

### New Files
1. `server/services/nano-banana-pro.ts` - Backend service
2. `src/nodes/generation/NanoBananaProNode.ts` - Node class

### Modified Files
1. `src/types/nodes.ts` - Add types and color
2. `server/routes/generate.ts` - Add API route
3. `src/lib/api-client.ts` - Add API client method
4. `src/nodes/index.ts` - Register node

---

## References

### Internal References
- Existing NanoBananaNode: `src/nodes/generation/NanoBananaNode.ts:30-112`
- Nano Banana service: `server/services/nano-banana.ts:1-91`
- API route patterns: `server/routes/generate.ts:114-157`
- Type definitions: `src/types/nodes.ts:163-174`
- Node registration: `src/nodes/index.ts:27-51`

### External References
- [Fal.ai Nano Banana Pro Model](https://fal.ai/models/fal-ai/nano-banana-pro)
- [Fal.ai OpenAPI Spec](https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=fal-ai/nano-banana-pro)
- [Fal.ai JavaScript Client](https://github.com/fal-ai/fal-js)
