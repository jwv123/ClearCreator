# Known Gaps (Not Yet Implemented)

- **No dev proxy config** — `AiService` calls `/api/ai` expecting same-origin. Need `proxy.conf.json` for Angular dev server to proxy `/api/*` to `localhost:3001`.
- **Apollo Client configured and used** — `provideApollo()` is in `app.config.ts` with auth headers. `ProjectService` uses Apollo for dashboard queries/mutations. Dashboard and editor are wired up.
- **No project save/load** — `CanvasState.isDirty` exists but nothing persists canvas state to the backend.
- **Auth middleware is permissive** — skips auth for `/health` and `/ai/models`, falls through for missing tokens.
- **No PDF export endpoint** — `pdfmake` is a dependency but no `/api/export/pdf` route exists.
- **Environment tokens are placeholders** — `YOUR_SUPABASE_ANON_KEY`, etc. in `environment.ts`.
- **No tests** — all schematics have `skipTests: true`, no test runner configured, no spec files.
- **Frontend doesn't use shared-types lib** — types are defined inline in components/services rather than importing from `@clearcreator/shared-types`.