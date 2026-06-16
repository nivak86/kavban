import { useCallback, useEffect, useState } from 'react';
import {
  nowIso,
  readKavbanLocalState,
  writeKavbanLocalState,
  type KavbanLocalState,
} from './storage';
import { kavbanAgents, kavbanDefaultAgentRouting, kavbanProject } from './seed';
import type {
  KavbanAgentId,
  KavbanAgentRouting,
  KavbanApprovalStatus,
  KavbanCheckStatus,
  KavbanConnector,
  KavbanConnectorId,
  KavbanContextFile,
  KavbanProject,
  KavbanReviewStatus,
  KavbanTask,
  KavbanTaskEventKind,
  KavbanTaskIntake,
  KavbanTaskPriority,
  KavbanTaskStatus,
} from './types';

export type KavbanCreateTaskInput = {
  title: string;
  description: string;
  status: KavbanTaskStatus;
  priority: KavbanTaskPriority;
  agentId: KavbanAgentId;
  reviewerId: KavbanAgentId;
  requiresHumanReview: boolean;
  branch?: string;
  tagLabels: string[];
  dependencies: string[];
  contextFiles: string[];
};

export type KavbanCodexTaskPayload = Record<string, unknown>;

export type KavbanImportCodexTaskInput = {
  payload: KavbanCodexTaskPayload;
  rawPayload: string;
};

export type KavbanImportCodexTaskResult = {
  projectId: string;
  taskId: string;
};

export type KavbanUpdateTaskInput = KavbanCreateTaskInput;

export type KavbanRecordRunCheckInput = {
  status: KavbanCheckStatus;
  command?: string;
  output?: string;
};

export type KavbanRecordHumanReviewInput = {
  status: KavbanApprovalStatus;
  note?: string;
};

export type KavbanAddTaskCommentInput = {
  body: string;
};

export type KavbanContextFileInput = {
  path: string;
  purpose: string;
  injected: boolean;
};

export type KavbanRepositoryInput = {
  owner: string;
  name: string;
  defaultBranch: string;
  localPath: string;
};

export type KavbanAgentRoutingInput = KavbanAgentRouting;

const taskStateByStatus: Record<KavbanTaskStatus, string> = {
  backlog: 'Draft',
  ready: 'Ready',
  progress: 'Working...',
  'ai-review': 'AI review',
  'human-review': 'Needs human',
  done: 'Done',
};

const tagColors = ['#6aa7ff', '#78d16d', '#f2d14b', '#f26d6d', '#d6cdfd'];
const workerAgentIds: KavbanAgentId[] = ['codex', 'claude'];
const reviewerAgentIds: KavbanAgentId[] = ['reviewer', 'codex'];

function slugifyProjectName(name: string) {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'project'
  );
}

function normalizeLookupToken(value: string) {
  return slugifyProjectName(value).toLowerCase();
}

function createProjectFromSeed(name: string): KavbanProject {
  const slug = slugifyProjectName(name);
  const project = structuredClone(kavbanProject);

  return {
    ...project,
    id: `project-${slug}-${Date.now().toString(36)}`,
    name,
    brief: `${name} is a Kavban project. Add the brief, connect the repo, and define the agent context before moving tasks into Ready for Agent.`,
    connectors: {
      ...project.connectors,
      github: {
        ...project.connectors.github,
        connected: false,
        status: 'Choose repository',
      },
      claude: {
        ...project.connectors.claude,
        connected: false,
        status: 'Needs auth',
      },
      codex: {
        ...project.connectors.codex,
        connected: true,
        status: 'Ready',
      },
    },
    repository: {
      ...project.repository,
      name: slug,
    },
    tasks: [],
  };
}

function getNextTaskNumber(tasks: KavbanTask[]) {
  const highestNumber = tasks.reduce((highest, task) => {
    const number = Number(task.key.match(/^KAV-(\d+)$/)?.[1]);

    return Number.isFinite(number) ? Math.max(highest, number) : highest;
  }, 120);

  return highestNumber + 1;
}

function createBranchSlug(value: string) {
  return slugifyProjectName(value).slice(0, 48) || 'task';
}

function createTaskBranch(taskId: string, title: string) {
  return `kav/${taskId}-${createBranchSlug(title)}`;
}

function getTaskNumber(task: KavbanTask) {
  return Number(task.key.match(/^KAV-(\d+)$/)?.[1]) || 0;
}

function createTaskPrNumber(task: KavbanTask) {
  return `#${55000 + getTaskNumber(task)}`;
}

function createTaskRollbackPrNumber(task: KavbanTask) {
  return `#${65000 + getTaskNumber(task)}`;
}

function getTaskDependency(
  dependency: string,
  tasks: KavbanTask[]
): KavbanTask | undefined {
  return tasks.find(
    (task) => task.id === dependency || task.key === dependency
  );
}

function hasBlockingDependencies(task: KavbanTask, tasks: KavbanTask[]) {
  return task.dependencies.some((dependency) => {
    const dependencyTask = getTaskDependency(dependency, tasks);

    return !dependencyTask || dependencyTask.status !== 'done';
  });
}

function getTaskRunConnectorIds(task: KavbanTask): KavbanConnectorId[] {
  const agentConnectorId: KavbanConnectorId =
    task.agentId === 'claude' ? 'claude' : 'codex';

  return ['github', agentConnectorId];
}

function getMissingRunConnectorIds(project: KavbanProject, task: KavbanTask) {
  return getTaskRunConnectorIds(task).filter(
    (connectorId) => !project.connectors[connectorId]?.connected
  );
}

function getTaskContextFiles(
  project: KavbanProject,
  input: KavbanCreateTaskInput
) {
  if (input.contextFiles.length > 0) {
    return input.contextFiles;
  }

  return project.contextFiles
    .filter((file) => file.injected)
    .map((file) => file.path);
}

function getAgentRunContextFiles(project: KavbanProject, task: KavbanTask) {
  if (task.contextFiles.length > 0) {
    return task.contextFiles;
  }

  return project.contextFiles
    .filter((file) => file.injected)
    .map((file) => file.path);
}

function getLatestChangeRequest(task: KavbanTask) {
  const event = [...task.events]
    .reverse()
    .find((item) => item.kind === 'changes-requested');

  if (event) {
    return {
      summary: event.summary,
      createdAt: event.createdAt,
    };
  }

  const reviewReport = (task.reviewReports ?? []).find(
    (report) => report.status === 'changes-requested'
  );

  if (reviewReport) {
    return {
      summary: reviewReport.summary,
      createdAt: reviewReport.createdAt,
    };
  }

  return null;
}

function createAgentRunPrompt(
  project: KavbanProject,
  task: KavbanTask,
  branch: string,
  contextFiles: string[]
) {
  const repository = `${project.repository.owner}/${project.repository.name}`;
  const contextLines =
    contextFiles.length > 0
      ? contextFiles.map((file) => `- ${file}`)
      : ['- No context files selected.'];
  const changeRequest = getLatestChangeRequest(task);
  const reviewFeedbackLines = changeRequest
    ? ['', 'Review feedback:', `- ${changeRequest.summary}`]
    : [];

  return [
    `Project: ${project.name}`,
    `Repository: ${repository}`,
    `Task: ${task.key} ${task.title}`,
    `Branch: ${branch}`,
    `Assigned agent: ${kavbanAgents[task.agentId].name}`,
    `Priority: ${task.priority}`,
    '',
    'Instructions:',
    task.description,
    ...reviewFeedbackLines,
    '',
    'Context files:',
    ...contextLines,
    '',
    'Operating rules:',
    '- Keep the implementation scoped to this task.',
    '- Run the relevant checks before handing work back.',
    '- Record PR, review, and test outcomes on the task.',
  ].join('\n');
}

function normalizeContextFile(
  input: KavbanContextFileInput
): KavbanContextFile | null {
  const path = input.path.trim();

  if (!path) {
    return null;
  }

  return {
    path,
    purpose: input.purpose.trim() || 'Project context file',
    injected: input.injected,
  };
}

function normalizeRepository(input: KavbanRepositoryInput) {
  const owner = input.owner.trim();
  const name = input.name.trim();
  const defaultBranch = input.defaultBranch.trim();

  if (!owner || !name || !defaultBranch) {
    return null;
  }

  return {
    provider: 'github' as const,
    owner,
    name,
    defaultBranch,
    localPath: input.localPath.trim(),
  };
}

function getProjectAgentRouting(project: KavbanProject) {
  return project.agentRouting ?? kavbanDefaultAgentRouting;
}

function normalizeAgentRouting(input: KavbanAgentRoutingInput) {
  if (
    !workerAgentIds.includes(input.defaultAgentId) ||
    !workerAgentIds.includes(input.uiAgentId) ||
    !workerAgentIds.includes(input.codeAgentId) ||
    !reviewerAgentIds.includes(input.reviewerAgentId)
  ) {
    return null;
  }

  return {
    defaultAgentId: input.defaultAgentId,
    uiAgentId: input.uiAgentId,
    codeAgentId: input.codeAgentId,
    reviewerAgentId: input.reviewerAgentId,
    humanReviewRequired: input.humanReviewRequired,
  };
}

function replaceContextFilePath(paths: string[], from: string, to: string) {
  return Array.from(
    new Set(paths.map((path) => (path === from ? to : path)).filter(Boolean))
  );
}

function getPayloadString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function getPayloadStringList(value: unknown) {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .map((item) => getPayloadString(item))
          .filter((item) => item.length > 0)
      )
    );
  }

  const stringValue = getPayloadString(value);

  if (!stringValue) {
    return [];
  }

  return stringValue
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function getPayloadBoolean(value: unknown, fallback: boolean) {
  if (typeof value === 'boolean') {
    return value;
  }

  const stringValue = getPayloadString(value).toLowerCase();

  if (stringValue === 'true') {
    return true;
  }

  if (stringValue === 'false') {
    return false;
  }

  return fallback;
}

function normalizePayloadPriority(value: unknown): KavbanTaskPriority {
  const priority = getPayloadString(value).toLowerCase();

  if (priority === 'high') {
    return 'High';
  }

  if (priority === 'low') {
    return 'Low';
  }

  return 'Medium';
}

function normalizePayloadAgent(
  value: unknown,
  defaultAgentId: KavbanAgentId
): KavbanAgentId {
  const agentId = getPayloadString(value).toLowerCase();

  if (agentId === 'codex' || agentId === 'claude') {
    return agentId;
  }

  return defaultAgentId;
}

function getCodexPayloadContextTags(payload: KavbanCodexTaskPayload) {
  return getPayloadStringList(
    payload.context_tags ?? payload.contextTags ?? payload.context
  );
}

function getCodexPayloadContextFiles(payload: KavbanCodexTaskPayload) {
  return getPayloadStringList(payload.context_files ?? payload.contextFiles);
}

function findCodexTargetProject(
  projects: KavbanProject[],
  activeProjectId: string,
  projectValue: unknown
) {
  const requestedProject = getPayloadString(projectValue);
  const activeProject =
    projects.find((project) => project.id === activeProjectId) ?? projects[0];

  if (!requestedProject) {
    return activeProject;
  }

  const requestedToken = normalizeLookupToken(requestedProject);
  const matchedProject = projects.find((project) => {
    const candidates = [
      project.id,
      project.name,
      project.repository.name,
      `${project.repository.owner}/${project.repository.name}`,
    ];

    return candidates.some(
      (candidate) => normalizeLookupToken(candidate) === requestedToken
    );
  });

  return matchedProject ?? activeProject;
}

function normalizeCodexTaskPayload(
  project: KavbanProject,
  payload: KavbanCodexTaskPayload,
  rawPayload: string,
  importedAt: string
) {
  const title = getPayloadString(payload.title);

  if (!title) {
    return null;
  }

  const taskType = getPayloadString(payload.type);
  const contextTags = getCodexPayloadContextTags(payload);
  const projectRouting = getProjectAgentRouting(project);
  const tagLabels = Array.from(
    new Set([taskType, ...contextTags].filter(Boolean))
  );
  const rawPayloadValue =
    rawPayload.trim() || JSON.stringify(payload, null, 2);
  const intake: KavbanTaskIntake = {
    source: 'codex_annotation',
    project: getPayloadString(payload.project) || undefined,
    taskType: taskType || undefined,
    contextTags,
    rawPayload: rawPayloadValue,
    importedAt,
  };

  return {
    input: {
      title,
      description: getPayloadString(payload.description),
      status: 'backlog' as const,
      priority: normalizePayloadPriority(payload.priority),
      agentId: normalizePayloadAgent(
        payload.suggested_agent ?? payload.suggestedAgent,
        projectRouting.defaultAgentId
      ),
      reviewerId: projectRouting.reviewerAgentId,
      requiresHumanReview: getPayloadBoolean(
        payload.requires_human_review ?? payload.requiresHumanReview,
        projectRouting.humanReviewRequired
      ),
      tagLabels,
      dependencies: getPayloadStringList(payload.dependencies),
      contextFiles: getCodexPayloadContextFiles(payload),
    },
    intake,
  };
}

type CreateTaskFromInputOptions = {
  actor?: KavbanTask['events'][number]['actor'];
  createdAt?: string;
  eventKind?: KavbanTaskEventKind;
  eventSummary?: string;
  intake?: KavbanTaskIntake;
};

function createTaskFromInput(
  project: KavbanProject,
  input: KavbanCreateTaskInput,
  options?: CreateTaskFromInputOptions
): KavbanTask {
  const taskNumber = getNextTaskNumber(project.tasks);
  const taskKey = `KAV-${taskNumber}`;
  const taskId = `kav-${String(taskNumber).padStart(6, '0')}`;
  const createdAt = options?.createdAt ?? nowIso();
  const tagLabels =
    input.tagLabels.length > 0 ? input.tagLabels : ['Manual task'];

  return {
    id: taskId,
    key: taskKey,
    title: input.title,
    description:
      input.description ||
      'Task created manually. Add implementation notes before running an agent.',
    status: input.status,
    state: taskStateByStatus[input.status],
    priority: input.priority,
    agentId: input.agentId,
    reviewerId: input.reviewerId,
    requiresHumanReview: input.requiresHumanReview,
    branch: input.branch?.trim() || createTaskBranch(taskId, input.title),
    tags: tagLabels.map((label, index) => ({
      label,
      color: tagColors[index % tagColors.length],
    })),
    dependencies: input.dependencies,
    contextFiles: getTaskContextFiles(project, input),
    ...(options?.intake ? { intake: options.intake } : {}),
    events: [
      {
        id: `evt-${taskId}-created`,
        kind: options?.eventKind ?? 'task-created',
        actor: options?.actor ?? 'human',
        summary: options?.eventSummary ?? 'Task created manually in Kavban.',
        createdAt,
      },
    ],
  };
}

export function useKavbanLocalStore() {
  const [state, setState] = useState<KavbanLocalState>(readKavbanLocalState);
  const activeProject =
    state.projects.find((project) => project.id === state.activeProjectId) ??
    state.projects[0] ??
    kavbanProject;
  const activeProjectWithDefaults = {
    ...activeProject,
    agentRouting: getProjectAgentRouting(activeProject),
  };

  useEffect(() => {
    writeKavbanLocalState(state);
  }, [state]);

  const updateProjectBrief = useCallback((brief: string) => {
    setState((current) => ({
      ...current,
      projects: current.projects.map((project) =>
        project.id === current.activeProjectId ? { ...project, brief } : project
      ),
      updatedAt: nowIso(),
    }));
  }, []);

  const updateProjectRepository = useCallback(
    (input: KavbanRepositoryInput) => {
      const repository = normalizeRepository(input);

      if (!repository) {
        return false;
      }

      setState((current) => ({
        ...current,
        projects: current.projects.map((project) =>
          project.id === current.activeProjectId
            ? {
                ...project,
                repository,
                connectors: {
                  ...project.connectors,
                  github: {
                    ...project.connectors.github,
                    connected: true,
                    status: `${repository.owner}/${repository.name}`,
                  },
                },
              }
            : project
        ),
        updatedAt: nowIso(),
      }));

      return true;
    },
    []
  );

  const updateAgentRouting = useCallback((input: KavbanAgentRoutingInput) => {
    const agentRouting = normalizeAgentRouting(input);

    if (!agentRouting) {
      return false;
    }

    setState((current) => ({
      ...current,
      projects: current.projects.map((project) =>
        project.id === current.activeProjectId
          ? {
              ...project,
              agentRouting,
            }
          : project
      ),
      updatedAt: nowIso(),
    }));

    return true;
  }, []);

  const selectProject = useCallback((projectId: string) => {
    setState((current) => {
      if (!current.projects.some((project) => project.id === projectId)) {
        return current;
      }

      return {
        ...current,
        activeProjectId: projectId,
        updatedAt: nowIso(),
      };
    });
  }, []);

  const createProject = useCallback((name: string) => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      return;
    }

    const project = createProjectFromSeed(trimmedName);

    setState((current) => ({
      ...current,
      activeProjectId: project.id,
      projects: [...current.projects, project],
      updatedAt: nowIso(),
    }));
  }, []);

  const createContextFile = useCallback(
    (input: KavbanContextFileInput) => {
      const file = normalizeContextFile(input);

      if (
        !file ||
        activeProject.contextFiles.some(
          (contextFile) => contextFile.path === file.path
        )
      ) {
        return false;
      }

      setState((current) => ({
        ...current,
        projects: current.projects.map((project) =>
          project.id === current.activeProjectId
            ? {
                ...project,
                contextFiles: [...project.contextFiles, file],
              }
            : project
        ),
        updatedAt: nowIso(),
      }));

      return true;
    },
    [activeProject.contextFiles]
  );

  const updateContextFile = useCallback(
    (path: string, input: KavbanContextFileInput) => {
      const file = normalizeContextFile(input);

      if (
        !file ||
        !activeProject.contextFiles.some(
          (contextFile) => contextFile.path === path
        ) ||
        activeProject.contextFiles.some(
          (contextFile) =>
            contextFile.path !== path && contextFile.path === file.path
        )
      ) {
        return false;
      }

      setState((current) => ({
        ...current,
        projects: current.projects.map((project) =>
          project.id === current.activeProjectId
            ? {
                ...project,
                contextFiles: project.contextFiles.map((contextFile) =>
                  contextFile.path === path ? file : contextFile
                ),
                tasks: project.tasks.map((task) => ({
                  ...task,
                  contextFiles: replaceContextFilePath(
                    task.contextFiles,
                    path,
                    file.path
                  ),
                })),
              }
            : project
        ),
        updatedAt: nowIso(),
      }));

      return true;
    },
    [activeProject.contextFiles]
  );

  const deleteContextFile = useCallback(
    (path: string) => {
      if (
        !activeProject.contextFiles.some(
          (contextFile) => contextFile.path === path
        )
      ) {
        return false;
      }

      setState((current) => ({
        ...current,
        projects: current.projects.map((project) =>
          project.id === current.activeProjectId
            ? {
                ...project,
                contextFiles: project.contextFiles.filter(
                  (contextFile) => contextFile.path !== path
                ),
                tasks: project.tasks.map((task) => ({
                  ...task,
                  contextFiles: task.contextFiles.filter(
                    (contextFilePath) => contextFilePath !== path
                  ),
                })),
              }
            : project
        ),
        updatedAt: nowIso(),
      }));

      return true;
    },
    [activeProject.contextFiles]
  );

  const createTask = useCallback(
    (input: KavbanCreateTaskInput) => {
      const trimmedTitle = input.title.trim();

      if (!trimmedTitle) {
        return null;
      }

      const task = createTaskFromInput(activeProject, {
        ...input,
        title: trimmedTitle,
        description: input.description.trim(),
        branch: input.branch?.trim(),
        tagLabels: input.tagLabels.map((label) => label.trim()).filter(Boolean),
        dependencies: input.dependencies.filter(Boolean),
        contextFiles: input.contextFiles.filter(Boolean),
      });

      setState((current) => ({
        ...current,
        projects: current.projects.map((project) =>
          project.id === current.activeProjectId
            ? {
                ...project,
                tasks: [...project.tasks, task],
              }
            : project
        ),
        updatedAt: nowIso(),
      }));

      return task.id;
    },
    [activeProject]
  );

  const importCodexTask = useCallback(
    (input: KavbanImportCodexTaskInput): KavbanImportCodexTaskResult | null => {
      const targetProject = findCodexTargetProject(
        state.projects,
        state.activeProjectId,
        input.payload.project
      );
      const importedAt = nowIso();

      if (!targetProject) {
        return null;
      }

      const normalized = normalizeCodexTaskPayload(
        targetProject,
        input.payload,
        input.rawPayload,
        importedAt
      );

      if (!normalized) {
        return null;
      }

      const task = createTaskFromInput(targetProject, normalized.input, {
        actor: 'codex_intake',
        createdAt: importedAt,
        eventKind: 'task-imported',
        eventSummary: 'Task created from Codex annotation.',
        intake: normalized.intake,
      });

      setState((current) => ({
        ...current,
        activeProjectId: targetProject.id,
        projects: current.projects.map((project) =>
          project.id === targetProject.id
            ? {
                ...project,
                tasks: [...project.tasks, task],
              }
            : project
        ),
        updatedAt: importedAt,
      }));

      return {
        projectId: targetProject.id,
        taskId: task.id,
      };
    },
    [state.activeProjectId, state.projects]
  );

  const updateTask = useCallback(
    (taskId: string, input: KavbanUpdateTaskInput) => {
      const trimmedTitle = input.title.trim();

      if (
        !trimmedTitle ||
        !activeProject.tasks.some((task) => task.id === taskId)
      ) {
        return false;
      }

      const tagLabels = input.tagLabels
        .map((label) => label.trim())
        .filter(Boolean);
      const normalizedInput = {
        ...input,
        title: trimmedTitle,
        description: input.description.trim(),
        branch: input.branch?.trim(),
        tagLabels,
        dependencies: input.dependencies.filter(Boolean),
        contextFiles: input.contextFiles.filter(Boolean),
      };
      const updatedAt = nowIso();
      const eventId = `evt-${taskId}-updated-${Date.now().toString(36)}`;

      setState((current) => ({
        ...current,
        projects: current.projects.map((project) =>
          project.id === current.activeProjectId
            ? {
                ...project,
                tasks: project.tasks.map((task) =>
                  task.id === taskId
                    ? {
                        ...task,
                        title: normalizedInput.title,
                        description:
                          normalizedInput.description ||
                          'Task created manually. Add implementation notes before running an agent.',
                        status: normalizedInput.status,
                        state: taskStateByStatus[normalizedInput.status],
                        priority: normalizedInput.priority,
                        agentId: normalizedInput.agentId,
                        reviewerId: normalizedInput.reviewerId,
                        requiresHumanReview:
                          normalizedInput.requiresHumanReview,
                        branch: normalizedInput.branch || undefined,
                        dependencies: normalizedInput.dependencies,
                        tags: (normalizedInput.tagLabels.length > 0
                          ? normalizedInput.tagLabels
                          : ['Manual task']
                        ).map((label, index) => ({
                          label,
                          color: tagColors[index % tagColors.length],
                        })),
                        contextFiles: getTaskContextFiles(
                          project,
                          normalizedInput
                        ),
                        events: [
                          ...task.events,
                          {
                            id: eventId,
                            kind: 'task-updated',
                            actor: 'human',
                            summary: 'Task details updated manually.',
                            createdAt: updatedAt,
                          },
                        ],
                      }
                    : task
                ),
              }
            : project
        ),
        updatedAt,
      }));

      return true;
    },
    [activeProject]
  );

  const deleteTask = useCallback(
    (taskId: string) => {
      const taskToDelete = activeProject.tasks.find(
        (task) => task.id === taskId
      );

      if (!taskToDelete) {
        return false;
      }

      setState((current) => ({
        ...current,
        projects: current.projects.map((project) =>
          project.id === current.activeProjectId
            ? {
                ...project,
                tasks: project.tasks
                  .filter((task) => task.id !== taskId)
                  .map((task) => ({
                    ...task,
                    dependencies: task.dependencies.filter(
                      (dependency) =>
                        dependency !== taskToDelete.id &&
                        dependency !== taskToDelete.key
                    ),
                  })),
              }
            : project
        ),
        updatedAt: nowIso(),
      }));

      return true;
    },
    [activeProject]
  );

  const startAgentRun = useCallback(
    (taskId: string) => {
      const taskToRun = activeProject.tasks.find((task) => task.id === taskId);

      if (
        !taskToRun ||
        taskToRun.status === 'done' ||
        taskToRun.lockedBy ||
        getMissingRunConnectorIds(activeProject, taskToRun).length > 0 ||
        hasBlockingDependencies(taskToRun, activeProject.tasks)
      ) {
        return null;
      }

      const updatedAt = nowIso();
      const runId = `run-${taskId}-${Date.now().toString(36)}`;
      const branch =
        taskToRun.branch || createTaskBranch(taskToRun.id, taskToRun.title);
      const runContextFiles = getAgentRunContextFiles(activeProject, taskToRun);
      const changeRequest = getLatestChangeRequest(taskToRun);
      const run = {
        id: runId,
        agentId: taskToRun.agentId,
        status: 'running' as const,
        branch,
        contextFiles: runContextFiles,
        prompt: createAgentRunPrompt(
          activeProject,
          taskToRun,
          branch,
          runContextFiles
        ),
        checks: [],
        logs: [
          {
            id: `log-${runId}-lock`,
            level: 'info' as const,
            message: `Locked task for ${kavbanAgents[taskToRun.agentId].name}.`,
            createdAt: updatedAt,
          },
          {
            id: `log-${runId}-branch`,
            level: 'info' as const,
            message: `Created branch ${branch}.`,
            createdAt: updatedAt,
          },
          {
            id: `log-${runId}-context`,
            level: 'info' as const,
            message: `Attached ${runContextFiles.length} context files.`,
            createdAt: updatedAt,
          },
          {
            id: `log-${runId}-prompt`,
            level: 'info' as const,
            message: 'Generated execution prompt for the assigned agent.',
            createdAt: updatedAt,
          },
          ...(changeRequest
            ? [
                {
                  id: `log-${runId}-feedback`,
                  level: 'warning' as const,
                  message: `Review feedback attached: ${changeRequest.summary}`,
                  createdAt: updatedAt,
                },
              ]
            : []),
        ],
        createdAt: updatedAt,
        updatedAt,
      };

      setState((current) => ({
        ...current,
        projects: current.projects.map((project) =>
          project.id === current.activeProjectId
            ? {
                ...project,
                tasks: project.tasks.map((task) =>
                  task.id === taskId
                    ? {
                        ...task,
                        status: 'progress',
                        state: taskStateByStatus.progress,
                        branch,
                        lockedBy: task.agentId,
                        lockedAt: updatedAt,
                        lockRunId: runId,
                        lockReason: `Agent run ${runId} is in progress.`,
                        testStatus: 'not-run',
                        agentRuns: [run, ...(task.agentRuns ?? [])],
                        events: [
                          ...task.events,
                          {
                            id: `evt-${runId}-locked`,
                            kind: 'task-locked',
                            actor: 'system',
                            summary: `${kavbanAgents[task.agentId].name} locked task for execution.`,
                            createdAt: updatedAt,
                          },
                          {
                            id: `evt-${runId}-started`,
                            kind: 'agent-started',
                            actor: task.agentId,
                            summary: `${kavbanAgents[task.agentId].name} started branch ${branch}.`,
                            createdAt: updatedAt,
                          },
                          {
                            id: `evt-${runId}-context`,
                            kind: 'context-attached',
                            actor: 'system',
                            summary: `Context pack assembled with ${runContextFiles.length} files.`,
                            createdAt: updatedAt,
                          },
                        ],
                      }
                    : task
                ),
              }
            : project
        ),
        updatedAt,
      }));

      return runId;
    },
    [activeProject]
  );

  const recordAgentRunCheck = useCallback(
    (taskId: string, runId: string, input: KavbanRecordRunCheckInput) => {
      const taskToUpdate = activeProject.tasks.find(
        (task) => task.id === taskId
      );
      const runToUpdate = taskToUpdate?.agentRuns?.find(
        (run) => run.id === runId
      );

      if (!taskToUpdate || !runToUpdate) {
        return false;
      }

      const updatedAt = nowIso();
      const command = input.command?.trim() || 'pnpm test';
      const output =
        input.output?.trim() || `${command} ${input.status} from Kavban.`;
      const checkId = `chk-${runId}-${Date.now().toString(36)}`;
      const logId = `log-${checkId}`;
      const eventKind: KavbanTaskEventKind =
        input.status === 'passed' ? 'tests-passed' : 'tests-failed';
      const runStatus = input.status === 'passed' ? 'completed' : 'failed';
      const logLevel = input.status === 'passed' ? 'success' : 'error';
      const releasesCurrentLock = taskToUpdate.lockRunId === runId;

      setState((current) => ({
        ...current,
        projects: current.projects.map((project) =>
          project.id === current.activeProjectId
            ? {
                ...project,
                tasks: project.tasks.map((task) =>
                      task.id === taskId
                    ? {
                        ...task,
                        ...(releasesCurrentLock
                          ? {
                              lockedBy: undefined,
                              lockedAt: undefined,
                              lockRunId: undefined,
                              lockReason: undefined,
                            }
                          : {}),
                        testStatus: input.status,
                        agentRuns: task.agentRuns?.map((run) =>
                          run.id === runId
                            ? {
                                ...run,
                                status: runStatus,
                                checks: [
                                  {
                                    id: checkId,
                                    command,
                                    status: input.status,
                                    output,
                                    createdAt: updatedAt,
                                  },
                                  ...(run.checks ?? []),
                                ],
                                logs: [
                                  ...(run.logs ?? []),
                                  {
                                    id: logId,
                                    level: logLevel,
                                    message: `${command} ${input.status}: ${output}`,
                                    createdAt: updatedAt,
                                  },
                                ],
                                updatedAt,
                              }
                            : run
                        ),
                        events: [
                          ...task.events,
                          {
                            id: `evt-${checkId}`,
                            kind: eventKind,
                            actor: 'system',
                            summary: `${command} ${input.status}.`,
                            createdAt: updatedAt,
                          },
                          ...(releasesCurrentLock
                            ? [
                                {
                                  id: `evt-${checkId}-unlocked`,
                                  kind: 'task-unlocked' as const,
                                  actor: 'system' as const,
                                  summary: `Task lock released after ${runStatus} run.`,
                                  createdAt: updatedAt,
                                },
                              ]
                            : []),
                        ],
                      }
                    : task
                ),
              }
            : project
        ),
        updatedAt,
      }));

      return true;
    },
    [activeProject.tasks]
  );

  const createAiReview = useCallback(
    (taskId: string) => {
      const taskToReview = activeProject.tasks.find(
        (task) => task.id === taskId
      );

      if (!taskToReview || taskToReview.testStatus !== 'passed') {
        return null;
      }

      const updatedAt = nowIso();
      const reportId = `review-${taskId}-${Date.now().toString(36)}`;
      const reviewStatus: KavbanReviewStatus =
        taskToReview.requiresHumanReview === false ? 'passed' : 'needs-human';
      const nextStatus: KavbanTaskStatus =
        taskToReview.requiresHumanReview === false ? 'done' : 'human-review';
      const reviewer = kavbanAgents[taskToReview.reviewerId];
      const report = {
        id: reportId,
        reviewerId: taskToReview.reviewerId,
        status: reviewStatus,
        summary: `${reviewer.name} reviewed ${taskToReview.key}; tests passed and the branch is ready for ${
          nextStatus === 'done' ? 'completion' : 'human review'
        }.`,
        risk:
          taskToReview.priority === 'High'
            ? ('medium' as const)
            : ('low' as const),
        checks: [
          'Task instructions were matched against the implementation intent.',
          'Latest agent run has a passing check result.',
          'Context files and dependency blockers were reviewed.',
          'Branch scope is ready for the next approval step.',
        ],
        createdAt: updatedAt,
      };

      setState((current) => ({
        ...current,
        projects: current.projects.map((project) =>
          project.id === current.activeProjectId
            ? {
                ...project,
                tasks: project.tasks.map((task) =>
                  task.id === taskId
                    ? {
                        ...task,
                        status: nextStatus,
                        state: taskStateByStatus[nextStatus],
                        reviewStatus,
                        reviewReports: [report, ...(task.reviewReports ?? [])],
                        events: [
                          ...task.events,
                          {
                            id: `evt-${reportId}-started`,
                            kind: 'review-started',
                            actor: task.reviewerId,
                            summary: `${reviewer.name} started AI review.`,
                            createdAt: updatedAt,
                          },
                          {
                            id: `evt-${reportId}-completed`,
                            kind: 'ai-review-completed',
                            actor: task.reviewerId,
                            summary: `${reviewer.name} completed AI review with ${reviewStatus}.`,
                            createdAt: updatedAt,
                          },
                        ],
                      }
                    : task
                ),
              }
            : project
        ),
        updatedAt,
      }));

      return reportId;
    },
    [activeProject.tasks]
  );

  const recordHumanReview = useCallback(
    (taskId: string, input: KavbanRecordHumanReviewInput) => {
      const taskToReview = activeProject.tasks.find(
        (task) => task.id === taskId
      );

      if (!taskToReview || taskToReview.status !== 'human-review') {
        return false;
      }

      const updatedAt = nowIso();
      const approved = input.status === 'approved';
      const nextStatus: KavbanTaskStatus = approved
        ? 'human-review'
        : 'progress';
      const note =
        input.note?.trim() ||
        (approved
          ? 'Human approved the task for merge.'
          : 'Human requested changes from the assigned agent.');
      const eventKind: KavbanTaskEventKind = approved
        ? 'human-approved'
        : 'changes-requested';

      setState((current) => ({
        ...current,
        projects: current.projects.map((project) =>
          project.id === current.activeProjectId
            ? {
                ...project,
                tasks: project.tasks.map((task) =>
                  task.id === taskId
                    ? {
                        ...task,
                        status: nextStatus,
                        state: approved
                          ? 'Approved'
                          : taskStateByStatus[nextStatus],
                        approvalStatus: input.status,
                        reviewStatus: approved ? 'passed' : 'changes-requested',
                        events: [
                          ...task.events,
                          {
                            id: `evt-${taskId}-human-${Date.now().toString(36)}`,
                            kind: eventKind,
                            actor: 'human',
                            summary: note,
                            createdAt: updatedAt,
                          },
                        ],
                      }
                    : task
                ),
              }
            : project
        ),
        updatedAt,
      }));

      return true;
    },
    [activeProject.tasks]
  );

  const mergeTaskPullRequest = useCallback(
    (taskId: string) => {
      const taskToMerge = activeProject.tasks.find(
        (task) => task.id === taskId
      );

      const isRollbackMerge = Boolean(
        taskToMerge?.rollbackPr && !taskToMerge.rolledBackAt
      );
      const activePullRequest = isRollbackMerge
        ? taskToMerge?.rollbackPr
        : taskToMerge?.pr;

      if (
        !taskToMerge ||
        !activePullRequest ||
        taskToMerge.approvalStatus !== 'approved'
      ) {
        return false;
      }

      const updatedAt = nowIso();

      setState((current) => ({
        ...current,
        projects: current.projects.map((project) =>
          project.id === current.activeProjectId
            ? {
                ...project,
                tasks: project.tasks.map((task) =>
                  task.id === taskId
                    ? {
                        ...task,
                        status: 'done',
                        state: taskStateByStatus.done,
                        ...(isRollbackMerge
                          ? { rolledBackAt: updatedAt }
                          : { mergedAt: updatedAt }),
                        events: [
                          ...task.events,
                          {
                            id: `evt-${taskId}-merge-${Date.now().toString(36)}`,
                            kind: 'merge-completed',
                            actor: 'github',
                            summary: `${isRollbackMerge ? 'Rollback PR' : 'PR'} ${activePullRequest} merged into ${project.repository.defaultBranch}.`,
                            createdAt: updatedAt,
                          },
                        ],
                      }
                    : task
                ),
              }
            : project
        ),
        updatedAt,
      }));

      return true;
    },
    [activeProject.tasks]
  );

  const openRollbackPullRequest = useCallback(
    (taskId: string) => {
      const taskToRollback = activeProject.tasks.find(
        (task) => task.id === taskId
      );

      if (
        !taskToRollback ||
        !taskToRollback.mergedAt ||
        taskToRollback.rollbackPr
      ) {
        return null;
      }

      const updatedAt = nowIso();
      const rollbackPr = createTaskRollbackPrNumber(taskToRollback);

      setState((current) => ({
        ...current,
        projects: current.projects.map((project) =>
          project.id === current.activeProjectId
            ? {
                ...project,
                tasks: project.tasks.map((task) =>
                  task.id === taskId
                    ? {
                        ...task,
                        status: 'human-review',
                        state: 'Rollback review',
                        rollbackPr,
                        rollbackOpenedAt: updatedAt,
                        approvalStatus: 'pending',
                        reviewStatus: 'needs-human',
                        events: [
                          ...task.events,
                          {
                            id: `evt-${taskId}-rollback-${Date.now().toString(36)}`,
                            kind: 'rollback-opened',
                            actor: 'github',
                            summary: `Rollback PR ${rollbackPr} opened for ${task.pr ?? task.key}.`,
                            createdAt: updatedAt,
                          },
                        ],
                      }
                    : task
                ),
              }
            : project
        ),
        updatedAt,
      }));

      return rollbackPr;
    },
    [activeProject.tasks]
  );

  const openTaskPullRequest = useCallback(
    (taskId: string) => {
      const taskToOpen = activeProject.tasks.find((task) => task.id === taskId);

      if (!taskToOpen) {
        return null;
      }

      const updatedAt = nowIso();
      const branch =
        taskToOpen.branch || createTaskBranch(taskToOpen.id, taskToOpen.title);
      const pr = taskToOpen.pr || createTaskPrNumber(taskToOpen);

      setState((current) => ({
        ...current,
        projects: current.projects.map((project) =>
          project.id === current.activeProjectId
            ? {
                ...project,
                tasks: project.tasks.map((task) =>
                  task.id === taskId
                    ? {
                        ...task,
                        branch,
                        pr,
                        events: [
                          ...task.events,
                          {
                            id: `evt-${taskId}-pr-${Date.now().toString(36)}`,
                            kind: 'pr-opened',
                            actor: 'github',
                            summary: `Draft PR ${pr} opened from ${branch}.`,
                            createdAt: updatedAt,
                          },
                        ],
                      }
                    : task
                ),
              }
            : project
        ),
        updatedAt,
      }));

      return pr;
    },
    [activeProject.tasks]
  );

  const addTaskComment = useCallback(
    (taskId: string, input: KavbanAddTaskCommentInput) => {
      const body = input.body.trim();
      const taskToComment = activeProject.tasks.find(
        (task) => task.id === taskId
      );

      if (!taskToComment || !body) {
        return false;
      }

      const updatedAt = nowIso();
      const commentId = `comment-${taskId}-${Date.now().toString(36)}`;

      setState((current) => ({
        ...current,
        projects: current.projects.map((project) =>
          project.id === current.activeProjectId
            ? {
                ...project,
                tasks: project.tasks.map((task) =>
                  task.id === taskId
                    ? {
                        ...task,
                        comments: [
                          ...(task.comments ?? []),
                          {
                            id: commentId,
                            actor: 'human',
                            body,
                            createdAt: updatedAt,
                          },
                        ],
                        events: [
                          ...task.events,
                          {
                            id: `evt-${commentId}`,
                            kind: 'task-commented',
                            actor: 'human',
                            summary: `Comment added: ${body}`,
                            createdAt: updatedAt,
                          },
                        ],
                      }
                    : task
                ),
              }
            : project
        ),
        updatedAt,
      }));

      return true;
    },
    [activeProject.tasks]
  );

  const moveTask = useCallback(
    (taskId: string, status: KavbanTaskStatus) => {
      const taskToMove = activeProject.tasks.find((task) => task.id === taskId);

      if (!taskToMove || taskToMove.status === status) {
        return false;
      }

      const updatedAt = nowIso();
      const eventId = `evt-${taskId}-status-${Date.now().toString(36)}`;

      setState((current) => ({
        ...current,
        projects: current.projects.map((project) =>
          project.id === current.activeProjectId
            ? {
                ...project,
                tasks: project.tasks.map((task) =>
                  task.id === taskId
                    ? {
                        ...task,
                        status,
                        state: taskStateByStatus[status],
                        events: [
                          ...task.events,
                          {
                            id: eventId,
                            kind: 'task-status-changed',
                            actor: 'human',
                            summary: `Task moved from ${task.state} to ${taskStateByStatus[status]}.`,
                            createdAt: updatedAt,
                          },
                        ],
                      }
                    : task
                ),
              }
            : project
        ),
        updatedAt,
      }));

      return true;
    },
    [activeProject]
  );

  const updateConnector = useCallback(
    (
      connectorId: KavbanConnectorId,
      update: (connector: KavbanConnector) => KavbanConnector
    ) => {
      setState((current) => ({
        ...current,
        projects: current.projects.map((project) =>
          project.id === current.activeProjectId
            ? {
                ...project,
                connectors: {
                  ...project.connectors,
                  [connectorId]: update(project.connectors[connectorId]),
                },
              }
            : project
        ),
        updatedAt: nowIso(),
      }));
    },
    []
  );

  return {
    activeProjectId: state.activeProjectId,
    addTaskComment,
    createContextFile,
    createAiReview,
    createProject,
    createTask,
    deleteContextFile,
    deleteTask,
    importCodexTask,
    inboxItems: state.inboxItems,
    mergeTaskPullRequest,
    moveTask,
    openRollbackPullRequest,
    profile: state.profile,
    project: activeProjectWithDefaults,
    projects: state.projects,
    openTaskPullRequest,
    recordAgentRunCheck,
    recordHumanReview,
    selectProject,
    startAgentRun,
    state,
    updateAgentRouting,
    updateConnector,
    updateContextFile,
    updateProjectBrief,
    updateProjectRepository,
    updateTask,
  };
}
