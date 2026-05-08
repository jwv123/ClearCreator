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
- **[known-gaps.md](./.claude/rules/known-gaps.md)** — No save/load, permissive auth, no keyboard shortcuts, placeholder env tokens, etc.
- **[roadmap.md](./.claude/rules/roadmap.md)** — Phase summary and link to full TODO.md

## After Each Phase

When a phase is completed, always:
1. **Update all MD files** — `TODO.md`, `CLAUDE.md`, and every file under `.claude/rules/` (architecture.md, commands.md, known-gaps.md, roadmap.md, style-and-patterns.md) to reflect what changed. Remove resolved gaps, add new ones, update file locations, update phase status.
2. **Commit and push** — Commit with a message like "Implement Phase N (Name)" and push to GitHub.