export type KavbanTaskStatus =
  | 'backlog'
  | 'ready'
  | 'progress'
  | 'ai-review'
  | 'human-review'
  | 'done';

export type KavbanTaskPriority = 'High' | 'Medium' | 'Low';

export type KavbanConnectorId = 'github' | 'codex' | 'claude';

export type KavbanAgentId = 'codex' | 'claude' | 'reviewer';

export type KavbanWorkflowIconKey =
  | 'tray'
  | 'lightning'
  | 'circle'
  | 'magic-wand'
  | 'shield-check'
  | 'check-circle';

export type KavbanInboxKind = 'codex' | 'claude' | 'approval' | 'github';

export type KavbanTaskEventKind =
  | 'task-created'
  | 'task-imported'
  | 'task-locked'
  | 'task-unlocked'
  | 'task-updated'
  | 'task-status-changed'
  | 'agent-started'
  | 'context-attached'
  | 'tests-passed'
  | 'tests-failed'
  | 'review-started'
  | 'ai-review-completed'
  | 'approval-needed'
  | 'human-approved'
  | 'changes-requested'
  | 'task-commented'
  | 'pr-opened'
  | 'merge-completed'
  | 'rollback-opened';

export type KavbanNotificationEventKind = Extract<
  KavbanTaskEventKind,
  | 'task-created'
  | 'task-imported'
  | 'task-locked'
  | 'task-unlocked'
  | 'agent-started'
  | 'tests-failed'
  | 'ai-review-completed'
  | 'approval-needed'
  | 'changes-requested'
  | 'pr-opened'
  | 'merge-completed'
  | 'rollback-opened'
>;

export type KavbanNotificationSettings = Record<
  KavbanNotificationEventKind,
  boolean
>;

export type KavbanRepository = {
  provider: 'github';
  owner: string;
  name: string;
  defaultBranch: string;
  localPath?: string;
};

export type KavbanAgent = {
  id: KavbanAgentId;
  name: string;
  initials: string;
  color: string;
  role: string;
};

export type KavbanAgentRouting = {
  defaultAgentId: KavbanAgentId;
  uiAgentId: KavbanAgentId;
  codeAgentId: KavbanAgentId;
  reviewerAgentId: KavbanAgentId;
  humanReviewRequired: boolean;
};

export type KavbanTag = {
  label: string;
  color: string;
};

export type KavbanContextFile = {
  path: string;
  purpose: string;
  injected: boolean;
};

export type KavbanTaskEvent = {
  id: string;
  kind: KavbanTaskEventKind;
  actor: KavbanAgentId | 'github' | 'human' | 'system' | 'codex_intake';
  summary: string;
  createdAt: string;
};

export type KavbanTaskIntake = {
  source: 'codex_annotation';
  project?: string;
  taskType?: string;
  contextTags: string[];
  rawPayload: string;
  importedAt: string;
};

export type KavbanAgentRunStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed';

export type KavbanCheckStatus = 'passed' | 'failed';

export type KavbanAgentRunLogLevel = 'info' | 'success' | 'warning' | 'error';

export type KavbanAgentRunLog = {
  id: string;
  level: KavbanAgentRunLogLevel;
  message: string;
  createdAt: string;
};

export type KavbanRunCheck = {
  id: string;
  command: string;
  status: KavbanCheckStatus;
  output: string;
  createdAt: string;
};

export type KavbanAgentRun = {
  id: string;
  agentId: KavbanAgentId;
  status: KavbanAgentRunStatus;
  branch: string;
  contextFiles: string[];
  prompt: string;
  checks?: KavbanRunCheck[];
  logs?: KavbanAgentRunLog[];
  createdAt: string;
  updatedAt: string;
};

export type KavbanReviewStatus = 'passed' | 'changes-requested' | 'needs-human';

export type KavbanApprovalStatus = 'pending' | 'approved' | 'changes-requested';

export type KavbanReviewReport = {
  id: string;
  reviewerId: KavbanAgentId;
  status: KavbanReviewStatus;
  summary: string;
  risk: 'low' | 'medium' | 'high';
  checks: string[];
  createdAt: string;
};

export type KavbanTaskComment = {
  id: string;
  actor: KavbanAgentId | 'human';
  body: string;
  createdAt: string;
};

export type KavbanTask = {
  id: string;
  key: string;
  title: string;
  description: string;
  status: KavbanTaskStatus;
  state: string;
  priority: KavbanTaskPriority;
  agentId: KavbanAgentId;
  reviewerId: KavbanAgentId;
  requiresHumanReview?: boolean;
  branch?: string;
  pr?: string;
  tags: KavbanTag[];
  dependencies: string[];
  contextFiles: string[];
  intake?: KavbanTaskIntake;
  lockedBy?: KavbanAgentId;
  lockedAt?: string;
  lockRunId?: string;
  lockReason?: string;
  agentRuns?: KavbanAgentRun[];
  testStatus?: KavbanCheckStatus | 'not-run';
  reviewReports?: KavbanReviewReport[];
  reviewStatus?: KavbanReviewStatus;
  approvalStatus?: KavbanApprovalStatus;
  mergedAt?: string;
  rollbackPr?: string;
  rollbackOpenedAt?: string;
  rolledBackAt?: string;
  comments?: KavbanTaskComment[];
  events: KavbanTaskEvent[];
};

export type KavbanWorkflowColumn = {
  id: KavbanTaskStatus;
  label: string;
  iconKey: KavbanWorkflowIconKey;
  color: string;
};

export type KavbanConnector = {
  id: KavbanConnectorId;
  name: string;
  description: string;
  status: string;
  connected: boolean;
};

export type KavbanProject = {
  id: string;
  name: string;
  brief: string;
  repository: KavbanRepository;
  agentRouting?: KavbanAgentRouting;
  workflowColumns: KavbanWorkflowColumn[];
  contextFiles: KavbanContextFile[];
  connectors: Record<KavbanConnectorId, KavbanConnector>;
  tasks: KavbanTask[];
};

export type KavbanInboxItem = {
  id: string;
  title: string;
  source: string;
  time: string;
  taskKey: string;
  status: string;
  kind: KavbanInboxKind;
};

export type KavbanProfile = {
  id: string;
  name: string;
  displayName: string;
  role: string;
  defaultAgentId: KavbanAgentId;
  reviewerAgentId: KavbanAgentId;
  humanGate: string;
  notifications: KavbanNotificationSettings;
};
