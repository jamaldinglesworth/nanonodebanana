import { useState, useCallback, useMemo } from 'react'
import { useImageHistory } from '../hooks/useImageHistory'
import type { HistoryImage } from '../context/ImageHistoryContext'

const VISIBLE_COUNT = 5 // Number of images to show in collapsed fan view

interface ImageHistoryProps {
  onImageDragStart?: (image: HistoryImage) => void
}

/**
 * Image history panel with fan layout.
 * Shows recent generated images and allows dragging to canvas.
 */
export function ImageHistory({ onImageDragStart }: ImageHistoryProps) {
  const { images, removeImage, clearHistory } = useImageHistory()
  const [isExpanded, setIsExpanded] = useState(false)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // Get images to display based on expanded state
  const displayImages = useMemo(() => {
    if (isExpanded) {
      return images
    }
    return images.slice(0, VISIBLE_COUNT)
  }, [images, isExpanded])

  // Handle drag start for image
  const handleDragStart = useCallback(
    (e: React.DragEvent, image: HistoryImage) => {
      e.dataTransfer.setData('node-type', 'input/image')
      e.dataTransfer.setData('image-url', image.imageUrl)
      e.dataTransfer.setData('image-history-id', image.id)
      e.dataTransfer.effectAllowed = 'copy'
      onImageDragStart?.(image)
    },
    [onImageDragStart]
  )

  // Format timestamp for display
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - timestamp
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`

    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`

    return date.toLocaleDateString()
  }

  if (images.length === 0) {
    return null // Don't show panel if no history
  }

  return (
    <div className="absolute bottom-20 left-4 z-10">
      {/* Fan layout - collapsed view */}
      {!isExpanded && (
        <div className="relative h-16">
          {displayImages.map((image, index) => {
            const offset = index * 24
            const rotation = (index - (displayImages.length - 1) / 2) * 5
            const isHovered = hoveredId === image.id

            return (
              <div
                key={image.id}
                draggable
                onDragStart={(e) => handleDragStart(e, image)}
                onMouseEnter={() => setHoveredId(image.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="absolute cursor-grab rounded-lg border border-zinc-600 bg-zinc-800 shadow-lg transition-all duration-200 hover:z-50"
                style={{
                  left: offset,
                  transform: `rotate(${isHovered ? 0 : rotation}deg) ${isHovered ? 'scale(1.2) translateY(-10px)' : ''}`,
                  zIndex: isHovered ? 50 : displayImages.length - index,
                }}
              >
                <img
                  src={image.imageUrl}
                  alt={image.prompt || 'Generated image'}
                  className="h-14 w-14 rounded-lg object-cover"
                />
              </div>
            )
          })}

          {/* Expand button */}
          {images.length > VISIBLE_COUNT && (
            <button
              onClick={() => setIsExpanded(true)}
              className="absolute rounded-full bg-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-600"
              style={{ left: displayImages.length * 24 + 8 }}
            >
              +{images.length - VISIBLE_COUNT}
            </button>
          )}
        </div>
      )}

      {/* Expanded grid view */}
      {isExpanded && (
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/95 p-3 shadow-xl backdrop-blur">
          {/* Header */}
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-medium text-zinc-300">
              Image History ({images.length})
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => clearHistory()}
                className="text-xs text-zinc-500 hover:text-red-400"
              >
                Clear all
              </button>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-xs text-zinc-400 hover:text-zinc-200"
              >
                Collapse
              </button>
            </div>
          </div>

          {/* Image grid */}
          <div className="grid max-h-64 grid-cols-4 gap-2 overflow-y-auto">
            {images.map((image) => (
              <div
                key={image.id}
                draggable
                onDragStart={(e) => handleDragStart(e, image)}
                className="group relative cursor-grab rounded-md border border-zinc-600 bg-zinc-700 transition-all hover:border-blue-500"
              >
                <img
                  src={image.imageUrl}
                  alt={image.prompt || 'Generated image'}
                  className="h-16 w-16 rounded-md object-cover"
                />

                {/* Hover overlay with metadata */}
                <div className="absolute inset-0 flex flex-col justify-end rounded-md bg-gradient-to-t from-black/80 to-transparent p-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <p className="truncate text-[10px] text-zinc-300">
                    {image.model || image.nodeType || 'Unknown'}
                  </p>
                  <p className="text-[9px] text-zinc-500">
                    {formatTime(image.timestamp)}
                  </p>
                </div>

                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removeImage(image.id)
                  }}
                  className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white group-hover:flex hover:bg-red-600"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* Drag hint */}
          <p className="mt-2 text-center text-[10px] text-zinc-500">
            Drag an image to the canvas to use it
          </p>
        </div>
      )}
    </div>
  )
}
