import { createRPCClient } from '@/lib/connect';
import { auth } from '@/lib/firebase';
import { env } from '@/config/env';
import { GraphService } from '@/gen/synthify/graph/v1/graph_pb';
import { NodeService } from '@/gen/synthify/graph/v1/node_pb';
import { GraphProjectionScope } from '@/gen/synthify/graph/v1/graph_types_pb';

export type { Node as ApiNode, Edge as ApiEdge } from '@/gen/synthify/graph/v1/graph_types_pb';
export type { EntityRef, GraphEntityDetail } from '@/gen/synthify/graph/v1/node_pb';
export { GraphProjectionScope } from '@/gen/synthify/graph/v1/graph_types_pb';

const graphClient = createRPCClient(GraphService);
const nodeClient = createRPCClient(NodeService);

export async function getGraph(
  workspaceId: string,
  opts: { levelFilters?: number[] } = {},
) {
  const res = await graphClient.getGraph({
    workspaceId,
    levelFilters: opts.levelFilters ?? [],
  });
  return res.graph!;
}

export async function getGraphEntityDetail(
  targetRef: { workspaceId: string; scope: GraphProjectionScope; id: string; documentId?: string },
  resolveAliases = false,
) {
  const res = await nodeClient.getGraphEntityDetail({
    targetRef,
    resolveAliases,
  });
  return res.detail!;
}

// Subtree は REST エンドポイントのまま維持
export interface SubtreeNode {
  id: string;
  label: string;
  level: number;
  description: string;
  summary_html?: string;
  has_children: boolean;
}

export interface SubtreeEdge {
  id: string;
  source: string;
  target: string;
  type: string;
}

export interface Subtree {
  nodes: SubtreeNode[];
  edges: SubtreeEdge[];
}

export async function getSubtree(
  workspaceId: string,
  nodeId: string,
  maxDepth = 3,
): Promise<Subtree> {
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : undefined;
  const url = `${env.apiBaseUrl}/graph/subtree?workspace_id=${encodeURIComponent(workspaceId)}&node_id=${encodeURIComponent(nodeId)}&max_depth=${maxDepth}`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? res.statusText);
  }
  return res.json() as Promise<Subtree>;
}
