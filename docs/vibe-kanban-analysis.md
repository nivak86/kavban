# Vibe Kanban Analysis for KAVBAN

## Baseline

KAVBAN is initialized from `BloopAI/vibe-kanban` with two git remotes:

- `upstream`: `https://github.com/BloopAI/vibe-kanban.git`
- `origin`: `https://github.com/nivak86/kavban.git`

The upstream app is a Rust workspace plus PNPM frontend packages.

## Relevant Structure

- `crates/server`: local API server and route surface.
- `crates/db`: local SQLite models and migrations.
- `crates/executors`: coding-agent execution integrations, including Codex.
- `crates/git` and `crates/git-host`: branch, PR, and host operations.
- `packages/local-web`: local Vite app shell and TanStack routes.
- `packages/web-core`: shared React pages, hooks, stores, providers, and feature code.
- `packages/ui`: reusable UI primitives including kanban, issue list, badges, avatars, chat, PR, and workspace components.
- `shared`: generated TypeScript types and executor schemas.

## Existing Extension Points

- Issues already map cleanly to KAVBAN cards.
- Workspaces already provide branch, terminal, dev server, agent execution, and PR flow concepts.
- Executors already include Codex support and review-related code.
- Project-level routes and settings are in place, but upstream currently routes projects to a sunset/export page.
- The local UI design system is dark-friendly, compact, and already close to the target Linear-like screenshots.

## Initial KAVBAN Changes

- Added a KAVBAN command-center screen at `packages/web-core/src/pages/kavban/KavbanDashboard.tsx`.
- Routed the root page and project kanban page to the KAVBAN command center for the first visible MVP surface.
- Preserved the original Vibe Kanban foundation so backend, executor, workspace, and PR concepts can be extended rather than rebuilt.

## Proposed Next Extension Path

1. Add KAVBAN task metadata to the local database.
2. Add `/api/kavban/intake/codex` to normalize Codex annotations into tasks.
3. Connect normalized KAVBAN tasks to existing issues/cards.
4. Attach project context files to workspace creation and executor prompts.
5. Add manual Run Agent and AI Review actions to task detail.
6. Enforce human approval before merge.

## Notes

The current KAVBAN UI uses static seeded data. That is intentional for the first slice: it establishes the product vocabulary, task states, agent tags, review gates, and visual language before the deeper data and orchestration changes land.
