import { useImageHistory as useImageHistoryContext } from '../context/ImageHistoryContext'

/**
 * Hook for accessing image history state.
 * Provides access to generated images and history management methods.
 */
export function useImageHistory() {
  const context = useImageHistoryContext()

  return {
    images: context.images,
    addImage: context.addImage,
    removeImage: context.removeImage,
    clearHistory: context.clearHistory,
    maxImages: context.maxImages,
  }
}
