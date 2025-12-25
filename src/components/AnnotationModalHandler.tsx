import { useEffect, useState, useCallback } from 'react'
import { AnnotationModal } from './AnnotationModal'

interface AnnotationRequest {
  nodeId: number
  imageUrl: string
  onSave: (annotatedUrl: string) => void
}

/**
 * Handles 'open-annotation-modal' custom events from AnnotationNode.
 * Manages the modal state and passes callbacks back to the node.
 */
export function AnnotationModalHandler() {
  const [isOpen, setIsOpen] = useState(false)
  const [request, setRequest] = useState<AnnotationRequest | null>(null)

  // Listen for annotation modal events
  useEffect(() => {
    const handleOpenAnnotation = (e: CustomEvent<AnnotationRequest>) => {
      setRequest(e.detail)
      setIsOpen(true)
    }

    window.addEventListener('open-annotation-modal', handleOpenAnnotation as EventListener)
    return () => {
      window.removeEventListener('open-annotation-modal', handleOpenAnnotation as EventListener)
    }
  }, [])

  const handleClose = useCallback(() => {
    setIsOpen(false)
    setRequest(null)
  }, [])

  const handleSave = useCallback((annotatedUrl: string) => {
    if (request?.onSave) {
      request.onSave(annotatedUrl)
    }
    handleClose()
  }, [request, handleClose])

  if (!request) return null

  return (
    <AnnotationModal
      isOpen={isOpen}
      imageUrl={request.imageUrl}
      onClose={handleClose}
      onSave={handleSave}
    />
  )
}
