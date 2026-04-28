import React, { useEffect, useState, useMemo } from 'react';
import { listJobMutationLogs, JobMutationLog } from './api';

interface AgentTraceViewerProps {
  jobId: string;
}

interface FlowNode {
  log: Pick<JobMutationLog, 'mutationId' | 'targetId' | 'targetType' | 'mutationType' | 'createdAt' | 'provenanceJson' | 'beforeJson' | 'afterJson'>;
  children: FlowNode[];
}

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : 'Failed to fetch logs';
}

export const AgentTraceViewer: React.FC<AgentTraceViewerProps> = ({ jobId }) => {
  const [logs, setLogs] = useState<JobMutationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'flow' | 'list'>('flow');

  useEffect(() => {
    let interval: NodeJS.Timeout;
    async function fetchLogs() {
      try {
        const data = await listJobMutationLogs(jobId);
        setLogs(data);
        setError(null);
      } catch (err: unknown) {
        setError(errorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    if (jobId) {
      fetchLogs();
      interval = setInterval(fetchLogs, 3000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [jobId]);

  // ログを階層構造に変換する（簡易的な時系列ベースの推論）
  const flowRoot = useMemo(() => {
    if (logs.length === 0) return null;
    
    // 現在は単一の Orchestrator が全ての Tool を呼ぶ構造を想定し、
    // 仮想的なルート（Orchestrator）の下に全 ToolCall をぶら下げる。
    // 将来的に ADK が Caller 情報を持つようになれば、ここで正確な親子関係を構築可能。
    const root: FlowNode = {
      log: {
        mutationId: 'root', 
        beforeJson: '',
        afterJson: '',
        provenanceJson: '',
        targetId: 'Orchestrator', 
        targetType: 'agent', 
        mutationType: 'start', 
        createdAt: logs[0].createdAt 
      },
      children: logs.map(l => ({ log: l, children: [] }))
    };
    return root;
  }, [logs]);

  if (loading) return <div className="p-5 text-stone-400 text-xs animate-pulse">Tracing agent thoughts...</div>;
  if (error) return <div className="p-5 text-red-400 text-xs">Error: {error}</div>;

  return (
    <div className="flex h-full flex-col bg-stone-50 overflow-hidden">
      <div className="flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3">
        <h3 className="text-sm font-bold tracking-tight text-stone-800 flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
          Agent Trace Explorer
        </h3>
        <div className="flex gap-1 rounded-lg bg-stone-100 p-1">
          <button 
            onClick={() => setViewMode('flow')}
            className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${viewMode === 'flow' ? 'bg-white text-indigo-600 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
          >
            Flow
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
          >
            List
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {logs.length === 0 ? (
          <div className="flex h-full items-center justify-center text-stone-400 text-xs italic">
            Waiting for agent to initiate tasks...
          </div>
        ) : (
          viewMode === 'flow' ? (
            <div className="flex flex-col items-center gap-8 min-w-max pb-20">
              <FlowGraph node={flowRoot!} />
            </div>
          ) : (
            <div className="max-w-2xl mx-auto flex flex-col gap-4">
              {logs.map(log => <TraceListItem key={log.mutationId} log={log} />)}
            </div>
          )
        )}
      </div>
    </div>
  );
};

const FlowGraph: React.FC<{ node: FlowNode }> = ({ node }) => {
  return (
    <div className="flex flex-col items-center">
      <div className={`
        group relative px-6 py-4 rounded-xl border shadow-sm transition-all
        ${node.log.targetType === 'agent' 
          ? 'bg-indigo-600 border-indigo-500 text-white' 
          : 'bg-white border-stone-200 hover:border-indigo-300'}
      `}>
        <div className="flex flex-col items-center gap-1">
          <span className={`text-[9px] font-black uppercase tracking-[0.2em] opacity-60`}>
            {node.log.targetType}
          </span>
          <span className="text-xs font-bold">{node.log.targetId}</span>
        </div>
        
        {/* Connection line to children */}
        {node.children.length > 0 && (
          <div className="absolute left-1/2 -bottom-8 h-8 w-px bg-stone-300" />
        )}
      </div>

      <div className="mt-8 flex gap-6">
        {node.children.map((child, i) => (
          <div key={child.log.mutationId} className="relative pt-8">
            {/* Horizontal connection line */}
            {node.children.length > 1 && (
              <div className={`absolute top-0 h-px bg-stone-300 ${
                i === 0 ? 'left-1/2 right-0' : 
                i === node.children.length - 1 ? 'left-0 right-1/2' : 'left-0 right-0'
              }`} />
            )}
            <div className="absolute left-1/2 top-0 h-8 w-px bg-stone-300" />
            <FlowGraphItem node={child} />
          </div>
        ))}
      </div>
    </div>
  );
};

const FlowGraphItem: React.FC<{ node: FlowNode }> = ({ node }) => {
  const [showDetail, setShowDetail] = useState(false);
  const duration = node.log.provenanceJson ? JSON.parse(node.log.provenanceJson).duration_ms : null;

  return (
    <div className="flex flex-col items-center">
      <button 
        onClick={() => setShowDetail(!showDetail)}
        className={`
          flex flex-col items-center gap-1 px-5 py-3 rounded-lg border bg-white shadow-sm transition-all
          hover:shadow-md hover:scale-105 active:scale-95
          ${showDetail ? 'border-indigo-500 ring-2 ring-indigo-50/50' : 'border-stone-200'}
        `}
      >
        <span className="text-[8px] font-bold uppercase tracking-widest text-stone-400">Tool</span>
        <span className="text-[11px] font-bold text-stone-700">{node.log.targetId}</span>
        {duration && <span className="text-[9px] text-stone-400 font-medium">{duration}ms</span>}
      </button>

      {showDetail && (
        <div className="mt-3 w-80 z-10 bg-white border border-stone-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 text-left">
          <div className="bg-stone-50 px-4 py-2 border-b border-stone-100 flex justify-between items-center">
            <span className="text-[10px] font-bold text-stone-500 uppercase">Input / Output</span>
            <span className="text-[10px] text-stone-400">{new Date(node.log.createdAt).toLocaleTimeString()}</span>
          </div>
          <div className="p-4 space-y-4 max-h-[300px] overflow-auto">
            <div>
              <p className="text-[10px] font-bold text-indigo-400 mb-1">INPUT</p>
              <pre className="text-[10px] bg-stone-50 p-2 rounded border border-stone-100 font-mono whitespace-pre-wrap opacity-70">
                {JSON.stringify(JSON.parse(node.log.beforeJson || '{}'), null, 2)}
              </pre>
            </div>
            <div>
              <p className="text-[10px] font-bold text-emerald-500 mb-1">OUTPUT</p>
              <pre className="text-[10px] bg-stone-50 p-2 rounded border border-stone-100 font-mono whitespace-pre-wrap">
                {JSON.stringify(JSON.parse(node.log.afterJson || '{}'), null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TraceListItem: React.FC<{ log: JobMutationLog }> = ({ log }) => {
  // 既存のリスト表示コンポーネント（スタイル調整版）
  return (
    <div className="bg-white border border-stone-200 rounded-lg p-4 shadow-sm">
      <div className="flex justify-between">
        <span className="text-xs font-bold text-stone-800">{log.targetId}</span>
        <span className="text-[10px] text-stone-400">{new Date(log.createdAt).toLocaleTimeString()}</span>
      </div>
      <div className="text-[10px] text-stone-500 mt-1 uppercase tracking-wider">{log.targetType} • {log.mutationType}</div>
    </div>
  );
};
