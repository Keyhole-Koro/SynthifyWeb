'use client';

import { useRef, useCallback } from 'react';
import type { Paper, ExpansionMap } from '@keyhole-koro/paper-in-paper';
import type { PaperCanvasHandle } from '@keyhole-koro/paper-in-paper';
import { WorkspacePaper } from '@/features/workspaces/WorkspacePaper';
import { buildPaperMapFromSubtree, findRootNodeId } from '@/features/graph/buildPaperMap';
import { getGraph, getSubtree, type Subtree } from '@/features/graph/api';
import { ROOT_ID } from '@/features/paperMap/buildAppPaperMap';

export function useWorkspaceGraph(
  getWorkspaceName: (id: string) => string,
  setExpansionMap: React.Dispatch<React.SetStateAction<ExpansionMap>>,
  setFocusedNodeId: React.Dispatch<React.SetStateAction<string | null>>,
  canvasRef: React.RefObject<PaperCanvasHandle | null>,
) {
  const nodeWorkspaceRef = useRef<Map<string, string>>(new Map());
  const nodeHasChildrenRef = useRef<Map<string, boolean>>(new Map());
  const workspaceRootNodeRef = useRef<Map<string, string>>(new Map());
  const loadedSubtreeNodesRef = useRef<Set<string>>(new Set());
  const loadingSubtreeNodesRef = useRef<Set<string>>(new Set());
  const prevExpansionRef = useRef<ExpansionMap>(new Map());
  const initializedWorkspacesRef = useRef<Set<string>>(new Set());

  function buildWsPaper(
    workspaceId: string,
    workspaceRootNodeId: string,
    childPapers: { id: string; title: string }[],
  ): Paper {
    const workspaceName = getWorkspaceName(workspaceId);
    return {
      id: workspaceId,
      title: workspaceName,
      description: 'ドキュメントと知識グラフ',
      hue: 200,
      parentId: 'workspaces',
      childIds: workspaceRootNodeId ? [workspaceRootNodeId] : [],
      content: (
        <WorkspacePaper
          workspaceId={workspaceId}
          workspaceName={workspaceName}
          childPapers={childPapers}
          onSelectPaper={(paperId) => {
            setExpansionMap((prev) => {
              const next = new Map(prev);
              next.set('workspaces', { openChildIds: [workspaceId] });
              next.set(workspaceId, { openChildIds: [workspaceRootNodeId] });
              next.set(workspaceRootNodeId, {
                openChildIds: Array.from(new Set([...(next.get(workspaceRootNodeId)?.openChildIds ?? []), paperId])),
              });
              return next;
            });
            setFocusedNodeId(paperId);
          }}
        />
      ),
    };
  }

  function mergeGraphIntoWorkspace(workspaceId: string, workspaceRootNodeId: string, subtree: Subtree) {
    const graphPaperMap = buildPaperMapFromSubtree(subtree);

    const toMerge: Paper[] = Array.from(graphPaperMap.values()).map((paper) =>
      paper.id === workspaceRootNodeId ? { ...paper, parentId: workspaceId } : paper,
    );

    const childPapers = (graphPaperMap.get(workspaceRootNodeId)?.childIds ?? [])
      .map((cid) => graphPaperMap.get(cid))
      .filter((p): p is Paper => p != null)
      .map((p) => ({ id: p.id, title: p.title }));

    initializedWorkspacesRef.current.add(workspaceId);
    toMerge.push(buildWsPaper(workspaceId, workspaceRootNodeId, childPapers));

    canvasRef.current?.mergePapers(toMerge);
  }

  async function loadSubtreeForNode(workspaceId: string, workspaceRootNodeId: string, nodeId: string, maxDepth = 1) {
    if (loadingSubtreeNodesRef.current.has(nodeId) || loadedSubtreeNodesRef.current.has(nodeId)) return;
    loadingSubtreeNodesRef.current.add(nodeId);
    try {
      const subtree = await getSubtree(workspaceId, nodeId, maxDepth);
      for (const node of subtree.nodes) {
        nodeWorkspaceRef.current.set(node.id, workspaceId);
        nodeHasChildrenRef.current.set(node.id, node.has_children);
      }
      mergeGraphIntoWorkspace(workspaceId, workspaceRootNodeId, subtree);
      loadedSubtreeNodesRef.current.add(nodeId);
    } catch (err) {
      console.error('Failed to load subtree:', err);
    } finally {
      loadingSubtreeNodesRef.current.delete(nodeId);
    }
  }

  const handleOpenWorkspace = useCallback(async (workspaceId: string) => {
    const knownRootId = workspaceRootNodeRef.current.get(workspaceId);
    if (knownRootId) {
      setExpansionMap((prev) => {
        const next = new Map(prev);
        next.set(ROOT_ID, { openChildIds: ['workspaces'] });
        next.set('workspaces', { openChildIds: [workspaceId] });
        next.set(workspaceId, { openChildIds: [knownRootId] });
        return next;
      });
      setFocusedNodeId(knownRootId);
      return;
    }
    if (!initializedWorkspacesRef.current.has(workspaceId)) {
      initializedWorkspacesRef.current.add(workspaceId);
      canvasRef.current?.upsertPapers([buildWsPaper(workspaceId, '', [])]);
    }
    const graph = await getGraph(workspaceId);
    if (graph.nodes.length > 0) {
      const rootNodeId = findRootNodeId(graph.nodes, graph.edges) ?? graph.nodes[0]?.id;
      if (rootNodeId) {
        workspaceRootNodeRef.current.set(workspaceId, rootNodeId);
        await loadSubtreeForNode(workspaceId, rootNodeId, rootNodeId, 1);
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
    for (const nodeId of newlyOpened) {
      if (!nodeHasChildrenRef.current.get(nodeId)) continue;
      const workspaceId = nodeWorkspaceRef.current.get(nodeId);
      if (!workspaceId) continue;
      const workspaceRootNodeId = workspaceRootNodeRef.current.get(workspaceId);
      if (!workspaceRootNodeId) continue;
      void loadSubtreeForNode(workspaceId, workspaceRootNodeId, nodeId, 1);
    }
  }

  function resetGraph() {
    nodeWorkspaceRef.current.clear();
    nodeHasChildrenRef.current.clear();
    workspaceRootNodeRef.current.clear();
    loadedSubtreeNodesRef.current.clear();
    loadingSubtreeNodesRef.current.clear();
    prevExpansionRef.current = new Map();
    initializedWorkspacesRef.current.clear();
  }

  return {
    handleOpenWorkspace,
    handleExpansionMapChange,
    resetGraph,
  };
}
