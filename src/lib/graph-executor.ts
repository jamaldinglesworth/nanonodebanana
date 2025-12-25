import type { LGraph, LGraphNode } from 'litegraph.js'
import type { ExecutionContext, ExecutionEngine } from '../types/nodes'
import { NODE_MODE } from '../nodes/base/BaseNode'

/**
 * Topologically sorts nodes in the graph for execution order.
 * Ensures dependencies are executed before dependent nodes.
 *
 * Uses Kahn's algorithm with O(n + e) complexity where n = nodes, e = edges.
 */
function topologicalSort(graph: LGraph): LGraphNode[] {
  const nodes = graph._nodes || []
  const visited = new Set<number>()
  const result: LGraphNode[] = []

  // Build node ID to node lookup for O(1) access
  const nodeById = new Map<number, LGraphNode>()
  for (const node of nodes) {
    nodeById.set(node.id, node)
  }

  // Build dependency graph (who does this node depend on)
  // and reverse adjacency list (who depends on this node) for O(1) lookup
  const dependencies = new Map<number, Set<number>>()
  const dependents = new Map<number, Set<number>>()

  for (const node of nodes) {
    dependencies.set(node.id, new Set())
    dependents.set(node.id, new Set())
  }

  // Find dependencies based on input connections
  for (const node of nodes) {
    if (!node.inputs) continue

    for (const input of node.inputs) {
      if (input.link != null) {
        const linkInfo = graph.links[input.link]
        if (linkInfo) {
          // node depends on linkInfo.origin_id
          dependencies.get(node.id)?.add(linkInfo.origin_id)
          // linkInfo.origin_id has node as a dependent
          dependents.get(linkInfo.origin_id)?.add(node.id)
        }
      }
    }
  }

  // Kahn's algorithm for topological sort
  const inDegree = new Map<number, number>()
  for (const node of nodes) {
    inDegree.set(node.id, dependencies.get(node.id)?.size || 0)
  }

  const queue: LGraphNode[] = nodes.filter(n => inDegree.get(n.id) === 0)

  while (queue.length > 0) {
    const node = queue.shift()!
    result.push(node)
    visited.add(node.id)

    // O(1) lookup of nodes that depend on this one
    const nodeDependents = dependents.get(node.id)
    if (nodeDependents) {
      for (const dependentId of nodeDependents) {
        const newDegree = (inDegree.get(dependentId) || 1) - 1
        inDegree.set(dependentId, newDegree)
        if (newDegree === 0 && !visited.has(dependentId)) {
          const dependentNode = nodeById.get(dependentId)
          if (dependentNode) {
            queue.push(dependentNode)
          }
        }
      }
    }
  }

  return result
}

/**
 * Gets input values for a node from connected output nodes.
 */
function getNodeInputs(
  node: LGraphNode,
  graph: LGraph,
  results: Map<string, Record<string, unknown>>
): Record<string, unknown> {
  const inputs: Record<string, unknown> = {}

  if (!node.inputs) return inputs

  for (const input of node.inputs) {
    if (input.link == null) continue

    const linkInfo = graph.links[input.link]
    if (!linkInfo) continue

    const sourceNodeId = linkInfo.origin_id
    const sourceSlot = linkInfo.origin_slot
    const sourceResults = results.get(String(sourceNodeId))

    if (sourceResults) {
      const sourceNode = graph.getNodeById(sourceNodeId)
      if (sourceNode?.outputs?.[sourceSlot]) {
        const outputName = sourceNode.outputs[sourceSlot].name
        inputs[input.name] = sourceResults[outputName]
      }
    }
  }

  return inputs
}

/**
 * Creates a graph execution engine.
 * Executes nodes in topological order, handling async operations.
 *
 * Thread-safety: Uses execution IDs to isolate concurrent runs.
 * The shared results cache is preserved between partial executions.
 */
export function createExecutionEngine(): ExecutionEngine {
  // Shared state for caching between partial executions
  const results = new Map<string, unknown>()

  // Execution isolation: track current execution to prevent race conditions
  let currentExecutionId: number | null = null
  let nextExecutionId = 0

  /**
   * Check if this execution is still the active one.
   * Returns false if another execution has started or cancel was called.
   */
  function isExecutionActive(executionId: number): boolean {
    return currentExecutionId === executionId
  }

  async function* execute(graph: LGraph): AsyncGenerator<ExecutionContext> {
    // Generate unique ID for this execution
    const executionId = nextExecutionId++
    currentExecutionId = executionId

    // Clear results only for full execution (partial execution preserves cache)
    results.clear()

    const sortedNodes = topologicalSort(graph)
    const nodeResults = new Map<string, Record<string, unknown>>()

    for (let i = 0; i < sortedNodes.length; i++) {
      // Check if this execution was cancelled or superseded
      if (!isExecutionActive(executionId)) break

      const node = sortedNodes[i]!
      const nodeId = String(node.id)
      const nodeMode = (node as unknown as { mode?: number }).mode ?? NODE_MODE.NORMAL

      // Handle muted nodes - skip execution, output null
      if (nodeMode === NODE_MODE.MUTED) {
        const nodeOutput: Record<string, unknown> = {}
        // Set all outputs to null
        if (node.outputs) {
          for (const output of node.outputs) {
            nodeOutput[output.name] = null
          }
        }
        nodeResults.set(nodeId, nodeOutput)
        results.set(nodeId, nodeOutput)

        yield {
          nodeId,
          status: 'completed',
          progress: ((i + 1) / sortedNodes.length) * 100,
          result: nodeOutput,
        }
        continue
      }

      // Handle bypassed nodes - pass through first input to first output
      if (nodeMode === NODE_MODE.BYPASSED) {
        const inputs = getNodeInputs(node, graph, nodeResults)
        const nodeOutput: Record<string, unknown> = {}

        // Pass through: map inputs to outputs by matching types or position
        if (node.inputs && node.outputs) {
          for (let outIdx = 0; outIdx < node.outputs.length; outIdx++) {
            const output = node.outputs[outIdx]
            if (!output) continue

            // Find matching input by type first, then by position
            let matchedValue: unknown = undefined
            for (let inIdx = 0; inIdx < node.inputs.length; inIdx++) {
              const input = node.inputs[inIdx]
              if (!input) continue

              // Check if types match
              if (input.type === output.type && inputs[input.name] !== undefined) {
                matchedValue = inputs[input.name]
                break
              }
            }
            // Fallback to position-based matching
            if (matchedValue === undefined && node.inputs[outIdx]) {
              const inputName = node.inputs[outIdx]?.name
              if (inputName) {
                matchedValue = inputs[inputName]
              }
            }
            nodeOutput[output.name] = matchedValue
          }
        }

        nodeResults.set(nodeId, nodeOutput)
        results.set(nodeId, nodeOutput)

        yield {
          nodeId,
          status: 'completed',
          progress: ((i + 1) / sortedNodes.length) * 100,
          result: nodeOutput,
        }
        continue
      }

      // Normal execution
      // Emit running status
      yield {
        nodeId,
        status: 'running',
        progress: (i / sortedNodes.length) * 100,
      }

      try {
        // Get input values from connected nodes
        const inputs = getNodeInputs(node, graph, nodeResults)

        // Execute the node if it has an onExecute method
        let nodeOutput: Record<string, unknown> = {}

        if ('onExecute' in node && typeof node.onExecute === 'function') {
          // Set inputs on the node
          for (const [key, value] of Object.entries(inputs)) {
            node.setProperty(key, value)
          }

          // Execute and get output
          const executeResult = await (node as unknown as { onExecute: () => Promise<Record<string, unknown>> }).onExecute()
          nodeOutput = executeResult || {}
        }

        // Store results
        nodeResults.set(nodeId, nodeOutput)
        results.set(nodeId, nodeOutput)

        // Emit completed status
        yield {
          nodeId,
          status: 'completed',
          progress: ((i + 1) / sortedNodes.length) * 100,
          result: nodeOutput,
        }
      } catch (error) {
        // Emit error status
        yield {
          nodeId,
          status: 'error',
          error: error instanceof Error ? error : new Error(String(error)),
        }
      }
    }
  }

  /**
   * Execute from a specific node onwards.
   * Runs the starting node and all nodes that depend on it (downstream).
   * Uses cached results for upstream dependencies.
   */
  async function* executeFromNode(graph: LGraph, startNodeId: number): AsyncGenerator<ExecutionContext> {
    // Generate unique ID for this execution
    const executionId = nextExecutionId++
    currentExecutionId = executionId

    // Note: Don't clear results - partial execution uses cached upstream results

    // Get all nodes that need to be executed (startNode and all downstream)
    const sortedNodes = topologicalSort(graph)
    const startNodeIndex = sortedNodes.findIndex(n => n.id === startNodeId)

    if (startNodeIndex === -1) {
      yield {
        nodeId: String(startNodeId),
        status: 'error',
        error: new Error(`Node ${startNodeId} not found in graph`),
      }
      return
    }

    // Find all nodes downstream from startNode (including startNode)
    const downstreamNodes = new Set<number>([startNodeId])
    const nodesToExecute: LGraphNode[] = []

    // Build set of downstream node IDs
    for (let i = startNodeIndex; i < sortedNodes.length; i++) {
      const node = sortedNodes[i]!
      // Check if any input comes from a downstream node
      let hasUpstreamDownstream = node.id === startNodeId
      if (node.inputs) {
        for (const input of node.inputs) {
          if (input.link != null) {
            const linkInfo = graph.links[input.link]
            if (linkInfo && downstreamNodes.has(linkInfo.origin_id)) {
              hasUpstreamDownstream = true
              break
            }
          }
        }
      }
      if (hasUpstreamDownstream) {
        downstreamNodes.add(node.id)
        nodesToExecute.push(node)
      }
    }

    const nodeResults = new Map<string, Record<string, unknown>>()

    // Pre-populate with cached results for nodes we're not re-executing
    for (const [nodeId, result] of results.entries()) {
      if (!downstreamNodes.has(Number(nodeId))) {
        nodeResults.set(nodeId, result as Record<string, unknown>)
      }
    }

    for (let i = 0; i < nodesToExecute.length; i++) {
      // Check if this execution was cancelled or superseded
      if (!isExecutionActive(executionId)) break

      const node = nodesToExecute[i]!
      const nodeId = String(node.id)
      const nodeMode = (node as unknown as { mode?: number }).mode ?? NODE_MODE.NORMAL

      // Handle muted/bypassed nodes same as full execute
      if (nodeMode === NODE_MODE.MUTED) {
        const nodeOutput: Record<string, unknown> = {}
        if (node.outputs) {
          for (const output of node.outputs) {
            nodeOutput[output.name] = null
          }
        }
        nodeResults.set(nodeId, nodeOutput)
        results.set(nodeId, nodeOutput)
        yield {
          nodeId,
          status: 'completed',
          progress: ((i + 1) / nodesToExecute.length) * 100,
          result: nodeOutput,
        }
        continue
      }

      if (nodeMode === NODE_MODE.BYPASSED) {
        const inputs = getNodeInputs(node, graph, nodeResults)
        const nodeOutput: Record<string, unknown> = {}
        if (node.inputs && node.outputs) {
          for (let outIdx = 0; outIdx < node.outputs.length; outIdx++) {
            const output = node.outputs[outIdx]
            if (!output) continue
            let matchedValue: unknown = undefined
            for (let inIdx = 0; inIdx < node.inputs.length; inIdx++) {
              const input = node.inputs[inIdx]
              if (!input) continue
              if (input.type === output.type && inputs[input.name] !== undefined) {
                matchedValue = inputs[input.name]
                break
              }
            }
            if (matchedValue === undefined && node.inputs[outIdx]) {
              const inputName = node.inputs[outIdx]?.name
              if (inputName) {
                matchedValue = inputs[inputName]
              }
            }
            nodeOutput[output.name] = matchedValue
          }
        }
        nodeResults.set(nodeId, nodeOutput)
        results.set(nodeId, nodeOutput)
        yield {
          nodeId,
          status: 'completed',
          progress: ((i + 1) / nodesToExecute.length) * 100,
          result: nodeOutput,
        }
        continue
      }

      yield {
        nodeId,
        status: 'running',
        progress: (i / nodesToExecute.length) * 100,
      }

      try {
        const inputs = getNodeInputs(node, graph, nodeResults)
        let nodeOutput: Record<string, unknown> = {}

        if ('onExecute' in node && typeof node.onExecute === 'function') {
          for (const [key, value] of Object.entries(inputs)) {
            node.setProperty(key, value)
          }
          const executeResult = await (node as unknown as { onExecute: () => Promise<Record<string, unknown>> }).onExecute()
          nodeOutput = executeResult || {}
        }

        nodeResults.set(nodeId, nodeOutput)
        results.set(nodeId, nodeOutput)

        yield {
          nodeId,
          status: 'completed',
          progress: ((i + 1) / nodesToExecute.length) * 100,
          result: nodeOutput,
        }
      } catch (error) {
        yield {
          nodeId,
          status: 'error',
          error: error instanceof Error ? error : new Error(String(error)),
        }
      }
    }
  }

  /**
   * Execute only a single node using cached inputs from previous executions.
   */
  async function* executeNodeOnly(graph: LGraph, nodeId: number): AsyncGenerator<ExecutionContext> {
    // Generate unique ID for this execution
    const executionId = nextExecutionId++
    currentExecutionId = executionId

    // Note: Don't clear results - single node execution uses cached inputs

    const node = graph.getNodeById(nodeId)
    if (!node) {
      yield {
        nodeId: String(nodeId),
        status: 'error',
        error: new Error(`Node ${nodeId} not found in graph`),
      }
      return
    }

    const nodeIdStr = String(nodeId)
    const nodeMode = (node as unknown as { mode?: number }).mode ?? NODE_MODE.NORMAL

    // Build nodeResults from cached results
    const nodeResults = new Map<string, Record<string, unknown>>()
    for (const [id, result] of results.entries()) {
      nodeResults.set(id, result as Record<string, unknown>)
    }

    if (nodeMode === NODE_MODE.MUTED) {
      const nodeOutput: Record<string, unknown> = {}
      if (node.outputs) {
        for (const output of node.outputs) {
          nodeOutput[output.name] = null
        }
      }
      results.set(nodeIdStr, nodeOutput)
      yield {
        nodeId: nodeIdStr,
        status: 'completed',
        progress: 100,
        result: nodeOutput,
      }
      return
    }

    if (nodeMode === NODE_MODE.BYPASSED) {
      const inputs = getNodeInputs(node, graph, nodeResults)
      const nodeOutput: Record<string, unknown> = {}
      if (node.inputs && node.outputs) {
        for (let outIdx = 0; outIdx < node.outputs.length; outIdx++) {
          const output = node.outputs[outIdx]
          if (!output) continue
          let matchedValue: unknown = undefined
          for (let inIdx = 0; inIdx < node.inputs.length; inIdx++) {
            const input = node.inputs[inIdx]
            if (!input) continue
            if (input.type === output.type && inputs[input.name] !== undefined) {
              matchedValue = inputs[input.name]
              break
            }
          }
          if (matchedValue === undefined && node.inputs[outIdx]) {
            const inputName = node.inputs[outIdx]?.name
            if (inputName) {
              matchedValue = inputs[inputName]
            }
          }
          nodeOutput[output.name] = matchedValue
        }
      }
      results.set(nodeIdStr, nodeOutput)
      yield {
        nodeId: nodeIdStr,
        status: 'completed',
        progress: 100,
        result: nodeOutput,
      }
      return
    }

    yield {
      nodeId: nodeIdStr,
      status: 'running',
      progress: 0,
    }

    try {
      const inputs = getNodeInputs(node, graph, nodeResults)
      let nodeOutput: Record<string, unknown> = {}

      if ('onExecute' in node && typeof node.onExecute === 'function') {
        for (const [key, value] of Object.entries(inputs)) {
          node.setProperty(key, value)
        }
        const executeResult = await (node as unknown as { onExecute: () => Promise<Record<string, unknown>> }).onExecute()
        nodeOutput = executeResult || {}
      }

      results.set(nodeIdStr, nodeOutput)

      yield {
        nodeId: nodeIdStr,
        status: 'completed',
        progress: 100,
        result: nodeOutput,
      }
    } catch (error) {
      yield {
        nodeId: nodeIdStr,
        status: 'error',
        error: error instanceof Error ? error : new Error(String(error)),
      }
    }
  }

  function cancel() {
    // Setting to null invalidates all active executions
    currentExecutionId = null
  }

  function getResults() {
    return new Map(results)
  }

  return {
    execute,
    executeFromNode,
    executeNodeOnly,
    cancel,
    getResults,
  }
}
