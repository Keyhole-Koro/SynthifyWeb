'use client';

import { useState, useRef, useCallback } from 'react';
import type { Paper, ExpansionMap } from '@keyhole-koro/paper-in-paper';
import { type Workspace } from '@/features/workspaces/api';
import { WorkspacePaper } from '@/features/workspaces/WorkspacePaper';
import { buildPaperMapFromGraph, findRootNodeId } from '@/features/graph/buildPaperMap';
import { getGraph, getSubtree, type ApiNode, type ApiEdge, type Subtree } from '@/features/graph/api';
import { ROOT_ID } from '@/features/paperMap/buildAppPaperMap';

export function useWorkspaceGraph(workspaces: Workspace[], setExpansionMap: React.Dispatch<React.SetStateAction<ExpansionMap>>, setFocusedNodeId: React.Dispatch<React.SetStateAction<string | null>>) {
  const [extraPapers, setExtraPapers] = useState<Paper[]>([]);

  const nodeWorkspaceRef = useRef<Map<string, string>>(new Map());
  const nodeHasChildrenRef = useRef<Map<string, boolean>>(new Map());
  const workspaceRootNodeRef = useRef<Map<string, string>>(new Map());
  const loadedSubtreeNodesRef = useRef<Set<string>>(new Set());
  const loadingSubtreeNodesRef = useRef<Set<string>>(new Set());
  const prevExpansionRef = useRef<ExpansionMap>(new Map());

  function mergeGraphIntoWorkspace(workspaceId: string, workspaceRootNodeId: string, nodes: ApiNode[], edges: ApiEdge[]) {
    // workspace_id をそのまま paper node ID として使う
    const workspace = workspaces.find((w) => w.workspace_id === workspaceId);
    const graphPaperMap = buildPaperMapFromGraph(nodes, edges);
    setExtraPapers((prev) => {
      const next = new Map(prev.map((p) => [p.id, p]));

      if (!next.has(workspaceId)) {
        next.set(workspaceId, {
          id: workspaceId,
          title: workspace?.name ?? workspaceId,
          description: 'ドキュメントと知識グラフ',
          hue: 200,
          parentId: 'workspaces',
          childIds: [workspaceRootNodeId],
          content: (
            <WorkspacePaper
              workspaceId={workspaceId}
              workspaceName={workspace?.name ?? workspaceId}
              childPapers={[]}
              onSelectPaper={() => {}}
            />
          ),
        });
      }

      for (const [id, paper] of graphPaperMap) {
        if (id === workspaceRootNodeId) {
          const existing = next.get(id);
          if (existing) {
            const mergedChildIds = Array.from(new Set([...existing.childIds, ...paper.childIds]));
            next.set(id, { ...existing, ...paper, childIds: mergedChildIds, parentId: workspaceId });
          } else {
            next.set(id, { ...paper, parentId: workspaceId });
          }
          continue;
        }
        const existing = next.get(id);
        if (existing) {
          const mergedChildIds = Array.from(new Set([...existing.childIds, ...paper.childIds]));
          next.set(id, { ...existing, ...paper, childIds: mergedChildIds, parentId: paper.parentId ?? existing.parentId });
        } else {
          next.set(id, paper);
        }
      }

      const graphRoot = next.get(workspaceRootNodeId);
      if (graphRoot) {
        const childPapers = graphRoot.childIds
          .map((cid) => { const c = next.get(cid); return c ? { id: c.id, title: c.title } : null; })
          .filter((p): p is { id: string; title: string } => p !== null);
        next.set(workspaceId, {
          ...next.get(workspaceId)!,
          childIds: [workspaceRootNodeId],
          content: (
            <WorkspacePaper
              workspaceId={workspaceId}
              workspaceName={workspace?.name ?? workspaceId}
              childPapers={childPapers}
              onSelectPaper={(paperId) => {
                setExpansionMap((prevExpansion) => {
                  const nextExpansion = new Map(prevExpansion);
                  nextExpansion.set('workspaces', { openChildIds: [workspaceId] });
                  nextExpansion.set(workspaceId, { openChildIds: [workspaceRootNodeId] });
                  nextExpansion.set(workspaceRootNodeId, {
                    openChildIds: Array.from(new Set([...(nextExpansion.get(workspaceRootNodeId)?.openChildIds ?? []), paperId])),
                  });
                  return nextExpansion;
                });
                setFocusedNodeId(paperId);
              }}
            />
          ),
        });
      }

      return Array.from(next.values());
    });
  }

  async function loadSubtreeForNode(workspaceId: string, workspaceRootNodeId: string, nodeId: string, maxDepth = 1) {
    if (loadingSubtreeNodesRef.current.has(nodeId) || loadedSubtreeNodesRef.current.has(nodeId)) return;
    loadingSubtreeNodesRef.current.add(nodeId);
    try {
      const subtree = await getSubtree(workspaceId, nodeId, maxDepth);
      const { nodes, edges } = mapSubtreeToApi(subtree);
      for (const node of subtree.nodes) {
        nodeWorkspaceRef.current.set(node.id, workspaceId);
        nodeHasChildrenRef.current.set(node.id, node.has_children);
      }
      mergeGraphIntoWorkspace(workspaceId, workspaceRootNodeId, nodes, edges);
      loadedSubtreeNodesRef.current.add(nodeId);
    } catch (err) {
      console.error('Failed to load subtree:', err);
    } finally {
      loadingSubtreeNodesRef.current.delete(nodeId);
    }
  }

  const handleOpenWorkspace = useCallback(async (workspaceId: string) => {
    // workspace_id をそのまま paper node ID として使う
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
    const ws = workspaces.find((w) => w.workspace_id === workspaceId);
    setExtraPapers((prev) => {
      if (prev.some((p) => p.id === workspaceId)) return prev;
      return [...prev, {
        id: workspaceId,
        title: ws?.name ?? workspaceId,
        description: 'ドキュメントと知識グラフ',
        hue: 200,
        parentId: 'workspaces',
        childIds: [],
        content: (
          <WorkspacePaper
            workspaceId={workspaceId}
            workspaceName={ws?.name ?? workspaceId}
            childPapers={[]}
            onSelectPaper={() => {}}
          />
        ),
      }];
    });
    const graph = await getGraph(workspaceId);
    if (graph.nodes.length > 0) {
      const rootNodeId = findRootNodeId(graph.nodes, graph.edges) ?? graph.nodes[0]?.id;
      if (rootNodeId) {
        workspaceRootNodeRef.current.set(workspaceId, rootNodeId);
        await loadSubtreeForNode(workspaceId, rootNodeId, rootNodeId, 1);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaces]);

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
    setExtraPapers([]);
    nodeWorkspaceRef.current.clear();
    nodeHasChildrenRef.current.clear();
    workspaceRootNodeRef.current.clear();
    loadedSubtreeNodesRef.current.clear();
    loadingSubtreeNodesRef.current.clear();
    prevExpansionRef.current = new Map();
  }

  return {
    extraPapers,
    handleOpenWorkspace,
    handleExpansionMapChange,
    resetGraph,
  };
}

function mapSubtreeToApi(subtree: Subtree): { nodes: ApiNode[]; edges: ApiEdge[] } {
  return {
    nodes: subtree.nodes.map((node) => ({
      id: node.id,
      scope: 'canonical',
      label: node.label,
      level: 0,
      entity_type: node.entity_type,
      description: node.description,
      summary_html: node.summary_html,
    })),
    edges: subtree.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type,
      scope: 'canonical',
    })),
  };
}
