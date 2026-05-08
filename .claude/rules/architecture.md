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

**Rule: Only `CanvasWrapperService` touches Fabric.js.** No component except `EditorComponent` (which holds the `<canvas>` DOM ref) should import from `fabric`. All canvas interactions go through the service.

1. **CanvasWrapperService** (`features/editor/canvas/`) — owns the Fabric.js `Canvas` instance. Bridges imperative canvas ops to Angular reactivity via signals (`selectedObjectIds`, `selectedObjectType`) and RxJS Subjects (`onObjectModified$`, `onTextChanged$`, etc.). Every element gets `crypto.randomUUID()` as its `id`.

2. **State services** (`features/editor/state/`) — lightweight signal bags. `SelectionState` derives from CanvasWrapper. `HistoryState` does undo/redo via `snapshot()/restoreSnapshot()` (50-entry stack). `CanvasState` holds project metadata. `AiState` holds generation state.

3. **Infrastructure services** (`core/services/`) — `AuthService` wraps Supabase auth (BehaviorSubject + signals). `AiService` uses raw `fetch` for SSE streaming, `HttpClient` for non-streaming. `SupabaseService` is a singleton client wrapper.

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
| AI streaming service | `apps/web/src/app/core/services/ai.service.ts` |
| Ollama proxy + system prompts | `apps/api/src/services/ollama.service.ts` |
| GraphQL schema + resolvers | `apps/api/src/graphql/schema/index.ts`, `apps/api/src/graphql/resolvers/index.ts` |
| Zod schemas for AI validation | `libs/ai-schemas/src/poster-design.schema.ts` |
| Shared TypeScript types | `libs/shared-types/src/` |
| Supabase migrations | `supabase/migrations/00001-00006_*.sql` |
| Seed data (3 templates) | `supabase/seed.sql` |
| Auth guard | `apps/web/src/app/core/guards/auth.guard.ts` |
| Angular routes | `apps/web/src/app/app.routes.ts` |
| Backend entry point | `apps/api/src/index.ts` |