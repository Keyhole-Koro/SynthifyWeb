import type { Paper } from '@keyhole-koro/paper-in-paper';
import type { SubtreeItem } from '@/features/tree/api';


export function buildProjectedPaper(
  workspaceRootItemId: string,
  itemId: string,
  treeItems: Map<string, SubtreeItem>,
  workspaceId: string,
): Paper | null {
  const item = treeItems.get(itemId);
  if (!item || item.id === workspaceRootItemId) return null;

  const projectedChildIds = (item.child_ids ?? []).filter(
    (childId) => childId !== workspaceRootItemId && treeItems.has(childId),
  );
  const projectedParentId =
    item.parent_id === workspaceRootItemId ? workspaceId : (item.parent_id ?? null);

  return {
    id: item.id,
    title: item.label,
    description: item.description,
    content: item.summary_html ? item.summary_html : `<p>${item.description}</p>`,
    hue: 220,
    parentId: projectedParentId,
    childIds: projectedChildIds,
    overrideCss: item.override_css || undefined,
  };
}

export function projectWorkspacePapers(
  workspaceId: string,
  workspaceRootItemId: string,
  treeItems: Map<string, SubtreeItem>,
  documentRootIds: string[],
  buildWsPaper: (workspaceId: string, childPapers: { id: string; title: string }[]) => Paper,
): Paper[] {
  const childPapers = documentRootIds
    .map((id) => treeItems.get(id))
    .filter((item): item is SubtreeItem => item != null)
    .map((item) => ({ id: item.id, title: item.label }));

  const projectedPapers: Paper[] = Array.from(treeItems.keys())
    .map((itemId) => buildProjectedPaper(workspaceRootItemId, itemId, treeItems, workspaceId))
    .filter((paper): paper is Paper => paper != null);

  return [...projectedPapers, buildWsPaper(workspaceId, childPapers)];
}
