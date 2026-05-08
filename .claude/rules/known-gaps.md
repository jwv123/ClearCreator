# Known Gaps (Not Yet Implemented)

- **No dev proxy config** — `AiService` calls `/api/ai` expecting same-origin. Need `proxy.conf.json` for Angular dev server to proxy `/api/*` to `localhost:3001`.
- **No Apollo Client configured** — `@apollo/client` and `apollo-angular` are dependencies but `provideApollo()` is not in `app.config.ts`. Dashboard and editor have `// TODO` comments for GraphQL queries.
- **No project save/load** — `CanvasState.isDirty` exists but nothing persists canvas state to the backend.
- **Auth middleware is permissive** — skips auth for `/health` and `/ai/models`, falls through for missing tokens.
- **No PDF export endpoint** — `pdfmake` is a dependency but no `/api/export/pdf` route exists.
- **Environment tokens are placeholders** — `YOUR_SUPABASE_ANON_KEY`, etc. in `environment.ts`.
- **No tests** — all schematics have `skipTests: true`, no test runner configured, no spec files.
- **Frontend doesn't use shared-types lib** — types are defined inline in components/services rather than importing from `@clearcreator/shared-types`.