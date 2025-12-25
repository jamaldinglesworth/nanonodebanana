import { useState, useMemo } from 'react'
import { useExecution } from '../hooks/useExecution'

/**
 * Convert raw base64 to data URI if needed.
 */
function toDataUri(image: string | null | undefined): string | null {
  if (!image) return null

  // Already a URL or data URI
  if (image.startsWith('http://') || image.startsWith('https://') || image.startsWith('data:') || image.startsWith('blob:')) {
    return image
  }

  // Raw base64 - detect format and convert to data URI
  if (image.startsWith('/9j/')) {
    return `data:image/jpeg;base64,${image}`
  } else if (image.startsWith('iVBORw')) {
    return `data:image/png;base64,${image}`
  } else if (image.startsWith('R0lGOD')) {
    return `data:image/gif;base64,${image}`
  } else if (image.startsWith('UklGR')) {
    return `data:image/webp;base64,${image}`
  }

  // Default to PNG
  return `data:image/png;base64,${image}`
}

/**
 * Bottom right panel displaying generated output images.
 * Shows the latest generated image with options to view, copy, or save.
 */
export function OutputPreview() {
  const { isExecuting, progress, executionResults } = useExecution()
  const [selectedImage] = useState<string | null>(null)

  // Get the latest generated image from execution results
  const latestImage = Array.from(executionResults.values())
    .filter((result): result is { image: string } =>
      typeof result === 'object' && result !== null && 'image' in result
    )
    .pop()?.image

  // Convert to data URI for display (memoized to avoid recalculating)
  const displayImage = useMemo(
    () => toDataUri(selectedImage || latestImage),
    [selectedImage, latestImage]
  )

  return (
    <div className="flex h-64 flex-col p-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
        Output Preview
      </h2>

      {/* Progress bar during execution */}
      {isExecuting && (
        <div className="mb-3">
          <div className="h-1 overflow-hidden rounded-full bg-zinc-700">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-center text-xs text-zinc-500">
            Generating... {Math.round(progress)}%
          </p>
        </div>
      )}

      {/* Image preview */}
      <div className="flex-1 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800">
        {displayImage ? (
          <img
            src={displayImage}
            alt="Generated output"
            className="h-full w-full object-contain"
            onClick={() => {
              // TODO: Open fullscreen view
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-center text-sm text-zinc-500">
              {isExecuting ? 'Generating image...' : 'No output yet'}
            </p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {displayImage && (
        <div className="mt-2 flex gap-2">
          <button
            className="flex-1 rounded-md bg-zinc-700 py-1 text-xs text-zinc-300 hover:bg-zinc-600"
            onClick={() => {
              // TODO: Copy to clipboard
            }}
          >
            Copy
          </button>
          <button
            className="flex-1 rounded-md bg-zinc-700 py-1 text-xs text-zinc-300 hover:bg-zinc-600"
            onClick={() => {
              // TODO: Download image
            }}
          >
            Save
          </button>
          <button
            className="flex-1 rounded-md bg-zinc-700 py-1 text-xs text-zinc-300 hover:bg-zinc-600"
            onClick={() => {
              // TODO: Send to input node
            }}
          >
            Use
          </button>
        </div>
      )}
    </div>
  )
}
