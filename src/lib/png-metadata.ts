/**
 * PNG Workflow Metadata Utility
 *
 * Embeds and extracts workflow data from PNG files using tEXt chunks.
 * PNG files contain chunks with a 4-byte length, 4-byte type, data, and CRC32.
 * We use a custom tEXt chunk to store workflow JSON.
 */

import { PNG_WORKFLOW_KEY } from './constants'

const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])

/**
 * CRC32 calculation for PNG chunks
 */
function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  const table: number[] = []

  // Build CRC table
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[i] = c
  }

  // Calculate CRC
  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]!) & 0xff]! ^ (crc >>> 8)
  }

  return (crc ^ 0xffffffff) >>> 0
}

/**
 * Read a 4-byte big-endian unsigned integer
 */
function readUint32(data: Uint8Array, offset: number): number {
  return (
    (data[offset]! << 24) |
    (data[offset + 1]! << 16) |
    (data[offset + 2]! << 8) |
    data[offset + 3]!
  ) >>> 0
}

/**
 * Write a 4-byte big-endian unsigned integer
 */
function writeUint32(data: Uint8Array, offset: number, value: number): void {
  data[offset] = (value >>> 24) & 0xff
  data[offset + 1] = (value >>> 16) & 0xff
  data[offset + 2] = (value >>> 8) & 0xff
  data[offset + 3] = value & 0xff
}

/**
 * Read a chunk type as string
 */
function readChunkType(data: Uint8Array, offset: number): string {
  return String.fromCharCode(
    data[offset]!,
    data[offset + 1]!,
    data[offset + 2]!,
    data[offset + 3]!
  )
}

/**
 * Write a chunk type from string
 */
function writeChunkType(data: Uint8Array, offset: number, type: string): void {
  for (let i = 0; i < 4; i++) {
    data[offset + i] = type.charCodeAt(i)
  }
}

interface PngChunk {
  type: string
  data: Uint8Array
  offset: number
  length: number
}

/**
 * Parse PNG chunks from binary data
 */
function parseChunks(data: Uint8Array): PngChunk[] {
  // Verify PNG signature
  for (let i = 0; i < 8; i++) {
    if (data[i] !== PNG_SIGNATURE[i]) {
      throw new Error('Invalid PNG signature')
    }
  }

  const chunks: PngChunk[] = []
  let offset = 8

  while (offset < data.length) {
    const length = readUint32(data, offset)
    const type = readChunkType(data, offset + 4)
    const chunkData = data.slice(offset + 8, offset + 8 + length)

    chunks.push({
      type,
      data: chunkData,
      offset,
      length,
    })

    offset += 12 + length // 4 (length) + 4 (type) + length + 4 (CRC)

    if (type === 'IEND') break
  }

  return chunks
}

/**
 * Create a tEXt chunk with key-value pair
 */
function createTextChunk(key: string, value: string): Uint8Array {
  const keyBytes = new TextEncoder().encode(key)
  const valueBytes = new TextEncoder().encode(value)
  const dataLength = keyBytes.length + 1 + valueBytes.length // key + null separator + value

  // Chunk: 4 bytes length + 4 bytes type + data + 4 bytes CRC
  const chunk = new Uint8Array(12 + dataLength)

  // Length
  writeUint32(chunk, 0, dataLength)

  // Type
  writeChunkType(chunk, 4, 'tEXt')

  // Data: key + null + value
  chunk.set(keyBytes, 8)
  chunk[8 + keyBytes.length] = 0 // Null separator
  chunk.set(valueBytes, 9 + keyBytes.length)

  // CRC (over type + data)
  const crcData = chunk.slice(4, 8 + dataLength)
  const crcValue = crc32(crcData)
  writeUint32(chunk, 8 + dataLength, crcValue)

  return chunk
}

/**
 * Parse a tEXt chunk to extract key-value pair
 */
function parseTextChunk(data: Uint8Array): { key: string; value: string } | null {
  // Find null separator
  let nullIndex = -1
  for (let i = 0; i < data.length; i++) {
    if (data[i] === 0) {
      nullIndex = i
      break
    }
  }

  if (nullIndex === -1) return null

  const decoder = new TextDecoder()
  const key = decoder.decode(data.slice(0, nullIndex))
  const value = decoder.decode(data.slice(nullIndex + 1))

  return { key, value }
}

export interface WorkflowMetadata {
  workflow: unknown
  version?: string
  timestamp?: string
  name?: string
}

/**
 * Extract workflow metadata from PNG binary data
 */
export function extractWorkflowFromPng(pngData: Uint8Array): WorkflowMetadata | null {
  try {
    const chunks = parseChunks(pngData)

    for (const chunk of chunks) {
      if (chunk.type === 'tEXt') {
        const textData = parseTextChunk(chunk.data)
        if (textData && textData.key === PNG_WORKFLOW_KEY) {
          return JSON.parse(textData.value)
        }
      }
    }

    return null
  } catch (error) {
    console.error('Failed to extract workflow from PNG:', error)
    return null
  }
}

/**
 * Extract workflow metadata from a File or Blob
 */
export async function extractWorkflowFromPngFile(file: File | Blob): Promise<WorkflowMetadata | null> {
  const arrayBuffer = await file.arrayBuffer()
  return extractWorkflowFromPng(new Uint8Array(arrayBuffer))
}

/**
 * Extract workflow metadata from a data URI
 */
export function extractWorkflowFromDataUri(dataUri: string): WorkflowMetadata | null {
  if (!dataUri.startsWith('data:image/png')) {
    return null
  }

  const base64 = dataUri.split(',')[1]
  if (!base64) return null

  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  return extractWorkflowFromPng(bytes)
}

/**
 * Embed workflow metadata into PNG binary data
 */
export function embedWorkflowInPng(
  pngData: Uint8Array,
  metadata: WorkflowMetadata
): Uint8Array {
  const chunks = parseChunks(pngData)

  // Find IEND chunk position
  const iendChunk = chunks.find(c => c.type === 'IEND')
  if (!iendChunk) {
    throw new Error('Invalid PNG: missing IEND chunk')
  }

  // Create metadata JSON
  const metadataJson = JSON.stringify(metadata)
  const textChunk = createTextChunk(PNG_WORKFLOW_KEY, metadataJson)

  // Build new PNG: everything before IEND + our chunk + IEND
  const beforeIend = pngData.slice(0, iendChunk.offset)
  const iendData = pngData.slice(iendChunk.offset, iendChunk.offset + 12) // IEND is always 12 bytes (0 length)

  const result = new Uint8Array(beforeIend.length + textChunk.length + iendData.length)
  result.set(beforeIend, 0)
  result.set(textChunk, beforeIend.length)
  result.set(iendData, beforeIend.length + textChunk.length)

  return result
}

/**
 * Embed workflow metadata into a PNG blob
 */
export async function embedWorkflowInPngBlob(
  blob: Blob,
  metadata: WorkflowMetadata
): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer()
  const resultData = embedWorkflowInPng(new Uint8Array(arrayBuffer), metadata)
  // Create a new ArrayBuffer from the Uint8Array to ensure type compatibility
  const buffer = new ArrayBuffer(resultData.length)
  new Uint8Array(buffer).set(resultData)
  return new Blob([buffer], { type: 'image/png' })
}

/**
 * Embed workflow metadata into a PNG data URI
 */
export function embedWorkflowInDataUri(
  dataUri: string,
  metadata: WorkflowMetadata
): string {
  if (!dataUri.startsWith('data:image/png')) {
    throw new Error('Data URI must be a PNG image')
  }

  const base64 = dataUri.split(',')[1]
  if (!base64) throw new Error('Invalid data URI')

  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  const resultData = embedWorkflowInPng(bytes, metadata)

  // Convert back to base64
  let binary = ''
  for (let i = 0; i < resultData.length; i++) {
    binary += String.fromCharCode(resultData[i]!)
  }

  return `data:image/png;base64,${btoa(binary)}`
}

/**
 * Check if a PNG contains workflow metadata
 */
export function hasWorkflowMetadata(pngData: Uint8Array): boolean {
  try {
    return extractWorkflowFromPng(pngData) !== null
  } catch {
    return false
  }
}

/**
 * Check if a file is a PNG by reading magic bytes
 */
export function isPngFile(data: Uint8Array): boolean {
  if (data.length < 8) return false
  for (let i = 0; i < 8; i++) {
    if (data[i] !== PNG_SIGNATURE[i]) return false
  }
  return true
}
