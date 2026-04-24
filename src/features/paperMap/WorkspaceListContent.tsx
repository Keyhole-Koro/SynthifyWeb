import { useEffect, useRef, useState } from 'react';
import { type Workspace } from '@/features/workspaces/api';

interface Props {
  workspaces: Workspace[];
  loading: boolean;
  error?: Error | null;
  onOpenWorkspace: (workspaceId: string) => void;
  onCreateWorkspace: (name: string) => Promise<void>;
  onLogout: () => void;
}

export function WorkspaceListContent({ workspaces, loading, error, onOpenWorkspace, onCreateWorkspace, onLogout }: Props) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showCreateForm) setTimeout(() => inputRef.current?.focus(), 0);
  }, [showCreateForm]);

  function stop(e: React.PointerEvent) { e.stopPropagation(); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      await onCreateWorkspace(name);
      setShowCreateForm(false);
      setNewName('');
    } finally {
      setCreating(false);
    }
  }

  if (error) {
    return (
      <div style={{ paddingTop: 4 }}>
        <div style={{ padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, marginBottom: 12 }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#dc2626', margin: '0 0 2px' }}>ワークスペースを読み込めませんでした</p>
          <p style={{ fontSize: '0.7rem', color: '#ef4444', margin: 0 }}>しばらく時間をおいてから、再度お試しください。</p>
        </div>
        <button type="button" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()} onClick={onLogout}
          style={{ width: '100%', border: '1px solid #e2e8f0', background: 'white', borderRadius: 6, padding: '8px 0', fontSize: '0.8rem', fontWeight: 500, color: '#64748b', cursor: 'pointer' }}>
          ログアウト
        </button>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: 4 }}>
      {workspaces.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: 6 }}>
            ワークスペース
          </p>
          <div style={{ display: 'grid', gap: 6 }}>
            {workspaces.map((ws) => (
              <a
                key={ws.workspaceId}
                data-paper-id={ws.workspaceId}
                onPointerDown={(e) => { e.stopPropagation(); onOpenWorkspace(ws.workspaceId); }}
                onPointerUp={(e) => e.stopPropagation()}
                style={{ display: 'block', width: '100%', textAlign: 'left', border: '1px solid var(--link-border)', background: 'var(--link-bg)', borderRadius: 8, padding: '10px 12px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)', cursor: 'pointer', textDecoration: 'none' }}
              >
                {ws.name}
              </a>
            ))}
          </div>
        </div>
      )}

      {showCreateForm ? (
        <form onSubmit={handleSubmit} style={{ marginBottom: 10, display: 'grid', gap: 8, padding: 12, background: 'var(--surface-alt)', borderRadius: 8, border: '1px solid var(--link-border)' }}>
          <input
            ref={inputRef}
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="ワークスペース名"
            maxLength={64}
            disabled={creating}
            style={{ width: '100%', border: '1px solid var(--link-border)', background: 'var(--surface)', borderRadius: 6, padding: '8px 12px', fontSize: '0.85rem', outline: 'none' }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={creating || !newName.trim()} onPointerDown={stop} onPointerUp={stop}
              style={{ flex: 1, border: 'none', background: 'var(--accent)', borderRadius: 6, padding: '10px 0', fontSize: '0.85rem', fontWeight: 600, color: '#fff', cursor: creating ? 'wait' : 'pointer', opacity: creating || !newName.trim() ? 0.7 : 1 }}>
              {creating ? '作成中…' : '作成'}
            </button>
            <button type="button" disabled={creating} onPointerDown={stop} onPointerUp={stop}
              onClick={() => { setShowCreateForm(false); setNewName(''); }}
              style={{ border: '1px solid var(--link-border)', background: 'var(--surface)', borderRadius: 6, padding: '10px 12px', fontSize: '0.8rem', fontWeight: 500, color: 'var(--muted)', cursor: 'pointer' }}>
              キャンセル
            </button>
          </div>
        </form>
      ) : (
        <button type="button" onPointerDown={stop} onPointerUp={stop} onClick={() => setShowCreateForm(true)} disabled={loading}
          style={{ width: '100%', border: 'none', background: 'var(--accent)', borderRadius: 6, padding: '10px 0', fontSize: '0.85rem', fontWeight: 600, color: '#fff', cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1, marginBottom: 10 }}>
          新しいワークスペースを作る
        </button>
      )}

      <button type="button" onPointerDown={stop} onPointerUp={stop} onClick={onLogout}
        style={{ width: '100%', border: '1px solid var(--link-border)', background: 'var(--surface)', borderRadius: 6, padding: '8px 0', fontSize: '0.8rem', fontWeight: 500, color: 'var(--muted)', cursor: 'pointer' }}>
        ログアウト
      </button>
    </div>
  );
}
