# Code Style and Patterns

## Angular (Frontend)

- Angular v21 with standalone components (no NgModules, `standalone: true` is default)
- Use `inject()` function instead of constructor injection
- Use `input()` and `output()` functions instead of decorators
- Use signals (`signal()`, `computed()`, `effect()`) for synchronous state
- Use RxJS Observables for async streams (HTTP, SSE, canvas events)
- Use `ChangeDetectionStrategy.OnPush` on all components
- Use native control flow (`@if`, `@for`, `@switch`) — never `*ngIf`, `*ngFor`, `*ngSwitch`
- NG-ZORRO for UI components (buttons, cards, forms, layouts, modals, etc.)
- Inline templates and styles for small components; external files for larger ones
- NG-ZORRO component module names use PascalCase: `NzButtonModule`, `NzCardModule`, `NzTooltipModule` (not `NzToolTipModule`)
- NG-ZORRO v21 tabs use `<nz-tabs>` and `<nz-tab>` (not `nz-tabset`)
- `nz-button-group` is NOT available as a standalone directive in v21 — use a `<div class="btn-group">` with CSS flexbox instead
- Editor sub-components live in `features/editor/components/` — each in its own directory with a single `.ts` file
- EditorComponent is an orchestrator that composes TopbarComponent, SidebarComponent (tools only), CanvasAreaComponent, PropertiesPanelComponent, LayersPanelComponent, AiPanelComponent, AssetsPanelComponent, FontSelectorComponent, and ExportDialogComponent (via NzModalService)
- SidebarComponent contains only the tool grid (Text, Rect, Circle, Image). AI generation is in AiPanelComponent
- AiPanelComponent lives in the right panel as a third tab (Properties | Layers | AI | Assets)
- SidebarComponent's "Image" button switches the right panel to the Assets tab instead of opening a file dialog
- FontSelectorComponent is used inside PropertiesPanelComponent for font family selection — it provides a searchable dropdown with System Fonts and Google Fonts groups, font preview rendering, and automatic font loading

## Canvas Viewport and Zoom

- `CanvasWrapperService.fitToScreen()` caches container dimensions (`lastContainerWidth`/`lastContainerHeight`) and uses them when called without arguments — this fixes the topbar Fit button
- Zoom methods (`zoomIn`, `zoomOut`, `setZoom`) use `canvas.zoomToPoint(center, zoom)` to preserve centering — `canvas.setZoom()` alone breaks the viewport transform
- `fitToScreen()` is called after `loadFromJSON()`, `restoreSnapshot()`, and `setDimensions()` to re-fit the viewport
- `onZoomChanged$` Subject emits zoom level changes from all zoom/fit methods — EditorComponent subscribes to keep `zoomLevel` signal in sync

## Layout Post-Processing

- `LayoutPostProcessor` (`features/editor/canvas/layout-post-processor.ts`) uses the Cassowary constraint solver (@lume/kiwi) to resolve overlapping elements after AI generation
- Constraints are prioritized: Required (safe margins, bounds), Strong (non-overlap), Medium (stay near AI position), Weak (grid alignment, edge alignment)
- Background elements (low opacity, full-canvas rects, >50% area coverage) are locked in place and not repositioned
- `AiState.applyDesignToCanvas()` runs post-processing after `loadFromJSON()` and applies adjustments via `canvasWrapper.updateElement()`
- `toFabricJSON()` strips layout hint fields (`zone`, `alignWith`) that guide AI reasoning but aren't Fabric.js properties

## AI System Prompts

- `DESIGN_SYSTEM_PROMPT` and `VISION_SYSTEM_PROMPT` use multi-stage Chain-of-Thought: Step 1 (zones), Step 2 (positioning with calculated heights), Step 3 (verify no overlaps)
- The Zod schema includes optional `zone` and `alignWith` fields on `CanvasElementSchema` to encourage structured layout thinking
- Layout hints are stripped by `toFabricJSON()` before passing to Fabric.js

- `AiService` (`core/services/`) is a pure HTTP/SSE layer with no Angular signals. It returns Observables and accepts AbortSignal. Methods accept optional `imageUrl` and `visionModel` parameters for vision-based generation.
- `AiState` (`features/editor/state/`) is the single reactive store for all AI-related UI state
- Components read from `AiState` signals and call `AiState` methods. Never call `AiService` directly from components
- `AiState` handles: model loading, generation orchestration, streaming text accumulation, Zod validation on apply, modify flow, error handling, cancellation via AbortController
- `AiState` holds `imageUrl` and `visionModel` signals — when `imageUrl` is set, the backend fetches the image and sends it to the vision model alongside the prompt
- `AiState.applyDesignToCanvas()` runs `LayoutPostProcessor.processLayout()` after `canvasWrapper.loadFromJSON()` to resolve overlaps and snap alignment via the Cassowary constraint solver (@lume/kiwi)
- The "Apply to Canvas" flow requires explicit user action — AI designs are previewed before applying

## Fabric.js (Canvas)

- **Never import `fabric` directly in components** — always go through `CanvasWrapperService`
- Fabric.js is loaded dynamically via `import('fabric')` in `CanvasWrapperService.init()` — it ships as a separate chunk
- `CanvasWrapperService` exposes `isReady` signal that becomes `true` after Fabric.js loads and canvas initializes
- `CanvasWrapperService.loadFromJSON()` converts AI design format (`{ elements, canvasWidth, ... }`) to Fabric.js format (`{ version, objects, background }`) before calling `canvas.loadFromJSON()`. It normalizes type names (e.g., `FabricImage` → `image`, `Textbox` → `textbox`) and converts circle `width/height` to `radius`. It also clamps element positions to a 60px safe zone (left/top >= 60, right/bottom within bounds) and enforces minimum text width of 200px.
- **Viewport sizing**: `fitToScreen()` resizes the canvas DOM element to match its container using `canvas.setDimensions()`, preventing the canvas from overflowing into sidebars. Uses viewport transform to center and scale project content. `projectWidth`/`projectHeight` track logical dimensions (e.g., 1080x1080) separately from the viewport dimensions. `withProjectDimensions()` temporarily restores project dimensions for serialization.
- `getCanvasWidth()`/`getCanvasHeight()` return project dimensions (not viewport dimensions)
- `CanvasAreaComponent` shows a spinner until `isReady()` is true. `.canvas-wrapper` has `position: relative; overflow: hidden` to contain the Fabric.js canvas container
- `FontService` uses dynamic `import('fabric')` for `cache.clearFontCache()` — no static fabric imports outside `CanvasWrapperService`
- Only `CanvasAreaComponent` holds the `<canvas>` DOM ref; all other components use the service
- Element IDs use `crypto.randomUUID()` assigned as `(obj as any).id`
- Canvas events are bridged to both signals and RxJS Subjects in `CanvasWrapperService`
- Use `CanvasWrapperService.snapshot()` / `restoreSnapshot()` for undo/redo, not command pattern
- History is wired in EditorComponent: `onObjectAdded$`, `onObjectModified$`, `onObjectRemoved$` push snapshots; `onTextChanged$` is debounced at 300ms
- `CanvasWrapperService.getElementProperties(id)` returns a typed `ElementProperties` object for the properties panel
- Layer ordering uses `bringForward()`, `sendBackward()`, `bringToFront()`, `sendToBack()`
- Visibility toggles: `toggleVisibility()`, `isElementVisible()`
- Lock/unlock: `lockElement()`, `unlockElement()`, `isElementLocked()` — sets `selectable` and `evented` on the Fabric object
- Export types use a local type alias (`type ImageFormat = 'png' | 'jpeg'`) instead of importing from `fabric`

## Keyboard Shortcuts

- `KeyboardShortcutsService` (`features/editor/`) listens to `keydown` on `document`, delegates to `CanvasWrapperService` and `HistoryState`
- Activated by `EditorComponent.ngOnInit()`, deactivated on `ngOnDestroy()`
- Ignores events when focus is in `<input>`, `<textarea>`, or `contentEditable` elements
- Shortcuts: Ctrl+Z (undo), Ctrl+Y / Ctrl+Shift+Z (redo), Delete/Backspace (delete selected), Ctrl+C (copy), Ctrl+V (paste), Ctrl+G (group), Ctrl+Shift+G (ungroup), Ctrl+A (select all), Arrow keys (nudge 1px, 10px with Shift)
- Clipboard state is held in `CanvasWrapperService.clipboard` (serialized JSON of copied objects). Paste offsets by 20px and creates new IDs
- `CanvasWrapperService` bulk operations: `deleteSelected()`, `selectAll()`, `nudgeSelected(dx, dy)`, `copySelected()`, `pasteClipboard()`

## Font System

- `FontService` (`core/services/`) manages Google Fonts — fetches font list from `/api/fonts/popular`, loads fonts on demand via Google Fonts CSS `<link>` injection + `document.fonts.load()`, clears Fabric.js font cache via dynamic `import('fabric')` after loading, deduplicates concurrent loads
- `FontSelectorComponent` (`features/editor/components/font-selector/`) provides a searchable NZ-ZORRO dropdown with System Fonts and Google Fonts option groups, font preview rendering, and preloading
- `AiState.applyDesignToCanvas()` extracts font families from AI designs and calls `FontService.ensureFontsLoaded()` before rendering — fonts are guaranteed loaded before `canvasWrapper.loadFromJSON()`
- `AiState.modifySelectedElements()` preloads fonts from AI modifications before applying changes
- `addTextElement()` accepts an optional `fontFamily` parameter (default `'Arial'`)
- `EditorComponent.ngOnInit()` calls `FontService.loadPopularFonts()` to pre-populate the font list

## Upload System

- `UploadService` (`core/services/`) manages image uploads to Supabase Storage — two-phase flow: (1) call `createUpload` GraphQL mutation to get `storagePath` and metadata, (2) upload file to Supabase Storage at that path, (3) update local signal
- `UploadService` tracks `uploads`, `isUploading`, `isLoadingInitial`, `uploadError` as signals
- `UploadService.getImageDimensions()` uses `Image()` + `URL.createObjectURL` to read `naturalWidth`/`naturalHeight` before upload
- `AssetsPanelComponent` shows uploaded images in a 3-column grid with click-to-add-to-canvas, hover-reveal delete button, file name and dimensions display, `decoding="async"` on images, error fallback to placeholder SVG, and initial loading spinner
- The sidebar "Image" tool switches to the Assets tab rather than opening a local file picker
- `CanvasWrapperService.addImageFromURL()` is used to add uploaded images to canvas (no canvas changes needed)

## Performance & Polish

- Fabric.js loads dynamically via `import('fabric')` — separate chunk, editor shell renders immediately with spinner
- `LayersPanelComponent` uses `CdkVirtualScrollViewport` from `@angular/cdk/scrolling` for virtual scrolling with `*cdkVirtualFor`
- `PropertiesPanelComponent` debounces numeric input changes (150ms) via `Subject + debounceTime` — prevents excessive history entries during typing
- `CanvasAreaComponent` shows `<nz-spin>` until `CanvasWrapperService.isReady()` is true
- `EditorComponent` shows a full-editor loading overlay while `CanvasState.isLoading()` is true (project data loading)
- `AiPanelComponent` shows spinner next to model selector while models list is empty
- `AssetsPanelComponent` shows loading spinner on initial fetch via `UploadService.isLoadingInitial` signal
- Editor sidebars hide on mobile (<768px) via `BreakpointObserver` — a bottom toolbar with tool and panel toggle icons appears instead
- Mobile panel overlay slides up from bottom when toggling Properties/Layers/AI/Assets on small screens
- Dashboard project cards use responsive `nzXs/nzSm/nzMd/nzLg` spans (1→2→3→4 columns)
- Auth card uses `max-width: 400px; width: 100%` for responsive width
- CSS custom properties for breakpoints defined in `:root` in `styles.scss`

## Backend (Node.js)

- Express v5 with Apollo Server v4 for GraphQL
- ESM modules (`"type": "module"` in package.json, `.js` extensions in imports)
- Supabase service-role client for all resolver data access (bypasses RLS)
- Zod schemas from `@clearcreator/ai-schemas` validate AI output before sending to frontend
- SSE streaming for AI generation: `for await (const part of response)` from Ollama JS client, written as `data: {JSON}\n\n`
- Vision generation: When `imageUrl` is provided, backend fetches the image (max 10MB), converts to base64, sends in Ollama `Message.images` field. Uses `VISION_SYSTEM_PROMPT` instead of `DESIGN_SYSTEM_PROMPT`. Default vision model: `qwen3-vl:235b-instruct` (configurable via `OLLAMA_VISION_MODEL` env var).
- System prompts enforce strict layout rules: element ordering (backgrounds → shapes → text), safe zone (all elements at left/top >= 60px except full-canvas backgrounds), minimum text width (200px), no text overlap (30-60px gaps between text blocks, height estimation formula: fontSize × lineHeight × lines + 30px padding)
- Rate limiting is in-memory (100 req/min per IP) — fine for dev, needs Redis for production
- PDF export uses pdfmake (`PdfPrinter`) with Roboto VFS fonts — only embeds images, no text rendering needed
- Export endpoint at `POST /api/export/pdf` uses `express.json({ limit: '50mb' })` for large base64 payloads

## Export System

- `ExportDialogComponent` is opened via `NzModalService.create()` from the topbar Export button
- PNG/JPG export: client-side via `CanvasWrapperService.toDataURL()` with format/multiplier/quality options, triggers browser download via anchor element
- PDF export: client generates canvas image via `toDataURL()`, POSTs to `/api/export/pdf` with image data, page size, and orientation; server generates PDF via pdfmake and returns binary blob
- `ExportDialogComponent` supports format selection (PNG/JPG/PDF), resolution multiplier (1x–4x), JPG quality slider, and PDF page size/orientation
- Fabric.js `ImageFormat` type: use `'jpeg'` (not `'jpg'`) for JPEG format

## Auto-Save System

- EditorComponent subscribes to canvas change events and pushes to `saveTrigger$` Subject
- `saveTrigger$.pipe(debounceTime(5000))` triggers `autoSave()` — 5-second debounce after last change
- `autoSave()` serializes canvas JSON (via `withProjectDimensions()` for accurate project dimensions), generates thumbnail via `toDataURL({ multiplier: 0.5 })`, uploads thumbnail via `ThumbnailService`, calls `ProjectService.updateProject()`
- `ThumbnailService.uploadThumbnail()` uploads to `{userId}/thumbnails/{projectId}.png` in Supabase Storage with `upsert: true`; falls back to base64 data URL if Storage fails
- On component destroy (`ngOnDestroy`), force-saves if dirty
- `CanvasState` signals: `saving`, `isLoading`, `isDirty`, `lastSavedAt`, with `markDirty()` and `markClean()` methods
- TopbarComponent shows save status: "Saving..." (blue spinner), "Unsaved" (yellow dot), "Saved" (green check)
- Project is loaded on editor init via `ProjectService.getProject()` when route has `:id`

## Database

- Canvas state stored as JSONB in `projects.canvas_json` — Fabric.js serialization format preserved as-is
- All tables use Row Level Security (RLS)
- `uploads` storage bucket is publicly readable (canvas needs public image URLs)
- Profile auto-created on signup via Supabase trigger