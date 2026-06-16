# KAVBAN Project

## Purpose

KAVBAN is a local-first AI Kanban orchestration system. It starts from Vibe Kanban and adds project context packs, Codex intake, agent routing, AI review, human approval gates, and safe GitHub PR flow.

## Users

- Kavin as the primary local operator.
- Coding agents such as Codex, Claude Code, Gemini, and future agent SDK workers.
- Human reviewers approving sensitive or production-bound changes.

## Repository

- Owner: `nivak86`
- Name: `kavban`
- Default branch: `main`
- Upstream base: `BloopAI/vibe-kanban`

## Constraints

- Local-first by default.
- Agents never push directly to `main`.
- Human review is required for auth, payments, secrets, database migrations, infrastructure, and user-visible production behavior.
- Secrets are referenced by environment variables only.
