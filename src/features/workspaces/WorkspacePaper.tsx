'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useJobStatus } from '@/features/jobs/useJobStatus';
import { useWorkspaceJobStatuses } from '@/features/jobs/useWorkspaceJobStatuses';

interface WorkspacePaperProps {
  workspaceId: string;
  workspaceName: string;
  hasTree: boolean;
  childItems: { id: string; title: string }[];
  onSelectItem: (itemId: string) => void;
  onUploadFile: (file: File) => Promise<{ jobId: string; documentId: string }>;
  onProcessingComplete?: (jobId: string) => Promise<void> | void;
}

export function WorkspacePaper({
  workspaceId,
  workspaceName,
  hasTree,
  childItems,
  onSelectItem,
  onUploadFile,
  onProcessingComplete,
}: WorkspacePaperProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const completedJobRef = useRef<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { status: jobStatus, error: jobStatusError } = useJobStatus(workspaceId, activeJobId);
  const { jobs: workspaceJobs, error: workspaceJobsError } = useWorkspaceJobStatuses(workspaceId);
  const isTreeMissing = !hasTree;

  async function handleUpload(file: File) {
    setUploading(true);
    setUploadMessage(null);
    try {
      const job = await onUploadFile(file);
      setActiveJobId(job.jobId);
      completedJobRef.current = null;
      setUploadMessage('アップロードしました。解析を開始します。');
    } catch (err) {
      console.error('Upload failed:', err);
      setUploadMessage('アップロードに失敗しました。時間をおいて再試行してください。');
    } finally {
      setUploading(false);
    }
  }

  useEffect(() => {
    if (!jobStatus || !activeJobId) return;
    if (jobStatus.status !== 'succeeded') return;
    if (completedJobRef.current === activeJobId) return;
    completedJobRef.current = activeJobId;
    setUploadMessage('解析が完了しました。');
    void onProcessingComplete?.(activeJobId);
  }, [activeJobId, jobStatus, onProcessingComplete]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await handleUpload(file);
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    await handleUpload(file);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onUploadFile]);

  return (
    <div className="flex h-full flex-col gap-5 p-5">
      {/* Header */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-400/80">Workspace</p>
        <h2 className="mt-0.5 text-lg font-semibold tracking-tight text-stone-800">{workspaceName}</h2>
      </div>

      {/* Items list */}
      {childItems.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-400">Documents</p>
          <div className="space-y-0.5">
            {childItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onSelectItem(item.id)}
                className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-indigo-50"
              >
                <svg className="h-4 w-4 shrink-0 text-stone-300 group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="truncate text-sm text-stone-600 group-hover:text-indigo-700">{item.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Drop zone */}
      <div className={childItems.length > 0 ? '' : 'flex-1 flex flex-col justify-center'}>
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />

        {isTreeMissing || childItems.length === 0 ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={[
              'group flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-all cursor-pointer select-none',
              isDragging
                ? 'border-indigo-400 bg-indigo-50/60'
                : 'border-stone-200 hover:border-indigo-300 hover:bg-indigo-50/40',
              uploading ? 'cursor-wait opacity-60' : '',
            ].join(' ')}
          >
            <div className={[
              'flex h-11 w-11 items-center justify-center rounded-full transition-colors',
              isDragging ? 'bg-indigo-100' : 'bg-stone-100 group-hover:bg-indigo-100',
            ].join(' ')}>
              {uploading ? (
                <svg className="h-5 w-5 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                <svg className={['h-5 w-5 transition-colors', isDragging ? 'text-indigo-500' : 'text-stone-400 group-hover:text-indigo-500'].join(' ')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16V4m0 0l-4 4m4-4l4 4M4 20h16" />
                </svg>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-stone-700">
                {uploading ? 'アップロード中...' : isDragging ? 'ここにドロップ' : 'ファイルをアップロード'}
              </p>
              {!uploading && (
                <p className="mt-0.5 text-[11px] text-stone-400">
                  クリックまたはドラッグ&ドロップ
                </p>
              )}
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-stone-200 py-2.5 text-xs font-medium text-stone-400 transition-colors hover:border-indigo-300 hover:text-indigo-500 disabled:cursor-wait disabled:opacity-60"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            ファイルを追加
          </button>
        )}

        {uploadMessage && (
          <p className={[
            'mt-2.5 text-center text-[11px]',
            uploadMessage.includes('失敗') ? 'text-red-400' : 'text-indigo-500',
          ].join(' ')}>
            {uploadMessage}
          </p>
        )}

        {(jobStatus || jobStatusError) && (
          <div className="mt-3 rounded-lg border border-stone-200 bg-white px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <span className="truncate text-[11px] font-medium text-stone-600">
                {jobStatusError ?? jobStatus?.message ?? jobStatus?.currentStage ?? '解析中'}
              </span>
              {typeof jobStatus?.progress === 'number' && (
                <span className="text-[10px] font-semibold text-stone-400">{jobStatus.progress}%</span>
              )}
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-100">
              <div
                className={[
                  'h-full rounded-full transition-all',
                  jobStatus?.status === 'failed' ? 'bg-red-400' : 'bg-indigo-500',
                ].join(' ')}
                style={{ width: `${Math.max(4, Math.min(100, jobStatus?.progress ?? 8))}%` }}
              />
            </div>
          </div>
        )}

        {(workspaceJobs.length > 0 || workspaceJobsError) && (
          <div className="mt-4 rounded-xl border border-stone-200 bg-white/95 p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-400">Recent Jobs</p>
              {workspaceJobsError && <span className="text-[10px] text-red-400">sync error</span>}
            </div>
            <div className="space-y-2">
              {workspaceJobs.map((job) => (
                <div key={job.jobId} className="rounded-lg border border-stone-100 bg-stone-50 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-[11px] font-medium text-stone-700">
                      {job.message || job.currentStage || job.status}
                    </span>
                    <span className={jobStatusTone(job.status)}>{job.status}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-3 text-[10px] text-stone-400">
                    <span className="truncate">{job.documentId}</span>
                    <span>{typeof job.progress === 'number' ? `${job.progress}%` : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function jobStatusTone(status: string) {
  switch (status) {
    case 'succeeded':
      return 'text-[10px] font-semibold uppercase tracking-wide text-emerald-600';
    case 'failed':
      return 'text-[10px] font-semibold uppercase tracking-wide text-red-500';
    case 'running':
      return 'text-[10px] font-semibold uppercase tracking-wide text-indigo-500';
    default:
      return 'text-[10px] font-semibold uppercase tracking-wide text-stone-400';
  }
}
