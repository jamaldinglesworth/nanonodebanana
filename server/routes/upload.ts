import { Elysia, t } from 'elysia'
import { v4 as uuidv4 } from 'uuid'
import { basename } from 'path'
import { saveFile, getFileUrl } from '../services/storage'

/**
 * Maximum file size: 10MB
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024

/**
 * Maximum base64 string length: ~13.3MB (10MB file = ~13.3MB base64)
 */
const MAX_BASE64_LENGTH = 14 * 1024 * 1024

/**
 * Allowed image MIME types
 */
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

/**
 * Allowed file extensions (must match MIME types)
 */
const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif']

/**
 * Sanitise filename to prevent path traversal attacks.
 * Removes directory components and validates extension.
 */
function sanitiseFilename(filename: string): string {
  // Extract just the filename, removing any path components
  const base = basename(filename)

  // Remove any characters that could be used for path traversal
  const sanitised = base.replace(/[^a-zA-Z0-9._-]/g, '_')

  // Ensure the filename isn't empty after sanitisation
  if (!sanitised || sanitised === '.' || sanitised === '..') {
    return `${uuidv4()}.png`
  }

  return sanitised
}

/**
 * Validate file extension against allowed list.
 */
function isValidExtension(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase()
  return ext ? ALLOWED_EXTENSIONS.includes(ext) : false
}

/**
 * File upload routes.
 */
export const uploadRoutes = new Elysia({ prefix: '/api/upload' })
  /**
   * Upload an image file.
   * Accepts multipart form data with a 'file' field.
   */
  .post(
    '/image',
    async ({ body }) => {
      const file = body.file

      if (!file) {
        throw new Error('No file provided')
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum: 10MB`)
      }

      // Validate MIME type
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        throw new Error(`Invalid file type: ${file.type}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`)
      }

      // Validate and sanitise filename
      const sanitisedName = sanitiseFilename(file.name)
      if (!isValidExtension(sanitisedName)) {
        throw new Error(`Invalid file extension. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`)
      }

      // Generate unique filename with validated extension
      const ext = sanitisedName.split('.').pop() ?? 'png'
      const filename = `${uuidv4()}.${ext}`

      // Save file
      const filePath = await saveFile(file, filename)
      const url = getFileUrl(filename)

      // Convert to base64
      const buffer = await file.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')

      return {
        url,
        base64,
        filename,
        path: filePath,
      }
    },
    {
      body: t.Object({
        file: t.File({ maxSize: MAX_FILE_SIZE }),
      }),
    }
  )

  /**
   * Upload image from base64 data.
   */
  .post(
    '/base64',
    async ({ body }) => {
      const { base64, filename: customFilename } = body

      // Validate base64 length (prevents DoS via massive payloads)
      if (base64.length > MAX_BASE64_LENGTH) {
        const sizeMB = (base64.length / 1024 / 1024).toFixed(2)
        throw new Error(`Base64 data too large: ${sizeMB}MB. Maximum: ~10MB decoded`)
      }

      // Determine file extension from base64 header
      let ext = 'png'
      if (base64.startsWith('/9j/')) {
        ext = 'jpg'
      } else if (base64.startsWith('UklGR')) {
        ext = 'webp'
      } else if (base64.startsWith('R0lGOD')) {
        ext = 'gif'
      }

      // Validate and sanitise custom filename if provided
      let filename: string
      if (customFilename) {
        const sanitised = sanitiseFilename(customFilename)
        if (!isValidExtension(sanitised)) {
          throw new Error(`Invalid file extension. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`)
        }
        filename = sanitised
      } else {
        filename = `${uuidv4()}.${ext}`
      }

      // Convert base64 to buffer
      const buffer = Buffer.from(base64, 'base64')

      // Validate decoded size
      if (buffer.length > MAX_FILE_SIZE) {
        throw new Error(`Decoded file too large: ${(buffer.length / 1024 / 1024).toFixed(2)}MB. Maximum: 10MB`)
      }

      // Create a File-like object
      const blob = new Blob([buffer], { type: `image/${ext}` })
      const file = new File([blob], filename, { type: `image/${ext}` })

      // Save file
      const filePath = await saveFile(file, filename)
      const url = getFileUrl(filename)

      return {
        url,
        filename,
        path: filePath,
      }
    },
    {
      body: t.Object({
        base64: t.String({ maxLength: MAX_BASE64_LENGTH }),
        filename: t.Optional(t.String({ maxLength: 255 })),
      }),
    }
  )
