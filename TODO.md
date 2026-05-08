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

## Phase 4: Canvas Core
- [ ] Complete `CanvasWrapperService` — verify all Fabric.js operations work (add/remove/update elements, selection, serialization)
- [ ] Build `CanvasComponent` with ResizeObserver for responsive canvas sizing
- [ ] Implement `EditorComponent` layout (topbar, sidebar, canvas, properties panel)
- [ ] Build `SidebarComponent` with text, shape, and image tools
- [ ] Build `PropertiesPanelComponent` — dynamic panel based on selection type
- [ ] Build `LayersPanelComponent` — z-order list with drag reorder, visibility, lock toggles
- [ ] Add dev proxy config (`proxy.conf.json`) so `/api/*` routes to `localhost:3001`

## Phase 5: AI Integration
- [ ] Test Ollama Cloud API connectivity end-to-end
- [ ] Build `AiPanelComponent` with streaming response display
- [ ] Implement "Apply to Canvas" flow — parse AI JSON, validate with Zod, call `CanvasWrapperService.loadFromJSON()`
- [ ] Implement "Modify Element" flow — parse AI changes, call `CanvasWrapperService.updateElement()`
- [ ] Add model selector dropdown (fetches from `GET /api/ai/models`)
- [ ] Handle error cases (invalid JSON, network failures, rate limits)

## Phase 6: Font System
- [ ] Implement `FontService` — fetch Google Fonts API, load fonts via `document.fonts.load()`
- [ ] Build `FontSelectorComponent` — searchable dropdown with font preview
- [ ] Ensure fonts are loaded before Fabric.js renders text objects

## Phase 7: Image Uploads
- [ ] Implement `UploadService` — create upload mutation, upload to Supabase Storage, return public URL
- [ ] Build `AssetsPanelComponent` — grid of user uploads, drag-to-canvas
- [ ] Handle image dimensions from upload metadata
- [ ] Wire `FabricImage.fromURL()` for adding uploaded images to canvas

## Phase 8: Undo/Redo + Keyboard Shortcuts
- [ ] Implement undo/redo in `HistoryState` — subscribe to `CanvasWrapperService.onObjectModified$`
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