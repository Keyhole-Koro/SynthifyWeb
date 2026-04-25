'use client';

import { useRef, useCallback } from 'react';
import type { Paper, ExpansionMap } from '@keyhole-koro/paper-in-paper';
import type { PaperCanvasHandle } from '@keyhole-koro/paper-in-paper';
import { WorkspacePaper } from '@/features/workspaces/WorkspacePaper';
import { buildPaperMapFromSubtree, findRootItemId } from '@/features/tree/buildTree';
import { getTree, getSubtree, type SubtreeItem } from '@/features/tree/api';
import { createDocument, startProcessing, uploadFile } from '@/features/documents/api';
import { ROOT_ID } from '@/features/paperMap/staticPapers';

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

  const handleUploadWorkspaceFile = useCallback(async (workspaceId: string, file: File) => {
    const created = await createDocument(
      workspaceId,
      file.name,
      file.type || 'application/octet-stream',
      file.size,
    );
    await uploadFile(created.uploadUrl, file);
    await startProcessing(created.document.documentId);
  }, []);

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
          hasTree={Boolean(workspaceRootItemId)}
          childItems={childPapers}
          onUploadFile={(file) => handleUploadWorkspaceFile(workspaceId, file)}
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
      if (!loadedSubtreeItemsRef.current.has(knownRootId)) {
        void loadSubtreeForItem(workspaceId, knownRootId, knownRootId, 1);
      }
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
    // Ensure placeholder content is replaced even if a previous attempt happened before canvasRef was ready.
    initializedWorkspacesRef.current.add(workspaceId);
    canvasRef.current?.upsertPapers([buildWsPaper(workspaceId, '', [])]);

    const tree = await getTree(workspaceId);
    const items = tree?.items ?? [];
    if (items.length > 0) {
      const rootItemId = findRootItemId(items) ?? items[0]?.id;
      if (rootItemId) {
        workspaceRootItemRef.current.set(workspaceId, rootItemId);
        await loadSubtreeForItem(workspaceId, rootItemId, rootItemId, 1);
      }
    } else {
      canvasRef.current?.upsertPapers([buildWsPaper(workspaceId, '', [])]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getWorkspaceName, handleUploadWorkspaceFile]);

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
