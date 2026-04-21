import { buildPaperMap } from '@keyhole-koro/paper-in-paper';
import type { Paper, PaperMap } from '@keyhole-koro/paper-in-paper';
import { type User } from 'firebase/auth';
import { type Workspace } from '@/features/workspaces/api';
import { AuthPaper, type AuthMode } from '@/features/auth/AuthPaper';
import { WorkspaceListContent } from './WorkspaceListContent';
import { STATIC_PAPERS, PL, ROOT_ID } from './staticPapers';

export { ROOT_ID };

export function buildAppPaperMap({
  user,
  workspaces,
  authMode,
  loading,
  extraPapers,
  onAuthModeChange,
  onEmailSubmit,
  onGoogleSubmit,
  onLogout,
  onOpenWorkspace,
  onCreateWorkspace,
}: {
  user: User | null;
  workspaces: Workspace[];
  authMode: AuthMode;
  loading: boolean;
  extraPapers: Paper[];
  onAuthModeChange: (mode: AuthMode) => void;
  onEmailSubmit: () => void;
  onGoogleSubmit: () => void;
  onLogout: () => void;
  onOpenWorkspace: (workspaceId: string) => void;
  onCreateWorkspace: (name: string) => Promise<void>;
}): PaperMap {
  const wsNodeIds = extraPapers
    .filter((p) => p.parentId === 'workspaces')
    .map((p) => p.id);

  const paperMap = buildPaperMap([...STATIC_PAPERS, ...extraPapers]);

  // root content: ログイン後はワークスペースリンクに切り替え
  const rootPaper = paperMap.get(ROOT_ID);
  if (rootPaper && user) {
    paperMap.set(ROOT_ID, {
      ...rootPaper,
      content: (
        <section>
          <h2 style={{ margin: '0 0 8px', fontSize: '1rem' }}>Synthify</h2>
          <div style={{ display: 'grid', gap: 8 }}>
            <p style={{ margin: 0, lineHeight: 1.65, fontSize: '0.85rem' }}>
              複数のドキュメントを読み込み、<PL id="extraction">AIが概念・主張・根拠を抽出</PL>して
              <PL id="graph" />を自動生成。そのまま<PL id="workspaces">ワークスペースに入って</PL>
              <PL id="explore">paper-in-paper形式で探索</PL>できます。
            </p>
            <PL id="workspaces" variant="card" />
          </div>
        </section>
      ),
    });
  }

  // workspacesノードにws一覧コンテンツと動的childIdsを注入
  const workspacesNode = paperMap.get('workspaces');
  if (workspacesNode) {
    paperMap.set('workspaces', {
      ...workspacesNode,
      childIds: wsNodeIds,
      content: (
        <WorkspaceListContent
          workspaces={workspaces}
          loading={loading}
          onOpenWorkspace={onOpenWorkspace}
          onCreateWorkspace={onCreateWorkspace}
          onLogout={onLogout}
        />
      ),
    });
  }

  // authノードにログインフォームを注入
  const authNode = paperMap.get('auth');
  if (authNode) {
    paperMap.set('auth', {
      ...authNode,
      content: (
        <AuthPaper
          user={user}
          mode={authMode}
          loading={loading}
          onModeChange={onAuthModeChange}
          onEmailSubmit={onEmailSubmit}
          onGoogleSubmit={onGoogleSubmit}
          onLogout={onLogout}
          onCreateWorkspace={onCreateWorkspace}
        />
      ),
    });
  }

  return paperMap;
}
