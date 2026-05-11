# Commands

## Development

```bash
# Frontend (Angular v21) — dev server on localhost:4200
# Proxies /api/* to localhost:3001 via proxy.conf.json
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

## Environment Variables

Backend (`apps/api/.env`):
- `OLLAMA_HOST` — Ollama API host (default: `https://ollama.com`)
- `OLLAMA_API_KEY` — Ollama Cloud API key
- `OLLAMA_MODEL` — Default text model (default: `gpt-oss:120b`)
- `OLLAMA_VISION_MODEL` — Default vision model for image-based generation (default: `qwen3-vl:235b-instruct`)
- `GOOGLE_FONTS_API_KEY` — Required for font catalog; falls back to empty list if missing