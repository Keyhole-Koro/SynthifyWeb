import { useMemo } from 'react';
import type { AuthMode } from '@/features/auth/AuthPaper';
import { AuthPaper } from '@/features/auth/AuthPaper';
import { WorkspaceListContent } from '@/features/paperMap/WorkspaceListContent';
import { AuthUser } from '@/features/auth/session';
import { Workspace } from '@/features/workspaces/api';
import { Paper, PaperMap } from '@keyhole-koro/paper-in-paper';

interface UseLandingPaperMapProps {
  user: AuthUser | null;
  loading: boolean;
  workspaces: Workspace[];
  workspaceError: Error | null;
  authMode: AuthMode;
  authAttention: number;
  workspacesAttention: number;
  workspacePaperGroups: Map<string, Paper[]>;
  setAuthMode: (mode: AuthMode) => void;
  handleEmailSubmit: () => void;
  handleGoogleSubmit: () => void;
  handleLogout: () => void;
  handleCreateWorkspace: (name: string) => Promise<void>;
  handleOpenWorkspace: (workspaceId: string) => Promise<void>;
  buildWsPaper: (workspaceId: string, childPapers: { id: string; title: string }[]) => Paper;
}

export function useLandingPaperMap({
  user,
  loading,
  workspaces,
  workspaceError,
  authMode,
  authAttention,
  workspacesAttention,
  workspacePaperGroups,
  setAuthMode,
  handleEmailSubmit,
  handleGoogleSubmit,
  handleLogout,
  handleCreateWorkspace,
  handleOpenWorkspace,
  buildWsPaper,
}: UseLandingPaperMapProps) {
  const rootPaper = useMemo<Paper>(() => ({
    id: 'root',
    title: 'Synthify',
    description: 'Document Intelligence Platform',
    hue: 220,
    parentId: null,
    childIds: ['auth', 'workspaces'],
    content: '<p>Synthify へようこそ。ドキュメントを知識構造へ変換します。</p>',
  }), []);

  const paperMap = useMemo<PaperMap>(() => {
    const map = new Map<string, Paper>();

    map.set('root', rootPaper);

    map.set('auth', {
      id: 'auth',
      title: user ? 'アカウント' : 'ログイン',
      description: '認証とプロファイル',
      hue: 280,
      attentionScore: authAttention,
      parentId: 'root',
      childIds: [],
      content: (
        <AuthPaper
          user={user}
          mode={authMode}
          loading={loading}
          onModeChange={setAuthMode}
          onEmailSubmit={handleEmailSubmit}
          onGoogleSubmit={handleGoogleSubmit}
          onLogout={handleLogout}
        />
      ),
    });

    map.set('workspaces', {
      id: 'workspaces',
      title: 'ワークスペース',
      description: 'あなたのプロジェクト一覧',
      hue: 200,
      attentionScore: workspacesAttention,
      parentId: 'root',
      childIds: workspaces.map((w) => w.workspaceId),
      content: (
        <WorkspaceListContent
          workspaces={workspaces}
          loading={loading}
          error={workspaceError}
          onOpenWorkspace={handleOpenWorkspace}
          onCreateWorkspace={handleCreateWorkspace}
          onLogout={handleLogout}
        />
      ),
    });

    for (const ws of workspaces) {
      const workspacePapers = workspacePaperGroups.get(ws.workspaceId);
      if (workspacePapers && workspacePapers.length > 0) {
        for (const paper of workspacePapers) {
          map.set(paper.id, paper);
        }
      } else {
        map.set(ws.workspaceId, buildWsPaper(ws.workspaceId, []));
      }
    }

    return map;
  }, [
    rootPaper, user, workspaces, workspaceError, authMode, loading,
    handleEmailSubmit, handleGoogleSubmit, handleLogout, handleCreateWorkspace,
    handleOpenWorkspace, buildWsPaper, authAttention, workspacesAttention,
    workspacePaperGroups, setAuthMode,
  ]);

  return { paperMap };
}
