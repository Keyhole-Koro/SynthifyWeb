'use client';

import { useEffect, useRef, useState } from 'react';
import {
  listDocuments,
  createDocument,
  uploadFile,
  startProcessing,
  type Document,
} from '@/features/documents/api';

interface Props {
  workspaceId: string;
  workspaceName: string;
  onExploreGraph: () => Promise<void>;
}

const s = {
  section: { marginBottom: 12 } as React.CSSProperties,
  label: { fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: 6 },
  docItem: { display: 'flex', alignItems: 'center', gap: 6, padding: '5px 0', borderBottom: '1px solid var(--line)', fontSize: '0.78rem' } as React.CSSProperties,
  filename: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
  btn: (variant: 'primary' | 'secondary' | 'ghost' = 'secondary'): React.CSSProperties => ({
    border: variant === 'ghost' ? 'none' : '1px solid var(--link-border)',
    background: variant === 'primary' ? 'var(--accent)' : variant === 'ghost' ? 'transparent' : 'var(--link-bg)',
    color: variant === 'primary' ? '#fff' : 'var(--accent)',
    borderRadius: 6,
    padding: '5px 10px',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
  }),
};

export function WorkspacePaper({ workspaceId, workspaceName, onExploreGraph }: Props) {
  const [docs, setDocs] = useState<Document[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [graphLoading, setGraphLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listDocuments(workspaceId)
      .then(setDocs)
      .catch(console.error)
      .finally(() => setDocsLoading(false));
  }, [workspaceId]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    setUploading(true);
    setUploadError(null);
    try {
      const { document, upload_url } = await createDocument(
        workspaceId,
        file.name,
        file.type || 'application/octet-stream',
        file.size,
      );
      await uploadFile(upload_url, file);
      await startProcessing(document.document_id);
      setDocs((prev) => [document, ...prev]);
    } catch (err) {
      setUploadError(String(err));
    } finally {
      setUploading(false);
    }
  }

  async function handleExplore() {
    setGraphLoading(true);
    try {
      await onExploreGraph();
    } catch (err) {
      console.error('graph load failed:', err);
    } finally {
      setGraphLoading(false);
    }
  }

  return (
    <div style={{ paddingTop: 2 }}>
      <div style={s.section}>
        <p style={s.label}>{workspaceName}</p>

        {docsLoading ? (
          <p style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>読み込み中…</p>
        ) : docs.length === 0 ? (
          <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 8 }}>
            ドキュメントがありません
          </p>
        ) : (
          <div style={{ marginBottom: 8 }}>
            {docs.slice(0, 6).map((doc) => (
              <div key={doc.document_id} style={s.docItem}>
                <svg style={{ flexShrink: 0, width: 12, height: 12, color: 'var(--muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span style={s.filename}>{doc.filename}</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--muted)', flexShrink: 0 }}>
                  {formatDate(doc.created_at)}
                </span>
              </div>
            ))}
            {docs.length > 6 && (
              <p style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 4 }}>
                他 {docs.length - 6} 件
              </p>
            )}
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          style={{ display: 'none' }}
          accept=".pdf,.txt,.md,.docx"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <button
          style={s.btn('secondary')}
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? 'アップロード中…' : '+ ドキュメントを追加'}
        </button>
        {uploadError && (
          <p style={{ fontSize: '0.7rem', color: '#ef4444', marginTop: 4 }}>{uploadError}</p>
        )}
      </div>

      {docs.length > 0 && (
        <button
          style={s.btn('primary')}
          onClick={handleExplore}
          disabled={graphLoading}
        >
          {graphLoading ? '読み込み中…' : 'グラフを探索 →'}
        </button>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
}
