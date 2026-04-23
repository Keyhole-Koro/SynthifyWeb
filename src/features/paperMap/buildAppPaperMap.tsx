import type { PaperMap, Paper } from '@keyhole-koro/paper-in-paper';
import type { Workspace } from '@/features/workspaces/api';

export const ROOT_ID = 'root';

interface BuildAppPaperMapProps {
  user: any;
  workspaces: Workspace[];
}

/**
 * アプリケーション全体の PaperMap を構築する。
 * 静的なアイテム（Auth, Workspaces）と動的なアイテム（各 Workspace）を組み合わせる。
 */
export function buildAppPaperMap({
  user,
  workspaces,
}: BuildAppPaperMapProps): PaperMap {
  const paperMap = new Map<string, Paper>();

  const wsItemIds = workspaces.map((w) => w.workspaceId);

  // 1. Root
  paperMap.set(ROOT_ID, {
    id: ROOT_ID,
    title: 'Synthify',
    description: 'Document Intelligence Platform',
    hue: 220,
    parentId: null,
    childIds: ['auth', 'workspaces'],
    content: '<p>Synthify へようこそ。ドキュメントを知識構造へ変換します。</p>',
  });

  // 2. Auth
  paperMap.set('auth', {
    id: 'auth',
    title: user ? 'アカウント' : 'ログイン',
    description: '認証とプロファイル',
    hue: 280,
    parentId: ROOT_ID,
    childIds: [],
    content: 'auth-component', // Rendered by custom component in PaperCanvas
  });

  // 3. Workspaces
  paperMap.set('workspaces', {
    id: 'workspaces',
    title: 'ワークスペース',
    description: 'あなたのプロジェクト一覧',
    hue: 200,
    parentId: ROOT_ID,
    childIds: wsItemIds,
    content: 'workspaces-component',
  });

  // 4. Individual Workspaces
  for (const ws of workspaces) {
    paperMap.set(ws.workspaceId, {
      id: ws.workspaceId,
      title: ws.name,
      description: 'ワークスペースの知識構造',
      hue: 200,
      parentId: 'workspaces',
      childIds: [],
      content: `<p>${ws.name} ワークスペースを読み込み中...</p>`,
    });
  }

  return paperMap;
}
