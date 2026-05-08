# Known Gaps (Not Yet Implemented)

- **No project save/load** — `CanvasState.isDirty` exists but nothing persists canvas state to the backend.
- **Auth middleware is permissive** — skips auth for `/health` and `/ai/models`, falls through for missing tokens.
- **No PDF export endpoint** — `pdfmake` is a dependency but no `/api/export/pdf` route exists.
- **Environment tokens are placeholders** — `YOUR_SUPABASE_ANON_KEY`, etc. in `environment.ts`.
- **No tests** — all schematics have `skipTests: true`, no test runner configured, no spec files.
- **Frontend doesn't use shared-types lib** — types are defined inline in components/services rather than importing from `@clearcreator/shared-types`.
- **No keyboard shortcuts** — Undo/Redo/Copy/Paste/Delete not bound to keyboard events.
- **Properties panel reads stale data** — PropertiesPanelComponent reads element properties on selection/modified events but doesn't refresh on continuous drag operations (object:moving).