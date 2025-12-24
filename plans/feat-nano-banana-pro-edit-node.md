# feat: Nano Banana Pro Edit Node

## Overview

Create a new **Nano Banana Pro Edit** node that combines the image editing capabilities of `fal-ai/nano-banana-pro/edit` with the Pro model's enhanced features (resolution control, web search integration).

This node is a hybrid of:
- **Nano Banana Edit** - Takes input images for editing
- **Nano Banana Pro** - Has resolution control, web search, and limit generations options

## Problem Statement

Users currently have two separate Nano Banana nodes:
1. `Nano Banana Edit` - For image editing but lacks resolution control and web search
2. `Nano Banana Pro` - Has advanced features but only generates from prompts (no image input)

The new `fal-ai/nano-banana-pro/edit` API combines both capabilities, enabling users to edit existing images with Pro-level quality and features.

## API Specification

**Endpoint**: `fal-ai/nano-banana-pro/edit`

### Input Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `prompt` | string | ✓ | — | Image editing instruction (3-50,000 chars) |
| `image_urls` | list<string> | ✓ | — | Source images for editing |
| `num_images` | integer | ✗ | 1 | Number of images (1-4) |
| `aspect_ratio` | enum | ✗ | "auto" | auto, 21:9, 16:9, 3:2, 4:3, 5:4, 1:1, 4:5, 3:4, 2:3, 9:16 |
| `output_format` | enum | ✗ | "png" | jpeg, png, webp |
| `resolution` | enum | ✗ | "1K" | 1K, 2K, 4K |
| `enable_web_search` | boolean | ✗ | false | Use web data for generation |
| `limit_generations` | boolean | ✗ | false | Restrict to 1 image per prompt |

### Output

```typescript
{
  images: Array<{ url: string; content_type?: string; file_name?: string }>;
  description: string;
}
```

## Technical Approach

### Files to Create

1. **`server/services/nano-banana-pro-edit.ts`** - Fal.ai API integration service
2. **`src/nodes/generation/NanoBananaProEditNode.ts`** - Frontend node class

### Files to Modify

1. **`src/types/nodes.ts`** - Add request/response types and colour constant
2. **`src/lib/api-client.ts`** - Add API client method
3. **`server/routes/generate.ts`** - Add route handler
4. **`src/nodes/index.ts`** - Register the new node

## Implementation Phases

### Phase 1: Backend Service

Create `server/services/nano-banana-pro-edit.ts`:

```typescript
// server/services/nano-banana-pro-edit.ts
import { fal } from '@fal-ai/client'

interface NanoBananaProEditParams {
  prompt: string
  imageUrls: string[]
  numImages: number
  resolution: '1K' | '2K' | '4K'
  aspectRatio: string
  outputFormat: 'jpeg' | 'png' | 'webp'
  enableWebSearch: boolean
  limitGenerations: boolean
}

interface NanoBananaProEditResult {
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

export async function editWithNanoBananaPro(
  params: NanoBananaProEditParams
): Promise<NanoBananaProEditResult> {
  configureClient()

  const result = await fal.subscribe('fal-ai/nano-banana-pro/edit', {
    input: {
      prompt: params.prompt,
      image_urls: params.imageUrls,
      num_images: params.numImages,
      resolution: params.resolution,
      aspect_ratio: params.aspectRatio,
      output_format: params.outputFormat,
      enable_web_search: params.enableWebSearch,
      limit_generations: params.limitGenerations,
    },
    logs: true,
  })

  // Extract images (convert URLs to base64)
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
}
```

### Phase 2: Type Definitions

Add to `src/types/nodes.ts`:

```typescript
// Request type
export interface NanoBananaProEditRequest {
  prompt: string
  imageUrl: string
  numImages: number
  resolution: '1K' | '2K' | '4K'
  aspectRatio: 'auto' | '21:9' | '16:9' | '3:2' | '4:3' | '5:4' | '1:1' | '4:5' | '3:4' | '2:3' | '9:16'
  outputFormat: 'jpeg' | 'png' | 'webp'
  enableWebSearch: boolean
  limitGenerations: boolean
}

// Response type
export interface NanoBananaProEditResponse {
  images: string[]
  description?: string
  executionTime: number
}

// Add to NODE_TYPE_COLOURS
nanoBananaProEdit: '#333',
```

### Phase 3: API Client

Add to `src/lib/api-client.ts`:

```typescript
import type { NanoBananaProEditRequest, NanoBananaProEditResponse } from '../types/nodes'

// In generateApi object:
async nanoBananaProEdit(request: NanoBananaProEditRequest): Promise<NanoBananaProEditResponse> {
  return fetchApi<NanoBananaProEditResponse>('/generate/nano-banana-pro-edit', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}
```

### Phase 4: Server Route

Add to `server/routes/generate.ts`:

```typescript
import { editWithNanoBananaPro } from '../services/nano-banana-pro-edit'

// Add route:
.post(
  '/nano-banana-pro-edit',
  async ({ body }) => {
    const startTime = Date.now()

    const result = await editWithNanoBananaPro({
      prompt: body.prompt,
      imageUrls: [body.imageUrl], // API expects array
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
      imageUrl: t.String({ minLength: 1 }),
      numImages: t.Number({ minimum: 1, maximum: 4, default: 1 }),
      resolution: t.Union([
        t.Literal('1K'),
        t.Literal('2K'),
        t.Literal('4K'),
      ]),
      aspectRatio: t.Union([
        t.Literal('auto'),
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

### Phase 5: Frontend Node

Create `src/nodes/generation/NanoBananaProEditNode.ts`:

```typescript
import { createNodeClass, getInputValue, getWidgetValue, type ExecutableNode } from '../base/BaseNode'
import { NODE_TYPE_COLOURS } from '../../types/nodes'
import { generateApi } from '../../lib/api-client'

const ASPECT_RATIOS = [
  'auto', '1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '21:9', '5:4', '4:5',
] as const

const RESOLUTIONS = ['1K', '2K', '4K'] as const
const OUTPUT_FORMATS = ['png', 'jpeg', 'webp'] as const

export const NanoBananaProEditNode = createNodeClass(
  {
    title: 'Nano Banana Pro Edit',
    category: 'generation',
    colour: NODE_TYPE_COLOURS.nanoBananaProEdit,
    description: 'Pro image editing with resolution control & web search',
    inputs: [
      { name: 'image', type: 'image' },
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
        defaultValue: 'auto',
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
      aspect_ratio: 'auto',
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
    const image = getInputValue<string>(node, 'image')
    const prompt = getInputValue<string>(node, 'prompt')

    const resolution = getWidgetValue<string>(node, 'resolution') ?? '1K'
    const aspectRatio = getWidgetValue<string>(node, 'aspect_ratio') ?? 'auto'
    const numImagesStr = getWidgetValue<string>(node, 'num_images') ?? '1'
    const outputFormat = getWidgetValue<string>(node, 'output_format') ?? 'png'
    const enableWebSearch = getWidgetValue<boolean>(node, 'enable_web_search') ?? false
    const limitGenerations = getWidgetValue<boolean>(node, 'limit_generations') ?? false

    if (!image) {
      throw new Error('Input image is required')
    }

    if (!prompt) {
      throw new Error('Prompt is required')
    }

    const numImages = parseInt(numImagesStr, 10)

    const response = await generateApi.nanoBananaProEdit({
      prompt,
      imageUrl: image,
      numImages,
      resolution: resolution as '1K' | '2K' | '4K',
      aspectRatio: aspectRatio as 'auto' | '21:9' | '16:9' | '3:2' | '4:3' | '5:4' | '1:1' | '4:5' | '3:4' | '2:3' | '9:16',
      outputFormat: outputFormat as 'jpeg' | 'png' | 'webp',
      enableWebSearch,
      limitGenerations,
    })

    node.setProperty('executionTime', response.executionTime)
    node.setProperty('description', response.description ?? '')

    const outputImage = response.images[0] ?? ''

    node.setOutputData(0, outputImage)
    node.setOutputData(1, response.description ?? '')

    return { image: outputImage, description: response.description }
  }
)
```

### Phase 6: Node Registration

Add to `src/nodes/index.ts`:

```typescript
// Import
import { NanoBananaProEditNode } from './generation/NanoBananaProEditNode'

// In NODE_PATHS
'generation/nano-banana-pro-edit': NanoBananaProEditNode,

// In exports
export { NanoBananaProEditNode }
```

## Acceptance Criteria

### Functional Requirements

- [ ] Node appears in sidebar under "Generation" category as "Nano Banana Pro Edit"
- [ ] Node accepts image input (from ImageSource or other image nodes)
- [ ] Node accepts prompt input (from Prompt or other text nodes)
- [ ] All widgets function correctly:
  - [ ] Resolution dropdown (1K, 2K, 4K)
  - [ ] Aspect ratio dropdown (auto + 10 ratios)
  - [ ] Num images dropdown (1-4)
  - [ ] Output format dropdown (png, jpeg, webp)
  - [ ] Enable web search toggle
  - [ ] Limit generations toggle
- [ ] Node outputs edited image and description
- [ ] Error handling for missing image/prompt
- [ ] Progress indicator shows during generation

### Quality Gates

- [ ] `bun run typecheck` passes
- [ ] `bun run lint` passes (no new warnings)
- [ ] Node can be dragged from sidebar to canvas
- [ ] Node can connect to ImageSource and Prompt nodes
- [ ] Generation executes and returns result

## Success Metrics

- Node successfully calls `fal-ai/nano-banana-pro/edit` API
- Generated images display correctly in output nodes
- All widget options produce valid API requests

## Dependencies

- `@fal-ai/client` package (already installed)
- `FAL_KEY` environment variable (already configured)

## References

### Internal References

- Similar node implementation: `src/nodes/generation/NanoBananaEditNode.ts:33-123`
- Pro features pattern: `src/nodes/generation/NanoBananaProNode.ts:36-146`
- Service pattern: `server/services/nano-banana-pro.ts:42-106`
- Route pattern: `server/routes/generate.ts:214-267`

### External References

- API Documentation: https://fal.ai/models/fal-ai/nano-banana-pro/edit/llms.txt
- OpenAPI Schema: https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=fal-ai/nano-banana-pro/edit
