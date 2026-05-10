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

## Phase 8: Undo/Redo + Keyboard Shortcuts
- [x] Implement undo/redo in `HistoryState` — wired to canvas events via EditorComponent subscriptions (object:added, object:modified, object:removed, debounced text:changed)
- [ ] Add keyboard shortcuts: Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z, Delete, Ctrl+C/V, Ctrl+G/Shift+G, Ctrl+A, arrow keys

## Phase 9: Export
- [ ] Implement PNG/JPG export via `CanvasWrapperService.toDataURL()`
- [ ] Add PDF export endpoint on backend (`POST /api/export/pdf` using pdfmake)
- [ ] Build `ExportDialogComponent` — format selection, resolution multiplier, PDF page size
- [ ] Implement auto-save (debounced, every 5s of inactivity)
- [ ] Generate thumbnail on save via `CanvasWrapperService.toDataURL()` at low multiplier

## Phase 10: Polish
- [ ] Lazy load Fabric.js (dynamic `import()`) to reduce initial bundle size
- [ ] Virtual scrolling for layers panel with many objects
- [ ] Image lazy loading in assets panel
- [ ] Loading states and error handling throughout
- [ ] Mobile-responsive layout considerations