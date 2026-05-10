# Roadmap

See [TODO.md](../../TODO.md) for the full phased checklist. Phases 1–8 are complete.

Phase summary:
1. ✅ Scaffolding — project structure, dependencies, migrations
2. ✅ Auth — Apollo Angular with auth headers, OAuth callback route, register flow
3. ✅ Dashboard — ProjectService with Apollo CRUD, ProjectCardComponent, TemplateGalleryComponent, create-from-template flow
4. ✅ Canvas core — Fabric.js wrapper, editor layout, properties/layers panels
5. ✅ AI integration — streaming generation, apply-to-canvas, model selector, modify elements, AiPanelComponent, AiState reactive store
6. ✅ Font system — Google Fonts API proxy, FontService with on-demand loading, FontSelectorComponent with search and preview, AI design font preloading
7. ✅ Image uploads — UploadService, Supabase Storage direct upload, AssetsPanelComponent with click-to-add, image dimensions, FabricImage integration
8. ✅ Keyboard shortcuts — KeyboardShortcutsService, Ctrl+Z/Y for undo/redo, Delete/Backspace, Ctrl+C/V copy/paste, Ctrl+G/Shift+G group/ungroup, Ctrl+A select all, arrow key nudge (1px / 10px with Shift)
9. Export — PNG/JPG client-side, PDF backend endpoint
10. Polish — auto-save, thumbnails, lazy loading, performance