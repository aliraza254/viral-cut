import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Zap,
  Check,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { HookVariation } from '../types';

interface HookManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentHook: string;
  reelTitle: string;
  transcriptContext: string;
  language?: 'english' | 'roman-urdu';
  onSelectHook: (newHook: string, onScreenText?: string, visualCue?: string) => void;
}

export const HookManagerModal: React.FC<HookManagerModalProps> = ({
  isOpen,
  onClose,
  currentHook,
  reelTitle,
  transcriptContext,
  language = 'english',
  onSelectHook,
}) => {
  const [variations, setVariations] = useState<HookVariation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateHooks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/regenerate-hook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reelTitle,
          currentHook,
          language,
          scriptTopic: transcriptContext.slice(0, 1000),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate hook variations');
      }

      setVariations(data.hooks || []);
    } catch (err: any) {
      setError(err.message || 'Error generating hooks');
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    if (isOpen && variations.length === 0) {
      handleGenerateHooks();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Viral Hook Lab</h2>
              <p className="text-xs text-zinc-400">
                The first 2.5 seconds decide 85% of your video's reach. Test alternate hooks.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Current Hook */}
        <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3.5">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-medium text-amber-400">Current 0-3s Opening Line:</span>
            <span>Active Hook</span>
          </div>
          <p className="mt-1 text-sm font-semibold text-zinc-100">"{currentHook}"</p>
        </div>

        {/* Action Bar */}
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-300">
            AI-Engineered Hook Alternatives
          </span>
          <button
            onClick={handleGenerateHooks}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
            <span>Generate New Angles</span>
          </button>
        </div>

        {/* Variations List */}
        <div className="mt-3 max-h-96 space-y-3 overflow-y-auto pr-1">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
              <RefreshCw className="h-6 w-6 animate-spin text-amber-400" />
              <p className="mt-3 text-xs">Simulating psychological scroll-stoppers...</p>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-rose-800/40 bg-rose-950/20 p-3 text-xs text-rose-300">
              {error}
            </div>
          )}

          {!isLoading &&
            variations.map((h, idx) => (
              <div
                key={idx}
                className="group relative rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 transition-all hover:border-amber-500/50 hover:bg-zinc-900"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400">{h.type}</span>
                  {h.predictedRetentionImpact && (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                      <TrendingUp className="h-3 w-3" />
                      {h.predictedRetentionImpact}
                    </span>
                  )}
                </div>

                <p className="mt-2 text-sm font-bold text-zinc-100">"{h.spokenLine}"</p>

                <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-zinc-400 sm:grid-cols-2">
                  <div className="rounded-lg bg-zinc-950/60 px-2.5 py-1.5">
                    <span className="text-zinc-500 block text-[10px]">On-Screen Text:</span>
                    <span className="text-zinc-200 font-medium">{h.onScreenText}</span>
                  </div>
                  <div className="rounded-lg bg-zinc-950/60 px-2.5 py-1.5">
                    <span className="text-zinc-500 block text-[10px]">Visual Scene Cue:</span>
                    <span className="text-zinc-300 truncate block">{h.visualCue}</span>
                  </div>
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => {
                      onSelectHook(h.spokenLine, h.onScreenText, h.visualCue);
                      onClose();
                    }}
                    className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-zinc-950 hover:bg-amber-400 transition-colors"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Apply This Hook</span>
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};
