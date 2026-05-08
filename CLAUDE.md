# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ClearCreator is an AI-powered Canva-like design tool. Users type prompts, AI generates posters/flyers via Ollama Cloud, and results render on a Fabric.js canvas where users can edit elements directly or ask AI to modify them.

**Stack**: Angular v21 (standalone, signals, OnPush) | NG-ZORRO | Fabric.js v7 | Express + Apollo GraphQL | Supabase (auth, DB, storage) | Ollama Cloud API | Zod

## Rule Files

Context is split into focused rule files under `.claude/rules/`:

- **[commands.md](./.claude/rules/commands.md)** — Dev server, build, and run commands
- **[architecture.md](./.claude/rules/architecture.md)** — Canvas architecture, backend AI proxy, Supabase roles, shared types, key file locations
- **[style-and-patterns.md](./.claude/rules/style-and-patterns.md)** — Angular patterns, Fabric.js rules, backend conventions, database conventions
- **[known-gaps.md](./.claude/rules/known-gaps.md)** — Missing proxy config, unconfigured Apollo, no save/load, permissive auth, etc.
- **[roadmap.md](./.claude/rules/roadmap.md)** — Phase summary and link to full TODO.md