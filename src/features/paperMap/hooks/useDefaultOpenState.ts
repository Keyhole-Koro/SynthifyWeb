import { useEffect, useMemo, useState } from 'react';
import type { DefaultOpenState, ExpansionMap } from '@keyhole-koro/paper-in-paper';
import type { AuthUser } from '@/features/auth/session';
import type { Workspace } from '@/features/workspaces/api';
import { authPaper, rootPaper, workspacesPaper } from '@/features/paperMap/staticPapers';
import {
  loadExpansionMap,
  loadFocusedItemId,
  saveExpansionMap,
  saveFocusedItemId,
} from '@/features/paperMap/expansionPersistence';

interface DefaultOpenStateOptions {
  user: AuthUser | null;
  loading: boolean;
  workspaces: Workspace[];
}

export function computeDefaultOpenState(opts: Pick<DefaultOpenStateOptions, 'user' | 'workspaces'>): DefaultOpenState {
  if (opts.user && opts.workspaces.length > 0) {
    const map: ExpansionMap = new Map();
    map.set(rootPaper.id, { openChildIds: [workspacesPaper.id] });
    return { expansionMap: map, focusedNodeId: workspacesPaper.id };
  }

  const map: ExpansionMap = new Map();
  map.set(rootPaper.id, { openChildIds: [authPaper.id] });
  return { expansionMap: map, focusedNodeId: authPaper.id };
}

function loadPersistedOpenState(): DefaultOpenState | null {
  if (typeof window === 'undefined') return null;
  const expansionMap = loadExpansionMap();
  const focusedNodeId = loadFocusedItemId();
  if (!expansionMap) return null;
  return { expansionMap, focusedNodeId };
}

function cloneExpansionMap(expansionMap: ExpansionMap): ExpansionMap {
  return new Map(
    Array.from(expansionMap.entries(), ([parentId, entry]) => [
      parentId,
      { openChildIds: [...entry.openChildIds] },
    ]),
  );
}

export interface OpenState {
  defaultOpenState: DefaultOpenState;
  hasMounted: boolean;
  canvasKey: string;
  resetOpenState: (next: DefaultOpenState) => void;
  persistOpenState: (expansionMap: ExpansionMap, focusedNodeId: string | null) => void;
}

/**
 * Resolves the initial open state once from persisted storage or computed defaults.
 * PaperCanvas should own the source of truth; this hook only provides
 * initial values plus persistence helpers.
 */
export function useDefaultOpenState(opts: DefaultOpenStateOptions): OpenState | null {
  const { user, loading, workspaces } = opts;

  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => { setHasMounted(true); }, []);

  const [resolved, setResolved] = useState<DefaultOpenState | null>(null);
  const [canvasKey, setCanvasKey] = useState(0);

  useEffect(() => {
    if (loading) return;
    if (resolved !== null) return;

    const initial = loadPersistedOpenState()
      ?? computeDefaultOpenState({ user, workspaces });

    setResolved(initial);
  }, [loading, user, workspaces, resolved]);

  const resetOpenState = useMemo(() => (next: DefaultOpenState) => {
    setResolved({
      expansionMap: cloneExpansionMap(next.expansionMap ?? new Map()),
      focusedNodeId: next.focusedNodeId ?? null,
    });
    setCanvasKey((prev) => prev + 1);
  }, []);

  const persistOpenState = useMemo(() => (expansionMap: ExpansionMap, focusedNodeId: string | null) => {
    if (!hasMounted || resolved === null) return;
    saveExpansionMap(expansionMap);
    saveFocusedItemId(focusedNodeId);
  }, [hasMounted, resolved]);

  if (resolved === null) return null;

  return {
    defaultOpenState: resolved,
    hasMounted,
    canvasKey: `open-state-${canvasKey}`,
    resetOpenState,
    persistOpenState,
  };
}
