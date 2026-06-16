import { useCallback, useEffect, useState } from 'react';
import {
  nowIso,
  readKavbanLocalState,
  writeKavbanLocalState,
  type KavbanLocalState,
} from './storage';
import { kavbanProject } from './seed';
import type {
  KavbanConnector,
  KavbanConnectorId,
  KavbanProject,
} from './types';

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

export function useKavbanLocalStore() {
  const [state, setState] = useState<KavbanLocalState>(readKavbanLocalState);
  const activeProject =
    state.projects.find((project) => project.id === state.activeProjectId) ??
    state.projects[0] ??
    kavbanProject;

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
    createProject,
    inboxItems: state.inboxItems,
    profile: state.profile,
    project: activeProject,
    projects: state.projects,
    selectProject,
    state,
    updateConnector,
    updateProjectBrief,
  };
}
