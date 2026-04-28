'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { listAllJobs } from '@/features/tree/api';
import { AgentTraceViewer } from '@/features/tree/AgentTraceViewer';
import type { Job } from '@/gen/synthify/tree/v1/job_pb';
import { getInitialAuthUser, subscribeAuthUser, type AuthUser } from '@/features/auth/session';

export default function AuditPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState<AuthUser | null>(getInitialAuthUser);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    return subscribeAuthUser((nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
    });
  }, []);

  useEffect(() => {
    if (!authReady) {
      return;
    }
    if (!user) {
      setJobs([]);
      setSelectedJobId(null);
      setLoading(false);
      return;
    }

    async function fetchJobs() {
      setLoading(true);
      try {
        const data = await listAllJobs();
        setJobs(data);
      } catch (err) {
        console.error('Failed to fetch jobs:', err);
      } finally {
        setLoading(false);
      }
    }
    void fetchJobs();
  }, [authReady, user]);

  const filteredJobs = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return jobs.filter(j => 
      j.jobId.toLowerCase().includes(q) || 
      j.documentId.toLowerCase().includes(q)
    );
  }, [jobs, searchQuery]);

  if (loading) return <div className="p-10 text-stone-400">Loading audit data...</div>;
  if (!user) return <div className="p-10 text-stone-400">Sign in to view audit data.</div>;

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden">
      {/* Sidebar: Job List */}
      <div className="w-80 border-r border-stone-200 bg-white flex flex-col">
        <div className="p-4 border-b border-stone-100 bg-stone-50/50">
          <h1 className="text-sm font-bold tracking-tight text-stone-800 uppercase">Audit Dashboard</h1>
          <p className="text-[10px] text-stone-400 font-medium">Document Processing History</p>
          
          <div className="mt-4 relative">
            <input 
              type="text" 
              placeholder="Search by Job ID or Doc Name..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-[11px] bg-white border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            <svg className="absolute left-2.5 top-2 h-3.5 w-3.5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredJobs.length === 0 ? (
            <div className="p-10 text-center text-[11px] text-stone-400 italic">No jobs found matching "{searchQuery}"</div>
          ) : (
            filteredJobs.map((job) => (
              <button
                key={job.jobId}
                onClick={() => setSelectedJobId(job.jobId)}
                className={`w-full text-left p-4 border-b border-stone-50 transition-colors hover:bg-stone-50 ${selectedJobId === job.jobId ? 'bg-indigo-50/50 border-indigo-100' : ''}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] font-mono text-stone-400">{job.jobId.slice(0, 8)}...</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${job.status === 3 ? 'bg-emerald-100 text-emerald-700' : job.status === 4 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    {job.status === 1 ? 'Queued' : job.status === 2 ? 'Running' : job.status === 3 ? 'Success' : 'Failed'}
                  </span>
                </div>
                <div className="text-xs font-bold text-stone-700 truncate">{job.documentId}</div>
                <div className="text-[10px] text-stone-400 mt-1">{new Date(job.createdAt).toLocaleString()}</div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Content: Trace Viewer */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        {selectedJobId ? (
          <div className="flex-1 overflow-hidden">
            <AgentTraceViewer jobId={selectedJobId} />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-stone-300 p-10 text-center">
            <svg className="w-12 h-12 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <p className="text-sm font-medium">Select a job from the list to view its audit trace.</p>
            <p className="text-[11px] mt-1">Review agent decisions, tool calls, and data mutations in real-time.</p>
          </div>
        )}
      </div>
    </div>
  );
}
