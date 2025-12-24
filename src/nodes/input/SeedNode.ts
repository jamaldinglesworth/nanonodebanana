import type { LGraphNode, IWidget } from 'litegraph.js'
import { NODE_TYPE_COLOURS } from '../../types/nodes'

// Extend LGraphNode type for our custom properties
interface SeedNodeType extends LGraphNode {
  resizable?: boolean
  _randomizeRect?: { x: number; y: number; width: number; height: number }
}

/**
 * SeedNode - Random seed generator node.
 * Provides a seed value for reproducible image generation.
 * Has a Randomize button and a Lock toggle.
 */
export function SeedNode(this: SeedNodeType) {
  // Add output
  this.addOutput('seed', 'number')

  // Add widgets
  this.addWidget('number', 'seed', 0, () => {}, { min: 0, max: 2147483647, step: 1 })
  this.addWidget('toggle', 'locked', false, () => {})

  // Initialize properties
  this.properties = {
    seed: 0,
    locked: false,
  }

  // Set node appearance
  this.title = 'Seed'
  this.size = [180, 130]
  this.resizable = true
  this.color = NODE_TYPE_COLOURS.seed
  this.bgcolor = adjustBrightness(NODE_TYPE_COLOURS.seed, -40)

  // Store reference for callbacks
  // eslint-disable-next-line @typescript-eslint/no-this-alias
  const nodeRef = this

  // Generate random seed function
  const randomizeSeed = () => {
    const newSeed = Math.floor(Math.random() * 2147483647)
    const seedWidget = nodeRef.widgets?.find((w: IWidget) => w.name === 'seed')
    if (seedWidget) {
      seedWidget.value = newSeed
      nodeRef.properties.seed = newSeed
      nodeRef.setDirtyCanvas(true, true)
    }
  }

  // Custom foreground drawing - draws Randomize button
  this.onDrawForeground = function (ctx: CanvasRenderingContext2D) {
    // Calculate button position (below widgets)
    const titleHeight = 26
    const widgetHeight = 30
    const numWidgets = 2 // seed + locked
    const buttonY = titleHeight + numWidgets * widgetHeight + 10

    const padding = 10
    const buttonHeight = 24
    const buttonWidth = nodeRef.size[0] - padding * 2

    // Store button rect for click detection
    nodeRef._randomizeRect = {
      x: padding,
      y: buttonY,
      width: buttonWidth,
      height: buttonHeight,
    }

    // Draw button background with gradient
    const gradient = ctx.createLinearGradient(padding, buttonY, padding, buttonY + buttonHeight)
    gradient.addColorStop(0, '#4a9eff')
    gradient.addColorStop(1, '#3b82f6')
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.roundRect(padding, buttonY, buttonWidth, buttonHeight, 4)
    ctx.fill()

    // Draw button border
    ctx.strokeStyle = '#60a5fa'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(padding, buttonY, buttonWidth, buttonHeight, 4)
    ctx.stroke()

    // Draw button text
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 11px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('🎲 Randomize', padding + buttonWidth / 2, buttonY + buttonHeight / 2)
    ctx.textAlign = 'left' // Reset alignment

    // Ensure node height accommodates button
    const requiredHeight = buttonY + buttonHeight + padding
    if (nodeRef.size[1] < requiredHeight) {
      nodeRef.size[1] = requiredHeight
    }
  }

  // Handle mouse click on Randomize button
  this.onMouseDown = function (_e: MouseEvent, pos: [number, number]) {
    const rect = nodeRef._randomizeRect
    if (
      rect &&
      pos[0] >= rect.x &&
      pos[0] <= rect.x + rect.width &&
      pos[1] >= rect.y &&
      pos[1] <= rect.y + rect.height
    ) {
      randomizeSeed()
      return true // Event handled
    }
    return false
  }

  // Execute function
  this.onExecute = function () {
    const lockedWidget = nodeRef.widgets?.find((w: IWidget) => w.name === 'locked')
    const seedWidget = nodeRef.widgets?.find((w: IWidget) => w.name === 'seed')

    const locked = (lockedWidget?.value as boolean) ?? false
    let seed = (seedWidget?.value as number) ?? 0

    // Generate new random seed if not locked
    if (!locked) {
      seed = Math.floor(Math.random() * 2147483647)
      if (seedWidget) {
        seedWidget.value = seed
        nodeRef.properties.seed = seed
      }
    }

    nodeRef.setOutputData(0, seed)
  }
}

/**
 * Adjusts the brightness of a hex colour.
 */
function adjustBrightness(hex: string, amount: number): string {
  hex = hex.replace('#', '')
  const r = Math.max(0, Math.min(255, parseInt(hex.substring(0, 2), 16) + amount))
  const g = Math.max(0, Math.min(255, parseInt(hex.substring(2, 4), 16) + amount))
  const b = Math.max(0, Math.min(255, parseInt(hex.substring(4, 6), 16) + amount))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

// Static properties for LiteGraph registration
SeedNode.title = 'Seed'
SeedNode.desc = 'Random seed generator with randomize button'
// Additional metadata for dynamic UI generation
;(SeedNode as unknown as Record<string, unknown>).nodeCategory = 'input'
;(SeedNode as unknown as Record<string, unknown>).nodeColour = NODE_TYPE_COLOURS.seed
;(SeedNode as unknown as Record<string, unknown>).nodeDescription = 'Random seed generator'
