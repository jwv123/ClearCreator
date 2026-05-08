# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ClearCreator is an AI-powered Canva-like design tool. Users type prompts, AI generates posters/flyers via Ollama Cloud, and results render on a Fabric.js canvas where users can edit elements directly or ask AI to modify them.

## Development Commands

```bash
# Frontend (Angular v21)
cd apps/web && npm start              # Dev server on localhost:4200
cd apps/web && npm run build          # Production build to dist/web/

# Backend (Express + Apollo)
cd apps/api && npm run dev            # Dev server on localhost:3001 (tsx watch)
cd apps/api && npm run build          # TypeScript compile to dist/
cd apps/api && npm start              # Production start

# Run both together
npm start                             # Concurrently runs frontend + backend

# Database
# Apply Supabase migrations manually via Supabase dashboard or CLI
```

**Note**: No test runner is configured. All schematics have `skipTests: true`.

## Architecture

### Three-Layer Canvas Architecture

The editor uses a strict separation where **only `CanvasWrapperService` touches Fabric.js**:

1. **CanvasWrapperService** (`features/editor/canvas/`) — owns the Fabric.js `Canvas` instance. Bridges imperative canvas operations to Angular reactivity via both signals (`selectedObjectIds`, `selectedObjectType`) and RxJS Subjects (`onObjectModified$`, `onTextChanged$`, etc.). Every canvas element gets `crypto.randomUUID()` as its `id` property.

2. **State services** (`features/editor/state/`) — lightweight injectable signal bags. `SelectionState` derives from `CanvasWrapperService`. `HistoryState` implements undo/redo via `snapshot()/restoreSnapshot()` with a 50-entry stack. `CanvasState` holds project metadata. `AiState` holds generation state.

3. **Infrastructure services** (`core/services/`) — `AuthService` wraps Supabase auth with BehaviorSubject + signals. `AiService` uses raw `fetch` for SSE streaming and `HttpClient` for non-streaming calls to `/api/ai/*`. `SupabaseService` is a singleton client wrapper.

**Rule**: No component except `EditorComponent` (which only holds the `<canvas>` ref) should import from `fabric`. All canvas interactions go through `CanvasWrapperService`.

### Backend AI Proxy

The Express server at port 3001 proxies all AI calls to Ollama Cloud:
- `GET /api/ai/models` — lists available models via `ollama.list()`
- `POST /api/ai/generate` — non-streaming design generation, validates output through `DesignGenerationSchema` (Zod)
- `POST /api/ai/generate/stream` — SSE streaming. Each chunk: `data: { content, done }`. Final message: `data: { validated, design, done }`
- `POST /api/ai/modify` — element modification with `MODIFY_SYSTEM_PROMPT`

System prompts in `ollama.service.ts` are critical — they define the JSON schema contract between AI and canvas. The `zodToJsonSchema()` helper converts Zod schemas to Ollama's `format` parameter.

### Supabase Roles

- **Auth** (client-side): email/password + Google OAuth via `@supabase/supabase-js`
- **Data** (server-side): GraphQL resolvers use service-role client, RLS enforces owner access
- **Storage**: `uploads` bucket is public-read (canvas needs publicly accessible image URLs), owner-scoped write

### Shared Type System

- `libs/shared-types` — TypeScript interfaces used by both frontend and backend (CanvasElement, Project, Upload, etc.)
- `libs/ai-schemas` — Zod schemas for validating AI output (DesignGenerationSchema, ElementModificationSchema)

The API references these via TypeScript path aliases (`@clearcreator/shared-types`, `@clearcreator/ai-schemas`) in its tsconfig. The frontend does **not** currently use these libs — it defines types inline.

## Known Gaps (Not Yet Implemented)

- **No dev proxy config** — `AiService` calls `/api/ai` expecting same-origin. You need a `proxy.conf.json` for the Angular dev server to proxy `/api/*` to `localhost:3001`.
- **No Apollo Client configured** — `@apollo/client` and `apollo-angular` are dependencies but `provideApollo()` is not in `app.config.ts`. Dashboard and editor have `// TODO` comments for GraphQL queries.
- **No project save/load** — `CanvasState.isDirty` exists but nothing persists canvas state to the backend.
- **Auth middleware is permissive** — skips auth for `/health` and `/ai/models`, falls through for missing tokens.
- **No PDF export endpoint** — `pdfmake` is a dependency but no `/api/export/pdf` route exists.
- **Environment tokens are placeholders** — `YOUR_SUPABASE_ANON_KEY`, etc. in `environment.ts`.

## Implementation Roadmap

See [TODO.md](./TODO.md) for the full phased checklist. Phase 1 (scaffolding) is complete.

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