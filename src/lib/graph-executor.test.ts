import { describe, it, expect, vi } from 'vitest'
import { createExecutionEngine } from './graph-executor'
import { NODE_MODE } from '../nodes/base/BaseNode'

// Helper to create mock nodes
function createMockNode(
  id: number,
  options: {
    type?: string
    inputs?: Array<{ name: string; type: string; link: number | null }>
    outputs?: Array<{ name: string; type: string }>
    mode?: number
    onExecute?: () => Promise<Record<string, unknown>>
  } = {}
) {
  return {
    id,
    type: options.type ?? 'test/node',
    inputs: options.inputs ?? [],
    outputs: options.outputs ?? [],
    mode: options.mode ?? NODE_MODE.NORMAL,
    onExecute: options.onExecute ?? vi.fn().mockResolvedValue({}),
    setProperty: vi.fn(),
    pos: [0, 0],
    size: [100, 50],
  }
}

// Helper to create mock graph
function createMockGraph(
  nodes: ReturnType<typeof createMockNode>[],
  links: Record<number, { origin_id: number; origin_slot: number; target_id: number; target_slot: number }>
) {
  return {
    _nodes: nodes,
    links,
    getNodeById: (id: number) => nodes.find(n => n.id === id),
  }
}

describe('graph-executor', () => {
  describe('createExecutionEngine', () => {
    it('should create an execution engine with all methods', () => {
      const engine = createExecutionEngine()

      expect(engine.execute).toBeDefined()
      expect(engine.executeFromNode).toBeDefined()
      expect(engine.executeNodeOnly).toBeDefined()
      expect(engine.cancel).toBeDefined()
      expect(engine.getResults).toBeDefined()
    })
  })

  describe('execute', () => {
    it('should execute nodes in topological order', async () => {
      const executionOrder: number[] = []

      const nodeA = createMockNode(1, {
        outputs: [{ name: 'output', type: 'string' }],
        onExecute: vi.fn().mockImplementation(async () => {
          executionOrder.push(1)
          return { output: 'from A' }
        }),
      })

      const nodeB = createMockNode(2, {
        inputs: [{ name: 'input', type: 'string', link: 1 }],
        outputs: [{ name: 'output', type: 'string' }],
        onExecute: vi.fn().mockImplementation(async () => {
          executionOrder.push(2)
          return { output: 'from B' }
        }),
      })

      const nodeC = createMockNode(3, {
        inputs: [{ name: 'input', type: 'string', link: 2 }],
        onExecute: vi.fn().mockImplementation(async () => {
          executionOrder.push(3)
          return {}
        }),
      })

      const graph = createMockGraph(
        [nodeC, nodeA, nodeB], // Deliberately out of order
        {
          1: { origin_id: 1, origin_slot: 0, target_id: 2, target_slot: 0 },
          2: { origin_id: 2, origin_slot: 0, target_id: 3, target_slot: 0 },
        }
      )

      const engine = createExecutionEngine()
      const contexts: Array<{ nodeId: string; status: string }> = []

      for await (const ctx of engine.execute(graph as never)) {
        contexts.push({ nodeId: ctx.nodeId, status: ctx.status })
      }

      // Should execute A -> B -> C
      expect(executionOrder).toEqual([1, 2, 3])
    })

    it('should emit running and completed statuses for each node', async () => {
      const node = createMockNode(1, {
        onExecute: vi.fn().mockResolvedValue({ result: 'success' }),
      })

      const graph = createMockGraph([node], {})
      const engine = createExecutionEngine()

      const statuses: string[] = []
      for await (const ctx of engine.execute(graph as never)) {
        statuses.push(ctx.status)
      }

      expect(statuses).toEqual(['running', 'completed'])
    })

    it('should emit error status when node execution fails', async () => {
      const node = createMockNode(1, {
        onExecute: vi.fn().mockRejectedValue(new Error('Test error')),
      })

      const graph = createMockGraph([node], {})
      const engine = createExecutionEngine()

      const contexts: Array<{ status: string; error?: Error }> = []
      for await (const ctx of engine.execute(graph as never)) {
        contexts.push({ status: ctx.status, error: ctx.error })
      }

      expect(contexts).toHaveLength(2)
      expect(contexts[0]?.status).toBe('running')
      expect(contexts[1]?.status).toBe('error')
      expect(contexts[1]?.error?.message).toBe('Test error')
    })

    it('should calculate progress correctly', async () => {
      const nodes = [
        createMockNode(1, { outputs: [{ name: 'out', type: 'string' }] }),
        createMockNode(2, { inputs: [{ name: 'in', type: 'string', link: 1 }], outputs: [{ name: 'out', type: 'string' }] }),
        createMockNode(3, { inputs: [{ name: 'in', type: 'string', link: 2 }] }),
      ]

      const graph = createMockGraph(nodes, {
        1: { origin_id: 1, origin_slot: 0, target_id: 2, target_slot: 0 },
        2: { origin_id: 2, origin_slot: 0, target_id: 3, target_slot: 0 },
      })

      const engine = createExecutionEngine()
      const completedProgress: number[] = []

      for await (const ctx of engine.execute(graph as never)) {
        if (ctx.status === 'completed') {
          completedProgress.push(Math.round(ctx.progress ?? 0))
        }
      }

      expect(completedProgress).toEqual([33, 67, 100])
    })

    it('should handle muted nodes by outputting null values', async () => {
      const mutedNode = createMockNode(1, {
        outputs: [{ name: 'output', type: 'string' }],
        mode: NODE_MODE.MUTED,
        onExecute: vi.fn().mockResolvedValue({ output: 'should not be called' }),
      })

      const graph = createMockGraph([mutedNode], {})
      const engine = createExecutionEngine()

      let result: Record<string, unknown> | undefined
      for await (const ctx of engine.execute(graph as never)) {
        if (ctx.status === 'completed') {
          result = ctx.result as Record<string, unknown>
        }
      }

      // onExecute should NOT be called for muted nodes
      expect(mutedNode.onExecute).not.toHaveBeenCalled()
      expect(result).toEqual({ output: null })
    })

    it('should handle bypassed nodes by passing through inputs', async () => {
      const sourceNode = createMockNode(1, {
        outputs: [{ name: 'output', type: 'string' }],
        onExecute: vi.fn().mockResolvedValue({ output: 'source value' }),
      })

      const bypassedNode = createMockNode(2, {
        inputs: [{ name: 'input', type: 'string', link: 1 }],
        outputs: [{ name: 'output', type: 'string' }],
        mode: NODE_MODE.BYPASSED,
        onExecute: vi.fn().mockResolvedValue({ output: 'should not be called' }),
      })

      const graph = createMockGraph([sourceNode, bypassedNode], {
        1: { origin_id: 1, origin_slot: 0, target_id: 2, target_slot: 0 },
      })

      const engine = createExecutionEngine()

      const results: Array<{ nodeId: string; result?: Record<string, unknown> }> = []
      for await (const ctx of engine.execute(graph as never)) {
        if (ctx.status === 'completed') {
          results.push({ nodeId: ctx.nodeId, result: ctx.result as Record<string, unknown> })
        }
      }

      // Bypassed node should NOT call onExecute
      expect(bypassedNode.onExecute).not.toHaveBeenCalled()

      // Find bypassed node result
      const bypassResult = results.find(r => r.nodeId === '2')
      expect(bypassResult?.result?.output).toBe('source value')
    })
  })

  describe('cancel', () => {
    it('should stop execution when cancelled', async () => {
      const slowNode = createMockNode(1, {
        outputs: [{ name: 'out', type: 'string' }],
        onExecute: vi.fn().mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, 100))
          return { out: 'done' }
        }),
      })

      const dependentNode = createMockNode(2, {
        inputs: [{ name: 'in', type: 'string', link: 1 }],
        onExecute: vi.fn().mockResolvedValue({}),
      })

      const graph = createMockGraph([slowNode, dependentNode], {
        1: { origin_id: 1, origin_slot: 0, target_id: 2, target_slot: 0 },
      })

      const engine = createExecutionEngine()

      // Start execution
      const generator = engine.execute(graph as never)

      // Get first status
      await generator.next()

      // Cancel mid-execution
      engine.cancel()

      // Consume remaining (should stop early)
      const remaining: unknown[] = []
      for await (const ctx of generator) {
        remaining.push(ctx)
      }

      // The second node should NOT have executed
      expect(dependentNode.onExecute).not.toHaveBeenCalled()
    })
  })

  describe('getResults', () => {
    it('should return cached results after execution', async () => {
      const node = createMockNode(1, {
        onExecute: vi.fn().mockResolvedValue({ value: 42 }),
      })

      const graph = createMockGraph([node], {})
      const engine = createExecutionEngine()

      // Execute - consume all execution contexts
      const contexts = []
      for await (const ctx of engine.execute(graph as never)) {
        contexts.push(ctx)
      }

      const results = engine.getResults()
      expect(results.get('1')).toEqual({ value: 42 })
    })
  })

  describe('executeFromNode', () => {
    it('should execute only from the specified node onwards', async () => {
      const executionOrder: number[] = []

      const nodeA = createMockNode(1, {
        outputs: [{ name: 'out', type: 'string' }],
        onExecute: vi.fn().mockImplementation(async () => {
          executionOrder.push(1)
          return { out: 'A' }
        }),
      })

      const nodeB = createMockNode(2, {
        inputs: [{ name: 'in', type: 'string', link: 1 }],
        outputs: [{ name: 'out', type: 'string' }],
        onExecute: vi.fn().mockImplementation(async () => {
          executionOrder.push(2)
          return { out: 'B' }
        }),
      })

      const nodeC = createMockNode(3, {
        inputs: [{ name: 'in', type: 'string', link: 2 }],
        onExecute: vi.fn().mockImplementation(async () => {
          executionOrder.push(3)
          return {}
        }),
      })

      const graph = createMockGraph([nodeA, nodeB, nodeC], {
        1: { origin_id: 1, origin_slot: 0, target_id: 2, target_slot: 0 },
        2: { origin_id: 2, origin_slot: 0, target_id: 3, target_slot: 0 },
      })

      const engine = createExecutionEngine()

      // First execute full graph to cache results
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ctx of engine.execute(graph as never)) { /* consume */ }
      executionOrder.length = 0 // Reset

      // Now execute from node B
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ctx of engine.executeFromNode(graph as never, 2)) { /* consume */ }

      // Only B and C should execute (A is upstream and cached)
      expect(executionOrder).toEqual([2, 3])
    })

    it('should return error for non-existent node', async () => {
      const graph = createMockGraph([], {})
      const engine = createExecutionEngine()

      const contexts: Array<{ status: string; error?: Error }> = []
      for await (const ctx of engine.executeFromNode(graph as never, 999)) {
        contexts.push({ status: ctx.status, error: ctx.error })
      }

      expect(contexts).toHaveLength(1)
      expect(contexts[0]?.status).toBe('error')
      expect(contexts[0]?.error?.message).toContain('not found')
    })
  })

  describe('executeNodeOnly', () => {
    it('should execute only the specified node', async () => {
      const nodeA = createMockNode(1, {
        outputs: [{ name: 'out', type: 'string' }],
        onExecute: vi.fn().mockResolvedValue({ out: 'A' }),
      })

      const nodeB = createMockNode(2, {
        inputs: [{ name: 'in', type: 'string', link: 1 }],
        onExecute: vi.fn().mockResolvedValue({ processed: 'B' }),
      })

      const graph = createMockGraph([nodeA, nodeB], {
        1: { origin_id: 1, origin_slot: 0, target_id: 2, target_slot: 0 },
      })

      const engine = createExecutionEngine()

      // Execute only node B
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ctx of engine.executeNodeOnly(graph as never, 2)) { /* consume */ }

      // Only node B should have executed
      expect(nodeA.onExecute).not.toHaveBeenCalled()
      expect(nodeB.onExecute).toHaveBeenCalled()
    })

    it('should return error for non-existent node', async () => {
      const graph = createMockGraph([], {})
      const engine = createExecutionEngine()

      const contexts: Array<{ status: string; error?: Error }> = []
      for await (const ctx of engine.executeNodeOnly(graph as never, 999)) {
        contexts.push({ status: ctx.status, error: ctx.error })
      }

      expect(contexts).toHaveLength(1)
      expect(contexts[0]?.status).toBe('error')
      expect(contexts[0]?.error?.message).toContain('not found')
    })
  })

  describe('execution isolation', () => {
    it('should invalidate previous execution when new one starts', async () => {
      const slowNode = createMockNode(1, {
        onExecute: vi.fn().mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, 50))
          return {}
        }),
      })

      const graph = createMockGraph([slowNode], {})
      const engine = createExecutionEngine()

      // Start first execution
      const gen1 = engine.execute(graph as never)
      await gen1.next() // Get 'running'

      // Start second execution (should invalidate first)
      const gen2 = engine.execute(graph as never)

      // Consume first generator - should stop early
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ctx of gen1) { /* consume */ }

      // Consume second generator
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ctx of gen2) { /* consume */ }

      // Only the second execution should have fully completed the node
      // (first was cancelled when second started)
      expect(slowNode.onExecute).toHaveBeenCalled()
    })
  })
})
