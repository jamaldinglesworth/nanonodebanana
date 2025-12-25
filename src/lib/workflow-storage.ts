import type { LGraph } from 'litegraph.js'
import type { WorkflowData } from '../types/nodes'
import { workflowApi } from './api-client'

const LOCAL_STORAGE_KEY = 'nanonodebanana_current_workflow'
const AUTOSAVE_KEY = 'nanonodebanana_autosave'
const MAX_AUTOSAVE_SIZE = 2 * 1024 * 1024 // 2MB limit for autosave

/**
 * Serialises a Litegraph graph to a JSON-compatible object.
 */
export function serialiseGraph(graph: LGraph): object {
  return graph.serialize()
}

/**
 * Strips large base64 image data from serialised graph to reduce storage size.
 * This is used for autosave to prevent localStorage quota errors.
 */
function stripLargeDataFromGraph(graphData: object): object {
  const stripped = JSON.parse(JSON.stringify(graphData))

  if (stripped.nodes && Array.isArray(stripped.nodes)) {
    for (const node of stripped.nodes) {
      // Strip base64 images from widget values and properties
      if (node.widgets_values && Array.isArray(node.widgets_values)) {
        node.widgets_values = node.widgets_values.map((value: unknown) => {
          if (typeof value === 'string' && isLargeBase64(value)) {
            return '[IMAGE_DATA_STRIPPED_FOR_AUTOSAVE]'
          }
          return value
        })
      }

      // Strip from properties
      if (node.properties) {
        for (const key of Object.keys(node.properties)) {
          const value = node.properties[key]
          if (typeof value === 'string' && isLargeBase64(value)) {
            node.properties[key] = '[IMAGE_DATA_STRIPPED_FOR_AUTOSAVE]'
          }
        }
      }
    }
  }

  return stripped
}

/**
 * Checks if a string is a large base64-encoded data string.
 */
function isLargeBase64(value: string): boolean {
  // Check for data URI pattern or raw base64 that's larger than 10KB
  const isDataUri = value.startsWith('data:')
  const isLongString = value.length > 10000
  return isDataUri && isLongString
}

/**
 * Safely sets an item in localStorage with quota error handling.
 * Returns true if successful, false if quota exceeded.
 */
function safeSetLocalStorage(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value)
    return true
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.name === 'QuotaExceededError' ||
        error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
    ) {
      console.warn(`localStorage quota exceeded for key: ${key}`)
      return false
    }
    throw error
  }
}

/**
 * Deserialises a graph from saved data.
 */
export function deserialiseGraph(graph: LGraph, data: object): void {
  graph.configure(data as Parameters<typeof graph.configure>[0])
}

/**
 * Saves the current workflow to local storage for recovery.
 * Returns true if successful, false if quota exceeded.
 */
export function saveToLocalStorage(graph: LGraph, name: string): boolean {
  const graphData = serialiseGraph(graph)
  const data = {
    name,
    graph: graphData,
    savedAt: new Date().toISOString(),
  }

  const jsonData = JSON.stringify(data)

  // If data is too large, try stripping image data first
  if (jsonData.length > MAX_AUTOSAVE_SIZE) {
    const strippedData = {
      name,
      graph: stripLargeDataFromGraph(graphData),
      savedAt: new Date().toISOString(),
      stripped: true,
    }
    return safeSetLocalStorage(LOCAL_STORAGE_KEY, JSON.stringify(strippedData))
  }

  return safeSetLocalStorage(LOCAL_STORAGE_KEY, jsonData)
}

/**
 * Loads a workflow from local storage.
 */
export function loadFromLocalStorage(): {
  name: string
  graph: object
  savedAt: string
} | null {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY)
  if (!data) return null

  try {
    return JSON.parse(data)
  } catch {
    return null
  }
}

/**
 * Clears the current workflow from local storage.
 */
export function clearLocalStorage(): void {
  localStorage.removeItem(LOCAL_STORAGE_KEY)
}

/**
 * Enables autosave for the graph.
 * Saves to local storage on every change, stripping large image data to prevent quota errors.
 */
export function enableAutosave(graph: LGraph, name: string): () => void {
  const intervalId = setInterval(() => {
    const graphData = serialiseGraph(graph)

    // Always strip large data for autosave to prevent quota issues
    const strippedGraph = stripLargeDataFromGraph(graphData)
    const data = {
      name,
      graph: strippedGraph,
      savedAt: new Date().toISOString(),
      stripped: true,
    }

    const jsonData = JSON.stringify(data)

    // Skip autosave silently if data is too large
    if (jsonData.length > MAX_AUTOSAVE_SIZE) {
      return
    }

    const success = safeSetLocalStorage(AUTOSAVE_KEY, jsonData)
    if (!success) {
      // Try to clear old autosave and retry
      localStorage.removeItem(AUTOSAVE_KEY)
      safeSetLocalStorage(AUTOSAVE_KEY, jsonData)
    }
  }, 30000) // Autosave every 30 seconds

  return () => clearInterval(intervalId)
}

/**
 * Loads the autosaved workflow if available.
 */
export function loadAutosave(): {
  name: string
  graph: object
  savedAt: string
} | null {
  const data = localStorage.getItem(AUTOSAVE_KEY)
  if (!data) return null

  try {
    return JSON.parse(data)
  } catch {
    return null
  }
}

/**
 * Clears the autosave data.
 */
export function clearAutosave(): void {
  localStorage.removeItem(AUTOSAVE_KEY)
}

/**
 * Saves a workflow to the server.
 */
export async function saveWorkflow(
  graph: LGraph,
  name: string,
  description?: string
): Promise<WorkflowData> {
  return workflowApi.create({
    name,
    description,
    graph: serialiseGraph(graph),
  })
}

/**
 * Updates an existing workflow on the server.
 */
export async function updateWorkflow(
  id: string,
  graph: LGraph,
  name?: string,
  description?: string
): Promise<WorkflowData> {
  return workflowApi.update(id, {
    name,
    description,
    graph: serialiseGraph(graph),
  })
}

/**
 * Loads a workflow from the server.
 */
export async function loadWorkflow(id: string): Promise<WorkflowData> {
  return workflowApi.get(id)
}

/**
 * Lists all saved workflows from the server.
 */
export async function listWorkflows(): Promise<WorkflowData[]> {
  return workflowApi.list()
}

/**
 * Deletes a workflow from the server.
 */
export async function deleteWorkflow(id: string): Promise<void> {
  return workflowApi.delete(id)
}

/**
 * Exports a workflow as a downloadable JSON file.
 */
export function exportWorkflow(graph: LGraph, name: string): void {
  const data = {
    name,
    version: '1.0.0',
    graph: serialiseGraph(graph),
    exportedAt: new Date().toISOString(),
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `${name.toLowerCase().replace(/\s+/g, '-')}.workflow.json`
  link.click()

  URL.revokeObjectURL(url)
}

/**
 * Imports a workflow from a JSON file.
 */
export async function importWorkflow(file: File): Promise<{
  name: string
  graph: object
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string)
        if (!data.graph) {
          throw new Error('Invalid workflow file: missing graph data')
        }
        resolve({
          name: data.name || 'Imported Workflow',
          graph: data.graph,
        })
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}
