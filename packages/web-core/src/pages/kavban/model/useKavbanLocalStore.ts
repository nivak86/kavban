import { useCallback, useEffect, useState } from 'react';
import {
  nowIso,
  readKavbanLocalState,
  writeKavbanLocalState,
  type KavbanLocalState,
} from './storage';
import type { KavbanConnector, KavbanConnectorId } from './types';

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
