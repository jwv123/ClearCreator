# TODO.md

## Phase 1: Scaffolding ✅
- [x] Initialize project structure (Angular + Node.js monorepo)
- [x] Install core dependencies (Fabric.js, Apollo, Supabase, NG-ZORRO, Zod)
- [x] Create shared types and AI schemas libraries
- [x] Set up Express backend with Apollo Server and Ollama proxy
- [x] Configure Angular routing (auth, dashboard, editor)
- [x] Create Supabase migrations and seed data

## Phase 2: Auth ✅
- [x] Configure Apollo Angular in `app.config.ts` with auth headers
- [x] Add Supabase auth callback route (`/auth/callback`)
- [x] Test login/register/Google OAuth flow end-to-end

## Phase 3: Dashboard ✅
- [x] Wire up Apollo Angular queries (myProjects, templates, featuredTemplates)
- [x] Implement `ProjectService` with CRUD mutations
- [x] Build working `ProjectCardComponent` with thumbnails
- [x] Build working `TemplateGalleryComponent` with template previews
- [x] Create project flow → navigate to editor

## Phase 4: Canvas Core ✅
- [x] Complete `CanvasWrapperService` — verify all Fabric.js operations work (add/remove/update elements, selection, serialization)
- [x] Build `CanvasComponent` with ResizeObserver for responsive canvas sizing
- [x] Implement `EditorComponent` layout (topbar, sidebar, canvas, properties panel)
- [x] Build `SidebarComponent` with text, shape, and image tools
- [x] Build `PropertiesPanelComponent` — dynamic panel based on selection type
- [x] Build `LayersPanelComponent` — z-order list with drag reorder, visibility, lock toggles
- [x] Add dev proxy config (`proxy.conf.json`) so `/api/*` routes to `localhost:3001`

## Phase 5: AI Integration ✅
- [x] Test Ollama Cloud API connectivity end-to-end
- [x] Build `AiPanelComponent` with streaming response display
- [x] Implement "Apply to Canvas" flow — parse AI JSON, validate with Zod, call `CanvasWrapperService.loadFromJSON()`
- [x] Implement "Modify Element" flow — parse AI changes, call `CanvasWrapperService.updateElement()`
- [x] Add model selector dropdown (fetches from `GET /api/ai/models`)
- [x] Handle error cases (invalid JSON, network failures, rate limits)

## Phase 6: Font System ✅
- [x] Implement `FontService` — fetch Google Fonts API, load fonts via `document.fonts.load()`
- [x] Build `FontSelectorComponent` — searchable dropdown with font preview
- [x] Ensure fonts are loaded before Fabric.js renders text objects

## Phase 7: Image Uploads ✅
- [x] Implement `UploadService` — create upload mutation, upload to Supabase Storage, return public URL
- [x] Build `AssetsPanelComponent` — grid of user uploads, click-to-add-to-canvas
- [x] Handle image dimensions from upload metadata
- [x] Wire `FabricImage.fromURL()` for adding uploaded images to canvas

## Phase 8: Undo/Redo + Keyboard Shortcuts ✅
- [x] Implement undo/redo in `HistoryState` — wired to canvas events via EditorComponent subscriptions (object:added, object:modified, object:removed, debounced text:changed)
- [x] Add keyboard shortcuts: Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z, Delete, Ctrl+C/V, Ctrl+G/Shift+G, Ctrl+A, arrow keys

## Phase 9: Export ✅
- [x] Implement PNG/JPG export via `CanvasWrapperService.toDataURL()`
- [x] Add PDF export endpoint on backend (`POST /api/export/pdf` using pdfmake)
- [x] Build `ExportDialogComponent` — format selection, resolution multiplier, PDF page size
- [x] Implement auto-save (debounced, every 5s of inactivity)
- [x] Generate thumbnail on save via `CanvasWrapperService.toDataURL()` at low multiplier

## Phase 10: Polish ✅
- [x] Lazy load Fabric.js (dynamic `import()`) to reduce initial bundle size
- [x] Virtual scrolling for layers panel with many objects
- [x] Image lazy loading in assets panel (decoding="async", error fallback, initial loading state)
- [x] Loading states and error handling throughout (editor overlay, canvas spinner, AI model spinner, debounced property inputs)
- [x] Mobile-responsive layout (collapsible sidebars, responsive dashboard grid, responsive auth cards, topbar adjustments)

## Phase 11: Bug Fixes & Vision AI ✅
- [x] Fix GraphQL field resolver mapping (snake_case → camelCase) for Project, Template, Upload, User types
- [x] Register NG-ZORRO icons via `provideNzIcons()` in app.config.ts (33 icons + custom circle SVG)
- [x] Add `NzModalModule` import to EditorComponent (fix NzModalService provider error)
- [x] Fix AI streaming flow — complete subject only on validated design, not on Ollama `done` flag
- [x] Fix Fabric.js `loadFromJSON` to convert AI design format to Fabric.js serialization format (type normalization, circle radius conversion)
- [x] Fix thumbnail upload path to match Supabase Storage RLS policy (`{userId}/thumbnails/` instead of `thumbnails/{userId}/`)
- [x] Add vision model support — reference image URL input in AI panel, backend fetches image and sends to Ollama vision model, `VISION_SYSTEM_PROMPT` for image analysis
- [x] Add `radius` field to `CanvasElementSchema` in Zod validation
- [x] Improve `DESIGN_SYSTEM_PROMPT` with detailed design principles and element guidance
- [x] Add `OLLAMA_MODEL` and `OLLAMA_VISION_MODEL` env vars with sensible defaults
- [x] Fix canvas overflow into sidebar — `fitToScreen()` resizes canvas element to container, `projectWidth`/`projectHeight` for logical dimensions, `withProjectDimensions()` for serialization
- [x] Add AI element position clamping — `toFabricJSON()` clamps elements to 60px safe zone, enforces minimum text width of 200px
- [x] Strengthen system prompts — enforce left/top >= 60px safe zone, anti-overlap spacing (30-60px gaps), minimum text width, height estimation formula