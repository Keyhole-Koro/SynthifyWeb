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
      <div className="flex flex-col gap-3 pt-1">
        <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2.5">
          <p className="text-xs font-semibold text-red-600">ワークスペースを読み込めませんでした</p>
          <p className="mt-0.5 text-[11px] text-red-400">しばらく時間をおいてから、再度お試しください。</p>
        </div>
        <button
          type="button"
          onPointerDown={stop} onPointerUp={stop}
          onClick={onLogout}
          className="w-full rounded-lg border border-stone-200 py-2 text-xs font-medium text-stone-500 transition-colors hover:bg-stone-50"
        >
          ログアウト
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 pt-1">
      {/* Workspace list */}
      {workspaces.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-400">
            ワークスペース
          </p>
          <div className="flex flex-col gap-1">
            {workspaces.map((ws) => (
              <a
                key={ws.workspaceId}
                data-paper-id={ws.workspaceId}
                onPointerDown={(e) => { e.stopPropagation(); onOpenWorkspace(ws.workspaceId); }}
                onPointerUp={(e) => e.stopPropagation()}
                className="group flex items-center gap-3 rounded-lg border border-stone-100 bg-white px-3 py-2.5 text-sm font-medium text-stone-700 transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-stone-100 transition-colors group-hover:bg-indigo-100">
                  <svg className="h-3.5 w-3.5 text-stone-400 group-hover:text-indigo-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                  </svg>
                </div>
                <span className="truncate">{ws.name}</span>
                <svg className="ml-auto h-3.5 w-3.5 shrink-0 text-stone-300 opacity-0 transition-opacity group-hover:opacity-100 group-hover:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Create form / button */}
      {showCreateForm ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-indigo-400">新しいワークスペース</p>
          <input
            ref={inputRef}
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="ワークスペース名"
            maxLength={64}
            disabled={creating}
            onPointerDown={stop} onPointerUp={stop}
            className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-stone-800 placeholder-stone-300 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={creating || !newName.trim()}
              onPointerDown={stop} onPointerUp={stop}
              className="flex-1 rounded-lg bg-indigo-500 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-600 disabled:cursor-wait disabled:opacity-60"
            >
              {creating ? '作成中…' : '作成'}
            </button>
            <button
              type="button"
              disabled={creating}
              onPointerDown={stop} onPointerUp={stop}
              onClick={() => { setShowCreateForm(false); setNewName(''); }}
              className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-500 transition-colors hover:bg-stone-50 disabled:opacity-60"
            >
              キャンセル
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          disabled={loading}
          onPointerDown={stop} onPointerUp={stop}
          onClick={() => setShowCreateForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-stone-200 py-2.5 text-xs font-medium text-stone-400 transition-colors hover:border-indigo-300 hover:text-indigo-500 disabled:cursor-wait disabled:opacity-60"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新しいワークスペースを作る
        </button>
      )}

      {/* Logout */}
      <button
        type="button"
        onPointerDown={stop} onPointerUp={stop}
        onClick={onLogout}
        className="w-full rounded-lg border border-stone-200 py-2 text-xs font-medium text-stone-400 transition-colors hover:bg-stone-50 hover:text-stone-600"
      >
        ログアウト
      </button>
    </div>
  );
}
