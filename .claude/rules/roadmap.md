# Roadmap

See [TODO.md](../../TODO.md) for the full phased checklist. Phases 1–12 are complete.

Phase summary:
1. ✅ Scaffolding — project structure, dependencies, migrations
2. ✅ Auth — Apollo Angular with auth headers, OAuth callback route, register flow
3. ✅ Dashboard — ProjectService with Apollo CRUD, ProjectCardComponent, TemplateGalleryComponent, create-from-template flow
4. ✅ Canvas core — Fabric.js wrapper, editor layout, properties/layers panels
5. ✅ AI integration — streaming generation, apply-to-canvas, model selector, modify elements, AiPanelComponent, AiState reactive store
6. ✅ Font system — Google Fonts API proxy, FontService with on-demand loading, FontSelectorComponent with search and preview, AI design font preloading
7. ✅ Image uploads — UploadService, Supabase Storage direct upload, AssetsPanelComponent with click-to-add, image dimensions, FabricImage integration
8. ✅ Keyboard shortcuts — KeyboardShortcutsService, Ctrl+Z/Y for undo/redo, Delete/Backspace, Ctrl+C/V copy/paste, Ctrl+G/Shift+G group/ungroup, Ctrl+A select all, arrow key nudge (1px / 10px with Shift)
9. ✅ Export — PNG/JPG client-side export, PDF backend endpoint via pdfmake, ExportDialogComponent with format/quality/resolution options, auto-save with 5s debounce, thumbnail generation to Supabase Storage, project load in editor, save status indicator
10. ✅ Polish — Fabric.js lazy loading (dynamic import), virtual scrolling for layers panel, debounced property inputs, loading states throughout (editor overlay, canvas spinner, AI model spinner, assets initial load), mobile-responsive layout (collapsible sidebars, responsive dashboard, responsive auth cards)
11. ✅ Bug fixes & Vision AI — GraphQL camelCase field resolvers, NG-ZORRO icon registration, NzModalModule import, AI streaming fix (complete on validated, not on Ollama done), Fabric.js loadFromJSON AI-to-Fabric format conversion, thumbnail RLS path fix, vision model support (reference image URL → Ollama vision model), improved system prompts with safe zones and anti-overlap rules, OLLAMA_MODEL/OLLAMA_VISION_MODEL env vars, canvas viewport sizing fix (fitToScreen resizes canvas element to container), AI element position clamping (60px safe zone, min text width 200px)
12. ✅ Canvas centering, zoom & AI layout — fix fitToScreen (cache container dims, fix Fit button), fix zoom (zoomToPoint preserves centering), fix stale viewport (fitToScreen after loadFromJSON/restoreSnapshot/setDimensions), onZoomChanged$ Subject for zoom signal sync, @lume/kiwi constraint solver for layout post-processing (LayoutPostProcessor: safe margins, non-overlap, alignment snapping), integrate post-processor into AI apply flow, multi-stage CoT system prompts (zones, positioning, verify), zone/alignWith hint fields in Zod schema