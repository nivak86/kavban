# KAVBAN — AI Kanban Agent Orchestration System

## 1. Concept

KAVBAN is a project-aware AI Kanban system built on top of, or alongside, Vibe Kanban.

It is designed to manage software and non-software projects where each Kanban card can become an executable AI task for coding agents such as Codex, Claude Code, Gemini, or other agent SDKs.

The system should support:

- One Kanban board per project
- Project-specific settings, repositories, connections, and context files
- Agent-executable tasks
- Sequential and parallel task execution
- AI review before human review
- Human approval before merging to main
- Full task-level chat and execution history
- Safe GitHub-based branch, PR, review, and merge workflow

The product goal:

> Trello/Jira for AI agents, where every card can be planned, executed, reviewed, and shipped safely.

---

## 2. Recommended Build Strategy

Do not build a generic Kanban board from scratch.

Start from **Vibe Kanban** as the base layer because it already focuses on AI coding-agent workflows.

Recommended approach:

```text
Vibe Kanban base
    +
KAVBAN extensions
    +
Separate orchestration engine
```

Use Vibe Kanban for:

- Kanban UI
- Project/task layout
- Existing coding-agent support
- Git/workspace concepts
- Basic task lifecycle

Build custom KAVBAN modules for:

- Codex annotation intake
- Project memory/context packs
- Agent orchestration
- Dependency handling
- AI reviewer agent
- Human-review gate
- Task chat history
- Audit logs and rollback
- Broader non-code workflows

Avoid deeply modifying Vibe Kanban at first. Treat it as the UI and task surface. Put the real intelligence in a separate orchestration layer.

---

## 3. High-Level Architecture

```text
User / Codex App / Voice / Telegram / Web UI
                  |
                  v
          KAVBAN Intake Layer
                  |
                  v
          KAVBAN Task Normalizer
                  |
                  v
          Kanban Board / Task Store
                  |
                  v
          Orchestration Engine
                  |
        +---------+----------+----------+
        |                    |          |
        v                    v          v
   Codex Worker        Claude Worker   Other Agent Worker
        |                    |          |
        +---------+----------+----------+
                  |
                  v
            AI Reviewer Agent
                  |
                  v
           Human Review Gate
                  |
                  v
            GitHub PR / Merge
```

---

## 4. Core Workflow

### Standard Task Flow

```text
Backlog
  ↓
Ready for Agent
  ↓
In Progress
  ↓
AI Review
  ↓
Fix Required OR Human Review
  ↓
Approved
  ↓
PR Created
  ↓
Merged to Main
  ↓
Done
```

### Parallel Task Flow

```text
Task A ──┐
Task B ──┼──▶ Reviewer ──▶ Human Review ──▶ Merge
Task C ──┘
```

### Sequential Task Flow

```text
Task A
  ↓
Task B depends on Task A
  ↓
Task C depends on Task B
```

Each task should support dependencies.

A task may only run if:

- Its dependencies are complete
- Its project context pack is available
- Required connections are configured
- The correct agent is available
- The task is not locked by another worker

---

## 5. Project Structure

Each project should have a dedicated KAVBAN config.

Example:

```text
projects/
  rocky/
    kavban.project.md
    architecture.md
    coding-rules.md
    current-state.md
    known-issues.md
    review-checklist.md
    connections.md
    agent-rules.md
    task-history.md

  rikvin-capital-portal/
    kavban.project.md
    architecture.md
    coding-rules.md
    current-state.md
    known-issues.md
    review-checklist.md
    connections.md
    agent-rules.md
    task-history.md
```

---

## 6. Project Context Pack

Every project must have a context pack.

The context pack is injected into every agent run.

Minimum files:

### `kavban.project.md`

Purpose:

- Project description
- Business purpose
- Main users
- Current repo
- Deployment target
- Important constraints

### `architecture.md`

Purpose:

- App structure
- Key services
- Frontend/backend stack
- Database structure
- Important flows

### `coding-rules.md`

Purpose:

- Coding style
- Testing rules
- Naming conventions
- Commit rules
- Forbidden changes

### `current-state.md`

Purpose:

- Current development status
- Known active branches
- Current priorities
- Recent decisions

### `known-issues.md`

Purpose:

- Bugs
- Technical debt
- Fragile areas
- Things agents should not break

### `review-checklist.md`

Purpose:

- What the reviewer agent must check
- Test requirements
- UI review requirements
- Security review requirements

### `connections.md`

Purpose:

- GitHub repo
- Local repo path
- Environment variables required
- External APIs
- Deployment target

Do not store secrets directly in Markdown. Store secret references only.

Example:

```yaml
secrets:
  GITHUB_TOKEN: stored_in_env
  OPENAI_API_KEY: stored_in_env
  ANTHROPIC_API_KEY: stored_in_env
```

### `agent-rules.md`

Purpose:

- Which agent to use for which task type
- When to use Claude
- When to use Codex
- When to require human review

Example:

```yaml
agent_routing:
  frontend_ui: claude
  backend_api: codex
  refactor: claude
  tests: codex
  security_review: claude
  copywriting: claude
  data_scripts: codex
```

---

## 7. Task Schema

Every Kanban card should be normalized into a structured task.

Example:

```yaml
task:
  id: kav-000123
  project_id: rocky
  title: Fix login redirect bug
  description: After login, users are redirected to /dashboard instead of the originally requested page.

  type: bug
  priority: high
  status: ready_for_agent

  repo:
    provider: github
    owner: kavinb
    name: rocky
    default_branch: main
    working_branch: kav-000123-login-redirect

  agent:
    assigned: claude
    fallback: codex
    reviewer: codex

  dependencies: []

  context_files:
    - kavban.project.md
    - architecture.md
    - coding-rules.md
    - current-state.md
    - known-issues.md
    - review-checklist.md

  execution:
    run_tests: true
    create_pr: true
    auto_merge: false
    requires_human_review: true

  review:
    ai_review_required: true
    human_review_required: true

  created_from:
    source: codex_annotation
    raw_input_id: codex-note-789
```

---

## 8. Card Fields

Each Kanban card should expose:

- Title
- Description
- Project
- Repo
- Branch
- Assigned agent
- Reviewer agent
- Priority
- Status
- Dependencies
- Required context files
- Human review required: yes/no
- PR link
- Test status
- Last run status
- Task chat history
- Agent logs
- Reviewer report
- Approval status

---

## 9. Codex Annotation Intake

One of the key KAVBAN features is using Codex as an intake agent.

The user can annotate inside Codex, and Codex’s role is to create structured KAVBAN tasks.

### Intake Flow

```text
User annotation in Codex
        ↓
Codex creates structured JSON
        ↓
KAVBAN intake API receives payload
        ↓
Task normalizer validates fields
        ↓
Task added to correct project board
        ↓
Orchestrator decides next action
```

### Example Codex Output

```json
{
  "project": "rocky",
  "title": "Add daily health summary widget",
  "description": "Create a dashboard widget that summarizes sleep, glucose, workout, and food data for the day.",
  "type": "feature",
  "priority": "medium",
  "suggested_agent": "claude",
  "requires_human_review": true,
  "dependencies": [],
  "context": [
    "dashboard",
    "health-data",
    "ui"
  ]
}
```

### Intake API Endpoint

Create endpoint:

```http
POST /api/kavban/intake
```

Expected actions:

1. Authenticate request
2. Validate JSON
3. Match project
4. Attach project context pack
5. Create Kanban card
6. Return task ID

Response:

```json
{
  "success": true,
  "task_id": "kav-000124",
  "status": "backlog"
}
```

---

## 10. Orchestration Engine

The orchestration engine is the heart of KAVBAN.

Responsibilities:

- Watch for tasks in `Ready for Agent`
- Check dependencies
- Lock task before execution
- Create working branch
- Assemble context pack
- Send prompt to selected agent
- Track agent output
- Run tests
- Commit changes
- Create PR
- Move task to AI Review
- Assign reviewer agent
- Move to Human Review if needed
- Merge only after approval

### Orchestrator Loop

Pseudo-flow:

```text
Every N seconds:
  find tasks where status = Ready for Agent

  for each task:
    if dependencies incomplete:
      skip

    if task locked:
      skip

    lock task
    create branch
    build context pack
    send to assigned agent
    monitor execution
    save logs
    run tests
    move to AI Review
```

---

## 11. Agent Workers

Each agent worker should be isolated.

### Codex Worker

Use for:

- Backend code
- Data scripts
- Tests
- Structured refactors
- API work
- Codebase search and patching

### Claude Worker

Use for:

- UI work
- Architecture-heavy tasks
- Refactoring
- Long context reasoning
- Documentation
- Product logic
- Review reports

### Reviewer Worker

Use for:

- Diff review
- Test review
- Screenshot review
- Security review
- Regression detection
- Instruction compliance

The reviewer must not be the same agent instance that wrote the code.

---

## 12. AI Review

The AI reviewer should check:

- Did the agent satisfy the task?
- Did it follow project rules?
- Did it modify unrelated files?
- Did tests pass?
- Did it introduce obvious security issues?
- Did it update docs where needed?
- Does the UI still make sense?
- Is the PR small enough to review?
- Are there hidden assumptions?
- Does this require human decision?

### AI Review Output

```yaml
review:
  result: pass | fail | needs_human
  summary: Short explanation
  files_changed:
    - path: app/dashboard/page.tsx
      comment: Added new widget component
  risks:
    - Low risk. UI-only change.
  tests:
    status: passed
    command: npm test
  recommendation: move_to_human_review
```

### Review Outcomes

```text
PASS
  ↓
Human Review or Approved

FAIL
  ↓
Fix Required

NEEDS HUMAN
  ↓
Human Review
```

---

## 13. Human Review

Human review is required when:

- The task changes production logic
- The task changes auth, payments, or security
- The task changes database schema
- The task changes user-visible UI
- The AI reviewer is uncertain
- The project rules require it
- The user marked the task as requiring review

Human review actions:

- Approve
- Reject
- Request changes
- Assign back to agent
- Merge PR
- Close task

---

## 14. GitHub Workflow

For each task:

1. Create branch:

```text
kav/{task_id}-{slug}
```

Example:

```text
kav/kav-000123-login-redirect
```

2. Agent commits changes to branch.

3. Tests run.

4. PR created.

5. AI reviewer comments on PR and task card.

6. Human reviews.

7. Merge to main only after approval.

### Merge Rules

Agents must not directly push to main.

Allowed:

- Create branch
- Commit to branch
- Push branch
- Open PR
- Comment on PR
- Update PR

Forbidden unless explicitly approved:

- Merge to main
- Force push main
- Delete repository files broadly
- Modify secrets
- Deploy production

---

## 15. Task Chat History

Each task should have a full chat and event history.

Store:

- User original instruction
- Codex annotation
- Normalized task JSON
- Orchestrator decisions
- Agent prompts
- Agent responses
- Tool calls
- Commit hashes
- Test results
- Reviewer output
- Human comments
- Approval/rejection decision

Example event log:

```yaml
events:
  - timestamp: 2026-06-16T09:00:00+08:00
    type: task_created
    actor: codex_intake
    message: Task created from Codex annotation.

  - timestamp: 2026-06-16T09:04:00+08:00
    type: agent_started
    actor: orchestrator
    message: Assigned to Claude worker.

  - timestamp: 2026-06-16T09:22:00+08:00
    type: tests_passed
    actor: codex_worker
    message: npm test passed.

  - timestamp: 2026-06-16T09:28:00+08:00
    type: ai_review_completed
    actor: reviewer_agent
    message: Review passed. Human approval recommended.
```

---

## 16. Database Model

Minimum tables:

### `projects`

```sql
id
name
slug
description
repo_provider
repo_owner
repo_name
default_branch
local_path
created_at
updated_at
```

### `project_context_files`

```sql
id
project_id
file_name
file_path
content
version
created_at
updated_at
```

### `tasks`

```sql
id
project_id
title
description
type
priority
status
assigned_agent
reviewer_agent
requires_human_review
branch_name
pr_url
created_from
created_at
updated_at
```

### `task_dependencies`

```sql
id
task_id
depends_on_task_id
created_at
```

### `task_events`

```sql
id
task_id
event_type
actor_type
actor_name
message
metadata_json
created_at
```

### `agent_runs`

```sql
id
task_id
agent_name
agent_type
status
prompt
response
started_at
completed_at
metadata_json
```

### `reviews`

```sql
id
task_id
reviewer_agent
result
summary
risks_json
tests_json
recommendation
created_at
```

### `approvals`

```sql
id
task_id
reviewer_name
status
comment
created_at
```

---

## 17. API Endpoints

### Project APIs

```http
GET /api/projects
POST /api/projects
GET /api/projects/:id
PATCH /api/projects/:id
DELETE /api/projects/:id
```

### Task APIs

```http
GET /api/tasks
POST /api/tasks
GET /api/tasks/:id
PATCH /api/tasks/:id
DELETE /api/tasks/:id
```

### Intake APIs

```http
POST /api/kavban/intake
POST /api/kavban/intake/codex
POST /api/kavban/intake/voice
POST /api/kavban/intake/telegram
```

### Orchestration APIs

```http
POST /api/tasks/:id/run
POST /api/tasks/:id/pause
POST /api/tasks/:id/retry
POST /api/tasks/:id/review
POST /api/tasks/:id/approve
POST /api/tasks/:id/reject
POST /api/tasks/:id/merge
```

### Event APIs

```http
GET /api/tasks/:id/events
GET /api/tasks/:id/agent-runs
GET /api/tasks/:id/reviews
```

---

## 18. UI Requirements

### Board View

Columns:

- Backlog
- Ready for Agent
- In Progress
- AI Review
- Fix Required
- Human Review
- Approved
- PR Created
- Done

### Card Detail View

Tabs:

1. Overview
2. Instructions
3. Context
4. Agent Run
5. Review
6. Files Changed
7. Chat History
8. GitHub / PR
9. Settings

### Project Settings View

Sections:

- Repo
- Agents
- Context files
- Connections
- Review rules
- Merge rules
- Notifications
- Danger zone

---

## 19. Notifications

Support notification events for:

- Task created
- Agent started
- Agent failed
- AI review completed
- Human review needed
- PR created
- Merge completed
- Task blocked
- Dependency completed

Future channels:

- Telegram
- WhatsApp
- Email
- Slack
- Desktop notification

---

## 20. Security Rules

KAVBAN must be conservative by default.

### Agents Can

- Create branches
- Modify code in branches
- Run tests
- Create commits
- Open PRs
- Write review reports
- Comment on tasks

### Agents Cannot

- Push to main
- Merge PRs without approval
- Delete large parts of codebase
- Modify secrets
- Deploy production
- Change billing/payment logic without review
- Change auth/security logic without review
- Approve their own work

### Required Human Review

Always require human review for:

- Auth
- Payments
- Database migrations
- Infrastructure
- Secrets
- Production deploys
- Legal/compliance content
- User-facing financial or medical logic

---

## 21. Rollback and Safety

Every task should be reversible.

Required:

- Branch per task
- Commit history per task
- PR per task
- One-click reject
- One-click revert after merge
- Full event log
- Snapshot of original files before major edits
- Clear diff view

For rollback:

```text
If PR not merged:
  close PR
  delete branch if safe

If PR merged:
  create revert PR
  assign reviewer
  require human approval
```

---

## 22. MVP Scope

### MVP Goal

A usable KAVBAN system for one project, one repo, and two agents.

### MVP Features

- Fork or install Vibe Kanban
- Add project settings
- Add task schema extension
- Add Codex intake endpoint
- Add context pack files
- Add manual “Run Agent” button
- Add Claude worker
- Add Codex worker
- Add AI review button
- Add task event log
- Add GitHub PR creation
- Add human approve/reject
- Block direct merge to main

### MVP Non-Goals

Do not build yet:

- Full dependency graph UI
- Mobile app
- Voice input
- WhatsApp bot
- Multi-user permission system
- Advanced analytics
- Auto-deployment
- Complex non-code workflows

---

## 23. Phase Plan

## Phase 0 — Research Existing Vibe Kanban

Tasks:

- Clone Vibe Kanban
- Run locally
- Understand data model
- Understand task lifecycle
- Understand agent integration points
- Identify whether APIs/webhooks exist
- Identify where to extend cards
- Identify where to add custom task metadata

Deliverable:

```text
docs/vibe-kanban-analysis.md
```

---

## Phase 1 — KAVBAN Project Layer

Build:

- Project settings extension
- Context pack storage
- Repo configuration
- Agent routing settings
- Review rules

Deliverable:

```text
Each project has its own settings and context pack.
```

---

## Phase 2 — Task Normalizer

Build:

- Structured task schema
- Intake validation
- Task metadata fields
- Dependency field
- Agent assignment field
- Human-review flag

Deliverable:

```text
Raw instruction can become a valid KAVBAN task.
```

---

## Phase 3 — Codex Intake

Build:

- `POST /api/kavban/intake/codex`
- JSON schema validation
- Project matching
- Card creation
- Error handling
- Logging

Deliverable:

```text
Codex annotations can create cards automatically.
```

---

## Phase 4 — Orchestrator v1

Build:

- Manual Run button
- Task lock
- Branch creation
- Context pack assembly
- Agent prompt creation
- Agent run logging
- Test command execution
- Status updates

Deliverable:

```text
One task can be run by one selected agent from the board.
```

---

## Phase 5 — AI Review

Build:

- Reviewer agent worker
- Diff extraction
- Test result summary
- Review checklist injection
- Reviewer report
- Pass/fail/needs-human status

Deliverable:

```text
Every completed agent task receives an AI review.
```

---

## Phase 6 — Human Review and PR Flow

Build:

- Human review column
- Approve/reject/request changes
- PR link
- Merge guard
- Re-run agent on requested changes

Deliverable:

```text
No task reaches main without approval.
```

---

## Phase 7 — Dependencies and Parallel Execution

Build:

- Dependency validation
- Parallel task execution
- Blocked state
- Auto-unblock when dependencies complete
- Worker queue

Deliverable:

```text
Independent tasks run in parallel. Dependent tasks wait.
```

---

## Phase 8 — Broader Rocky Integration

Build:

- Voice-to-task
- Telegram-to-task
- Web annotation-to-task
- Email-to-task
- Rocky command interface

Deliverable:

```text
Rocky can create and manage KAVBAN tasks.
```

---

## 24. Prompt Templates

### Agent Execution Prompt

```text
You are working on KAVBAN task {{task_id}} for project {{project_name}}.

Objective:
{{task_title}}

Detailed instruction:
{{task_description}}

Project context:
{{context_pack}}

Rules:
- Work only on the assigned branch.
- Do not push to main.
- Do not modify secrets.
- Keep the change focused.
- Run the required tests.
- Explain files changed.
- If unsure, stop and request human review.

Expected output:
1. Summary of changes
2. Files changed
3. Tests run
4. Risks
5. Next steps
```

### Reviewer Prompt

```text
You are the AI reviewer for KAVBAN task {{task_id}}.

Review the completed changes against:

1. Original task
2. Project context
3. Coding rules
4. Review checklist
5. Git diff
6. Test results

Return:

- PASS, FAIL, or NEEDS_HUMAN
- Summary
- Issues found
- Risk level
- Required fixes
- Whether human approval is required
```

### Codex Intake Prompt

```text
Convert the user annotation into a KAVBAN task.

Return only valid JSON.

Fields:
- project
- title
- description
- type
- priority
- suggested_agent
- requires_human_review
- dependencies
- context_tags

Do not write prose outside the JSON.
```

---

## 25. Example End-to-End Task

User says in Codex:

```text
Add a daily health summary widget to Rocky showing sleep, glucose, food, and workout status.
```

Codex outputs:

```json
{
  "project": "rocky",
  "title": "Add daily health summary widget",
  "description": "Create a dashboard widget that summarizes sleep, glucose, food, and workout status for the current day.",
  "type": "feature",
  "priority": "medium",
  "suggested_agent": "claude",
  "requires_human_review": true,
  "dependencies": [],
  "context_tags": ["dashboard", "health", "ui"]
}
```

KAVBAN:

1. Creates card in Rocky board.
2. Assigns Claude.
3. Creates branch.
4. Injects Rocky context pack.
5. Claude implements.
6. Tests run.
7. Codex reviewer checks.
8. Human reviews UI.
9. PR is merged.
10. Card moves to Done.

---

## 26. Build Stack Recommendation

Suggested stack if extending Vibe Kanban:

- Base: Vibe Kanban
- Backend: existing Vibe Kanban backend where possible
- Orchestrator: separate service
- DB: PostgreSQL or SQLite for local-first MVP
- Queue: BullMQ / Redis, or simple DB-backed queue for MVP
- GitHub: GitHub API
- Agents:
  - Claude Code
  - Codex
  - Gemini CLI optional
- Runtime:
  - Local machine first
  - Later Docker workers
- Logs:
  - Database task events
  - File-based raw logs for debugging

---

## 27. Local-First Design

For your use case, KAVBAN should be local-first.

Why:

- Your projects live on your machine
- Rocky is intended to run locally
- Agent SDKs often need local repo access
- Safer for secrets
- Faster iteration
- Easier to inspect changes

Recommended:

```text
KAVBAN UI: localhost
Orchestrator: localhost
Workers: local processes
Repos: local folders
GitHub: remote sync only
```

Later, add cloud mode.

---

## 28. Naming

Working name:

```text
KAVBAN
```

Meaning:

```text
Kavin + Kanban
```

Alternative product names:

- AgentBoard
- ShipBoard
- TaskForge
- Rocky Board
- AgentOps Board
- AutoKanban

Keep KAVBAN for internal build.

---

## 29. Success Criteria

KAVBAN is successful when:

- You can speak or type a task once
- It lands in the right project board
- It gets the right context automatically
- The correct agent starts work
- Independent tasks run in parallel
- Dependent tasks wait
- AI reviewer checks the work
- Human only reviews important decisions
- PR is created safely
- Main is never touched without approval
- Every decision and chat is logged

---

## 30. First 10 Build Tasks

1. Clone and run Vibe Kanban locally.
2. Document Vibe Kanban architecture.
3. Identify task/card model.
4. Add KAVBAN metadata to cards.
5. Create project context pack folder structure.
6. Create Codex intake JSON schema.
7. Build `/api/kavban/intake/codex`.
8. Build manual task runner button.
9. Build simple Claude worker.
10. Build AI reviewer report panel.

---

## 31. Key Principle

Do not build a fancy board first.

Build the agent workflow first.

The board is only the interface.

The real value is:

```text
Task
  +
Correct context
  +
Right agent
  +
Safe execution
  +
Independent review
  +
Human approval
  +
Controlled merge
```

That is KAVBAN.
