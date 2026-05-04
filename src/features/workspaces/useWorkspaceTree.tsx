'use client';

import { useRef, useCallback, useEffect } from 'react';
import type { Paper, ExpansionMap } from '@keyhole-koro/paper-in-paper';
import { WorkspacePaper } from '@/features/workspaces/WorkspacePaper';
import { findRootItemId } from '@/features/tree/buildTree';
import { projectWorkspacePapers } from '@/features/workspaces/useWorkspaceProjection';
import { getTree, getSubtree, type ApiItem, type SubtreeItem } from '@/features/tree/api';
import { create } from '@bufbuild/protobuf';
import { SubtreeItemSchema } from '@synthify/proto-ts/gen/synthify/tree/v1/tree_types_pb';
import { createDocument, startProcessing, uploadFile } from '@/features/documents/api';
import { ROOT_ID } from '@/features/paperMap/staticPapers';

export function useWorkspaceTree(
  getWorkspaceName: (id: string) => string,
  expansionMap: ExpansionMap,
  setExpansionMap: React.Dispatch<React.SetStateAction<ExpansionMap>>,
  setFocusedItemId: React.Dispatch<React.SetStateAction<string | null>>,
  setWorkspacePapers: (workspaceId: string, papers: Paper[]) => void,
  clearWorkspacePapers: () => void,
  workspaces: { workspaceId: string }[],
) {
  const itemWorkspaceRef = useRef<Map<string, string>>(new Map());
  const itemHasChildrenRef = useRef<Map<string, boolean>>(new Map());
  const workspaceRootItemRef = useRef<Map<string, string>>(new Map());
  const workspaceDocumentRootIdsRef = useRef<Map<string, string[]>>(new Map());
  const workspaceTreeItemsRef = useRef<Map<string, Map<string, SubtreeItem>>>(new Map());
  const loadedSubtreeItemsRef = useRef<Set<string>>(new Set());
  const loadingSubtreeItemsRef = useRef<Set<string>>(new Set());
  const prevExpansionRef = useRef<ExpansionMap>(expansionMap);
  const initializedWorkspacesRef = useRef<Set<string>>(new Set());

  // Re-hydrate expanded workspaces and subtrees on mount or when workspaces are loaded.
  // Also re-renders already-initialized workspaces so their title reflects the loaded name.
  useEffect(() => {
    if (workspaces.length === 0) return;

    for (const { workspaceId } of workspaces) {
      if (initializedWorkspacesRef.current.has(workspaceId)) {
        const rootItemId = workspaceRootItemRef.current.get(workspaceId);
        const childPapers = rootItemId
          ? (workspaceDocumentRootIdsRef.current.get(workspaceId) ?? [])
              .map((id) => {
                const it = workspaceTreeItemsRef.current.get(workspaceId)?.get(id)?.item;
                return it ? { id: it.id, title: it.label } : null;
              })
              .filter((p): p is { id: string; title: string } => p != null)
          : [];
        setWorkspacePapers(workspaceId, [buildWsPaper(workspaceId, childPapers)]);
      }
    }

    const rootOpenIds = expansionMap.get(ROOT_ID)?.openChildIds ?? [];
    if (!rootOpenIds.includes('workspaces')) return;

    const workspacesOpenIds = expansionMap.get('workspaces')?.openChildIds ?? [];
    for (const workspaceId of workspacesOpenIds) {
      if (!initializedWorkspacesRef.current.has(workspaceId)) {
        console.log('[workspace-tree] Re-hydrating workspace:', workspaceId);
        void handleOpenWorkspace(workspaceId);
      }
    }

    // Also check for expanded items within workspaces
    // We can't easily know which workspace an item belongs to without itemWorkspaceRef,
    // so we might need to wait for workspace trees to load.
    // handleExpansionMapChange will handle newly discovered items once itemWorkspaceRef is populated.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaces]);

  const handleUploadWorkspaceFile = useCallback(async (workspaceId: string, file: File) => {
    const created = await createDocument(
      workspaceId,
      file.name,
      file.type || 'application/octet-stream',
      file.size,
    );
    await uploadFile(created.uploadUrl, file, created.uploadMethod);
    const processing = await startProcessing(created.document.documentId);
    return {
      jobId: processing.job.jobId,
      documentId: created.document.documentId,
    };
  }, []);

  const buildWsPaper = useCallback((
    workspaceId: string,
    childPapers: { id: string; title: string }[],
  ): Paper => {
    const workspaceName = getWorkspaceName(workspaceId);
    return {
      id: workspaceId,
      title: workspaceName,
      description: 'ドキュメントと知識構造',
      hue: 200,
      parentId: 'workspaces',
      childIds: childPapers.map((paper) => paper.id),
      content: (
        <WorkspacePaper
          workspaceId={workspaceId}
          workspaceName={workspaceName}
          hasTree={childPapers.length > 0}
          childItems={childPapers}
          onUploadFile={(file) => handleUploadWorkspaceFile(workspaceId, file)}
          onProcessingComplete={() => refreshWorkspaceTree(workspaceId, { revealNewDocumentRoots: true })}
          onSelectItem={(paperId) => {
            setExpansionMap((prev) => {
              const next = new Map(prev);
              next.set('workspaces', { openChildIds: [workspaceId] });
              const openChildIds = Array.from(new Set([...(next.get(workspaceId)?.openChildIds ?? []), paperId]));
              next.set(workspaceId, { openChildIds });
              return next;
            });
            setFocusedItemId(paperId);
          }}
        />
      ),
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getWorkspaceName, handleUploadWorkspaceFile, setExpansionMap, setFocusedItemId]);

  function updateWorkspaceExpansion(
    workspaceId: string,
    newDocumentRootIds: string[] = [],
    revealNewDocumentRoots = false,
  ) {
    setExpansionMap((prev) => {
      const next = new Map(prev);
      next.set(ROOT_ID, { openChildIds: ['workspaces'] });
      next.set('workspaces', { openChildIds: [workspaceId] });

      const allTreeItemIds = new Set(workspaceTreeItemsRef.current.get(workspaceId)?.keys() ?? []);
      const currentWorkspaceOpenIds = (next.get(workspaceId)?.openChildIds ?? []).filter((itemId) => allTreeItemIds.has(itemId));
      const openChildIds = revealNewDocumentRoots
        ? Array.from(new Set([...currentWorkspaceOpenIds, ...newDocumentRootIds]))
        : currentWorkspaceOpenIds;

      next.set(workspaceId, { openChildIds });
      console.log('[workspace-tree] updateWorkspaceExpansion', {
        workspaceId,
        revealNewDocumentRoots,
        newDocumentRootIds,
        openChildIds,
      });
      return next;
    });
  }

  function runProjectWorkspacePapers(workspaceId: string, workspaceRootItemId: string): Paper[] {
    const treeItems = workspaceTreeItemsRef.current.get(workspaceId) ?? new Map();
    const documentRootIds = workspaceDocumentRootIdsRef.current.get(workspaceId) ?? [];

    console.log('[workspace-tree] projectWorkspacePapers', {
      workspaceId,
      workspaceRootItemId,
      documentRootIds,
      projectedPaperIds: Array.from(treeItems.keys()).filter((itemId) => itemId !== workspaceRootItemId),
    });

    initializedWorkspacesRef.current.add(workspaceId);
    return projectWorkspacePapers(workspaceId, workspaceRootItemId, treeItems, documentRootIds, buildWsPaper);
  }

  async function refreshWorkspaceTree(
    workspaceId: string,
    opts: { revealNewDocumentRoots?: boolean } = {},
  ) {
    const tree = await getTree(workspaceId);
    const items = tree?.items ?? [];
    if (items.length === 0) {
      workspaceRootItemRef.current.delete(workspaceId);
      workspaceDocumentRootIdsRef.current.set(workspaceId, []);
      workspaceTreeItemsRef.current.set(workspaceId, new Map());
      setWorkspacePapers(workspaceId, [buildWsPaper(workspaceId, [])]);
      return;
    }
    const rootItemId = findRootItemId(items) ?? items[0]?.id;
    if (!rootItemId) return;

    const previousDocumentRootIds = workspaceDocumentRootIdsRef.current.get(workspaceId) ?? [];
    const rootItem = items.find((item: ApiItem) => item.id === rootItemId);
    const documentRootIds = rootItem?.childIds ?? [];
    const newDocumentRootIds = documentRootIds.filter((documentRootId: string) => !previousDocumentRootIds.includes(documentRootId));

    console.log('[workspace-tree] refreshWorkspaceTree', {
      workspaceId,
      rootItemId,
      documentRootIds,
      newDocumentRootIds,
      itemCount: items.length,
    });

    workspaceRootItemRef.current.set(workspaceId, rootItemId);
    workspaceDocumentRootIdsRef.current.set(workspaceId, documentRootIds);

    const treeItems = new Map<string, SubtreeItem>();
    workspaceTreeItemsRef.current.set(workspaceId, treeItems);
    for (const item of items) {
      const hasChildren = (item.childIds?.length ?? 0) > 0;
      itemWorkspaceRef.current.set(item.id, workspaceId);
      itemHasChildrenRef.current.set(item.id, hasChildren);
      treeItems.set(item.id, create(SubtreeItemSchema, { item, hasChildren }));

      // Re-hydration check for already loaded items in getTree result
      if (hasChildren && (expansionMap.get(item.id)?.openChildIds.length ?? 0) > 0) {
        if (!loadedSubtreeItemsRef.current.has(item.id) && !loadingSubtreeItemsRef.current.has(item.id)) {
          console.log('[workspace-tree] Re-hydrating subtree for already known item:', item.id);
          void loadSubtreeForItem(workspaceId, rootItemId, item.id, 1);
        }
      }
    }

    loadedSubtreeItemsRef.current.delete(rootItemId);
    await loadSubtreeForItem(workspaceId, rootItemId, rootItemId, 1);
    updateWorkspaceExpansion(workspaceId, newDocumentRootIds, opts.revealNewDocumentRoots === true);
  }

  async function mergeTreeIntoWorkspace(workspaceId: string, workspaceRootItemId: string, items: SubtreeItem[]) {
    const workspaceItems = workspaceTreeItemsRef.current.get(workspaceId) ?? new Map<string, SubtreeItem>();
    workspaceTreeItemsRef.current.set(workspaceId, workspaceItems);

    for (const item of items) {
      const id = item.item!.id;
      workspaceItems.set(id, item);

      // Re-hydration: if this item is expanded in the restored expansionMap, load its subtree
      if (item.hasChildren && (expansionMap.get(id)?.openChildIds.length ?? 0) > 0) {
        if (!loadedSubtreeItemsRef.current.has(id) && !loadingSubtreeItemsRef.current.has(id)) {
          console.log('[workspace-tree] Re-hydrating subtree for item:', id);
          void loadSubtreeForItem(workspaceId, workspaceRootItemId, id, 1);
        }
      }
    }

    setWorkspacePapers(workspaceId, runProjectWorkspacePapers(workspaceId, workspaceRootItemId));
  }

  async function loadSubtreeForItem(workspaceId: string, workspaceRootItemId: string, itemId: string, maxDepth = 1) {
    if (loadingSubtreeItemsRef.current.has(itemId) || loadedSubtreeItemsRef.current.has(itemId)) return;
    loadingSubtreeItemsRef.current.add(itemId);
    try {
      const items = await getSubtree(workspaceId, itemId, maxDepth);
      for (const item of items) {
        itemWorkspaceRef.current.set(item.item!.id, workspaceId);
        itemHasChildrenRef.current.set(item.item!.id, item.hasChildren);
      }
      mergeTreeIntoWorkspace(workspaceId, workspaceRootItemId, items);
      loadedSubtreeItemsRef.current.add(itemId);
    } catch (err) {
      console.error('Failed to load subtree:', err);
    } finally {
      loadingSubtreeItemsRef.current.delete(itemId);
    }
  }

  // Watch for expansion changes and load subtrees
  useEffect(() => {
    const prev = prevExpansionRef.current;
    if (expansionMap === prev) return;

    const newlyOpened: string[] = [];
    for (const [parentId, entry] of expansionMap) {
      const currentIds = entry?.openChildIds ?? [];
      const prevIds = prev.get(parentId)?.openChildIds ?? [];
      const prevSet = new Set(prevIds);
      for (const childId of currentIds) {
        if (!prevSet.has(childId)) newlyOpened.push(childId);
      }
    }
    prevExpansionRef.current = expansionMap;

    for (const itemId of newlyOpened) {
      if (!itemHasChildrenRef.current.get(itemId)) continue;
      const workspaceId = itemWorkspaceRef.current.get(itemId);
      if (!workspaceId) continue;
      const workspaceRootItemId = workspaceRootItemRef.current.get(workspaceId);
      if (!workspaceRootItemId) continue;
      void loadSubtreeForItem(workspaceId, workspaceRootItemId, itemId, 1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expansionMap]);

  const handleOpenWorkspace = useCallback(async (workspaceId: string) => {
    const knownRootId = workspaceRootItemRef.current.get(workspaceId);
    if (knownRootId) {
      if (!loadedSubtreeItemsRef.current.has(knownRootId)) {
        void loadSubtreeForItem(workspaceId, knownRootId, knownRootId, 1);
      }
      updateWorkspaceExpansion(workspaceId);
      setFocusedItemId(workspaceId);
      return;
    }
    initializedWorkspacesRef.current.add(workspaceId);
    setWorkspacePapers(workspaceId, [buildWsPaper(workspaceId, [])]);

    updateWorkspaceExpansion(workspaceId);
    setFocusedItemId(workspaceId);
    await refreshWorkspaceTree(workspaceId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getWorkspaceName, handleUploadWorkspaceFile]);

  function handleExpansionMapChange(next: ExpansionMap) {
    setExpansionMap(next);
  }

  function resetTree() {
    itemWorkspaceRef.current.clear();
    itemHasChildrenRef.current.clear();
    workspaceRootItemRef.current.clear();
    workspaceDocumentRootIdsRef.current.clear();
    workspaceTreeItemsRef.current.clear();
    loadedSubtreeItemsRef.current.clear();
    loadingSubtreeItemsRef.current.clear();
    prevExpansionRef.current = new Map();
    initializedWorkspacesRef.current.clear();
    clearWorkspacePapers();
  }

  return {
    handleOpenWorkspace,
    handleExpansionMapChange,
    resetTree,
    buildWsPaper,
  };
}
