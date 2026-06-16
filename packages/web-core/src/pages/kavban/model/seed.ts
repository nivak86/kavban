import type {
  KavbanAgent,
  KavbanAgentId,
  KavbanAgentRouting,
  KavbanConnectorId,
  KavbanInboxItem,
  KavbanProfile,
  KavbanProject,
  KavbanTask,
  KavbanWorkflowColumn,
} from './types';

export const kavbanAgents: Record<KavbanAgentId, KavbanAgent> = {
  codex: {
    id: 'codex',
    name: 'Codex',
    initials: 'CX',
    color: '#d7e3ff',
    role: 'Backend, tests, intake normalization, and reviews.',
  },
  claude: {
    id: 'claude',
    name: 'Claude',
    initials: 'CL',
    color: '#f3cfa8',
    role: 'UI, product logic, long-context reasoning, and documentation.',
  },
  reviewer: {
    id: 'reviewer',
    name: 'Reviewer',
    initials: 'RV',
    color: '#d6cdfd',
    role: 'Independent review and merge-gate checks.',
  },
};

export const kavbanDefaultAgentRouting: KavbanAgentRouting = {
  defaultAgentId: 'codex',
  uiAgentId: 'claude',
  codeAgentId: 'codex',
  reviewerAgentId: 'reviewer',
  humanReviewRequired: true,
};

export const kavbanWorkflowColumns: KavbanWorkflowColumn[] = [
  {
    id: 'backlog',
    label: 'Backlog',
    iconKey: 'tray',
    color: '#7b818d',
  },
  {
    id: 'ready',
    label: 'Ready for Agent',
    iconKey: 'lightning',
    color: '#f2d14b',
  },
  {
    id: 'progress',
    label: 'In Progress',
    iconKey: 'circle',
    color: '#f2d14b',
  },
  {
    id: 'ai-review',
    label: 'AI Review',
    iconKey: 'magic-wand',
    color: '#6aa7ff',
  },
  {
    id: 'human-review',
    label: 'Human Review',
    iconKey: 'shield-check',
    color: '#f26d6d',
  },
  {
    id: 'done',
    label: 'Done',
    iconKey: 'check-circle',
    color: '#58b957',
  },
];

export const kavbanConnectorOrder: KavbanConnectorId[] = [
  'github',
  'codex',
  'claude',
];

const projectTasks: KavbanTask[] = [
  {
    id: 'kav-000121',
    key: 'KAV-121',
    title: 'Capture Codex annotation payloads',
    description:
      'Accept structured task payloads from Codex and preserve the raw instruction for traceability.',
    status: 'backlog',
    state: 'Draft',
    priority: 'Medium',
    agentId: 'codex',
    reviewerId: 'reviewer',
    tags: [
      { label: 'Intake', color: '#6aa7ff' },
      { label: 'API', color: '#78d16d' },
    ],
    dependencies: [],
    contextFiles: ['kavban.project.md', 'coding-rules.md'],
    events: [
      {
        id: 'evt-kav-121-created',
        kind: 'task-created',
        actor: 'system',
        summary: 'Task created from Codex annotation draft.',
        createdAt: '2026-06-16T09:00:00.000Z',
      },
    ],
  },
  {
    id: 'kav-000122',
    key: 'KAV-122',
    title: 'Create project context pack editor',
    description:
      'Add a project settings surface where the brief, repo, connectors, agents, and review rules can be edited.',
    status: 'ready',
    state: 'Ready',
    priority: 'High',
    agentId: 'claude',
    reviewerId: 'codex',
    branch: 'kav/kav-000122-context-pack',
    tags: [
      { label: 'Project', color: '#f2d14b' },
      { label: 'Settings', color: '#6aa7ff' },
    ],
    dependencies: [],
    contextFiles: ['architecture.md', 'connections.md'],
    events: [
      {
        id: 'evt-kav-122-normalized',
        kind: 'context-attached',
        actor: 'claude',
        summary: 'Project settings were normalized for the mock workflow.',
        createdAt: '2026-06-16T09:10:00.000Z',
      },
    ],
  },
  {
    id: 'kav-000123',
    key: 'KAV-123',
    title: 'Run agent with selected context files',
    description:
      'Build a manual run surface that locks a task, creates a branch, assembles context, and starts the selected agent.',
    status: 'progress',
    state: 'Working...',
    priority: 'High',
    agentId: 'codex',
    reviewerId: 'reviewer',
    branch: 'kav/kav-000123-run-agent',
    pr: '#55234',
    testStatus: 'passed',
    tags: [
      { label: 'Orchestrator', color: '#78d16d' },
      { label: 'Codex', color: '#f2d14b' },
    ],
    dependencies: ['KAV-122'],
    contextFiles: ['agent-rules.md', 'review-checklist.md'],
    agentRuns: [
      {
        id: 'run-kav-000123-seed',
        agentId: 'codex',
        status: 'completed',
        branch: 'kav/kav-000123-run-agent',
        contextFiles: ['agent-rules.md', 'review-checklist.md'],
        prompt:
          'Project: Kavban\nRepository: nivak86/kavban\nTask: KAV-123 Run agent with selected context files\nBranch: kav/kav-000123-run-agent\nAssigned agent: Codex\nPriority: High\n\nInstructions:\nBuild a manual run surface that locks a task, creates a branch, assembles context, and starts the selected agent.\n\nContext files:\n- agent-rules.md\n- review-checklist.md',
        checks: [
          {
            id: 'chk-kav-000123-seed',
            command: 'pnpm test',
            status: 'passed',
            output: 'pnpm test passed.',
            createdAt: '2026-06-16T09:24:00.000Z',
          },
        ],
        createdAt: '2026-06-16T09:20:00.000Z',
        updatedAt: '2026-06-16T09:24:00.000Z',
      },
    ],
    events: [
      {
        id: 'evt-kav-123-started',
        kind: 'agent-started',
        actor: 'codex',
        summary: 'Codex started branch kav/kav-000123-run-agent.',
        createdAt: '2026-06-16T09:20:00.000Z',
      },
      {
        id: 'evt-kav-123-context',
        kind: 'context-attached',
        actor: 'system',
        summary: 'Context pack assembled with 6 files.',
        createdAt: '2026-06-16T09:21:00.000Z',
      },
      {
        id: 'evt-kav-123-tests',
        kind: 'tests-passed',
        actor: 'system',
        summary: 'pnpm test passed.',
        createdAt: '2026-06-16T09:24:00.000Z',
      },
    ],
  },
  {
    id: 'kav-000124',
    key: 'KAV-124',
    title: 'Review diff before human approval',
    description:
      'Use an independent reviewer agent to inspect the diff, tests, security risk, and task compliance.',
    status: 'ai-review',
    state: 'AI review',
    priority: 'Medium',
    agentId: 'claude',
    reviewerId: 'codex',
    branch: 'kav/kav-000124-ai-review',
    pr: '#55249',
    testStatus: 'passed',
    reviewStatus: 'changes-requested',
    tags: [
      { label: 'Review', color: '#6aa7ff' },
      { label: 'Safety', color: '#f26d6d' },
    ],
    dependencies: [],
    contextFiles: ['review-checklist.md'],
    reviewReports: [
      {
        id: 'review-kav-000124-seed',
        reviewerId: 'codex',
        status: 'changes-requested',
        summary:
          'Codex reviewer requested a smaller diff and clearer test evidence before human approval.',
        risk: 'medium',
        checks: [
          'Diff scope needs one follow-up pass.',
          'Test command must be attached to the run log.',
          'Security-sensitive files were not modified.',
        ],
        createdAt: '2026-06-16T09:34:00.000Z',
      },
    ],
    events: [
      {
        id: 'evt-kav-124-review',
        kind: 'review-started',
        actor: 'codex',
        summary: 'Reviewer is checking diff scope and test output.',
        createdAt: '2026-06-16T09:30:00.000Z',
      },
      {
        id: 'evt-kav-124-review-completed',
        kind: 'ai-review-completed',
        actor: 'codex',
        summary: 'Codex completed AI review with changes-requested.',
        createdAt: '2026-06-16T09:34:00.000Z',
      },
    ],
  },
  {
    id: 'kav-000125',
    key: 'KAV-125',
    title: 'Require human gate before merge',
    description:
      'Block merge actions until a human approves production logic, auth, payments, migrations, or secrets-related work.',
    status: 'human-review',
    state: 'Needs human',
    priority: 'High',
    agentId: 'codex',
    reviewerId: 'reviewer',
    branch: 'kav/kav-000125-human-gate',
    pr: '#55423',
    approvalStatus: 'pending',
    tags: [
      { label: 'GitHub', color: '#78d16d' },
      { label: 'Gate', color: '#f26d6d' },
    ],
    dependencies: ['KAV-124'],
    contextFiles: ['connections.md', 'review-checklist.md'],
    events: [
      {
        id: 'evt-kav-125-approval',
        kind: 'approval-needed',
        actor: 'reviewer',
        summary: 'AI review passed. Human approval is now required.',
        createdAt: '2026-06-16T09:40:00.000Z',
      },
    ],
  },
  {
    id: 'kav-000126',
    key: 'KAV-126',
    title: 'Create PR event log',
    description:
      'Record branch, commit, PR, reviewer output, and approval decisions against the task history.',
    status: 'done',
    state: 'PR created',
    priority: 'Low',
    agentId: 'codex',
    reviewerId: 'reviewer',
    branch: 'kav/kav-000126-event-log',
    pr: '#55449',
    tags: [
      { label: 'Events', color: '#6aa7ff' },
      { label: 'Git', color: '#78d16d' },
    ],
    dependencies: [],
    contextFiles: ['task-history.md'],
    events: [
      {
        id: 'evt-kav-126-pr',
        kind: 'pr-opened',
        actor: 'github',
        summary: 'Draft PR opened and linked to the task.',
        createdAt: '2026-06-16T09:50:00.000Z',
      },
    ],
  },
];

export const kavbanProject: KavbanProject = {
  id: 'kavban-core',
  name: 'Kavban Core',
  brief:
    'KAVBAN turns every project card into an executable AI task. It should route work to Codex or Claude, attach project context, create a safe branch, require independent AI review, and block merges until human approval.',
  repository: {
    provider: 'github',
    owner: 'nivak86',
    name: 'kavban',
    defaultBranch: 'main',
    localPath: '/Users/kavinbakhda/Desktop/KAVBAN',
  },
  agentRouting: kavbanDefaultAgentRouting,
  workflowColumns: kavbanWorkflowColumns,
  contextFiles: [
    {
      path: 'kavban.project.md',
      purpose: 'Product and operating spec',
      injected: true,
    },
    {
      path: 'architecture.md',
      purpose: 'System map and implementation notes',
      injected: true,
    },
    {
      path: 'review-checklist.md',
      purpose: 'AI and human review criteria',
      injected: true,
    },
  ],
  connectors: {
    github: {
      id: 'github',
      name: 'GitHub',
      description: 'Create branches, open PRs, and sync review state.',
      status: 'nivak86/kavban',
      connected: true,
    },
    codex: {
      id: 'codex',
      name: 'Codex',
      description:
        'Backend, tests, refactors, intake normalization, and reviews.',
      status: 'Ready',
      connected: true,
    },
    claude: {
      id: 'claude',
      name: 'Claude',
      description:
        'UI, product logic, long-context reasoning, and documentation.',
      status: 'Needs auth',
      connected: false,
    },
  },
  tasks: projectTasks,
};

export const kavbanInboxItems: KavbanInboxItem[] = [
  {
    id: 'inbox-1',
    title: 'Codex annotation created KAV-123',
    source: 'Codex added task to Kavban Core',
    time: '8m',
    taskKey: 'KAV-123',
    status: 'Ready to run',
    kind: 'codex',
  },
  {
    id: 'inbox-2',
    title: 'Claude completed context pack copy',
    source: 'Claude finished KAV-122',
    time: '1h',
    taskKey: 'KAV-122',
    status: 'Review suggested',
    kind: 'claude',
  },
  {
    id: 'inbox-3',
    title: 'Human approval needed for merge gate',
    source: 'AI reviewer flagged KAV-125',
    time: '4h',
    taskKey: 'KAV-125',
    status: 'Needs decision',
    kind: 'approval',
  },
  {
    id: 'inbox-4',
    title: 'GitHub connector refreshed',
    source: 'Repository status updated',
    time: '1d',
    taskKey: 'KAV-GH',
    status: 'Connected',
    kind: 'github',
  },
];

export const kavbanProfile: KavbanProfile = {
  id: 'profile-kavin',
  name: 'kavin',
  displayName: 'Kavin Bakhda',
  role: 'Local operator for Kavban Core',
  defaultAgentId: 'codex',
  reviewerAgentId: 'codex',
  humanGate: 'Always on',
};
