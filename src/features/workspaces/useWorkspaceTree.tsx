'use client';

import { useRef, useCallback } from 'react';
import type { Paper, ExpansionMap } from '@keyhole-koro/paper-in-paper';
import type { PaperCanvasHandle } from '@keyhole-koro/paper-in-paper';
import { WorkspacePaper } from '@/features/workspaces/WorkspacePaper';
import { buildPaperMapFromSubtree, findRootItemId } from '@/features/tree/buildTree';
import { getTree, getSubtree, type SubtreeItem } from '@/features/tree/api';
import { ROOT_ID } from '@/features/paperMap/buildAppPaperMap';

export function useWorkspaceTree(
  getWorkspaceName: (id: string) => string,
  setExpansionMap: React.Dispatch<React.SetStateAction<ExpansionMap>>,
  setFocusedItemId: React.Dispatch<React.SetStateAction<string | null>>,
  canvasRef: React.RefObject<PaperCanvasHandle | null>,
) {
  const itemWorkspaceRef = useRef<Map<string, string>>(new Map());
  const itemHasChildrenRef = useRef<Map<string, boolean>>(new Map());
  const workspaceRootItemRef = useRef<Map<string, string>>(new Map());
  const loadedSubtreeItemsRef = useRef<Set<string>>(new Set());
  const loadingSubtreeItemsRef = useRef<Set<string>>(new Set());
  const prevExpansionRef = useRef<ExpansionMap>(new Map());
  const initializedWorkspacesRef = useRef<Set<string>>(new Set());

  function buildWsPaper(
    workspaceId: string,
    workspaceRootItemId: string,
    childPapers: { id: string; title: string }[],
  ): Paper {
    const workspaceName = getWorkspaceName(workspaceId);
    return {
      id: workspaceId,
      title: workspaceName,
      description: 'ドキュメントと知識構造',
      hue: 200,
      parentId: 'workspaces',
      childIds: workspaceRootItemId ? [workspaceRootItemId] : [],
      content: (
        <WorkspacePaper
          workspaceId={workspaceId}
          workspaceName={workspaceName}
          childItems={childPapers}
          onSelectItem={(paperId) => {
            setExpansionMap((prev) => {
              const next = new Map(prev);
              next.set('workspaces', { openChildIds: [workspaceId] });
              next.set(workspaceId, { openChildIds: [workspaceRootItemId] });
              next.set(workspaceRootItemId, {
                openChildIds: Array.from(new Set([...(next.get(workspaceRootItemId)?.openChildIds ?? []), paperId])),
              });
              return next;
            });
            setFocusedItemId(paperId);
          }}
        />
      ),
    };
  }

  function mergeTreeIntoWorkspace(workspaceId: string, workspaceRootItemId: string, items: SubtreeItem[]) {
    const treePaperMap = buildPaperMapFromSubtree(items);

    const toMerge: Paper[] = Array.from(treePaperMap.values()).map((paper) =>
      paper.id === workspaceRootItemId ? { ...paper, parentId: workspaceId } : paper,
    );

    const childPapers = (treePaperMap.get(workspaceRootItemId)?.childIds ?? [])
      .map((cid) => treePaperMap.get(cid))
      .filter((p): p is Paper => p != null)
      .map((p) => ({ id: p.id, title: p.title }));

    initializedWorkspacesRef.current.add(workspaceId);
    toMerge.push(buildWsPaper(workspaceId, workspaceRootItemId, childPapers));

    canvasRef.current?.mergePapers(toMerge);
  }

  async function loadSubtreeForItem(workspaceId: string, workspaceRootItemId: string, itemId: string, maxDepth = 1) {
    if (loadingSubtreeItemsRef.current.has(itemId) || loadedSubtreeItemsRef.current.has(itemId)) return;
    loadingSubtreeItemsRef.current.add(itemId);
    try {
      const items = await getSubtree(workspaceId, itemId, maxDepth);
      for (const item of items) {
        itemWorkspaceRef.current.set(item.id, workspaceId);
        itemHasChildrenRef.current.set(item.id, item.has_children);
      }
      mergeTreeIntoWorkspace(workspaceId, workspaceRootItemId, items);
      loadedSubtreeItemsRef.current.add(itemId);
    } catch (err) {
      console.error('Failed to load subtree:', err);
    } finally {
      loadingSubtreeItemsRef.current.delete(itemId);
    }
  }

  const handleOpenWorkspace = useCallback(async (workspaceId: string) => {
    const knownRootId = workspaceRootItemRef.current.get(workspaceId);
    if (knownRootId) {
      setExpansionMap((prev) => {
        const next = new Map(prev);
        next.set(ROOT_ID, { openChildIds: ['workspaces'] });
        next.set('workspaces', { openChildIds: [workspaceId] });
        next.set(workspaceId, { openChildIds: [knownRootId] });
        return next;
      });
      setFocusedItemId(knownRootId);
      return;
    }
    if (!initializedWorkspacesRef.current.has(workspaceId)) {
      initializedWorkspacesRef.current.add(workspaceId);
      canvasRef.current?.upsertPapers([buildWsPaper(workspaceId, '', [])]);
    }
    const tree = await getTree(workspaceId);
    if (tree.nodes.length > 0) {
      const rootItemId = findRootItemId(tree.nodes) ?? tree.nodes[0]?.id;
      if (rootItemId) {
        workspaceRootItemRef.current.set(workspaceId, rootItemId);
        await loadSubtreeForItem(workspaceId, rootItemId, rootItemId, 1);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getWorkspaceName]);

  function handleExpansionMapChange(next: ExpansionMap) {
    setExpansionMap(next);
    const prev = prevExpansionRef.current;
    const newlyOpened: string[] = [];
    for (const [parentId, entry] of next) {
      const currentIds = entry?.openChildIds ?? [];
      const prevIds = prev.get(parentId)?.openChildIds ?? [];
      const prevSet = new Set(prevIds);
      for (const childId of currentIds) {
        if (!prevSet.has(childId)) newlyOpened.push(childId);
      }
    }
    prevExpansionRef.current = next;
    for (const itemId of newlyOpened) {
      if (!itemHasChildrenRef.current.get(itemId)) continue;
      const workspaceId = itemWorkspaceRef.current.get(itemId);
      if (!workspaceId) continue;
      const workspaceRootItemId = workspaceRootItemRef.current.get(workspaceId);
      if (!workspaceRootItemId) continue;
      void loadSubtreeForItem(workspaceId, workspaceRootItemId, itemId, 1);
    }
  }

  function resetTree() {
    itemWorkspaceRef.current.clear();
    itemHasChildrenRef.current.clear();
    workspaceRootItemRef.current.clear();
    loadedSubtreeItemsRef.current.clear();
    loadingSubtreeItemsRef.current.clear();
    prevExpansionRef.current = new Map();
    initializedWorkspacesRef.current.clear();
  }

  return {
    handleOpenWorkspace,
    handleExpansionMapChange,
    resetTree,
  };
}
