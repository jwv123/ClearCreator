# Known Gaps (Not Yet Implemented)

- **Auth middleware is permissive** — skips auth for `/health`, `/ai/models`, and `/fonts`, falls through for missing tokens.
- **Environment tokens are placeholders** — `YOUR_SUPABASE_ANON_KEY`, etc. in `environment.ts`. `GOOGLE_FONTS_API_KEY` env var required on backend for font catalog; falls back to empty list if missing.
- **No tests** — all schematics have `skipTests: true`, no test runner configured, no spec files.
- **Frontend doesn't use shared-types lib** — types are defined inline in components/services rather than importing from `@clearcreator/shared-types`. Frontend also can't import `@clearcreator/ai-schemas` (no path alias in web tsconfig) so Zod validation on frontend uses structural checks instead.
- **Properties panel reads stale data** — PropertiesPanelComponent reads element properties on selection/modified events but doesn't refresh on continuous drag operations (object:moving).
- **Backend tsc build fails** — `rootDir` issue with path aliases to `libs/` outside `apps/api/src`. Works at runtime via `tsx` but `tsc` build produces errors. Needs composite project references or build tooling update.
- **Modify flow has no streaming** — `/api/ai/modify` is non-streaming. For complex modifications, a streaming variant would improve UX.
- **Mobile editor is limited** — sidebars collapse on mobile but the canvas editing experience is still desktop-first. Touch interactions and pinch-to-zoom are not implemented.