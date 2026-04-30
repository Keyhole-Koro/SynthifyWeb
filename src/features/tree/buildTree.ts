import { buildPaperMap } from '@keyhole-koro/paper-in-paper';
import type { Paper, PaperMap } from '@keyhole-koro/paper-in-paper';
import type { ApiItem, SubtreeItem } from './api';

const DEFAULT_HUE = 220;

/**
 * GetTree レスポンスの items から PaperMap を構築する。
 */
export function buildPaperMapFromTree(items: ApiItem[]): PaperMap {
  const papers: Paper[] = items.map((item) => ({
    id: item.id,
    title: item.label,
    description: item.description,
    content: item.summaryHtml || `<p>${item.description}</p>`,
    hue: DEFAULT_HUE,
    parentId: item.parentId || null,
    childIds: item.childIds || [],
    overrideCss: item.overrideCss || undefined,
  }));

  return buildPaperMap(papers);
}

/**
 * ツリー構造を持たない孤立アイテム（親なし・子なし）の ID 一覧を返す。
 * paper-in-paper の unplacedItemIds として使う。
 */
export function findUnplacedItemIds(items: ApiItem[]): string[] {
  const itemIds = new Set(items.map((i) => i.id));
  return items
    .filter((i) => i.level > 0 && (!i.parentId || !itemIds.has(i.parentId)))
    .map((i) => i.id);
}

/** Subtree レスポンスから直接 PaperMap を構築する。ApiItem/SubtreeItem の再変換を省く。 */
export function buildPaperMapFromSubtree(items: SubtreeItem[]): PaperMap {
  const papers: Paper[] = items.map((item) => ({
    id: item.id,
    title: item.label,
    description: item.description,
    content: item.summary_html ? item.summary_html : `<p>${item.description}</p>`,
    hue: DEFAULT_HUE,
    parentId: item.parent_id || null,
    childIds: item.child_ids || [],
    overrideCss: item.override_css || undefined,
  }));

  return buildPaperMap(papers);
}

/** Returns the root item ID (level 0 or a item without a parent). */
export function findRootItemId(items: ApiItem[]): string | undefined {
  const root = items.find((i) => i.level === 0 && !i.parentId);
  if (root) return root.id;
  // If no level-0 item exists, return a item without a parent.
  return items.find((i) => !i.parentId)?.id;
}
