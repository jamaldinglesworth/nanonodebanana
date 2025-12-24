import { Elysia, t } from 'elysia'
import { generateWithGemini } from '../services/gemini'
import { generateWithFal } from '../services/fal'
import { generateWithNanoBanana } from '../services/nano-banana'

/**
 * Request schema for Gemini image generation.
 */
const geminiRequestSchema = t.Object({
  prompt: t.String(),
  negativePrompt: t.Optional(t.String()),
  referenceImage: t.Optional(t.String()),
  model: t.Union([t.Literal('imagen-3'), t.Literal('gemini-2.0-flash')]),
  aspectRatio: t.Union([
    t.Literal('1:1'),
    t.Literal('16:9'),
    t.Literal('9:16'),
    t.Literal('4:3'),
    t.Literal('3:4'),
  ]),
  numberOfImages: t.Number({ minimum: 1, maximum: 4 }),
  seed: t.Optional(t.Number()),
})

/**
 * Request schema for Fal.ai image generation.
 */
const falRequestSchema = t.Object({
  prompt: t.String(),
  model: t.Union([
    t.Literal('flux-pro'),
    t.Literal('flux-dev'),
    t.Literal('flux-schnell'),
  ]),
  imageSize: t.Object({
    width: t.Number({ minimum: 64, maximum: 4096 }),
    height: t.Number({ minimum: 64, maximum: 4096 }),
  }),
  guidanceScale: t.Number({ minimum: 1, maximum: 20 }),
  steps: t.Number({ minimum: 1, maximum: 50 }),
  seed: t.Optional(t.Number()),
  referenceImage: t.Optional(t.String()),
})

/**
 * Image generation routes.
 */
export const generateRoutes = new Elysia({ prefix: '/api/generate' })
  /**
   * Generate images using Google Gemini.
   */
  .post(
    '/gemini',
    async ({ body }) => {
      const startTime = Date.now()

      const images = await generateWithGemini({
        prompt: body.prompt,
        negativePrompt: body.negativePrompt,
        referenceImage: body.referenceImage,
        model: body.model,
        aspectRatio: body.aspectRatio,
        numberOfImages: body.numberOfImages,
        seed: body.seed,
      })

      const executionTime = Date.now() - startTime

      return {
        images,
        executionTime,
      }
    },
    {
      body: geminiRequestSchema,
    }
  )

  /**
   * Generate images using Fal.ai Flux.
   */
  .post(
    '/fal',
    async ({ body }) => {
      const startTime = Date.now()

      const result = await generateWithFal({
        prompt: body.prompt,
        model: body.model,
        imageSize: body.imageSize,
        guidanceScale: body.guidanceScale,
        steps: body.steps,
        seed: body.seed,
        referenceImage: body.referenceImage,
      })

      const executionTime = Date.now() - startTime

      return {
        images: result.images,
        seed: result.seed,
        executionTime,
      }
    },
    {
      body: falRequestSchema,
    }
  )

  /**
   * Generate images using Nano Banana model.
   */
  .post(
    '/nano-banana',
    async ({ body }) => {
      const startTime = Date.now()

      const result = await generateWithNanoBanana({
        prompt: body.prompt,
        numImages: body.numImages,
        aspectRatio: body.aspectRatio,
        outputFormat: body.outputFormat,
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
        prompt: t.String({ minLength: 3, maxLength: 5000 }),
        numImages: t.Number({ minimum: 1, maximum: 4, default: 1 }),
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
      }),
    }
  )
