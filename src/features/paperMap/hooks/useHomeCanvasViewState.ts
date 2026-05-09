import { useMemo } from 'react';
import { useCanvasSelector, type CanvasHandleHook } from '@keyhole-koro/paper-in-paper';
import { ROOT_ID } from '@/features/paperMap/staticPapers';

interface HomeCanvasViewState {
  isWorkspaceExpanded: boolean;
  isFullscreen: boolean;
  authAttention: number;
  workspacesAttention: number;
}

/**
 * Reads home-canvas-specific view derivations from the live canvas state.
 * No external React state mirror; the hook re-renders only when the boolean
 * "is workspaces open under root?" changes.
 *
 * NOTE: authAttention / workspacesAttention currently abuse `attention` to
 * express sibling room share. The `useSiblingShare` migration in
 * paper-in-paper-architecture.md (Phase 3) replaces this.
 */
export function useHomeCanvasViewState(
  canvas: CanvasHandleHook,
  canvasFullscreen: boolean,
): HomeCanvasViewState {
  const isWorkspaceExpanded = useCanvasSelector(
    canvas,
    (state) => state.expansionMap.get(ROOT_ID)?.openChildIds.includes('workspaces') ?? false,
    false,
  );

  return useMemo(() => ({
    isWorkspaceExpanded,
    isFullscreen: isWorkspaceExpanded || canvasFullscreen,
    authAttention: isWorkspaceExpanded ? 15 : 100,
    workspacesAttention: isWorkspaceExpanded ? 180 : 100,
  }), [isWorkspaceExpanded, canvasFullscreen]);
}
