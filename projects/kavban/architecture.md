# Architecture

## Base

KAVBAN uses Vibe Kanban as the foundation for board UI, workspaces, executors, Git workflows, and task review surfaces.

## Main Layers

- Intake layer: receives Codex annotations and other future task inputs.
- Task normalizer: validates and enriches raw instructions.
- Project context pack: injects project files into agent runs.
- Orchestrator: locks tasks, creates branches, launches agents, runs tests, and records events.
- AI reviewer: reviews diffs, tests, screenshots, and instruction compliance.
- Human gate: approves, rejects, requests changes, or allows PR merge.

## Initial Frontend Surface

The first KAVBAN screen lives in `packages/web-core/src/pages/kavban/KavbanDashboard.tsx` and models the target Linear-like board/list workflow with seeded data.
