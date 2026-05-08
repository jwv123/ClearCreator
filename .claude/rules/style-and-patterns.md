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
- EditorComponent is an orchestrator that composes TopbarComponent, SidebarComponent (tools only), CanvasAreaComponent, PropertiesPanelComponent, LayersPanelComponent, and AiPanelComponent
- SidebarComponent contains only the tool grid (Text, Rect, Circle, Image). AI generation is in AiPanelComponent
- AiPanelComponent lives in the right panel as a third tab (Properties | Layers | AI)

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