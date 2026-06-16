import { kavbanInboxItems, kavbanProfile, kavbanProject } from './seed';
import type { KavbanInboxItem, KavbanProfile, KavbanProject } from './types';

export const KAVBAN_STORAGE_VERSION = 1;
export const KAVBAN_STORAGE_KEY = 'kavban.local-state.v1';

export type KavbanLocalState = {
  version: typeof KAVBAN_STORAGE_VERSION;
  project: KavbanProject;
  inboxItems: KavbanInboxItem[];
  profile: KavbanProfile;
  updatedAt: string;
};

export type KavbanStorageAdapter = {
  read: () => string | null;
  remove: () => void;
  write: (value: string) => void;
};

export const nowIso = () => new Date().toISOString();

export function createKavbanSeedState(): KavbanLocalState {
  return {
    version: KAVBAN_STORAGE_VERSION,
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

export const browserKavbanStorageAdapter: KavbanStorageAdapter = {
  read: () => {
    if (!canUseLocalStorage()) {
      return null;
    }

    return window.localStorage.getItem(KAVBAN_STORAGE_KEY);
  },
  remove: () => {
    if (!canUseLocalStorage()) {
      return;
    }

    window.localStorage.removeItem(KAVBAN_STORAGE_KEY);
  },
  write: (value) => {
    if (!canUseLocalStorage()) {
      return;
    }

    window.localStorage.setItem(KAVBAN_STORAGE_KEY, value);
  },
};

function isKavbanLocalState(value: unknown): value is KavbanLocalState {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<KavbanLocalState>;

  return (
    candidate.version === KAVBAN_STORAGE_VERSION &&
    !!candidate.project &&
    Array.isArray(candidate.project.tasks) &&
    Array.isArray(candidate.inboxItems) &&
    !!candidate.profile
  );
}

export function migrateKavbanLocalState(value: unknown): KavbanLocalState {
  if (isKavbanLocalState(value)) {
    return value;
  }

  return createKavbanSeedState();
}

export function readKavbanLocalState(
  adapter: KavbanStorageAdapter = browserKavbanStorageAdapter
) {
  const saved = adapter.read();

  if (!saved) {
    return createKavbanSeedState();
  }

  try {
    return migrateKavbanLocalState(JSON.parse(saved) as unknown);
  } catch {
    return createKavbanSeedState();
  }
}

export function writeKavbanLocalState(
  state: KavbanLocalState,
  adapter: KavbanStorageAdapter = browserKavbanStorageAdapter
) {
  adapter.write(JSON.stringify(state));
}
