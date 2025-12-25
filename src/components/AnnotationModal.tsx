import { useCallback, useEffect, useRef, useState } from 'react'
import { Stage, Layer, Image as KonvaImage, Rect, Circle, Arrow, Line, Text, Transformer } from 'react-konva'
import type Konva from 'konva'

type Tool = 'select' | 'rectangle' | 'circle' | 'arrow' | 'freehand' | 'text'

interface Shape {
  id: string
  type: Tool
  x: number
  y: number
  width?: number
  height?: number
  radius?: number
  points?: number[]
  text?: string
  stroke: string
  strokeWidth: number
  fill?: string
}

interface AnnotationModalProps {
  isOpen: boolean
  imageUrl: string
  onClose: () => void
  onSave: (annotatedImageUrl: string) => void
}

/**
 * Full-screen modal for annotating images using Konva.js.
 * Supports drawing rectangles, circles, arrows, freehand, and text.
 */
export function AnnotationModal({ isOpen, imageUrl, onClose, onSave }: AnnotationModalProps) {
  const stageRef = useRef<Konva.Stage>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Canvas state
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 })
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  // Drawing state
  const [tool, setTool] = useState<Tool>('select')
  const [shapes, setShapes] = useState<Shape[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentShape, setCurrentShape] = useState<Shape | null>(null)

  // Tool settings
  const [strokeColor, setStrokeColor] = useState('#ff0000')
  const [strokeWidth, setStrokeWidth] = useState(3)
  const [fillEnabled, setFillEnabled] = useState(false)
  const [fillColor, setFillColor] = useState('#ff000033')

  // Load image when modal opens
  useEffect(() => {
    if (!isOpen || !imageUrl) return

    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.src = imageUrl
    img.onload = () => {
      setImage(img)
      // Reset state for new image
      setShapes([])
      setSelectedId(null)
      setScale(1)
      setPosition({ x: 0, y: 0 })
    }
  }, [isOpen, imageUrl])

  // Calculate stage size based on container
  useEffect(() => {
    if (!containerRef.current || !image) return

    const container = containerRef.current
    const padding = 100 // Space for toolbar
    const maxWidth = container.clientWidth - padding
    const maxHeight = container.clientHeight - padding

    // Calculate scale to fit image
    const scaleX = maxWidth / image.width
    const scaleY = maxHeight / image.height
    const fitScale = Math.min(scaleX, scaleY, 1)

    setStageSize({
      width: image.width,
      height: image.height,
    })
    setScale(fitScale)

    // Center the image
    setPosition({
      x: (container.clientWidth - image.width * fitScale) / 2,
      y: (container.clientHeight - image.height * fitScale) / 2,
    })
  }, [image])

  // Generate unique ID for shapes
  const generateId = () => `shape-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

  // Handle mouse down for drawing
  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (tool === 'select') {
      // Clicking on empty space deselects
      const clickedOnEmpty = e.target === e.target.getStage()
      if (clickedOnEmpty) {
        setSelectedId(null)
      }
      return
    }

    setIsDrawing(true)
    const stage = stageRef.current
    if (!stage) return

    const pos = stage.getPointerPosition()
    if (!pos) return

    // Transform position to stage coordinates
    const transform = stage.getAbsoluteTransform().copy().invert()
    const point = transform.point(pos)

    const newShape: Shape = {
      id: generateId(),
      type: tool,
      x: point.x,
      y: point.y,
      stroke: strokeColor,
      strokeWidth,
      fill: fillEnabled ? fillColor : undefined,
    }

    if (tool === 'rectangle') {
      newShape.width = 0
      newShape.height = 0
    } else if (tool === 'circle') {
      newShape.radius = 0
    } else if (tool === 'arrow' || tool === 'freehand') {
      newShape.points = [point.x, point.y]
    } else if (tool === 'text') {
      const text = prompt('Enter text:')
      if (text) {
        newShape.text = text
        setShapes(prev => [...prev, newShape])
      }
      setIsDrawing(false)
      return
    }

    setCurrentShape(newShape)
  }, [tool, strokeColor, strokeWidth, fillEnabled, fillColor])

  // Handle mouse move for drawing
  const handleMouseMove = useCallback((_e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isDrawing || !currentShape) return

    const stage = stageRef.current
    if (!stage) return

    const pos = stage.getPointerPosition()
    if (!pos) return

    const transform = stage.getAbsoluteTransform().copy().invert()
    const point = transform.point(pos)

    setCurrentShape(prev => {
      if (!prev) return null

      if (prev.type === 'rectangle') {
        return {
          ...prev,
          width: point.x - prev.x,
          height: point.y - prev.y,
        }
      } else if (prev.type === 'circle') {
        const dx = point.x - prev.x
        const dy = point.y - prev.y
        return {
          ...prev,
          radius: Math.sqrt(dx * dx + dy * dy),
        }
      } else if (prev.type === 'arrow') {
        return {
          ...prev,
          points: [prev.x, prev.y, point.x, point.y],
        }
      } else if (prev.type === 'freehand') {
        return {
          ...prev,
          points: [...(prev.points || []), point.x, point.y],
        }
      }
      return prev
    })
  }, [isDrawing, currentShape])

  // Handle mouse up to finish drawing
  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !currentShape) return

    setIsDrawing(false)
    setShapes(prev => [...prev, currentShape])
    setCurrentShape(null)
  }, [isDrawing, currentShape])

  // Handle zoom
  const handleZoom = useCallback((delta: number) => {
    setScale(prev => Math.min(Math.max(0.1, prev + delta), 5))
  }, [])

  // Fit to screen
  const handleFitToScreen = useCallback(() => {
    if (!containerRef.current || !image) return

    const container = containerRef.current
    const padding = 100
    const maxWidth = container.clientWidth - padding
    const maxHeight = container.clientHeight - padding

    const scaleX = maxWidth / image.width
    const scaleY = maxHeight / image.height
    const fitScale = Math.min(scaleX, scaleY, 1)

    setScale(fitScale)
    setPosition({
      x: (container.clientWidth - image.width * fitScale) / 2,
      y: (container.clientHeight - image.height * fitScale) / 2,
    })
  }, [image])

  // Delete selected shape
  const handleDelete = useCallback(() => {
    if (!selectedId) return
    setShapes(prev => prev.filter(s => s.id !== selectedId))
    setSelectedId(null)
  }, [selectedId])

  // Save annotated image
  const handleSave = useCallback(() => {
    const stage = stageRef.current
    if (!stage) return

    // Temporarily hide transformer
    setSelectedId(null)

    // Wait for transformer to hide, then export
    setTimeout(() => {
      const dataUrl = stage.toDataURL({
        pixelRatio: 1,
        mimeType: 'image/png',
      })
      onSave(dataUrl)
      onClose()
    }, 50)
  }, [onSave, onClose])

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        handleDelete()
      } else if (e.key === 'v') {
        setTool('select')
      } else if (e.key === 'r') {
        setTool('rectangle')
      } else if (e.key === 'c') {
        setTool('circle')
      } else if (e.key === 'a') {
        setTool('arrow')
      } else if (e.key === 'f') {
        setTool('freehand')
      } else if (e.key === 't') {
        setTool('text')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, handleDelete])

  // Prevent events from propagating to LiteGraph
  const stopPropagation = useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation()
  }, [])

  if (!isOpen) return null

  const tools: { id: Tool; icon: string; label: string; key: string }[] = [
    { id: 'select', icon: '↖', label: 'Select', key: 'V' },
    { id: 'rectangle', icon: '▢', label: 'Rectangle', key: 'R' },
    { id: 'circle', icon: '○', label: 'Circle', key: 'C' },
    { id: 'arrow', icon: '→', label: 'Arrow', key: 'A' },
    { id: 'freehand', icon: '✎', label: 'Freehand', key: 'F' },
    { id: 'text', icon: 'T', label: 'Text', key: 'T' },
  ]

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col bg-zinc-900"
      onClick={stopPropagation}
      onMouseDown={stopPropagation}
      onKeyDown={stopPropagation}
    >
      {/* Top toolbar */}
      <div className="flex items-center justify-between border-b border-zinc-700 bg-zinc-800 px-4 py-2">
        <div className="flex items-center gap-4">
          {/* Tool buttons */}
          <div className="flex items-center gap-1">
            {tools.map(t => (
              <button
                key={t.id}
                onClick={() => setTool(t.id)}
                className={`flex h-8 w-8 items-center justify-center rounded text-lg transition-colors ${
                  tool === t.id
                    ? 'bg-blue-600 text-white'
                    : 'text-zinc-400 hover:bg-zinc-700 hover:text-white'
                }`}
                title={`${t.label} (${t.key})`}
              >
                {t.icon}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-zinc-600" />

          {/* Color picker */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-zinc-400">Stroke:</label>
            <input
              type="color"
              value={strokeColor}
              onChange={e => setStrokeColor(e.target.value)}
              className="h-7 w-7 cursor-pointer rounded border border-zinc-600 bg-transparent"
            />
          </div>

          {/* Stroke width */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-zinc-400">Size:</label>
            <input
              type="range"
              min="1"
              max="20"
              value={strokeWidth}
              onChange={e => setStrokeWidth(Number(e.target.value))}
              className="w-20"
            />
            <span className="w-6 text-sm text-zinc-300">{strokeWidth}</span>
          </div>

          {/* Fill toggle */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-sm text-zinc-400">
              <input
                type="checkbox"
                checked={fillEnabled}
                onChange={e => setFillEnabled(e.target.checked)}
                className="rounded border-zinc-600"
              />
              Fill
            </label>
            {fillEnabled && (
              <input
                type="color"
                value={fillColor.slice(0, 7)}
                onChange={e => setFillColor(e.target.value + '33')}
                className="h-7 w-7 cursor-pointer rounded border border-zinc-600 bg-transparent"
              />
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Zoom controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleZoom(-0.1)}
              className="rounded px-2 py-1 text-sm text-zinc-400 hover:bg-zinc-700 hover:text-white"
              title="Zoom out"
            >
              −
            </button>
            <span className="w-14 text-center text-sm text-zinc-300">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => handleZoom(0.1)}
              className="rounded px-2 py-1 text-sm text-zinc-400 hover:bg-zinc-700 hover:text-white"
              title="Zoom in"
            >
              +
            </button>
            <button
              onClick={handleFitToScreen}
              className="ml-1 rounded px-2 py-1 text-sm text-zinc-400 hover:bg-zinc-700 hover:text-white"
              title="Fit to screen"
            >
              Fit
            </button>
          </div>

          <div className="h-6 w-px bg-zinc-600" />

          {/* Actions */}
          <button
            onClick={handleDelete}
            disabled={!selectedId}
            className="rounded px-3 py-1.5 text-sm text-red-400 hover:bg-red-900/30 disabled:opacity-50"
          >
            Delete
          </button>
          <button
            onClick={onClose}
            className="rounded px-3 py-1.5 text-sm text-zinc-400 hover:bg-zinc-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>

      {/* Canvas area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden bg-zinc-950"
      >
        {image && (
          <Stage
            ref={stageRef}
            width={stageSize.width}
            height={stageSize.height}
            scaleX={scale}
            scaleY={scale}
            x={position.x}
            y={position.y}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            draggable={tool === 'select'}
            onDragEnd={e => {
              setPosition({ x: e.target.x(), y: e.target.y() })
            }}
          >
            {/* Background layer with image */}
            <Layer>
              <KonvaImage image={image} />
            </Layer>

            {/* Drawing layer */}
            <Layer>
              {/* Existing shapes */}
              {shapes.map(shape => {
                const commonProps = {
                  key: shape.id,
                  id: shape.id,
                  stroke: shape.stroke,
                  strokeWidth: shape.strokeWidth / scale,
                  fill: shape.fill,
                  onClick: () => tool === 'select' && setSelectedId(shape.id),
                  onTap: () => tool === 'select' && setSelectedId(shape.id),
                  draggable: tool === 'select',
                  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
                    setShapes(prev =>
                      prev.map(s =>
                        s.id === shape.id
                          ? { ...s, x: e.target.x(), y: e.target.y() }
                          : s
                      )
                    )
                  },
                }

                if (shape.type === 'rectangle') {
                  return (
                    <Rect
                      {...commonProps}
                      x={shape.x}
                      y={shape.y}
                      width={shape.width}
                      height={shape.height}
                    />
                  )
                }
                if (shape.type === 'circle') {
                  return (
                    <Circle
                      {...commonProps}
                      x={shape.x}
                      y={shape.y}
                      radius={shape.radius}
                    />
                  )
                }
                if (shape.type === 'arrow') {
                  return (
                    <Arrow
                      {...commonProps}
                      points={shape.points || []}
                      pointerLength={10 / scale}
                      pointerWidth={10 / scale}
                    />
                  )
                }
                if (shape.type === 'freehand') {
                  return (
                    <Line
                      {...commonProps}
                      points={shape.points || []}
                      tension={0.5}
                      lineCap="round"
                      lineJoin="round"
                    />
                  )
                }
                if (shape.type === 'text') {
                  return (
                    <Text
                      {...commonProps}
                      x={shape.x}
                      y={shape.y}
                      text={shape.text}
                      fontSize={16 / scale}
                      fill={shape.stroke}
                    />
                  )
                }
                return null
              })}

              {/* Current shape being drawn */}
              {currentShape && (
                <>
                  {currentShape.type === 'rectangle' && (
                    <Rect
                      x={currentShape.x}
                      y={currentShape.y}
                      width={currentShape.width}
                      height={currentShape.height}
                      stroke={currentShape.stroke}
                      strokeWidth={currentShape.strokeWidth / scale}
                      fill={currentShape.fill}
                    />
                  )}
                  {currentShape.type === 'circle' && (
                    <Circle
                      x={currentShape.x}
                      y={currentShape.y}
                      radius={currentShape.radius}
                      stroke={currentShape.stroke}
                      strokeWidth={currentShape.strokeWidth / scale}
                      fill={currentShape.fill}
                    />
                  )}
                  {currentShape.type === 'arrow' && (
                    <Arrow
                      points={currentShape.points || []}
                      stroke={currentShape.stroke}
                      strokeWidth={currentShape.strokeWidth / scale}
                      pointerLength={10 / scale}
                      pointerWidth={10 / scale}
                    />
                  )}
                  {currentShape.type === 'freehand' && (
                    <Line
                      points={currentShape.points || []}
                      stroke={currentShape.stroke}
                      strokeWidth={currentShape.strokeWidth / scale}
                      tension={0.5}
                      lineCap="round"
                      lineJoin="round"
                    />
                  )}
                </>
              )}

              {/* Transformer for selected shape */}
              {selectedId && (
                <Transformer
                  ref={ref => {
                    if (!ref) return
                    const node = ref.getStage()?.findOne('#' + selectedId)
                    if (node) {
                      ref.nodes([node])
                      ref.getLayer()?.batchDraw()
                    }
                  }}
                  boundBoxFunc={(oldBox, newBox) => {
                    // Limit resize
                    if (newBox.width < 5 || newBox.height < 5) {
                      return oldBox
                    }
                    return newBox
                  }}
                />
              )}
            </Layer>
          </Stage>
        )}
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="absolute bottom-4 left-4 rounded bg-zinc-800/80 px-3 py-2 text-xs text-zinc-400">
        <span className="font-medium text-zinc-300">Shortcuts:</span>{' '}
        V=Select, R=Rect, C=Circle, A=Arrow, F=Freehand, T=Text, Del=Delete, Esc=Close
      </div>
    </div>
  )
}
