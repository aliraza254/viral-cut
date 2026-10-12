import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Sparkles,
  Plus,
  RefreshCw,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  Lightbulb,
  Zap,
} from 'lucide-react';
import { PerformanceLog, ViralStrategyProfile } from '../types';

interface AnalyticsTrackerProps {
  onStrategyUpdated?: (strategy: ViralStrategyProfile) => void;
  activeStrategy: ViralStrategyProfile | null;
}

const DEFAULT_LOGS: PerformanceLog[] = [
  {
    id: 'log-1',
    date: '2026-03-24',
    platform: 'tiktok',
    title: 'The 3-Second Hormozi Offer Formula',
    hookType: 'Pattern Interrupt',
    views: 842000,
    retentionPct: 82,
    shares: 14200,
    comments: 3100,
    notes: 'Blew up on FYP! Opening "Stop selling PDFs" stopped thumbs immediately.',
  },
  {
    id: 'log-2',
    date: '2026-03-28',
    platform: 'reels',
    title: 'Why 99% Fail in the First 3 Seconds',
    hookType: 'High-Stakes Warning',
    views: 412000,
    retentionPct: 74,
    shares: 9800,
    comments: 1450,
    notes: 'Strong initial retention, slight dip at second 25 before loop.',
  },
  {
    id: 'log-3',
    date: '2026-04-02',
    platform: 'shorts',
    title: 'Neuroscience of Morning Dopamine Reset',
    hookType: 'Curiosity Loop',
    views: 920000,
    retentionPct: 88,
    shares: 21500,
    comments: 4200,
    notes: 'Massive save count. Visual B-roll of sun rays hit 90%+ retention.',
  },
  {
    id: 'log-4',
    date: '2026-04-05',
    platform: 'tiktok',
    title: 'Generic Productivity Tips (Control Test)',
    hookType: 'Generic Intro',
    views: 18400,
    retentionPct: 28,
    shares: 120,
    comments: 34,
    notes: 'Started with "Hey guys, in this video". 70% swiped away in 2 seconds.',
  },
];

export const AnalyticsTracker: React.FC<AnalyticsTrackerProps> = ({
  onStrategyUpdated,
  activeStrategy,
}) => {
  const [logs, setLogs] = useState<PerformanceLog[]>(() => {
    const saved = localStorage.getItem('viralcut_analytics_logs');
    return saved ? JSON.parse(saved) : DEFAULT_LOGS;
  });

  const [strategy, setStrategy] = useState<ViralStrategyProfile | null>(activeStrategy);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New log form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPlatform, setNewPlatform] = useState<'tiktok' | 'reels' | 'shorts'>('tiktok');
  const [newHookType, setNewHookType] = useState('Pattern Interrupt');
  const [newViews, setNewViews] = useState('150000');
  const [newRetention, setNewRetention] = useState('75');
  const [newShares, setNewShares] = useState('2500');
  const [newNotes, setNewNotes] = useState('');

  const saveLogs = (updated: PerformanceLog[]) => {
    setLogs(updated);
    localStorage.setItem('viralcut_analytics_logs', JSON.stringify(updated));
  };

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newEntry: PerformanceLog = {
      id: `log-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      platform: newPlatform,
      title: newTitle.trim(),
      hookType: newHookType,
      views: parseInt(newViews, 10) || 0,
      retentionPct: parseInt(newRetention, 10) || 50,
      shares: parseInt(newShares, 10) || 0,
      comments: Math.round((parseInt(newShares, 10) || 0) * 0.2),
      notes: newNotes.trim() || undefined,
    };

    saveLogs([newEntry, ...logs]);
    setShowAddForm(false);
    setNewTitle('');
    setNewNotes('');
  };

  const handleDeleteLog = (id: string) => {
    saveLogs(logs.filter((l) => l.id !== id));
  };

  // Run AI Strategy Optimization
  const handleCalibrateStrategy = async () => {
    setIsCalibrating(true);
    setError(null);

    try {
      const res = await fetch('/api/adjust-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          performanceLogs: logs.map((l) => ({
            platform: l.platform,
            title: l.title,
            hookType: l.hookType,
            views: l.views,
            retentionPct: `${l.retentionPct}%`,
            shares: l.shares,
            notes: l.notes,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to analyze performance data');
      }

      setStrategy(data);
      if (onStrategyUpdated) {
        onStrategyUpdated(data);
      }
    } catch (err: any) {
      setError(err.message || 'Strategy calibration failed');
    } finally {
      setIsCalibrating(false);
    }
  };

  const totalViews = logs.reduce((acc, l) => acc + l.views, 0);
  const avgRetention = logs.length > 0
    ? Math.round(logs.reduce((acc, l) => acc + l.retentionPct, 0) / logs.length)
    : 0;
  const bestPerforming = [...logs].sort((a, b) => b.views - a.views)[0];

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <BarChart3 className="h-4 w-4 text-emerald-400" />
            <span>Total Tracked Reach</span>
          </div>
          <div className="mt-2 text-2xl font-black text-white">
            {(totalViews / 1000000).toFixed(2)}M
          </div>
          <p className="mt-0.5 text-[11px] text-zinc-500">Across {logs.length} posted reels</p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <TrendingUp className="h-4 w-4 text-amber-400" />
            <span>Avg Viewer Retention</span>
          </div>
          <div className="mt-2 text-2xl font-black text-white">{avgRetention}%</div>
          <p className="mt-0.5 text-[11px] text-emerald-400">+34% vs standard video benchmark</p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Zap className="h-4 w-4 text-rose-400" />
            <span>Top Hook Category</span>
          </div>
          <div className="mt-2 text-base font-bold text-white truncate">
            {bestPerforming?.hookType || 'Pattern Interrupt'}
          </div>
          <p className="mt-0.5 text-[11px] text-zinc-500">
            {bestPerforming ? `${(bestPerforming.views / 1000).toFixed(0)}k peak views` : 'N/A'}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Sparkles className="h-4 w-4 text-purple-400" />
            <span>AI Strategy State</span>
          </div>
          <div className="mt-2">
            <button
              onClick={handleCalibrateStrategy}
              disabled={isCalibrating || logs.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 py-2 text-xs font-bold text-zinc-950 hover:opacity-95 disabled:opacity-50 transition-all cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isCalibrating ? 'animate-spin' : ''}`} />
              <span>{isCalibrating ? 'Optimizing...' : 'Calibrate AI Rules'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* AI Dynamic Strategy Profile (Feed back into generation) */}
      {strategy && (
        <div className="rounded-2xl border border-amber-500/40 bg-zinc-950 p-6 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                <Lightbulb className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Dynamic AI Strategy Calibrated</h3>
                <p className="text-xs text-zinc-400">
                  These insights are automatically injected into upcoming script generations.
                </p>
              </div>
            </div>

            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Active in Prompt Engine
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3.5">
                <span className="text-xs font-bold text-amber-400 block">Top Hook Diagnostics:</span>
                <p className="mt-1 text-xs text-zinc-300 leading-relaxed">
                  {strategy.topHookInsights}
                </p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3.5">
                <span className="text-xs font-bold text-rose-400 block">Drop-Off Remediation:</span>
                <p className="mt-1 text-xs text-zinc-300 leading-relaxed">
                  {strategy.dropOffAnalysis}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3.5">
                <span className="text-xs font-bold text-emerald-400 block">
                  Actionable Directives for Next Scripts:
                </span>
                <ul className="mt-2 space-y-1.5 text-xs text-zinc-300">
                  {strategy.directives.map((dir, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-amber-400 font-bold">•</span>
                      <span>{dir}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center gap-3 text-xs text-zinc-400 bg-zinc-900/30 p-3 rounded-xl border border-zinc-800">
                <div>
                  <span className="text-zinc-500 block text-[10px]">Optimal Duration:</span>
                  <span className="text-zinc-200 font-semibold">{strategy.optimalDuration}</span>
                </div>
                <span className="text-zinc-700">|</span>
                <div>
                  <span className="text-zinc-500 block text-[10px]">Recommended Pacing:</span>
                  <span className="text-zinc-200 font-semibold">
                    {strategy.pacingRecommendation || '140-155 WPM'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-800/50 bg-rose-950/20 p-3 text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* Performance Log Table */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div>
            <h4 className="text-sm font-bold text-white">Tracked Short-Form Posts</h4>
            <p className="text-xs text-zinc-400">
              Record metrics from your published TikTok, Reels, and Shorts to train your AI retention model.
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Log New Post</span>
          </button>
        </div>

        {/* Add Post Form */}
        {showAddForm && (
          <form onSubmit={handleAddLog} className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="text-[11px] font-medium text-zinc-300">Video Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Scaling Offer Breakdown"
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-zinc-300">Platform</label>
                <select
                  value={newPlatform}
                  onChange={(e) => setNewPlatform(e.target.value as any)}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:outline-none"
                >
                  <option value="tiktok">TikTok</option>
                  <option value="reels">Instagram Reels</option>
                  <option value="shorts">YouTube Shorts</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-zinc-300">Hook Formula Used</label>
                <select
                  value={newHookType}
                  onChange={(e) => setNewHookType(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:outline-none"
                >
                  <option value="Pattern Interrupt">Pattern Interrupt</option>
                  <option value="Curiosity Loop">Curiosity Loop</option>
                  <option value="High-Stakes Warning">High-Stakes Warning</option>
                  <option value="Story Arc">Fast Story Arc</option>
                  <option value="Actionable Breakdown">Actionable Breakdown</option>
                  <option value="Generic Intro">Generic / Slow Intro</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="text-[11px] font-medium text-zinc-300">Views Count</label>
                <input
                  type="number"
                  value={newViews}
                  onChange={(e) => setNewViews(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-zinc-300">Average Retention %</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={newRetention}
                  onChange={(e) => setNewRetention(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-zinc-300">Shares</label>
                <input
                  type="number"
                  value={newShares}
                  onChange={(e) => setNewShares(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-zinc-300">Audience Notes</label>
              <input
                type="text"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="What comments were repeated? Where was the spike?"
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded-lg px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-zinc-950 hover:bg-amber-400"
              >
                Save Post Metrics
              </button>
            </div>
          </form>
        )}

        {/* Table */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-[10px] uppercase font-semibold text-zinc-400">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Video Title</th>
                <th className="py-2.5 px-3">Platform</th>
                <th className="py-2.5 px-3">Hook Formula</th>
                <th className="py-2.5 px-3 text-right">Views</th>
                <th className="py-2.5 px-3 text-right">Retention</th>
                <th className="py-2.5 px-3 text-right">Shares</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-zinc-900/40 transition-colors">
                  <td className="py-3 px-3 font-mono text-zinc-400">{log.date}</td>
                  <td className="py-3 px-3 font-semibold text-zinc-100 max-w-xs truncate">
                    {log.title}
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-[11px] font-medium uppercase text-zinc-300">
                      {log.platform}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-amber-400 font-medium">{log.hookType}</span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-white">
                    {log.views.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    <span
                      className={`font-bold ${
                        log.retentionPct >= 75
                          ? 'text-emerald-400'
                          : log.retentionPct >= 50
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {log.retentionPct}%
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-zinc-300">
                    {log.shares.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleDeleteLog(log.id)}
                      className="text-zinc-500 hover:text-rose-400 transition-colors p-1"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
