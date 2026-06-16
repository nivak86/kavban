import { useCallback, useEffect, useState } from 'react';
import {
  nowIso,
  readKavbanLocalState,
  writeKavbanLocalState,
  type KavbanLocalState,
} from './storage';
import { kavbanDefaultAgentRouting, kavbanProject } from './seed';
import type {
  KavbanAgentId,
  KavbanAgentRouting,
  KavbanConnector,
  KavbanConnectorId,
  KavbanContextFile,
  KavbanProject,
  KavbanTask,
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
  tagLabels: string[];
  dependencies: string[];
  contextFiles: string[];
};

export type KavbanUpdateTaskInput = KavbanCreateTaskInput;

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

function createTaskFromInput(
  project: KavbanProject,
  input: KavbanCreateTaskInput
): KavbanTask {
  const taskNumber = getNextTaskNumber(project.tasks);
  const taskKey = `KAV-${taskNumber}`;
  const taskId = `kav-${String(taskNumber).padStart(6, '0')}`;
  const createdAt = nowIso();
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
    tags: tagLabels.map((label, index) => ({
      label,
      color: tagColors[index % tagColors.length],
    })),
    dependencies: input.dependencies,
    contextFiles: getTaskContextFiles(project, input),
    events: [
      {
        id: `evt-${taskId}-created`,
        kind: 'task-created',
        actor: 'human',
        summary: 'Task created manually in Kavban.',
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
    createContextFile,
    createProject,
    createTask,
    deleteContextFile,
    deleteTask,
    inboxItems: state.inboxItems,
    moveTask,
    profile: state.profile,
    project: activeProjectWithDefaults,
    projects: state.projects,
    selectProject,
    state,
    updateAgentRouting,
    updateConnector,
    updateContextFile,
    updateProjectBrief,
    updateProjectRepository,
    updateTask,
  };
}
