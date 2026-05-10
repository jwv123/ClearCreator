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
- EditorComponent is an orchestrator that composes TopbarComponent, SidebarComponent (tools only), CanvasAreaComponent, PropertiesPanelComponent, LayersPanelComponent, AiPanelComponent, AssetsPanelComponent, and FontSelectorComponent
- SidebarComponent contains only the tool grid (Text, Rect, Circle, Image). AI generation is in AiPanelComponent
- AiPanelComponent lives in the right panel as a third tab (Properties | Layers | AI | Assets)
- SidebarComponent's "Image" button switches the right panel to the Assets tab instead of opening a file dialog
- FontSelectorComponent is used inside PropertiesPanelComponent for font family selection — it provides a searchable dropdown with System Fonts and Google Fonts groups, font preview rendering, and automatic font loading

## AI State Management

- `AiService` (`core/services/`) is a pure HTTP/SSE layer with no Angular signals. It returns Observables and accepts AbortSignal
- `AiState` (`features/editor/state/`) is the single reactive store for all AI-related UI state
- Components read from `AiState` signals and call `AiState` methods. Never call `AiService` directly from components
- `AiState` handles: model loading, generation orchestration, streaming text accumulation, Zod validation on apply, modify flow, error handling, cancellation via AbortController
- The "Apply to Canvas" flow requires explicit user action — AI designs are previewed before applying

## Fabric.js (Canvas)

- **Never import `fabric` directly in components** — always go through `CanvasWrapperService`
- Only `CanvasAreaComponent` holds the `<canvas>` DOM ref; all other components use the service
- Element IDs use `crypto.randomUUID()` assigned as `(obj as any).id`
- Canvas events are bridged to both signals and RxJS Subjects in `CanvasWrapperService`
- Use `CanvasWrapperService.snapshot()` / `restoreSnapshot()` for undo/redo, not command pattern
- History is wired in EditorComponent: `onObjectAdded$`, `onObjectModified$`, `onObjectRemoved$` push snapshots; `onTextChanged$` is debounced at 300ms
- `CanvasWrapperService.getElementProperties(id)` returns a typed `ElementProperties` object for the properties panel
- Layer ordering uses `bringForward()`, `sendBackward()`, `bringToFront()`, `sendToBack()`
- Visibility toggles: `toggleVisibility()`, `isElementVisible()`
- Lock/unlock: `lockElement()`, `unlockElement()`, `isElementLocked()` — sets `selectable` and `evented` on the Fabric object
- Export types use `ImageFormat` from `fabric` (`import { type ImageFormat } from 'fabric'`)

## Font System

- `FontService` (`core/services/`) manages Google Fonts — fetches font list from `/api/fonts/popular`, loads fonts on demand via Google Fonts CSS `<link>` injection + `document.fonts.load()`, clears Fabric.js `cache.clearFontCache()` after loading, deduplicates concurrent loads
- `FontSelectorComponent` (`features/editor/components/font-selector/`) provides a searchable NZ-ZORRO dropdown with System Fonts and Google Fonts option groups, font preview rendering, and preloading
- `AiState.applyDesignToCanvas()` extracts font families from AI designs and calls `FontService.ensureFontsLoaded()` before rendering — fonts are guaranteed loaded before `canvasWrapper.loadFromJSON()`
- `AiState.modifySelectedElements()` preloads fonts from AI modifications before applying changes
- `addTextElement()` accepts an optional `fontFamily` parameter (default `'Arial'`)
- `EditorComponent.ngOnInit()` calls `FontService.loadPopularFonts()` to pre-populate the font list

## Upload System

- `UploadService` (`core/services/`) manages image uploads to Supabase Storage — two-phase flow: (1) call `createUpload` GraphQL mutation to get `storagePath` and metadata, (2) upload file to Supabase Storage at that path, (3) update local signal
- `UploadService` tracks `uploads`, `isUploading`, `uploadError` as signals
- `UploadService.getImageDimensions()` uses `Image()` + `URL.createObjectURL` to read `naturalWidth`/`naturalHeight` before upload
- `AssetsPanelComponent` shows uploaded images in a 3-column grid with click-to-add-to-canvas, hover-reveal delete button, file name and dimensions display
- The sidebar "Image" tool switches to the Assets tab rather than opening a local file picker
- `CanvasWrapperService.addImageFromURL()` is used to add uploaded images to canvas (no canvas changes needed)

## Backend (Node.js)

- Express v5 with Apollo Server v4 for GraphQL
- ESM modules (`"type": "module"` in package.json, `.js` extensions in imports)
- Supabase service-role client for all resolver data access (bypasses RLS)
- Zod schemas from `@clearcreator/ai-schemas` validate AI output before sending to frontend
- SSE streaming for AI generation: `for await (const part of response)` from Ollama JS client, written as `data: {JSON}\n\n`
- Rate limiting is in-memory (100 req/min per IP) — fine for dev, needs Redis for production

## Database

- Canvas state stored as JSONB in `projects.canvas_json` — Fabric.js serialization format preserved as-is
- All tables use Row Level Security (RLS)
- `uploads` storage bucket is publicly readable (canvas needs public image URLs)
- Profile auto-created on signup via Supabase trigger