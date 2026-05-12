import { useCallback, useRef } from 'react';
import type { ExpansionMap } from '@keyhole-koro/paper-in-paper';
import { saveExpansionMap, saveFocusedItemId } from '@/features/paperMap/expansionPersistence';

/**
 * Returns stable callbacks to pass to PaperCanvas that persist open-state to localStorage.
 */
export function usePaperCanvasOpenState() {
  const latestExpansionRef = useRef<ExpansionMap>(new Map());

  const onExpansionMapChange = useCallback((expansionMap: ExpansionMap) => {
    latestExpansionRef.current = expansionMap;
    saveExpansionMap(expansionMap);
  }, []);

  const onFocusedNodeIdChange = useCallback((focusedNodeId: string | null) => {
    saveFocusedItemId(focusedNodeId);
  }, []);

  return { onExpansionMapChange, onFocusedNodeIdChange };
}
