# Agent Rules

```yaml
agent_routing:
  frontend_ui: claude
  backend_api: codex
  refactor: claude
  tests: codex
  security_review: claude
  documentation: claude
  data_scripts: codex
  fallback: codex

review:
  reviewer_agent: codex
  reviewer_must_differ_from_writer: true
  human_review_required_for:
    - auth
    - payments
    - database_migrations
    - infrastructure
    - secrets
    - production_deploys
    - legal_compliance
```
