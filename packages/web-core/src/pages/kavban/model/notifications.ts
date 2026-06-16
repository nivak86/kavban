import type {
  KavbanInboxItem,
  KavbanInboxKind,
  KavbanNotificationEventKind,
  KavbanNotificationSettings,
  KavbanProject,
  KavbanTask,
  KavbanTaskEvent,
} from './types';

export type KavbanNotificationRule = {
  kind: KavbanNotificationEventKind;
  label: string;
  description: string;
  inboxKind: KavbanInboxKind;
  status: string;
};

export const kavbanNotificationRules: KavbanNotificationRule[] = [
  {
    kind: 'task-created',
    label: 'Task created',
    description: 'New tasks from Codex, manual entry, or project intake.',
    inboxKind: 'codex',
    status: 'Created',
  },
  {
    kind: 'task-imported',
    label: 'Codex import',
    description: 'Structured Codex annotations added to the board.',
    inboxKind: 'codex',
    status: 'Imported',
  },
  {
    kind: 'task-locked',
    label: 'Task locked',
    description: 'An agent has claimed a task for execution.',
    inboxKind: 'codex',
    status: 'Locked',
  },
  {
    kind: 'task-unlocked',
    label: 'Task unlocked',
    description: 'An agent run completed or released a task lock.',
    inboxKind: 'codex',
    status: 'Unlocked',
  },
  {
    kind: 'agent-started',
    label: 'Agent started',
    description: 'Codex or Claude started working on a card.',
    inboxKind: 'claude',
    status: 'Running',
  },
  {
    kind: 'tests-failed',
    label: 'Checks failed',
    description: 'A run check failed and likely needs attention.',
    inboxKind: 'approval',
    status: 'Needs fix',
  },
  {
    kind: 'ai-review-completed',
    label: 'AI review completed',
    description: 'Reviewer output is ready to inspect.',
    inboxKind: 'approval',
    status: 'Reviewed',
  },
  {
    kind: 'approval-needed',
    label: 'Human approval needed',
    description: 'A merge or sensitive change is waiting on you.',
    inboxKind: 'approval',
    status: 'Needs decision',
  },
  {
    kind: 'changes-requested',
    label: 'Changes requested',
    description: 'A reviewer or human asked the agent for follow-up work.',
    inboxKind: 'approval',
    status: 'Changes requested',
  },
  {
    kind: 'pr-opened',
    label: 'Pull request opened',
    description: 'A task branch has a linked GitHub pull request.',
    inboxKind: 'github',
    status: 'PR opened',
  },
  {
    kind: 'merge-completed',
    label: 'Merge completed',
    description: 'Approved work has merged safely.',
    inboxKind: 'github',
    status: 'Merged',
  },
  {
    kind: 'rollback-opened',
    label: 'Rollback opened',
    description: 'A revert pull request has been created after merge.',
    inboxKind: 'github',
    status: 'Rollback',
  },
];

export function getKavbanDefaultNotificationSettings(): KavbanNotificationSettings {
  return kavbanNotificationRules.reduce((settings, rule) => {
    settings[rule.kind] = true;

    return settings;
  }, {} as KavbanNotificationSettings);
}

export function normalizeKavbanNotificationSettings(
  settings?: Partial<KavbanNotificationSettings>
): KavbanNotificationSettings {
  const normalized = getKavbanDefaultNotificationSettings();

  kavbanNotificationRules.forEach((rule) => {
    const enabled = settings?.[rule.kind];

    if (typeof enabled === 'boolean') {
      normalized[rule.kind] = enabled;
    }
  });

  return normalized;
}

function getRule(kind: KavbanNotificationEventKind) {
  return kavbanNotificationRules.find((rule) => rule.kind === kind);
}

function formatInboxTime(value: string) {
  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    return 'now';
  }

  const elapsedMinutes = Math.max(
    0,
    Math.floor((Date.now() - timestamp) / 60000)
  );

  if (elapsedMinutes < 1) {
    return 'now';
  }

  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}m`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);

  if (elapsedHours < 24) {
    return `${elapsedHours}h`;
  }

  return `${Math.floor(elapsedHours / 24)}d`;
}

function createInboxItemFromEvent(
  project: KavbanProject,
  task: KavbanTask,
  event: KavbanTaskEvent
): KavbanInboxItem | null {
  const rule = getRule(event.kind as KavbanNotificationEventKind);

  if (!rule) {
    return null;
  }

  return {
    id: `notification-${event.id}`,
    kind: rule.inboxKind,
    source: `${project.name} - ${event.summary}`,
    status: rule.status,
    taskKey: task.key,
    time: formatInboxTime(event.createdAt),
    title: `${rule.label} for ${task.key}`,
  };
}

export function createKavbanInboxNotifications({
  manualItems,
  projects,
  settings,
}: {
  manualItems: KavbanInboxItem[];
  projects: KavbanProject[];
  settings: KavbanNotificationSettings;
}) {
  const eventItems = projects
    .flatMap((project) =>
      project.tasks.flatMap((task) =>
        task.events.map((event) => ({ event, project, task }))
      )
    )
    .filter(({ event }) => settings[event.kind as KavbanNotificationEventKind])
    .sort(
      (first, second) =>
        Date.parse(second.event.createdAt) - Date.parse(first.event.createdAt)
    )
    .map(({ event, project, task }) =>
      createInboxItemFromEvent(project, task, event)
    )
    .filter((item): item is KavbanInboxItem => Boolean(item));

  return [...eventItems, ...manualItems].slice(0, 40);
}
