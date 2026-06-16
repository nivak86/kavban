# Coding Rules

- Prefer existing Vibe Kanban patterns over new frameworks.
- Keep changes small and task-focused.
- Do not edit generated files directly.
- Regenerate shared Rust-to-TypeScript types with the existing scripts when backend types change.
- Use `pnpm run format` before completing broad code changes.
- Use branch names in the form `kav/{task_id}-{slug}`.
- Do not commit secrets, tokens, local credentials, or machine-specific paths except documented examples.
