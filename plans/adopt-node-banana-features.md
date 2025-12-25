# Feature Adoption Plan: node-banana → NanoNodeBanana

**Date:** 2025-12-25
**Type:** Enhancement
**Priority:** Medium-High

---

## Overview

Analysis of [shrimbly/node-banana](https://github.com/shrimbly/node-banana) repository to identify features we can adopt for NanoNodeBanana. This plan compares both projects and recommends actionable improvements.

---

## Project Comparison

### Technology Stack

| Aspect | node-banana | NanoNodeBanana |
|--------|------------|----------------|
| Framework | Next.js 16 | Vite + React |
| Node Editor | @xyflow/react (React Flow) | LiteGraph.js |
| Canvas/Drawing | Konva.js | None (LiteGraph only) |
| State Management | Zustand | React Context |
| Backend | Next.js API Routes | Elysia.js (Bun) |
| Database | localStorage/JSON files | SQLite |
| AI Models | Gemini, OpenAI | Gemini, Fal.ai FLUX, NanoBanana |

### Current Node Types

| node-banana | NanoNodeBanana |
|-------------|----------------|
| ImageInputNode | ImageSourceNode |
| PromptNode | PromptNode |
| AnnotationNode | ❌ Missing |
| GroupNode | ❌ Missing (LiteGraph has built-in) |
| SplitGridNode | ❌ Missing |
| LLMGenerateNode | GeminiGeneratorNode |
| NanoBananaNode | NanoBananaNode, NanoBananaEditNode, NanoBananaProNode, NanoBananaProEditNode |
| OutputNode | ImageOutputNode, SaveImageNode, GalleryNode |
| — | FalFluxNode, FalVideoNode |
| — | ImageResizeNode, ImageCropNode, ImageBlendNode, ImageAdjustNode, ImageFilterNode |

---

## Features to Adopt

### 1. Image Annotation System (High Priority)

**What node-banana has:**
- AnnotationNode that opens a full-screen modal
- Drawing tools: Rectangle, Circle, Arrow, Freehand, Text
- Konva.js-based canvas with zoom (0.1x-5x)
- Stroke color, size, fill options
- Select/transform existing annotations

**Why adopt:**
- Essential for image editing workflows (inpainting masks, guidance)
- Common in AI image tools (ComfyUI has similar)
- Differentiates from basic prompt-to-image pipelines

**Implementation approach:**
```
src/components/AnnotationModal.tsx     (new - Konva canvas modal)
src/nodes/processing/AnnotationNode.ts (new - node definition)
```

**Dependencies to add:**
```bash
bun add konva react-konva
```

**Estimated effort:** Medium (2-3 days)

---

### 2. Global Image History Panel (High Priority)

**What node-banana has:**
- Fan-layout UI showing recent 10 images
- Expandable sidebar for full history
- Drag images to canvas to create nodes
- Shows prompt, model, timestamp metadata
- Clear all functionality

**Why adopt:**
- Users often want to reuse previous generations
- Improves workflow iteration speed
- Common expectation in AI image tools

**Implementation approach:**
```
src/components/ImageHistory.tsx        (new - history panel)
src/context/ImageHistoryContext.tsx    (new - or add to existing context)
```

**Estimated effort:** Low-Medium (1-2 days)

---

### 3. Multi-Select Toolbar (Medium Priority)

**What node-banana has:**
- Floating toolbar when 2+ nodes selected
- Layout actions: Stack horizontally, Stack vertically, Arrange as grid
- Group/Ungroup operations

**Why adopt:**
- Improves workflow organization
- Common UX pattern in node editors
- LiteGraph supports groups natively

**Implementation approach:**
```
src/components/MultiSelectToolbar.tsx  (new)
```

**Note:** LiteGraph already has group support (`LiteGraph.LGraphGroup`), we just need UI to expose it.

**Estimated effort:** Low (1 day)

---

### 4. Floating Action Bar (Medium Priority)

**What node-banana has:**
- Bottom-center floating toolbar
- Quick node creation buttons
- Run workflow options (full, from selected, selected only)
- Edge style toggle (angular/curved)

**Why adopt:**
- More discoverable than right-click menus
- Faster workflow building
- Run options are powerful for debugging

**What we already have:**
- Toolbar.tsx exists but is simpler
- Side panel for node creation

**Implementation approach:**
- Enhance existing `Toolbar.tsx` with:
  - "Run from selected node" option
  - "Run selected node only" option
  - Edge style toggle

**Estimated effort:** Low (0.5-1 day)

---

### 5. Split Grid Node (Low Priority)

**What node-banana has:**
- Divides input image into grid cells
- Configurable rows × columns
- Creates multiple output handles for each cell

**Why adopt:**
- Useful for batch processing sections of image
- Enables parallel processing of image regions

**Implementation approach:**
```
src/nodes/processing/SplitGridNode.ts  (new)
```

**Estimated effort:** Medium (1-2 days)

---

### 6. State Management Upgrade to Zustand (Optional)

**What node-banana has:**
- Clean Zustand store with actions
- Selective subscriptions prevent unnecessary re-renders
- Copy/paste with internal edge preservation

**Why consider:**
- 40-70% fewer re-renders vs Context API (per research)
- Cleaner action organization
- Better for larger applications

**Current state:**
- We use React Context (`GraphContext`, `ExecutionContext`)
- Works but may have performance issues at scale

**Implementation approach:**
```bash
bun add zustand
```
```
src/store/workflowStore.ts  (new - migrate from contexts)
```

**Estimated effort:** Medium-High (2-3 days for migration)

---

## Features We Already Have That node-banana Lacks

| Our Feature | Description |
|-------------|-------------|
| **Fal.ai Integration** | FLUX models, video generation |
| **Image Processing Nodes** | Resize, Crop, Blend, Adjust, Filter |
| **NanoBanana Pro Models** | Advanced generation with edit capabilities |
| **SQLite Backend** | Proper workflow persistence |
| **Minimap** | Canvas navigation aid |
| **Elysia.js Backend** | Separate backend server |

---

## Recommended Implementation Order

### Phase 1: Quick Wins (1-2 days)
1. **Multi-Select Toolbar** - Expose LiteGraph's existing group functionality
2. **Enhanced Toolbar** - Add run options and edge style toggle

### Phase 2: Core Features (3-5 days)
3. **Global Image History** - Track and reuse generated images
4. **Annotation System** - Add Konva-based image annotation

### Phase 3: Nice to Have (2-3 days)
5. **Split Grid Node** - Image segmentation for batch processing
6. **Zustand Migration** - Performance optimization (optional)

---

## Acceptance Criteria

### Multi-Select Toolbar
- [ ] Toolbar appears when 2+ nodes selected
- [ ] Stack horizontally arranges nodes in a row
- [ ] Stack vertically arranges nodes in a column
- [ ] Arrange as grid creates square-ish layout
- [ ] Create group wraps selected nodes in LiteGraph group
- [ ] Ungroup removes nodes from group

### Enhanced Toolbar
- [ ] "Run from selected" executes graph starting at selected node
- [ ] "Run selected only" executes just the selected node
- [ ] Edge style toggle switches between curved and angular connections

### Image History
- [ ] Generated images automatically added to history
- [ ] History panel shows recent 10 images with expand option
- [ ] Drag image from history creates ImageSourceNode on canvas
- [ ] Each entry shows prompt, model, timestamp
- [ ] Clear all removes history

### Annotation System
- [ ] AnnotationNode accepts image input
- [ ] Click image opens full-screen modal
- [ ] Drawing tools: Select, Rectangle, Circle, Arrow, Freehand, Text
- [ ] Stroke color picker, size slider, fill toggle
- [ ] Zoom controls (fit, in, out, reset)
- [ ] Save flattens annotations onto image
- [ ] Output passes annotated image to next node

---

## Technical Notes

### LiteGraph Group Support
LiteGraph already supports groups natively:
```javascript
const group = new LiteGraph.LGraphGroup("My Group")
group.pos = [100, 100]
group.size = [300, 200]
group.color = "#335"
graph.add(group)
```

We just need UI to expose this functionality.

### Konva.js Integration
For annotation, we'll use Konva.js (same as node-banana):
- Renders to HTML5 Canvas
- Shape primitives (Rect, Circle, Arrow, Line, Text)
- Transformer for resize/rotate
- Stage → Layer → Shapes hierarchy

### PNG Metadata (Future Enhancement)
Research shows ComfyUI embeds workflow in PNG metadata - consider adding this for workflow sharing.

---

## References

### Research Sources
- [node-banana GitHub](https://github.com/shrimbly/node-banana)
- [LiteGraph.js Groups Documentation](https://github.com/jagenjo/litegraph.js/blob/master/guides/README.md)
- [Konva.js Documentation](https://konvajs.org/docs/)
- [React Flow (xyflow) Docs](https://reactflow.dev/)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)

### Internal References
- `src/components/Toolbar.tsx` - Current toolbar implementation
- `src/context/GraphContext.tsx` - Current state management
- `src/nodes/index.ts` - Node registration
- `src/lib/graph-executor.ts` - Execution engine

---

## SpecFlow Analysis Summary

Analysis identified **47 distinct user flows**, **89 edge cases**, and **27 critical questions** requiring resolution.

### Critical Questions to Resolve Before Implementation

| Question | Impact | Recommended Answer |
|----------|--------|-------------------|
| Image data storage (base64 vs blob URLs)? | Annotation & History features | Use blob URLs + `/api/upload` backend |
| Konva modal event isolation? | Prevents LiteGraph conflicts | Event capture + stopPropagation at modal root |
| History storage backend & quota? | Performance, reliability | IndexedDB, 100 image limit, FIFO pruning |
| LiteGraph Group API capabilities? | Multi-select grouping | Research needed - may be visual-only |
| "Run from Selected" dependency algorithm? | Execution correctness | Re-run all upstream dependencies |

### Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| LiteGraph event conflicts | HIGH | Event isolation, z-index management, test matrix |
| State management consistency | MEDIUM | LiteGraph as source of truth, complete Zustand migration |
| Image data size & performance | MEDIUM | Size warnings, blob storage, lazy loading |

### Revised Timeline

Original estimate: 8-12 days
**Realistic estimate: 15-20 days** (with proper specification and testing)

---

## Summary

**High-value adoptions:**
1. Image History Panel - Improves iteration workflow (start here - lowest risk)
2. Annotation System - Enables image editing capabilities (highest value, highest risk)
3. Multi-Select Toolbar - Better organization UX (quick win)

**Our advantages to keep:**
- Fal.ai FLUX model integration
- Comprehensive image processing nodes
- SQLite-backed persistence
- Minimap navigation

**Key insight:** node-banana uses React Flow which is simpler but less powerful than LiteGraph. We should adopt their UX patterns while leveraging LiteGraph's advanced features (groups, subgraphs, events).
