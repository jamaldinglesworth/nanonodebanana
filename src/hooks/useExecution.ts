import { useExecutionContext } from '../context/ExecutionContext'

/**
 * Hook for accessing and controlling workflow execution.
 * Provides execution state and control methods for components.
 */
export function useExecution() {
  const context = useExecutionContext()

  return {
    isExecuting: context.isExecuting,
    currentNodeId: context.currentNodeId,
    executionResults: context.executionResults,
    executionErrors: context.executionErrors,
    progress: context.progress,
    execute: context.execute,
    executeFromNode: context.executeFromNode,
    executeNodeOnly: context.executeNodeOnly,
    cancel: context.cancel,
    getNodeStatus: context.getNodeStatus,
  }
}
