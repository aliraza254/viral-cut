import React, { useState, useEffect } from 'react';
import { Key, CheckCircle2, AlertCircle, ExternalLink, X, ShieldCheck } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySaved?: (key: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  onKeySaved,
}) => {
  const [apiKey, setApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [maskedKey, setMaskedKey] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSavedSuccess(false);
      setErrorMessage(null);
      // Check stored key from localStorage or backend
      const localKey = localStorage.getItem('viralcut_gemini_api_key');
      if (localKey && localKey.trim().length > 10) {
        setHasExistingKey(true);
        setMaskedKey(`${localKey.slice(0, 6)}...${localKey.slice(-4)}`);
        setApiKey(localKey);
      }

      fetch('/api/config/status')
        .then((r) => r.json())
        .then((data) => {
          if (data.hasGeminiKey) {
            setHasExistingKey(true);
            setMaskedKey(data.maskedKey);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim() || apiKey.trim().length < 15) {
      setErrorMessage('Please enter a valid Gemini API Key (starts with AIza...)');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const cleanKey = apiKey.trim();
      localStorage.setItem('viralcut_gemini_api_key', cleanKey);

      // Save to server backend
      const res = await fetch('/api/config/set-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: cleanKey }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save API key to server');
      }

      setSavedSuccess(true);
      setHasExistingKey(true);
      setMaskedKey(`${cleanKey.slice(0, 6)}...${cleanKey.slice(-4)}`);
      onKeySaved?.(cleanKey);

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not save API key.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-5">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Key className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Google Gemini API Key</h3>
            <p className="text-xs text-zinc-400">
              Required for AI audio transcription & viral script generation.
            </p>
          </div>
        </div>

        {/* Existing Status Badge */}
        {hasExistingKey && (
          <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-3.5 py-2.5 text-xs text-emerald-300">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Active Key Configured:</span>
              <span className="font-mono text-emerald-200 font-bold">{maskedKey}</span>
            </div>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
              Ready
            </span>
          </div>
        )}

        {/* Free Key Guide Banner */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5 space-y-2 text-xs text-zinc-300">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white">Need a free API key?</span>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 font-semibold transition-colors"
            >
              <span>Get Free Key</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            1. Visit Google AI Studio (free, no credit card required).<br />
            2. Click <strong className="text-zinc-200">Create API key</strong> and copy it.<br />
            3. Paste it below and click Save.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-200">
              Paste Gemini API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-xs font-mono text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
              autoFocus
            />
          </div>

          {errorMessage && (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-950/30 p-2.5 text-xs text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {savedSuccess && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-2.5 text-xs text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>API Key saved successfully! Ready to transcribe.</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !apiKey.trim()}
              className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-5 py-2 text-xs font-bold text-zinc-950 transition-colors cursor-pointer disabled:opacity-50 shadow-md"
            >
              <Key className="h-3.5 w-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save API Key'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
