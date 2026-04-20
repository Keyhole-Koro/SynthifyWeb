'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { Paper, ExpansionMap } from '@keyhole-koro/paper-in-paper';
import { type AuthMode } from '@/features/landing/AuthPaper';
import { buildLandingPaperMap, LANDING_ROOT_ID } from '@/features/landing/landingPaperMap';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, type User, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { createWorkspace, listWorkspaces, type Workspace } from '@/features/workspaces/api';
import { WorkspacePaper } from '@/features/workspace/WorkspacePaper';
import { buildPaperMapFromGraph, findRootNodeId } from '@/features/graph/buildPaperMap';
import { getGraph, getSubtree, type ApiNode, type ApiEdge, type Subtree } from '@/features/graph/api';

function expansionOpen(map: ExpansionMap, parentId: string, childId: string): ExpansionMap {
  const current = map.get(parentId)?.openChildIds ?? [];
  if (current.includes(childId)) return map;
  const next = new Map(map);
  next.set(parentId, { openChildIds: [...current, childId] });
  return next;
}

const PaperCanvas = dynamic(
  () => import('@keyhole-koro/paper-in-paper').then((mod) => mod.PaperCanvas),
  { ssr: false },
);

export default function LandingPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

  // Workspace papers opened inline
  const [openWorkspaceIds, setOpenWorkspaceIds] = useState<string[]>([]);
  // Extra papers: workspace node papers + graph papers
  const [extraPapers, setExtraPapers] = useState<Paper[]>([]);
  // After extraPapers are synced to reducer, fire these open/spotlight actions
  const pendingOpenRef = useRef<{ parentId: string; childId: string; spotlight: boolean } | null>(null);
  const nodeWorkspaceRef = useRef<Map<string, string>>(new Map());
  const nodeHasChildrenRef = useRef<Map<string, boolean>>(new Map());
  const loadedSubtreeNodesRef = useRef<Set<string>>(new Set());
  const loadingSubtreeNodesRef = useRef<Set<string>>(new Set());
  const prevExpansionRef = useRef<Map<string, { openChildIds: string[] }>>(new Map());

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [winSize, setWinSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const update = () => setWinSize({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const [expansionMap, setExpansionMap] = useState<ExpansionMap>(() =>
    expansionOpen(new Map(), LANDING_ROOT_ID, 'auth'),
  );
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>('auth');

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const ws = await listWorkspaces();
          setWorkspaces(ws);
        } catch (err) {
          console.error('Failed to list workspaces:', err);
        }
      }
      setLoading(false);
    });
  }, []);

  // ── Workspace handlers ────────────────────────────────────────────────────

  const openWorkspaceIdsRef = useRef<string[]>([]);
  useEffect(() => { openWorkspaceIdsRef.current = openWorkspaceIds; }, [openWorkspaceIds]);

  const handleOpenWorkspace = useCallback((workspaceId: string) => {
    const wsNodeId = `ws_${workspaceId}`;
    if (openWorkspaceIdsRef.current.includes(workspaceId)) {
      setExpansionMap((prev) => expansionOpen(prev, 'auth', wsNodeId));
      setFocusedNodeId(wsNodeId);
      return;
    }
    pendingOpenRef.current = { parentId: 'auth', childId: wsNodeId, spotlight: false };
    setOpenWorkspaceIds((prev) => [...prev, workspaceId]);
  }, []);

  const handleCreateWorkspace = useCallback(async (name: string) => {
    const ws = await createWorkspace(name);
    setWorkspaces((prev) => [...prev, ws]);
    handleOpenWorkspace(ws.workspace_id);
  }, [handleOpenWorkspace]);

  // Build workspace paper nodes from openWorkspaceIds
  const workspacePaperNodes = useMemo<Paper[]>(() => {
    return openWorkspaceIds.map((wsId) => {
      const ws = workspaces.find((w) => w.workspace_id === wsId);
      const wsNodeId = `ws_${wsId}`;
      // Find any graph root that is a child of this workspace node
      const graphChildIds = extraPapers
        .filter((p) => p.parentId === wsNodeId)
        .map((p) => p.id);
      return {
        id: wsNodeId,
        title: ws?.name ?? wsId,
        description: 'ドキュメントと知識グラフ',
        hue: 200,
        parentId: 'auth',
        childIds: graphChildIds,
        content: (
          <WorkspacePaper
            workspaceId={wsId}
            workspaceName={ws?.name ?? wsId}
            onExploreGraph={() => handleExploreGraph(wsId)}
          />
        ),
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openWorkspaceIds, workspaces, extraPapers]);

  const paperMap = useMemo(
    () =>
      buildLandingPaperMap({
        user,
        workspaces,
        authMode,
        loading,
        openWorkspaceIds,
        extraPapers: [...workspacePaperNodes, ...extraPapers],
        onAuthModeChange: setAuthMode,
        onEmailSubmit: handleEmailSubmit,
        onGoogleSubmit: handleGoogleSubmit,
        onLogout: handleLogout,
        onOpenWorkspace: handleOpenWorkspace,
        onCreateWorkspace: handleCreateWorkspace,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, workspaces, authMode, loading, openWorkspaceIds, workspacePaperNodes, extraPapers],
  );

  // Fire pending open once the target node appears in paperMap
  useEffect(() => {
    if (!pendingOpenRef.current) return;
    const { parentId, childId } = pendingOpenRef.current;
    if (!paperMap.has(childId)) return;
    pendingOpenRef.current = null;
    setExpansionMap((prev) => expansionOpen(prev, parentId, childId));
    setFocusedNodeId(childId);
  }, [paperMap]);

  // auth 以降（ワークスペース等）が展開されているとき全画面にする
  useEffect(() => {
    const hasWorkspaceOpen = (expansionMap.get('auth')?.openChildIds.length ?? 0) > 0;
    setIsFullscreen(hasWorkspaceOpen);
  }, [expansionMap]);

  // ── Auth handlers ─────────────────────────────────────────────────────────

  function handleEmailSubmit() {
    alert('メールアドレス認証は現在準備中です。Googleログインをご利用ください。');
  }

  async function handleGoogleSubmit() {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
      alert('ログインに失敗しました。');
      setLoading(false);
    }
  }

  async function handleLogout() {
    await signOut(auth);
    setOpenWorkspaceIds([]);
    setExtraPapers([]);
    setExpansionMap(expansionOpen(new Map(), LANDING_ROOT_ID, 'auth'));
    setFocusedNodeId('auth');
    setIsFullscreen(false);
    nodeWorkspaceRef.current.clear();
    nodeHasChildrenRef.current.clear();
    loadedSubtreeNodesRef.current.clear();
    loadingSubtreeNodesRef.current.clear();
    prevExpansionRef.current = new Map();
  }

  // ── Graph explore handler ─────────────────────────────────────────────────

  function mergeGraphIntoWorkspace(workspaceId: string, rootNodeId: string, nodes: ApiNode[], edges: ApiEdge[]) {
    const wsNodeId = `ws_${workspaceId}`;
    const graphPaperMap = buildPaperMapFromGraph(nodes, edges);
    setExtraPapers((prev) => {
      const next = new Map(prev.map((p) => [p.id, p]));
      for (const [id, paper] of graphPaperMap) {
        if (id === rootNodeId) {
          const existing = next.get(id);
          if (existing) {
            const mergedChildIds = Array.from(new Set([...existing.childIds, ...paper.childIds]));
            next.set(id, { ...existing, childIds: mergedChildIds });
          } else {
            next.set(id, { ...paper, parentId: wsNodeId });
          }
          continue;
        }

        const existing = next.get(id);
        if (existing) {
          const mergedChildIds = Array.from(new Set([...existing.childIds, ...paper.childIds]));
          next.set(id, {
            ...existing,
            ...paper,
            childIds: mergedChildIds,
            parentId: paper.parentId ?? existing.parentId,
          });
        } else {
          next.set(id, paper);
        }
      }
      return Array.from(next.values());
    });
  }

  async function loadSubtreeForNode(workspaceId: string, nodeId: string, maxDepth = 1) {
    if (loadingSubtreeNodesRef.current.has(nodeId) || loadedSubtreeNodesRef.current.has(nodeId)) {
      return;
    }

    loadingSubtreeNodesRef.current.add(nodeId);
    try {
      const subtree = await getSubtree(workspaceId, nodeId, maxDepth);
      const { nodes, edges } = mapSubtreeToApi(subtree);

      for (const node of subtree.nodes) {
        nodeWorkspaceRef.current.set(node.id, workspaceId);
        nodeHasChildrenRef.current.set(node.id, node.has_children);
      }

      mergeGraphIntoWorkspace(workspaceId, nodeId, nodes, edges);
      loadedSubtreeNodesRef.current.add(nodeId);
    } catch (err) {
      console.error('Failed to load subtree:', err);
    } finally {
      loadingSubtreeNodesRef.current.delete(nodeId);
    }
  }

  async function handleExploreGraph(workspaceId: string) {
    const wsNodeId = `ws_${workspaceId}`;
    const graph = await getGraph(workspaceId, { levelFilters: [0] });
    if (graph.nodes.length === 0) return;

    const rootNodeId = findRootNodeId(graph.nodes, graph.edges) ?? graph.nodes[0]?.id;
    if (!rootNodeId) return;

    await loadSubtreeForNode(workspaceId, rootNodeId, 1);

    pendingOpenRef.current = { parentId: wsNodeId, childId: rootNodeId, spotlight: false };
  }

  function handleExpansionMapChange(expansionMap: ExpansionMap) {
    setExpansionMap(expansionMap);

    const prev = prevExpansionRef.current;
    const newlyOpened: string[] = [];

    for (const [parentId, entry] of expansionMap) {
      const currentIds = entry?.openChildIds ?? [];
      const prevIds = prev.get(parentId)?.openChildIds ?? [];
      const prevSet = new Set(prevIds);
      for (const childId of currentIds) {
        if (!prevSet.has(childId)) {
          newlyOpened.push(childId);
        }
      }
    }

    prevExpansionRef.current = expansionMap;

    for (const nodeId of newlyOpened) {
      if (!nodeHasChildrenRef.current.get(nodeId)) continue;
      const workspaceId = nodeWorkspaceRef.current.get(nodeId);
      if (!workspaceId) continue;
      void loadSubtreeForNode(workspaceId, nodeId, 1);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="relative h-screen w-screen overflow-hidden" style={{ background: 'radial-gradient(ellipse at top left, #fff8ee 0%, #f0e6d3 50%, #e8dbc8 100%)' }}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 h-[480px] w-[480px] rounded-full bg-amber-200/40 blur-[80px]" />
        <div className="absolute -bottom-32 right-1/4 h-[400px] w-[400px] rounded-full bg-orange-100/50 blur-[80px]" />
        <div className="absolute right-0 top-1/3 h-[300px] w-[300px] rounded-full bg-yellow-100/40 blur-[60px]" />
      </div>

      {!isFullscreen && (
        <div className="absolute left-6 top-6 z-20 flex select-none items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 shadow-md shadow-indigo-200">
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight text-stone-800">Synthify</span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-stone-400">Knowledge Graph Platform</span>
          </div>
        </div>
      )}

      {!isFullscreen && (
        <div className="absolute left-1/2 top-[11%] z-10 -translate-x-1/2 text-center select-none whitespace-nowrap">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-500/70 mb-2">Document Intelligence</p>
          <h1 className="text-3xl font-bold tracking-tight text-stone-800 sm:text-4xl">
            ドキュメントから、<span className="text-indigo-500">知識グラフ</span>へ
          </h1>
        </div>
      )}

      <div
        className="absolute overflow-hidden [contain:layout_paint] isolate"
        style={(() => {
          const ease = 'all 0.45s cubic-bezier(0.32, 0.72, 0, 1)';
          if (isFullscreen || winSize.w === 0) {
            return { inset: 0, zIndex: 30, borderRadius: 0, boxShadow: 'none', transition: ease };
          }
          const w = Math.min(winSize.w * 0.95, winSize.h * 1.28);
          const h = Math.min(w / 2.05, winSize.h * 0.62);
          const cx = winSize.w / 2;
          const cy = winSize.h / 2;
          return {
            left: cx - w / 2,
            right: cx - w / 2,
            top: cy - h / 2,
            bottom: cy - h / 2,
            zIndex: 20,
            borderRadius: 16,
            boxShadow: '0 20px 40px -8px rgba(120,110,90,0.3)',
            outline: '1px solid rgba(180,170,155,0.6)',
            transition: ease,
          };
        })()}
      >
        <PaperCanvas
          paperMap={paperMap}
          rootId={LANDING_ROOT_ID}
          expansionMap={expansionMap}
          focusedNodeId={focusedNodeId}
          isFullscreen={isFullscreen}
          debug={true}
          onExpansionMapChange={handleExpansionMapChange}
          onFocusedNodeIdChange={setFocusedNodeId}
          onFullscreenChange={setIsFullscreen}
        />
      </div>

      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-stone-100/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500/30 border-t-indigo-500" />
            <p className="text-sm font-medium text-stone-500">接続中...</p>
          </div>
        </div>
      )}
    </div>
  );
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
