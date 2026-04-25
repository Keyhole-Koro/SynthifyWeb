import React, { useRef, useState } from 'react';

interface WorkspacePaperProps {
  workspaceId: string;
  workspaceName: string;
  hasTree: boolean;
  childItems: { id: string; title: string }[];
  onSelectItem: (itemId: string) => void;
  onUploadFile: (file: File) => Promise<void>;
}

export function WorkspacePaper({
  workspaceName,
  hasTree,
  childItems,
  onSelectItem,
  onUploadFile,
}: WorkspacePaperProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const isTreeMissing = !hasTree;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploading(true);
    setUploadMessage(null);
    try {
      await onUploadFile(file);
      setUploadMessage('アップロードしました。解析を開始します。');
    } catch (err) {
      console.error('Upload failed:', err);
      setUploadMessage('アップロードに失敗しました。時間をおいて再試行してください。');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-stone-800">{workspaceName}</h2>
        <p className="text-xs text-stone-500">Tree Structure</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-stone-400">
          Root Items
        </div>
        <div className="space-y-1">
          {childItems.length === 0 && (
            <div className="py-8 text-center text-sm text-stone-400">
              {isTreeMissing ? 'No tree yet. Upload a file to start.' : 'No items synthesized yet.'}
            </div>
          )}
          {childItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectItem(item.id)}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-stone-600 transition-colors hover:bg-stone-100 hover:text-indigo-600"
            >
              <svg className="h-4 w-4 shrink-0 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="truncate">{item.title}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 border-t border-stone-100 pt-3">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
        />
        {isTreeMissing ? (
          <>
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-indigo-50 py-2 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-100 disabled:cursor-wait disabled:opacity-70"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16V4m0 0l-4 4m4-4l4 4M4 20h16" />
              </svg>
              {uploading ? 'Uploading...' : 'Upload File'}
            </button>
            {uploadMessage && (
              <p className="mt-2 text-center text-[11px] text-stone-500">{uploadMessage}</p>
            )}
          </>
        ) : (
          <button className="flex w-full items-center justify-center gap-2 rounded-md bg-stone-50 py-2 text-xs font-medium text-stone-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Item
          </button>
        )}
      </div>
    </div>
  );
}
