import { createRPCClient } from '@/lib/connect';
import { env } from '@/config/env';
import { getAuthHeaders } from '@/features/auth/auth';
import { TreeService } from '@/gen/synthify/tree/v1/tree_pb';
import { ItemService } from '@/gen/synthify/tree/v1/item_pb';
import { JobService } from '@/gen/synthify/tree/v1/job_pb';
import { TreeProjectionScope } from '@/gen/synthify/tree/v1/tree_types_pb';

export type { Item as ApiItem } from '@/gen/synthify/tree/v1/tree_types_pb';
export type { EntityRef, TreeEntityDetail } from '@/gen/synthify/tree/v1/item_pb';
export type { JobMutationLog } from '@/gen/synthify/tree/v1/job_pb';
export { TreeProjectionScope } from '@/gen/synthify/tree/v1/tree_types_pb';

const treeClient = createRPCClient(TreeService);
const itemClient = createRPCClient(ItemService);
const jobClient = createRPCClient(JobService);

export async function getTree(
  workspaceId: string,
  opts: { levelFilters?: number[] } = {},
) {
  const res = await treeClient.getTree({
    workspaceId,
    levelFilters: opts.levelFilters ?? [],
  });
  return res.tree!;
}

export async function getTreeEntityDetail(
  targetRef: { workspaceId: string; scope: TreeProjectionScope; id: string; documentId?: string },
  resolveAliases = false,
) {
  const res = await itemClient.getTreeEntityDetail({
    targetRef,
    resolveAliases,
  });
  return res.detail!;
}

// SubtreeItem は REST エンドポイントのまま維持
export interface SubtreeItem {
  id: string;
  label: string;
  level: number;
  description: string;
  summary_html?: string;
  override_css?: string;
  has_children: boolean;
  parent_id?: string;
  child_ids?: string[];
}

export async function getSubtree(
  workspaceId: string,
  itemId: string,
  maxDepth = 3,
): Promise<SubtreeItem[]> {
  const authHeaders = await getAuthHeaders();
  const url = `${env.apiBaseUrl}/tree/subtree?workspace_id=${encodeURIComponent(workspaceId)}&item_id=${encodeURIComponent(itemId)}&max_depth=${maxDepth}`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      ...authHeaders,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? res.statusText);
  }
  return res.json() as Promise<SubtreeItem[]>;
}

export async function listJobMutationLogs(jobId: string) {
  const res = await jobClient.listJobMutationLogs({ jobId });
  return res.logs;
}

export async function listAllJobs() {
  const res = await jobClient.listAllJobs({});
  return res.jobs;
}
