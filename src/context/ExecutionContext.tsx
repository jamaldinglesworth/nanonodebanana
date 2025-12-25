import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react'
import type { ExecutionContext as NodeExecutionContext } from '../types/nodes'
import { useGraphContext } from './GraphContext'
import { createExecutionEngine } from '../lib/graph-executor'

/**
 * Execution state interface for managing workflow execution.
 */
interface ExecutionState {
  isExecuting: boolean
  currentNodeId: string | null
  executionResults: Map<string, unknown>
  executionErrors: Map<string, Error>
  progress: number
  execute: () => Promise<void>
  executeFromNode: (nodeId: number) => Promise<void>
  executeNodeOnly: (nodeId: number) => Promise<void>
  cancel: () => void
  getNodeStatus: (nodeId: string) => NodeExecutionContext | undefined
}

const ExecutionContext = createContext<ExecutionState | undefined>(undefined)

interface ExecutionProviderProps {
  children: ReactNode
}

/**
 * Provider component for execution state management.
 * Handles workflow execution, cancellation, and progress tracking.
 */
export function ExecutionProvider({ children }: ExecutionProviderProps) {
  const { graph, canvas } = useGraphContext()

  const [isExecuting, setIsExecuting] = useState(false)
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null)
  const [executionResults] = useState<Map<string, unknown>>(new Map())
  const [executionErrors] = useState<Map<string, Error>>(new Map())
  const [progress, setProgress] = useState(0)
  const [nodeStatuses, setNodeStatuses] = useState<Map<string, NodeExecutionContext>>(new Map())

  const engineRef = useRef(createExecutionEngine())

  const execute = useCallback(async () => {
    if (!graph) {
      console.error('No graph available for execution')
      return
    }

    if (graph._nodes.length === 0) {
      console.log('No nodes to execute')
      return
    }

    setIsExecuting(true)
    setProgress(0)
    executionResults.clear()
    executionErrors.clear()
    setNodeStatuses(new Map())

    console.log('Starting workflow execution...')

    try {
      const engine = engineRef.current

      // Execute the graph and process each node's status
      for await (const status of engine.execute(graph)) {
        setCurrentNodeId(status.nodeId)
        setProgress(status.progress ?? 0)

        // Update node statuses
        setNodeStatuses(prev => {
          const next = new Map(prev)
          next.set(status.nodeId, status)
          return next
        })

        // Store results or errors
        if (status.status === 'completed' && status.result) {
          executionResults.set(status.nodeId, status.result)
          console.log(`Node ${status.nodeId} completed:`, status.result)
        } else if (status.status === 'error' && status.error) {
          executionErrors.set(status.nodeId, status.error)
          console.error(`Node ${status.nodeId} error:`, status.error)
        }

        // Force canvas redraw to show updated node states
        canvas?.setDirty(true, true)
      }

      console.log('Workflow execution completed')
      setProgress(100)
    } catch (error) {
      console.error('Execution failed:', error)
    } finally {
      setIsExecuting(false)
      setCurrentNodeId(null)
    }
  }, [graph, canvas, executionResults, executionErrors])

  /**
   * Execute from a specific node - runs the selected node and all downstream nodes.
   * Uses cached results from previous executions for upstream dependencies.
   */
  const executeFromNode = useCallback(async (startNodeId: number) => {
    if (!graph) {
      console.error('No graph available for execution')
      return
    }

    setIsExecuting(true)
    setProgress(0)
    // Don't clear previous results - we'll use them for upstream nodes
    setNodeStatuses(new Map())

    console.log(`Starting execution from node ${startNodeId}...`)

    try {
      const engine = engineRef.current

      // Execute the graph starting from the specified node
      for await (const status of engine.executeFromNode(graph, startNodeId)) {
        setCurrentNodeId(status.nodeId)
        setProgress(status.progress ?? 0)

        setNodeStatuses(prev => {
          const next = new Map(prev)
          next.set(status.nodeId, status)
          return next
        })

        if (status.status === 'completed' && status.result) {
          executionResults.set(status.nodeId, status.result)
          console.log(`Node ${status.nodeId} completed:`, status.result)
        } else if (status.status === 'error' && status.error) {
          executionErrors.set(status.nodeId, status.error)
          console.error(`Node ${status.nodeId} error:`, status.error)
        }

        canvas?.setDirty(true, true)
      }

      console.log('Execution from node completed')
      setProgress(100)
    } catch (error) {
      console.error('Execution failed:', error)
    } finally {
      setIsExecuting(false)
      setCurrentNodeId(null)
    }
  }, [graph, canvas, executionResults, executionErrors])

  /**
   * Execute only the selected node - uses cached inputs from previous executions.
   */
  const executeNodeOnly = useCallback(async (nodeId: number) => {
    if (!graph) {
      console.error('No graph available for execution')
      return
    }

    setIsExecuting(true)
    setProgress(0)
    setNodeStatuses(new Map())

    console.log(`Executing only node ${nodeId}...`)

    try {
      const engine = engineRef.current

      // Execute only the specified node
      for await (const status of engine.executeNodeOnly(graph, nodeId)) {
        setCurrentNodeId(status.nodeId)
        setProgress(status.progress ?? 0)

        setNodeStatuses(prev => {
          const next = new Map(prev)
          next.set(status.nodeId, status)
          return next
        })

        if (status.status === 'completed' && status.result) {
          executionResults.set(status.nodeId, status.result)
          console.log(`Node ${status.nodeId} completed:`, status.result)
        } else if (status.status === 'error' && status.error) {
          executionErrors.set(status.nodeId, status.error)
          console.error(`Node ${status.nodeId} error:`, status.error)
        }

        canvas?.setDirty(true, true)
      }

      console.log('Node execution completed')
      setProgress(100)
    } catch (error) {
      console.error('Execution failed:', error)
    } finally {
      setIsExecuting(false)
      setCurrentNodeId(null)
    }
  }, [graph, canvas, executionResults, executionErrors])

  const cancel = useCallback(() => {
    engineRef.current.cancel()
    setIsExecuting(false)
    setCurrentNodeId(null)
    console.log('Execution cancelled')
  }, [])

  const getNodeStatus = useCallback(
    (nodeId: string): NodeExecutionContext | undefined => {
      return nodeStatuses.get(nodeId)
    },
    [nodeStatuses]
  )

  const value: ExecutionState = {
    isExecuting,
    currentNodeId,
    executionResults,
    executionErrors,
    progress,
    execute,
    executeFromNode,
    executeNodeOnly,
    cancel,
    getNodeStatus,
  }

  return (
    <ExecutionContext.Provider value={value}>
      {children}
    </ExecutionContext.Provider>
  )
}

/**
 * Hook to access execution state from any component.
 * Must be used within an ExecutionProvider.
 */
export function useExecutionContext(): ExecutionState {
  const context = useContext(ExecutionContext)

  if (context === undefined) {
    throw new Error('useExecutionContext must be used within an ExecutionProvider')
  }

  return context
}
