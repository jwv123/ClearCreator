# ClearCreator

AI-powered design tool — generate posters, flyers, social media posts, and more using Ollama Cloud, then edit everything on a Fabric.js canvas.

![Angular](https://img.shields.io/badge/Angular-21-red) ![Node.js](https://img.shields.io/badge/Node.js-Express-green) ![Supabase](https://img.shields.io/badge/Supabase-Postgres-green) ![Fabric.js](https://img.shields.io/badge/Fabric.js-7-blue)

## How It Works

1. **Describe** what you want — type a prompt like "Minimalist birthday party flyer with pastel colors"
2. **Generate** — Ollama Cloud creates a structured JSON design specification
3. **Edit** — all elements (text, shapes, images) are fully editable on the Fabric.js canvas
4. **AI Modify** — select an element and ask AI to change colors, fonts, layout, etc.
5. **Vision AI** — provide a reference image URL and the AI will generate a design inspired by it
6. **Export** — download as PNG, JPG, or PDF

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Angular 21, NG-ZORRO (Ant Design), RxJS, Signals |
| Canvas | Fabric.js 7 (wrapped in Angular service layer) |
| Backend | Express 5, Apollo Server 4, GraphQL |
| AI | Ollama Cloud API (streaming SSE, structured JSON output) |
| Database | Supabase (Postgres, Auth, Storage, RLS) |
| Validation | Zod (AI output schemas) |
| Export | pdfmake (PDF), Fabric.js toDataURL (PNG/JPG) |

## Project Structure

```
clearcreator/
  apps/
    web/                  # Angular 21 frontend
      src/app/
        core/             # Services (auth, AI, fonts, Supabase), guards, models
        features/
          auth/           # Login, register, OAuth callback (Supabase auth)
          dashboard/      # Project list, template gallery
          editor/         # Canvas, sidebar, panels, state services
        shared/           # Shared components, pipes
    api/                  # Express + Apollo GraphQL backend
      src/
        graphql/          # Schema and resolvers
        services/         # Ollama proxy, AI prompt builder, Google Fonts proxy, PDF export
        middleware/       # Auth, error, rate-limit
  libs/
    shared-types/         # Shared TypeScript interfaces
    ai-schemas/            # Zod schemas for AI output validation
  supabase/
    migrations/           # 6 SQL migrations (profiles, projects, templates, uploads, ai_generations, RLS)
    seed.sql               # 3 sample templates
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm 11+
- [Supabase](https://supabase.com) account with a project
- [Ollama Cloud](https://ollama.com) API key

### Setup

1. **Clone and install**
   ```bash
   git clone https://github.com/jwv123/ClearCreator.git
   cd ClearCreator
   npm install
   cd apps/web && npm install
   cd ../api && npm install
   ```

2. **Configure environment**
   ```bash
   cp apps/api/.env.example apps/api/.env
   # Edit apps/api/.env with your Supabase URL, service role key, and Ollama API key
   ```
   
   Edit `apps/web/src/environments/environment.ts` with your Supabase URL and anon key.

3. **Set up Supabase**
   - Create a new Supabase project
   - Run the migrations in `supabase/migrations/` via the SQL editor
   - Run `supabase/seed.sql` for sample templates
   - Create a public storage bucket called `uploads`

4. **Start development**
   ```bash
   # Terminal 1 — Frontend (localhost:4200)
   cd apps/web && npm start

   # Terminal 2 — Backend (localhost:3001)
   cd apps/api && npm run dev

   # Or run both together
   npm start
   ```

5. **Open** http://localhost:4200

## Architecture

### Three-Layer Canvas

The editor uses strict separation — **only `CanvasWrapperService` touches Fabric.js**:

- **CanvasWrapperService** — owns the Fabric.js `Canvas` instance, bridges to Angular signals and RxJS Subjects. Resizes canvas element to container (preventing overflow), uses viewport transform for centering/scaling
- **State services** — `CanvasState`, `SelectionState`, `HistoryState`, `AiState` hold reactive state
- **Infrastructure services** — `AuthService`, `AiService`, `FontService`, `SupabaseService`, `ThumbnailService`, `ProjectService` handle external I/O

No component imports from `fabric` directly. All canvas operations go through the service.

### AI Generation Flow

```
User prompt → AiService (SSE) → Express /api/ai/generate/stream
    → Ollama Cloud (structured JSON output)
    → Zod validation (DesignGenerationSchema)
    → CanvasWrapperService.loadFromJSON()
    → Canvas renders the design
```

### Data Flow

```
Frontend (Angular)  ←→  GraphQL API (Express)  ←→  Supabase (Postgres + Auth + Storage)
                         ↕
                    Ollama Cloud (AI generation)
                         ↕
                    Google Fonts API (font catalog)

Export flow:  Canvas → toDataURL (PNG/JPG client-side)  →  browser download
              Canvas → toDataURL → POST /api/export/pdf  →  pdfmake  →  PDF download
Auto-save:    Canvas changes → 5s debounce → updateProject mutation + thumbnail upload
```

## Development Commands

| Command | Description |
|---------|-------------|
| `cd apps/web && npm start` | Frontend dev server (localhost:4200) |
| `cd apps/web && npm run build` | Production build |
| `cd apps/api && npm run dev` | Backend dev server (localhost:3001, tsx watch) |
| `cd apps/api && npm run build` | TypeScript compile |
| `npm start` | Run both frontend + backend concurrently |

## Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | ✅ | Scaffolding — project structure, dependencies, migrations |
| 2 | ✅ | Auth — Supabase auth, Apollo with auth headers, OAuth callback |
| 3 | ✅ | Dashboard — ProjectService, project cards, template gallery |
| 4 | ✅ | Canvas core — Fabric.js wrapper, editor layout, properties/layers |
| 5 | ✅ | AI integration — streaming generation, apply-to-canvas, model selector |
| 6 | ✅ | Font system — Google Fonts proxy, FontService, font selector with preview |
| 7 | ✅ | Image uploads — Supabase Storage, assets panel, drag-to-canvas |
| 8 | ✅ | Undo/redo + keyboard shortcuts |
| 9 | ✅ | Export — PNG/JPG/PDF, auto-save, thumbnails |
| 10 | ✅ | Polish — lazy loading, virtual scroll, mobile responsive |
| 11 | ✅ | Bug fixes & Vision AI — GraphQL resolvers, icon registration, AI streaming fix, Fabric.js loadFromJSON conversion, vision model support, canvas viewport sizing, AI element position clamping, safe zone system prompts |
| 12 | ✅ | Canvas centering, zoom & AI layout — fix Fit button, zoomToPoint centering, viewport refresh after load/undo, constraint-based layout post-processing (@lume/kiwi), multi-stage CoT system prompts |

See [TODO.md](./TODO.md) for detailed task breakdowns.

## License

MIT