# Architecture

## Monorepo Structure

```
clearcreator/
  apps/web/     # Angular v21 frontend
  apps/api/     # Express + Apollo GraphQL backend
  libs/shared-types/   # Shared TypeScript interfaces
  libs/ai-schemas/     # Zod validation schemas for AI output
  supabase/     # Migrations and seed data
```

No build step for `libs/` — the API references them via TypeScript path aliases (`@clearcreator/shared-types`, `@clearcreator/ai-schemas`) in `apps/api/tsconfig.json`. The frontend currently defines types inline rather than importing from shared-types.

## Three-Layer Canvas Architecture

**Rule: Only `CanvasWrapperService` touches Fabric.js.** No component imports from `fabric`. Fabric.js is loaded dynamically via `import('fabric')` in `CanvasWrapperService.init()` — it ships as a separate chunk. All canvas interactions go through the service. `CanvasWrapperService.isReady()` signal tracks whether Fabric.js has loaded and the canvas is initialized.

1. **CanvasWrapperService** (`features/editor/canvas/`) — dynamically loads Fabric.js via `await import('fabric')` in `init()`, owns the `Canvas` instance. Exposes `isReady` signal for loading state. Bridges imperative canvas ops to Angular reactivity via signals (`selectedObjectIds`, `selectedObjectType`, `isReady`) and RxJS Subjects (`onObjectModified$`, `onTextChanged$`, `onObjectsReordered$`, `onZoomChanged$`, etc.). Every element gets `crypto.randomUUID()` as its `id`. Provides layer ordering (bringForward/sendBackward), visibility toggles, lock/unlock, duplicate, group/ungroup, and `getElementProperties()`. **Viewport management**: `fitToScreen()` caches container dimensions and uses them as fallback when called without arguments (fixes topbar Fit button). Zoom methods (`zoomIn`/`zoomOut`/`setZoom`) use `canvas.zoomToPoint(center, zoom)` to preserve centering. `fitToScreen()` is called after `loadFromJSON()`, `restoreSnapshot()`, and `setDimensions()` to keep the viewport correctly fitted. `onZoomChanged$` emits zoom level changes for EditorComponent signal sync. `withProjectDimensions()` temporarily restores project dimensions for accurate serialization (save/export). `toFabricJSON()` clamps AI element positions to a 60px safe zone, enforces minimum text width of 200px, and strips layout hint fields (`zone`, `alignWith`).

2. **State services** (`features/editor/state/`) — lightweight signal bags. `SelectionState` derives from CanvasWrapper. `HistoryState` does undo/redo via `snapshot()/restoreSnapshot()` (50-entry stack, wired to canvas events via debounced subscriptions in EditorComponent). `CanvasState` holds project metadata. `AiState` is the single reactive store for all AI-related state — it holds `models`, `selectedModel`, `imageUrl`, `visionModel`, `isGenerating`, `streamingText`, `generationStatus`, `lastDesign`, `lastError`, `selectedContext` (computed from SelectionState), and orchestrates generate/apply/modify flows.

3. **Editor sub-components** (`features/editor/components/`) — `TopbarComponent`, `SidebarComponent` (tools only), `CanvasAreaComponent`, `PropertiesPanelComponent`, `LayersPanelComponent`, `AiPanelComponent`, `AssetsPanelComponent`, `FontSelectorComponent`, `ExportDialogComponent`. EditorComponent orchestrates them. The right panel has four tabs: Properties, Layers, AI, Assets. `FontSelectorComponent` is used inside `PropertiesPanelComponent` for font family selection with search and Google Fonts preview. `AssetsPanelComponent` shows uploaded images in a grid with click-to-add-to-canvas. `ExportDialogComponent` is opened via `NzModalService` from the topbar Export button — supports PNG/JPG (client-side via `toDataURL`) and PDF (server-side via `/api/export/pdf`).

4. **Infrastructure services** (`core/services/`) — `AuthService` wraps Supabase auth (BehaviorSubject + signals, exposes `currentUser` getter). `AiService` is a pure HTTP/SSE layer with no signals — it returns Observables and accepts AbortSignal. `FontService` fetches Google Fonts via the backend proxy, manages font loading via `document.fonts.load()` and dynamic `<link>` injection, clears Fabric.js font cache via dynamic `import('fabric')` after loading, and tracks loaded fonts in a signal. `SupabaseService` is a singleton client wrapper. `UploadService` manages image uploads — two-phase flow (createUpload mutation then upload to Supabase Storage), tracks uploads in a signal, provides deleteUpload and loadUploads, and exposes `isLoadingInitial` signal for initial fetch loading state. `ThumbnailService` uploads canvas thumbnails to Supabase Storage at `{userId}/thumbnails/{projectId}.png` with upsert, falls back to base64 data URL if Storage fails. `ProjectService` provides CRUD operations via Apollo GraphQL including `getProject()` for loading project data in the editor. `KeyboardShortcutsService` listens to `keydown` events on `document`, delegates to CanvasWrapperService and HistoryState, and manages clipboard state for copy/paste. Activated/deactivated by EditorComponent lifecycle.

5. **Keyboard shortcuts** — `KeyboardShortcutsService` (`features/editor/`) handles: Ctrl+Z (undo), Ctrl+Y / Ctrl+Shift+Z (redo), Delete/Backspace (delete selected), Ctrl+C (copy), Ctrl+V (paste), Ctrl+G (group), Ctrl+Shift+G (ungroup), Ctrl+A (select all), Arrow keys (nudge 1px, 10px with Shift). Ignores events when focus is in INPUT/TEXTAREA/contentEditable elements.

6. **Vision AI** — `AiPanelComponent` includes an optional "Reference Image URL" input and a "Vision Model" field (shown when imageUrl is set, default: `qwen3-vl:235b-instruct`). `AiState` holds `imageUrl` and `visionModel` signals. When an imageUrl is provided, `AiService.generateDesignStream()` sends it to the backend, which fetches the image, converts to base64, and passes it in the Ollama `images` field. The backend uses `VISION_SYSTEM_PROMPT` (analyzes the image) instead of `DESIGN_SYSTEM_PROMPT` (text-only). `OLLAMA_VISION_MODEL` env var configures the default vision model.

## Dev Proxy

Angular dev server proxies `/api/*` to `localhost:3001` via `apps/web/proxy.conf.json`. Configured in `angular.json` serve options. This is only used in development — production would use a reverse proxy or same-origin deployment.

## Backend AI Proxy

Express server at port 3001 proxies all AI calls to Ollama Cloud:
- `GET /api/ai/models` — lists models via `ollama.list()`
- `POST /api/ai/generate` — non-streaming, validates through `DesignGenerationSchema` (Zod). Accepts optional `imageUrl` and `visionModel` for vision-based generation.
- `POST /api/ai/generate/stream` — SSE streaming. Chunks: `data: { content, done }`. Final: `data: { validated, design, done }`. Uses `zod-to-json-schema` for the `format` parameter. Accepts optional `imageUrl` and `visionModel`.
- `POST /api/ai/modify` — element modification with `MODIFY_SYSTEM_PROMPT`, validates response with `ModifyResponseSchema`
- Vision mode: When `imageUrl` is provided, the backend fetches the image (max 10MB), converts to base64, and sends it in the `images` field of the Ollama chat message. Uses `VISION_SYSTEM_PROMPT` instead of `DESIGN_SYSTEM_PROMPT`. Routes to `visionModel` (default: `qwen3-vl:235b-instruct`) instead of the text model.

## Backend Font Proxy

Express server at port 3001 proxies Google Fonts API calls (keeps API key server-side):
- `GET /api/fonts/popular` — returns ~30 curated popular Google Fonts (1hr in-memory cache)
- `GET /api/fonts` — returns full Google Fonts catalog (1hr in-memory cache)
- Both endpoints are unauthenticated (bypass auth middleware)
- Requires `GOOGLE_FONTS_API_KEY` env var; returns empty list if not configured

System prompts in `ollama.service.ts` define the JSON schema contract between AI and canvas. The `zodToJsonSchema()` function from `zod-to-json-schema` converts Zod schemas to Ollama's `format` parameter.

## Backend Export Endpoint

Express server at port 3001 provides PDF generation:
- `POST /api/export/pdf` — accepts `{ imageDataUrl, canvasWidth, canvasHeight, backgroundColor, pageSize, orientation, multiplier }`, generates PDF via pdfmake, returns PDF binary. Protected by auth middleware. JSON body limit increased to 50mb for base64 image payloads.

## Auto-Save

EditorComponent subscribes to canvas change events (object added/modified/removed, text changed) and pushes to a `saveTrigger$` Subject. A 5-second debounce fires `autoSave()` which serializes canvas JSON (via `withProjectDimensions()` for accurate project dimensions), generates a thumbnail via `CanvasWrapperService.toDataURL()` at 0.5x multiplier, uploads thumbnail to Supabase Storage via `ThumbnailService`, and calls `ProjectService.updateProject()`. On component destroy, a force-save fires if dirty. Project is loaded on editor init via `ProjectService.getProject()` when a route `:id` exists. `CanvasState` tracks `saving`, `isLoading`, `isDirty`, and `lastSavedAt` signals.

## Supabase Roles

- **Auth** (client-side): email/password + Google OAuth via `@supabase/supabase-js`
- **Data** (server-side): GraphQL resolvers use service-role client, RLS enforces owner access
- **Storage**: `uploads` bucket is public-read (canvas needs public image URLs), owner-scoped write. Client uploads directly to Supabase Storage (anon key + RLS), then records metadata via `createUpload` GraphQL mutation

## Key File Locations

| What | Where |
|------|-------|
| Canvas wrapper (Fabric.js bridge) | `apps/web/src/app/features/editor/canvas/canvas-wrapper.service.ts` |
| Layout post-processor (constraint solver) | `apps/web/src/app/features/editor/canvas/layout-post-processor.ts` |
| Editor orchestrator | `apps/web/src/app/features/editor/editor.component.ts` |
| Topbar component | `apps/web/src/app/features/editor/components/topbar/topbar.component.ts` |
| Sidebar component (tools only) | `apps/web/src/app/features/editor/components/sidebar/sidebar.component.ts` |
| Canvas area component | `apps/web/src/app/features/editor/components/canvas-area/canvas-area.component.ts` |
| Properties panel | `apps/web/src/app/features/editor/components/properties-panel/properties-panel.component.ts` |
| Layers panel | `apps/web/src/app/features/editor/components/layers-panel/layers-panel.component.ts` |
| AI panel | `apps/web/src/app/features/editor/components/ai-panel/ai-panel.component.ts` |
| Assets panel | `apps/web/src/app/features/editor/components/assets-panel/assets-panel.component.ts` |
| AI state (reactive store) | `apps/web/src/app/features/editor/state/ai.state.ts` |
| AI service (HTTP/SSE layer) | `apps/web/src/app/core/services/ai.service.ts` |
| Font service (loading + state) | `apps/web/src/app/core/services/font.service.ts` |
| Upload service (Supabase Storage) | `apps/web/src/app/core/services/upload.service.ts` |
| Keyboard shortcuts service | `apps/web/src/app/features/editor/keyboard-shortcuts.service.ts` |
| Font selector component | `apps/web/src/app/features/editor/components/font-selector/font-selector.component.ts` |
| Export dialog component | `apps/web/src/app/features/editor/components/export-dialog/export-dialog.component.ts` |
| Thumbnail service (Supabase Storage) | `apps/web/src/app/core/services/thumbnail.service.ts` |
| Export service (PDF generation) | `apps/api/src/services/export.service.ts` |
| Ollama proxy + system prompts | `apps/api/src/services/ollama.service.ts` |
| Google Fonts proxy | `apps/api/src/services/font.service.ts` |
| GraphQL schema + resolvers | `apps/api/src/graphql/schema/index.ts`, `apps/api/src/graphql/resolvers/index.ts` |
| Zod schemas for AI validation | `libs/ai-schemas/src/poster-design.schema.ts` |
| Shared TypeScript types | `libs/shared-types/src/` |
| Supabase migrations | `supabase/migrations/00001-00006_*.sql` |
| Seed data (3 templates) | `supabase/seed.sql` |
| Auth guard | `apps/web/src/app/core/guards/auth.guard.ts` |
| Auth callback (OAuth) | `apps/web/src/app/features/auth/callback/callback.component.ts` |
| Apollo config | `apps/web/src/app/app.config.ts` |
| Project service (Apollo CRUD) | `apps/web/src/app/core/services/project.service.ts` |
| Dashboard component | `apps/web/src/app/features/dashboard/dashboard.component.ts` |
| Project card component | `apps/web/src/app/features/dashboard/project-card/project-card.component.ts` |
| Template gallery component | `apps/web/src/app/features/dashboard/template-gallery/template-gallery.component.ts` |
| Angular routes | `apps/web/src/app/app.routes.ts` |
| Backend entry point | `apps/api/src/index.ts` |