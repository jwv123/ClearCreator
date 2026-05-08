# Known Gaps (Not Yet Implemented)

- **No project save/load** — `CanvasState.isDirty` exists but nothing persists canvas state to the backend.
- **Auth middleware is permissive** — skips auth for `/health` and `/ai/models`, falls through for missing tokens.
- **No PDF export endpoint** — `pdfmake` is a dependency but no `/api/export/pdf` route exists.
- **Environment tokens are placeholders** — `YOUR_SUPABASE_ANON_KEY`, etc. in `environment.ts`.
- **No tests** — all schematics have `skipTests: true`, no test runner configured, no spec files.
- **Frontend doesn't use shared-types lib** — types are defined inline in components/services rather than importing from `@clearcreator/shared-types`. Frontend also can't import `@clearcreator/ai-schemas` (no path alias in web tsconfig) so Zod validation on frontend uses structural checks instead.
- **No keyboard shortcuts** — Undo/Redo/Copy/Paste/Delete not bound to keyboard events.
- **Properties panel reads stale data** — PropertiesPanelComponent reads element properties on selection/modified events but doesn't refresh on continuous drag operations (object:moving).
- **Backend tsc build fails** — `rootDir` issue with path aliases to `libs/` outside `apps/api/src`. Works at runtime via `tsx` but `tsc` build produces errors. Needs composite project references or build tooling update.
- **Modify flow has no streaming** — `/api/ai/modify` is non-streaming. For complex modifications, a streaming variant would improve UX.