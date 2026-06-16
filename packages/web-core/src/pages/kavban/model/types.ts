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
  | 'task-updated'
  | 'task-status-changed'
  | 'agent-started'
  | 'context-attached'
  | 'review-started'
  | 'approval-needed'
  | 'pr-opened';

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
  actor: KavbanAgentId | 'github' | 'human' | 'system';
  summary: string;
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
};
