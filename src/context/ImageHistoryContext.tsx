import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react'

/**
 * Represents a single image entry in the history.
 */
export interface HistoryImage {
  id: string
  imageUrl: string
  prompt?: string
  model?: string
  nodeType?: string
  timestamp: number
}

/**
 * Image history state interface.
 */
interface ImageHistoryState {
  images: HistoryImage[]
  addImage: (image: Omit<HistoryImage, 'id' | 'timestamp'>) => void
  removeImage: (id: string) => void
  clearHistory: () => void
  maxImages: number
}

const STORAGE_KEY = 'nanonodebanana_image_history'
const MAX_IMAGES = 100

const ImageHistoryContext = createContext<ImageHistoryState | undefined>(undefined)

interface ImageHistoryProviderProps {
  children: ReactNode
}

/**
 * Provider component for image history state management.
 * Stores generated images with metadata for quick access and reuse.
 */
export function ImageHistoryProvider({ children }: ImageHistoryProviderProps) {
  const [images, setImages] = useState<HistoryImage[]>(() => {
    // Load from localStorage on initial render
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        // Validate and return stored images
        if (Array.isArray(parsed)) {
          return parsed.slice(0, MAX_IMAGES)
        }
      }
    } catch {
      // Ignore parse errors
    }
    return []
  })

  // Persist to localStorage when images change
  useEffect(() => {
    try {
      // Store only metadata, not large base64 data
      const toStore = images.map(img => ({
        ...img,
        // Keep image URLs (they're usually blob: or short data URIs)
        // For large base64, we'd need IndexedDB (future enhancement)
      }))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore))
    } catch {
      // localStorage quota exceeded - silently fail
      // Future: migrate to IndexedDB for larger storage
    }
  }, [images])

  const addImage = useCallback((image: Omit<HistoryImage, 'id' | 'timestamp'>) => {
    const newImage: HistoryImage = {
      ...image,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    }

    setImages(prev => {
      // Add to front, remove oldest if over limit (FIFO)
      const updated = [newImage, ...prev]
      if (updated.length > MAX_IMAGES) {
        return updated.slice(0, MAX_IMAGES)
      }
      return updated
    })
  }, [])

  const removeImage = useCallback((id: string) => {
    setImages(prev => prev.filter(img => img.id !== id))
  }, [])

  const clearHistory = useCallback(() => {
    setImages([])
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const value: ImageHistoryState = {
    images,
    addImage,
    removeImage,
    clearHistory,
    maxImages: MAX_IMAGES,
  }

  return (
    <ImageHistoryContext.Provider value={value}>
      {children}
    </ImageHistoryContext.Provider>
  )
}

/**
 * Hook to access image history state from any component.
 * Must be used within an ImageHistoryProvider.
 */
export function useImageHistory(): ImageHistoryState {
  const context = useContext(ImageHistoryContext)

  if (context === undefined) {
    throw new Error('useImageHistory must be used within an ImageHistoryProvider')
  }

  return context
}
