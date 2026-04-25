import type { AuthUser } from '@/features/auth/session';

type AuthMode = 'login' | 'register';

type AuthPaperProps = {
  user: AuthUser | null;
  mode: AuthMode;
  loading: boolean;
  onModeChange: (mode: AuthMode) => void;
  onEmailSubmit: () => void;
  onGoogleSubmit: () => void;
  onLogout: () => void;
  onCreateWorkspace: (name: string) => Promise<void>;
};

export function AuthPaper({
  user,
  mode,
  loading,
  onModeChange,
  onEmailSubmit,
  onGoogleSubmit,
  onLogout,
}: AuthPaperProps) {
  const isLogin = mode === 'login';

  function stop(e: React.PointerEvent) { e.stopPropagation(); }

  if (user) {
    return (
      <div className="flex flex-col gap-4 pt-1">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-600">
            {(user.name || user.email).charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-stone-800">{user.name || user.email}</p>
            <p className="text-[11px] text-stone-400">ログイン中</p>
          </div>
        </div>
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

  return (
    <div className="flex flex-col gap-4 pt-1">
      {/* Heading */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-400/80">
          {isLogin ? 'Sign in' : 'Get started'}
        </p>
        <h3 className="mt-0.5 text-lg font-semibold tracking-tight text-stone-800">
          {isLogin ? 'おかえりなさい' : 'はじめよう'}
        </h3>
        <p className="mt-0.5 text-xs text-stone-400">
          {isLogin ? 'ドキュメントの知識ツリーを探索する' : '無料でワークスペースを作成する'}
        </p>
      </div>

      {/* Tab toggle */}
      <div className="flex rounded-lg bg-stone-100 p-1">
        {(['login', 'register'] as AuthMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onPointerDown={stop} onPointerUp={stop}
            onClick={() => onModeChange(m)}
            className={[
              'flex-1 rounded-md py-1.5 text-xs font-semibold transition-all',
              mode === m
                ? 'bg-white text-stone-800 shadow-sm'
                : 'text-stone-400 hover:text-stone-600',
            ].join(' ')}
          >
            {m === 'login' ? 'ログイン' : '新規登録'}
          </button>
        ))}
      </div>

      {/* Fields */}
      <div className="flex flex-col gap-2.5">
        {!isLogin && (
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-stone-400">お名前</label>
            <input
              type="text"
              placeholder="山田 太郎"
              onPointerDown={stop} onPointerUp={stop}
              className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 placeholder-stone-300 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        )}
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-stone-400">メールアドレス</label>
          <input
            type="email"
            placeholder="you@example.com"
            onPointerDown={stop} onPointerUp={stop}
            className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 placeholder-stone-300 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-stone-400">パスワード</label>
          <input
            type="password"
            placeholder="••••••••"
            onPointerDown={stop} onPointerUp={stop}
            className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 placeholder-stone-300 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      </div>

      {/* Primary action */}
      <button
        type="button"
        onPointerDown={stop} onPointerUp={stop}
        onClick={onEmailSubmit}
        disabled={loading}
        className="w-full rounded-lg bg-indigo-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-600 disabled:cursor-wait disabled:opacity-60"
      >
        {loading ? '処理中…' : isLogin ? 'ログイン' : 'アカウントを作成'}
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-stone-100" />
        <span className="text-[10px] font-medium text-stone-300">または</span>
        <div className="h-px flex-1 bg-stone-100" />
      </div>

      {/* Google */}
      <button
        type="button"
        onPointerDown={stop} onPointerUp={stop}
        onClick={onGoogleSubmit}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white py-2 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-50 disabled:cursor-wait disabled:opacity-60"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Google でログイン
      </button>
    </div>
  );
}

export type { AuthMode };
