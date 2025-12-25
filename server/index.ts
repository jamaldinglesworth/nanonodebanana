import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { staticPlugin } from '@elysiajs/static'
import { existsSync } from 'fs'
import { generateRoutes } from './routes/generate'
import { workflowRoutes } from './routes/workflows'
import { uploadRoutes } from './routes/upload'

const PORT = process.env.PORT ?? 3000
const IS_PRODUCTION = process.env.NODE_ENV === 'production'

/**
 * Allowed CORS origins.
 * - Development: Vite dev server on port 6880
 * - Production: Same-origin only (CORS not needed for same-origin)
 */
const ALLOWED_ORIGINS = IS_PRODUCTION
  ? [] // Production serves from same origin, no CORS needed
  : ['http://localhost:6880', 'http://127.0.0.1:6880']

/**
 * Create and configure the Elysia server instance.
 */
function createApp() {
  let server = new Elysia()
    // Enable CORS with restricted origins
    .use(
      cors({
        origin: IS_PRODUCTION
          ? false // Disable CORS in production (same-origin)
          : (request: Request) => {
              const origin = request.headers.get('origin')
              // Allow requests with no origin (e.g., same-origin, curl)
              if (!origin) return true
              return ALLOWED_ORIGINS.includes(origin)
            },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
      })
    )

  // Serve static files from dist/client in production only
  if (IS_PRODUCTION && existsSync('dist/client')) {
    server = server.use(
      staticPlugin({
        assets: 'dist/client',
        prefix: '/',
      })
    )
  }

  return server
    // Health check endpoint
    .get('/api/health', () => ({
      status: 'ok',
      timestamp: new Date().toISOString(),
    }))

    // Mount route groups
    .use(generateRoutes)
    .use(workflowRoutes)
    .use(uploadRoutes)

    // Error handling
    .onError(({ error, code }) => {
      console.error(`[${code}]`, error)

      if (code === 'NOT_FOUND') {
        return {
          error: 'Not found',
          message: 'The requested resource was not found',
        }
      }

      const errorMessage = error instanceof Error ? error.message : String(error)

      return {
        error: 'Internal server error',
        message: errorMessage,
      }
    })

    // Start server
    .listen(PORT)
}

const app = createApp()

console.log(`🍌 NanoNodeBanana server running at http://localhost:${PORT}`)

// Export app for potential testing/extension use
export { app }
export type App = typeof app
