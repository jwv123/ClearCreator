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

**Rule: Only `CanvasWrapperService` touches Fabric.js.** No component except `CanvasAreaComponent` (which holds the `<canvas>` DOM ref) should import from `fabric`. All canvas interactions go through the service.

1. **CanvasWrapperService** (`features/editor/canvas/`) — owns the Fabric.js `Canvas` instance. Bridges imperative canvas ops to Angular reactivity via signals (`selectedObjectIds`, `selectedObjectType`) and RxJS Subjects (`onObjectModified$`, `onTextChanged$`, `onObjectsReordered$`, etc.). Every element gets `crypto.randomUUID()` as its `id`. Provides layer ordering (bringForward/sendBackward), visibility toggles, lock/unlock, duplicate, group/ungroup, and `getElementProperties()`.

2. **State services** (`features/editor/state/`) — lightweight signal bags. `SelectionState` derives from CanvasWrapper. `HistoryState` does undo/redo via `snapshot()/restoreSnapshot()` (50-entry stack, wired to canvas events via debounced subscriptions in EditorComponent). `CanvasState` holds project metadata. `AiState` holds generation state.

3. **Editor sub-components** (`features/editor/components/`) — `TopbarComponent`, `SidebarComponent`, `CanvasAreaComponent`, `PropertiesPanelComponent`, `LayersPanelComponent`. EditorComponent orchestrates them. PropertiesPanel shows context-sensitive controls (text/shape/image/canvas). LayersPanel lists objects in z-order with visibility/lock toggles.

4. **Infrastructure services** (`core/services/`) — `AuthService` wraps Supabase auth (BehaviorSubject + signals). `AiService` uses raw `fetch` for SSE streaming, `HttpClient` for non-streaming. `SupabaseService` is a singleton client wrapper.

## Dev Proxy

Angular dev server proxies `/api/*` to `localhost:3001` via `apps/web/proxy.conf.json`. Configured in `angular.json` serve options. This is only used in development — production would use a reverse proxy or same-origin deployment.

## Backend AI Proxy

Express server at port 3001 proxies all AI calls to Ollama Cloud:
- `GET /api/ai/models` — lists models via `ollama.list()`
- `POST /api/ai/generate` — non-streaming, validates through `DesignGenerationSchema` (Zod)
- `POST /api/ai/generate/stream` — SSE streaming. Chunks: `data: { content, done }`. Final: `data: { validated, design, done }`
- `POST /api/ai/modify` — element modification with `MODIFY_SYSTEM_PROMPT`

System prompts in `ollama.service.ts` define the JSON schema contract between AI and canvas. The `zodToJsonSchema()` helper converts Zod schemas to Ollama's `format` parameter.

## Supabase Roles

- **Auth** (client-side): email/password + Google OAuth via `@supabase/supabase-js`
- **Data** (server-side): GraphQL resolvers use service-role client, RLS enforces owner access
- **Storage**: `uploads` bucket is public-read (canvas needs public image URLs), owner-scoped write

## Key File Locations

| What | Where |
|------|-------|
| Canvas wrapper (Fabric.js bridge) | `apps/web/src/app/features/editor/canvas/canvas-wrapper.service.ts` |
| Editor orchestrator | `apps/web/src/app/features/editor/editor.component.ts` |
| Topbar component | `apps/web/src/app/features/editor/components/topbar/topbar.component.ts` |
| Sidebar component | `apps/web/src/app/features/editor/components/sidebar/sidebar.component.ts` |
| Canvas area component | `apps/web/src/app/features/editor/components/canvas-area/canvas-area.component.ts` |
| Properties panel | `apps/web/src/app/features/editor/components/properties-panel/properties-panel.component.ts` |
| Layers panel | `apps/web/src/app/features/editor/components/layers-panel/layers-panel.component.ts` |
| AI streaming service | `apps/web/src/app/core/services/ai.service.ts` |
| Ollama proxy + system prompts | `apps/api/src/services/ollama.service.ts` |
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