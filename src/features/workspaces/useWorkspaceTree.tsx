'use client';

import { useRef, useCallback, useEffect } from 'react';
import type { CanvasHandleHook, Command, ExpansionMap, Paper } from '@keyhole-koro/paper-in-paper';
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
  canvas: CanvasHandleHook,
  defaultExpansionMap: ExpansionMap,
  setWorkspacePapers: (workspaceId: string, papers: Paper[]) => void,
  clearWorkspacePapers: () => void,
  workspaces: { workspaceId: string }[],
) {
  const getCanvasExpansionMap = useCallback(
    () => canvas.current?.getState().expansionMap ?? defaultExpansionMap,
    [canvas, defaultExpansionMap],
  );

  const dispatchCanvasCommand = useCallback(
    (command: Command) => canvas.current?.dispatch(command),
    [canvas],
  );

  const subscribeCanvas = useCallback(
    (listener: () => void) => canvas.current?.subscribe(listener) ?? (() => {}),
    [canvas],
  );
  const itemWorkspaceRef = useRef<Map<string, string>>(new Map());
  const itemHasChildrenRef = useRef<Map<string, boolean>>(new Map());
  const workspaceRootItemRef = useRef<Map<string, string>>(new Map());
  const workspaceDocumentRootIdsRef = useRef<Map<string, string[]>>(new Map());
  const workspaceTreeItemsRef = useRef<Map<string, Map<string, SubtreeItem>>>(new Map());
  const loadedSubtreeItemsRef = useRef<Set<string>>(new Set());
  const loadingSubtreeItemsRef = useRef<Set<string>>(new Set());
  const prevExpansionRef = useRef<ExpansionMap>(new Map());
  const initializedWorkspacesRef = useRef<Set<string>>(new Set());

  // Re-hydrate expanded workspaces and subtrees on mount or when workspaces are loaded.
  // Also re-renders already-initialized workspaces so their title reflects the loaded name.
  // Re-runs when canvas.current changes so we can read its initial state once attached.
  useEffect(() => {
    if (workspaces.length === 0) return;
    if (!canvas.current) return;
    const currentExpansionMap = canvas.current.getState().expansionMap;

    for (const { workspaceId } of workspaces) {
      if (initializedWorkspacesRef.current.has(workspaceId)) {
        const rootItemId = workspaceRootItemRef.current.get(workspaceId);
        const childPapers = rootItemId
          ? (workspaceDocumentRootIdsRef.current.get(workspaceId) ?? []).map((id) => ({ id }))
          : [];
        setWorkspacePapers(workspaceId, [buildWsPaper(workspaceId, childPapers)]);
      }
    }

    const rootOpenIds = currentExpansionMap.get(ROOT_ID)?.openChildIds ?? [];
    if (!rootOpenIds.includes('workspaces')) return;

    const workspacesOpenIds = currentExpansionMap.get('workspaces')?.openChildIds ?? [];
    for (const workspaceId of workspacesOpenIds) {
      if (!initializedWorkspacesRef.current.has(workspaceId)) {
        console.log('[workspace-tree] Re-hydrating workspace:', workspaceId);
        void handleOpenWorkspace(workspaceId);
      }
    }

    // Also check for expanded items within workspaces.
    // We can't easily know which workspace an item belongs to without itemWorkspaceRef,
    // so we may need to wait for workspace trees to load before subtree hydration catches up.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvas.current, workspaces]);

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
    childPapers: { id: string }[],
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
        />
      ),
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatchCanvasCommand, getWorkspaceName, handleUploadWorkspaceFile]);

  function syncOpenChildren(parentId: string, desiredOpenIds: string[]) {
    const currentOpenIds = getCanvasExpansionMap().get(parentId)?.openChildIds ?? [];
    const desiredSet = new Set(desiredOpenIds);
    const currentSet = new Set(currentOpenIds);

    for (const childId of currentOpenIds) {
      if (!desiredSet.has(childId)) {
        dispatchCanvasCommand({ type: 'CLOSE_NODE', parentId, childId });
      }
    }

    for (const childId of desiredOpenIds) {
      if (!currentSet.has(childId)) {
        dispatchCanvasCommand({ type: 'OPEN_NODE', parentId, childId });
      }
    }
  }

  function updateWorkspaceExpansion(
    workspaceId: string,
    newDocumentRootIds: string[] = [],
    revealNewDocumentRoots = false,
  ) {
    syncOpenChildren(ROOT_ID, ['workspaces']);
    syncOpenChildren('workspaces', [workspaceId]);

    const allTreeItemIds = new Set(workspaceTreeItemsRef.current.get(workspaceId)?.keys() ?? []);
    const currentWorkspaceOpenIds = (getCanvasExpansionMap().get(workspaceId)?.openChildIds ?? []).filter((itemId) => allTreeItemIds.has(itemId));
    const openChildIds = revealNewDocumentRoots
      ? Array.from(new Set([...currentWorkspaceOpenIds, ...newDocumentRootIds]))
      : currentWorkspaceOpenIds;

    syncOpenChildren(workspaceId, openChildIds);
    console.log('[workspace-tree] updateWorkspaceExpansion', {
      workspaceId,
      revealNewDocumentRoots,
      newDocumentRootIds,
      openChildIds,
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
      if (hasChildren && (getCanvasExpansionMap().get(item.id)?.openChildIds.length ?? 0) > 0) {
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
      if (item.hasChildren && (getCanvasExpansionMap().get(id)?.openChildIds.length ?? 0) > 0) {
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

  // Watch for expansion changes and load subtrees.
  // Re-subscribes when the canvas instance changes (handles next/dynamic late mount).
  useEffect(() => {
    const handle = canvas.current;
    if (!handle) return;

    const handleExpansionChange = () => {
      const expansionMap = handle.getState().expansionMap;
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
    };

    handleExpansionChange();
    return handle.subscribe(handleExpansionChange);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvas.current]);

  const handleOpenWorkspace = useCallback(async (workspaceId: string) => {
    const knownRootId = workspaceRootItemRef.current.get(workspaceId);
    if (knownRootId) {
      if (!loadedSubtreeItemsRef.current.has(knownRootId)) {
        void loadSubtreeForItem(workspaceId, knownRootId, knownRootId, 1);
      }
      updateWorkspaceExpansion(workspaceId);
      dispatchCanvasCommand({ type: 'FOCUS_NODE', nodeId: workspaceId });
      return;
    }
    initializedWorkspacesRef.current.add(workspaceId);
    setWorkspacePapers(workspaceId, [buildWsPaper(workspaceId, [])]);

    updateWorkspaceExpansion(workspaceId);
    dispatchCanvasCommand({ type: 'FOCUS_NODE', nodeId: workspaceId });
    await refreshWorkspaceTree(workspaceId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatchCanvasCommand, getWorkspaceName, handleUploadWorkspaceFile]);

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
    resetTree,
    buildWsPaper,
  };
}
