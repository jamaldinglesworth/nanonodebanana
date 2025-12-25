import { useEffect, useState, useCallback, useMemo } from 'react'
import { getCachedBlobUrl } from '../lib/image-utils'

interface ImageModalData {
  url: string
  title?: string
  metadata?: Record<string, unknown>
}

/**
 * Fullscreen image modal component.
 * Listens for 'show-image-modal' custom events to display images.
 * Press Escape or click outside to close.
 */
export function ImageModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [imageData, setImageData] = useState<ImageModalData | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)

  // Handle showing the modal
  const handleShowModal = useCallback((event: CustomEvent<ImageModalData>) => {
    setImageData(event.detail)
    setImageLoaded(false)
    setIsOpen(true)
  }, [])

  // Handle closing the modal
  const handleClose = useCallback(() => {
    setIsOpen(false)
    setImageData(null)
    setImageLoaded(false)
  }, [])

  // Handle keyboard events
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose()
    }
  }, [handleClose])

  // Listen for custom events
  useEffect(() => {
    window.addEventListener('show-image-modal', handleShowModal as EventListener)
    return () => {
      window.removeEventListener('show-image-modal', handleShowModal as EventListener)
    }
  }, [handleShowModal])

  // Listen for keyboard events when open
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => {
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [isOpen, handleKeyDown])

  // Convert base64 to blob URL for better performance with large images
  // useMemo ensures we only convert when the URL changes
  const imageSrc = useMemo(() => {
    if (!imageData?.url) return ''
    return getCachedBlobUrl(imageData.url)
  }, [imageData?.url])

  if (!isOpen || !imageData) return null

  // Format metadata for display
  const formatMetadata = (metadata: Record<string, unknown>) => {
    return Object.entries(metadata)
      .filter(([_, value]) => value !== undefined && value !== '')
      .map(([key, value]) => ({
        key: key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim(),
        value: typeof value === 'object' ? JSON.stringify(value) : String(value),
      }))
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90"
      onClick={handleClose}
    >
      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute right-4 top-4 rounded-lg bg-zinc-800/80 p-2 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-100"
        title="Close (Escape)"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Image container */}
      <div
        className="relative max-h-[90vh] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Loading indicator */}
        {!imageLoaded && (
          <div className="flex h-64 w-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-600 border-t-blue-500" />
          </div>
        )}

        {/* Image */}
        <img
          src={imageSrc}
          alt={imageData.title ?? 'Generated image'}
          className={`max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl ${imageLoaded ? 'block' : 'hidden'}`}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageLoaded(true)}
        />

        {/* Title and metadata panel */}
        {imageLoaded && (imageData.title || imageData.metadata) && (
          <div className="absolute bottom-0 left-0 right-0 rounded-b-lg bg-gradient-to-t from-black/80 to-transparent p-4">
            {imageData.title && (
              <h3 className="mb-2 text-lg font-semibold text-white">
                {imageData.title}
              </h3>
            )}
            {imageData.metadata && (
              <div className="flex flex-wrap gap-3">
                {formatMetadata(imageData.metadata).map(({ key, value }) => (
                  <div key={key} className="rounded bg-zinc-800/60 px-2 py-1">
                    <span className="text-xs text-zinc-400">{key}: </span>
                    <span className="text-xs text-zinc-200">{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-zinc-500">
        Press <kbd className="rounded bg-zinc-800 px-1.5 py-0.5">Esc</kbd> or click outside to close
      </div>
    </div>
  )
}

/**
 * Helper function to show the image modal from anywhere.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function showImageModal(url: string, title?: string, metadata?: Record<string, unknown>) {
  const event = new CustomEvent<ImageModalData>('show-image-modal', {
    detail: { url, title, metadata },
  })
  window.dispatchEvent(event)
}
