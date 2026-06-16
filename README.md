# KAVBAN

KAVBAN is a local-first AI Kanban orchestration system built from the Vibe Kanban codebase.

It turns cards into executable agent tasks with project context, branch-per-task workflow, AI review, human approval, and GitHub PR safety gates.

## Current Status

This repository has been initialized from `BloopAI/vibe-kanban` and now contains the first KAVBAN layer:

- A compact dark KAVBAN dashboard with board and list views.
- The original `KAVBAN.md` product specification.
- A Phase 0 Vibe Kanban analysis document.
- A KAVBAN project context pack in `projects/kavban`.
- A Codex intake JSON schema in `shared/kavban/intake.schema.json`.

## Development

Install dependencies:

```bash
pnpm i
```

Run the local app:

```bash
pnpm run dev
```

Run frontend checks:

```bash
pnpm run local-web:check
```

Run formatting:

```bash
pnpm run format
```

## Remotes

- `origin`: `https://github.com/nivak86/kavban.git`
- `upstream`: `https://github.com/BloopAI/vibe-kanban.git`

## Next Build Tasks

1. Add KAVBAN task metadata to the local data model.
2. Build `/api/kavban/intake/codex`.
3. Connect normalized intake payloads to real cards.
4. Attach project context packs to agent execution.
5. Add manual Run Agent and AI Review controls.
6. Enforce human approval before merge.
