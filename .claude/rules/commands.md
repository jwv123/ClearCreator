# Commands

## Development

```bash
# Frontend (Angular v21) — dev server on localhost:4200
cd apps/web && npm start

# Frontend — production build to dist/web/
cd apps/web && npm run build

# Backend (Express + Apollo) — dev server on localhost:3001 (tsx watch)
cd apps/api && npm run dev

# Backend — TypeScript compile to dist/
cd apps/api && npm run build

# Backend — production start
cd apps/api && npm start

# Run both frontend + backend concurrently
npm start

# Database — apply migrations via Supabase dashboard or CLI
```

No test runner is configured. All Angular schematics have `skipTests: true`.