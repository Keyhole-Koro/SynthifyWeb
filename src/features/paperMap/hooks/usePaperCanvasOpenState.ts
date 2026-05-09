import { useEffect } from 'react';
import type { ExpansionMap } from '@keyhole-koro/paper-in-paper';
import type { CanvasHandleHook } from '@keyhole-koro/paper-in-paper';

interface UsePaperCanvasOpenStateOptions {
  canvas: CanvasHandleHook;
  /** Bumped when the desired open state is reset (e.g. logout) so we re-attach. */
  attachKey?: unknown;
  onPersistOpenState?: (expansionMap: ExpansionMap, focusedNodeId: string | null) => void;
}

/**
 * Subscribes to the canvas store to persist open-state changes outward.
 * The canvas itself remains the source of truth — this hook never mirrors
 * its state into a React useState (use `useCanvasSelector` for that).
 */
export function usePaperCanvasOpenState({
  canvas,
  attachKey,
  onPersistOpenState,
}: UsePaperCanvasOpenStateOptions) {
  useEffect(() => {
    const handle = canvas.current;
    if (!handle || !onPersistOpenState) return;

    const persist = () => {
      const state = handle.getState();
      onPersistOpenState(state.expansionMap, state.focusedNodeId);
    };
    persist();
    return handle.subscribe(persist);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvas.current, attachKey, onPersistOpenState]);
}
