import React, { useState, useEffect } from 'react';
import {
  Key,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  X,
  ShieldCheck,
  Cpu,
  Sparkles,
  Bot,
  Zap,
} from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySaved?: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  onKeySaved,
}) => {
  const [activeTab, setActiveTab] = useState<'gemini' | 'openai' | 'claude'>('gemini');

  // Key values
  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [claudeKey, setClaudeKey] = useState('');

  // Status values
  const [keyStatus, setKeyStatus] = useState<{
    gemini: { hasKey: boolean; maskedKey: string | null };
    openai: { hasKey: boolean; maskedKey: string | null };
    claude: { hasKey: boolean; maskedKey: string | null };
    activeProvider: string;
  }>({
    gemini: { hasKey: false, maskedKey: null },
    openai: { hasKey: false, maskedKey: null },
    claude: { hasKey: false, maskedKey: null },
    activeProvider: 'none',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSavedSuccess(false);
      setErrorMessage(null);

      // Load existing keys from localStorage
      const localGemini = localStorage.getItem('viralcut_gemini_api_key');
      if (localGemini) setGeminiKey(localGemini);
      const localOpenai = localStorage.getItem('viralcut_openai_api_key');
      if (localOpenai) setOpenaiKey(localOpenai);
      const localClaude = localStorage.getItem('viralcut_claude_api_key');
      if (localClaude) setClaudeKey(localClaude);

      // Fetch server status
      fetch('/api/config/status')
        .then((r) => r.json())
        .then((data) => {
          if (data.gemini) {
            setKeyStatus(data);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const gClean = geminiKey.trim();
      const oClean = openaiKey.trim();
      const cClean = claudeKey.trim();

      if (!gClean && !oClean && !cClean) {
        throw new Error('Please enter at least one API key (Gemini, OpenAI, or Claude).');
      }

      if (gClean) localStorage.setItem('viralcut_gemini_api_key', gClean);
      if (oClean) localStorage.setItem('viralcut_openai_api_key', oClean);
      if (cClean) localStorage.setItem('viralcut_claude_api_key', cClean);

      const res = await fetch('/api/config/set-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          geminiKey: gClean || undefined,
          openaiKey: oClean || undefined,
          claudeKey: cClean || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save API keys to server');
      }

      setSavedSuccess(true);
      onKeySaved?.();

      setTimeout(() => {
        onClose();
      }, 1100);
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not save API keys.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-5">
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
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">AI Provider Settings & Fallbacks</h3>
            <p className="text-xs text-zinc-400">
              Configure Google Gemini, OpenAI, and Anthropic Claude keys for viral creation.
            </p>
          </div>
        </div>

        {/* Local Python Whisper Banner */}
        <div className="flex items-center justify-between rounded-xl border border-blue-500/30 bg-blue-950/20 px-3.5 py-2.5 text-xs text-blue-300">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-blue-400" />
            <div>
              <span className="font-bold text-blue-200">Local Python Whisper: </span>
              <span className="text-zinc-300">Primary transcriber (100% offline, 0 API keys).</span>
            </div>
          </div>
          <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-bold">
            0-Key Default
          </span>
        </div>

        {/* Provider Tabs */}
        <div className="flex rounded-xl border border-zinc-800 bg-zinc-900/80 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('gemini')}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'gemini'
                ? 'bg-amber-500 text-zinc-950 font-bold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Google Gemini</span>
            {keyStatus.gemini.hasKey && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('openai')}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'openai'
                ? 'bg-amber-500 text-zinc-950 font-bold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            <span>OpenAI (GPT-4o)</span>
            {keyStatus.openai.hasKey && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('claude')}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'claude'
                ? 'bg-amber-500 text-zinc-950 font-bold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Bot className="h-3.5 w-3.5" />
            <span>Claude (3.5 Sonnet)</span>
            {keyStatus.claude.hasKey && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="space-y-4">
          {/* Tab 1: Google Gemini */}
          {activeTab === 'gemini' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-xs text-zinc-300 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">Google Gemini 3.8 Flash (Free Tier)</span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 font-semibold"
                  >
                    <span>Get Free Key</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Fastest cloud transcriber & viral script generator. Free tier includes 15 RPM.
                </p>
                {keyStatus.gemini.hasKey && (
                  <div className="text-[11px] text-emerald-400 font-mono flex items-center gap-1 pt-1">
                    <ShieldCheck className="h-3.5 w-3.5" /> Active: {keyStatus.gemini.maskedKey}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-zinc-200">
                  Gemini API Key
                </label>
                <input
                  type="password"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-xs font-mono text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
                />
              </div>
            </div>
          )}

          {/* Tab 2: OpenAI */}
          {activeTab === 'openai' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-xs text-zinc-300 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">OpenAI GPT-4o & Whisper API</span>
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 font-semibold"
                  >
                    <span>Get OpenAI Key</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Powers GPT-4o scriptwriting and high-fidelity cloud Whisper transcription fallback.
                </p>
                {keyStatus.openai.hasKey && (
                  <div className="text-[11px] text-emerald-400 font-mono flex items-center gap-1 pt-1">
                    <ShieldCheck className="h-3.5 w-3.5" /> Active: {keyStatus.openai.maskedKey}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-zinc-200">
                  OpenAI API Key
                </label>
                <input
                  type="password"
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder="sk-proj-..."
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-xs font-mono text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
                />
              </div>
            </div>
          )}

          {/* Tab 3: Claude */}
          {activeTab === 'claude' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-xs text-zinc-300 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">Anthropic Claude 3.5 / 3.7 Sonnet</span>
                  <a
                    href="https://console.anthropic.com/settings/keys"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 font-semibold"
                  >
                    <span>Get Claude Key</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Master retention copywriting and nuanced tone adaptation with Sonnet.
                </p>
                {keyStatus.claude.hasKey && (
                  <div className="text-[11px] text-emerald-400 font-mono flex items-center gap-1 pt-1">
                    <ShieldCheck className="h-3.5 w-3.5" /> Active: {keyStatus.claude.maskedKey}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-zinc-200">
                  Anthropic Claude API Key
                </label>
                <input
                  type="password"
                  value={claudeKey}
                  onChange={(e) => setClaudeKey(e.target.value)}
                  placeholder="sk-ant-api03-..."
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-xs font-mono text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
                />
              </div>
            </div>
          )}

          {/* Error & Success Messages */}
          {errorMessage && (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-950/30 p-2.5 text-xs text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {savedSuccess && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-2.5 text-xs text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>API Keys saved and activated successfully!</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-zinc-500">
              Keys are stored securely in local environment (.env).
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-5 py-2 text-xs font-bold text-zinc-950 transition-colors cursor-pointer disabled:opacity-50 shadow-md"
              >
                <Key className="h-3.5 w-3.5" />
                <span>{isSaving ? 'Saving...' : 'Save Keys'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
