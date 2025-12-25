import { describe, it, expect, beforeEach, vi } from 'vitest'
import { STORAGE_KEYS } from './constants'

// Test the helper functions by importing the module
// Note: We test the exported functions and mock dependencies

describe('workflow-storage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('saveToLocalStorage and loadFromLocalStorage', () => {
    it('should save and load workflow data', async () => {
      const { saveToLocalStorage, loadFromLocalStorage } = await import('./workflow-storage')

      // Create a mock graph
      const mockGraph = {
        serialize: () => ({
          nodes: [{ id: 1, type: 'input/prompt', pos: [100, 100] }],
          links: [],
        }),
      }

      const result = saveToLocalStorage(mockGraph as never, 'Test Workflow')
      expect(result).toBe(true)

      const loaded = loadFromLocalStorage()
      expect(loaded).not.toBeNull()
      expect(loaded?.name).toBe('Test Workflow')
      expect(loaded?.graph).toEqual({
        nodes: [{ id: 1, type: 'input/prompt', pos: [100, 100] }],
        links: [],
      })
    })

    it('should return null when no data exists', async () => {
      const { loadFromLocalStorage } = await import('./workflow-storage')
      const loaded = loadFromLocalStorage()
      expect(loaded).toBeNull()
    })

    it('should handle invalid JSON gracefully', async () => {
      const { loadFromLocalStorage } = await import('./workflow-storage')
      localStorage.setItem(STORAGE_KEYS.CURRENT_WORKFLOW, 'invalid json{')
      const loaded = loadFromLocalStorage()
      expect(loaded).toBeNull()
    })
  })

  describe('clearLocalStorage', () => {
    it('should remove the workflow from localStorage', async () => {
      const { saveToLocalStorage, clearLocalStorage, loadFromLocalStorage } = await import('./workflow-storage')

      const mockGraph = {
        serialize: () => ({ nodes: [], links: [] }),
      }
      saveToLocalStorage(mockGraph as never, 'Test')
      expect(loadFromLocalStorage()).not.toBeNull()

      clearLocalStorage()
      expect(loadFromLocalStorage()).toBeNull()
    })
  })

  describe('autosave', () => {
    it('should save and load autosave data', async () => {
      const { loadAutosave, clearAutosave } = await import('./workflow-storage')

      // Initially empty
      expect(loadAutosave()).toBeNull()

      // Simulate autosave data
      const autosaveData = {
        name: 'Autosave Test',
        graph: { nodes: [], links: [] },
        savedAt: new Date().toISOString(),
        stripped: true,
      }
      localStorage.setItem(STORAGE_KEYS.AUTOSAVE, JSON.stringify(autosaveData))

      const loaded = loadAutosave()
      expect(loaded?.name).toBe('Autosave Test')

      clearAutosave()
      expect(loadAutosave()).toBeNull()
    })
  })

  describe('large data stripping', () => {
    it('should strip large base64 data from nodes', async () => {
      const { saveToLocalStorage, loadFromLocalStorage } = await import('./workflow-storage')

      // Create a graph with large base64 data (>2MB to trigger stripping)
      const largeBase64 = 'data:image/png;base64,' + 'A'.repeat(2.5 * 1024 * 1024)
      const mockGraph = {
        serialize: () => ({
          nodes: [
            {
              id: 1,
              type: 'input/image',
              pos: [100, 100],
              widgets_values: [largeBase64, 'other value'],
              properties: { imageData: largeBase64 },
            },
          ],
          links: [],
        }),
      }

      saveToLocalStorage(mockGraph as never, 'Large Data Test')

      const loaded = loadFromLocalStorage()
      expect(loaded).not.toBeNull()

      // Check that large data was stripped
      const node = (loaded?.graph as { nodes: Array<{ widgets_values: string[]; properties: { imageData: string } }> }).nodes[0]
      expect(node?.widgets_values[0]).toBe('[IMAGE_DATA_STRIPPED_FOR_AUTOSAVE]')
      expect(node?.properties.imageData).toBe('[IMAGE_DATA_STRIPPED_FOR_AUTOSAVE]')
      expect(node?.widgets_values[1]).toBe('other value') // Non-base64 preserved
    })
  })

  describe('serialiseGraph and deserialiseGraph', () => {
    it('should serialise a graph to JSON-compatible object', async () => {
      const { serialiseGraph } = await import('./workflow-storage')

      const mockGraph = {
        serialize: vi.fn(() => ({ test: 'data' })),
      }

      const result = serialiseGraph(mockGraph as never)
      expect(mockGraph.serialize).toHaveBeenCalled()
      expect(result).toEqual({ test: 'data' })
    })

    it('should deserialise data into a graph', async () => {
      const { deserialiseGraph } = await import('./workflow-storage')

      const mockGraph = {
        configure: vi.fn(),
      }
      const data = { nodes: [], links: [] }

      deserialiseGraph(mockGraph as never, data)
      expect(mockGraph.configure).toHaveBeenCalledWith(data)
    })
  })

  describe('exportWorkflow', () => {
    it('should create a downloadable JSON file', async () => {
      const { exportWorkflow } = await import('./workflow-storage')

      // Mock URL.createObjectURL and revokeObjectURL
      const mockUrl = 'blob:test-url'
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue(mockUrl)
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

      // Mock document.createElement for the anchor
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
      }
      const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink as never)

      const mockGraph = {
        serialize: () => ({ nodes: [], links: [] }),
      }

      exportWorkflow(mockGraph as never, 'My Workflow')

      expect(createObjectURLSpy).toHaveBeenCalled()
      expect(mockLink.download).toBe('my-workflow.workflow.json')
      expect(mockLink.click).toHaveBeenCalled()
      expect(revokeObjectURLSpy).toHaveBeenCalledWith(mockUrl)

      createObjectURLSpy.mockRestore()
      revokeObjectURLSpy.mockRestore()
      createElementSpy.mockRestore()
    })
  })

  describe('importWorkflow', () => {
    it('should parse a valid workflow file', async () => {
      const { importWorkflow } = await import('./workflow-storage')

      const workflowData = {
        name: 'Imported Workflow',
        graph: { nodes: [{ id: 1 }], links: [] },
      }
      const file = new File([JSON.stringify(workflowData)], 'test.workflow.json', {
        type: 'application/json',
      })

      const result = await importWorkflow(file)
      expect(result.name).toBe('Imported Workflow')
      expect(result.graph).toEqual({ nodes: [{ id: 1 }], links: [] })
    })

    it('should use default name if not provided', async () => {
      const { importWorkflow } = await import('./workflow-storage')

      const workflowData = {
        graph: { nodes: [], links: [] },
      }
      const file = new File([JSON.stringify(workflowData)], 'test.workflow.json')

      const result = await importWorkflow(file)
      expect(result.name).toBe('Imported Workflow')
    })

    it('should reject invalid workflow files', async () => {
      const { importWorkflow } = await import('./workflow-storage')

      const invalidData = { name: 'No Graph' } // Missing graph property
      const file = new File([JSON.stringify(invalidData)], 'test.workflow.json')

      await expect(importWorkflow(file)).rejects.toThrow('Invalid workflow file: missing graph data')
    })

    it('should reject non-JSON files', async () => {
      const { importWorkflow } = await import('./workflow-storage')

      const file = new File(['not valid json'], 'test.workflow.json')

      await expect(importWorkflow(file)).rejects.toThrow()
    })
  })
})
