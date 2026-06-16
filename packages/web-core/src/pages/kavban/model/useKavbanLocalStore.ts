import { useCallback, useEffect, useState } from 'react';
import { kavbanInboxItems, kavbanProfile, kavbanProject } from './seed';
import type {
  KavbanConnector,
  KavbanConnectorId,
  KavbanInboxItem,
  KavbanProfile,
  KavbanProject,
} from './types';

const STORAGE_KEY = 'kavban.local-state.v1';

export type KavbanLocalState = {
  version: 1;
  project: KavbanProject;
  inboxItems: KavbanInboxItem[];
  profile: KavbanProfile;
  updatedAt: string;
};

const nowIso = () => new Date().toISOString();

function cloneSeedState(): KavbanLocalState {
  return {
    version: 1,
    project: structuredClone(kavbanProject),
    inboxItems: structuredClone(kavbanInboxItems),
    profile: structuredClone(kavbanProfile),
    updatedAt: nowIso(),
  };
}

function canUseLocalStorage() {
  return (
    typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
  );
}

function isKavbanLocalState(value: unknown): value is KavbanLocalState {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<KavbanLocalState>;

  return (
    candidate.version === 1 &&
    !!candidate.project &&
    Array.isArray(candidate.project.tasks) &&
    Array.isArray(candidate.inboxItems) &&
    !!candidate.profile
  );
}

function readKavbanLocalState(): KavbanLocalState {
  if (!canUseLocalStorage()) {
    return cloneSeedState();
  }

  const saved = window.localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return cloneSeedState();
  }

  try {
    const parsed: unknown = JSON.parse(saved);
    return isKavbanLocalState(parsed) ? parsed : cloneSeedState();
  } catch {
    return cloneSeedState();
  }
}

function writeKavbanLocalState(state: KavbanLocalState) {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function useKavbanLocalStore() {
  const [state, setState] = useState<KavbanLocalState>(readKavbanLocalState);

  useEffect(() => {
    writeKavbanLocalState(state);
  }, [state]);

  const updateProjectBrief = useCallback((brief: string) => {
    setState((current) => ({
      ...current,
      project: {
        ...current.project,
        brief,
      },
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
        project: {
          ...current.project,
          connectors: {
            ...current.project.connectors,
            [connectorId]: update(current.project.connectors[connectorId]),
          },
        },
        updatedAt: nowIso(),
      }));
    },
    []
  );

  return {
    inboxItems: state.inboxItems,
    profile: state.profile,
    project: state.project,
    state,
    updateConnector,
    updateProjectBrief,
  };
}
