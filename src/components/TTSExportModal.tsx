import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Mic,
  Download,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Volume2,
  Key,
  Sliders,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FileAudio,
} from 'lucide-react';
import { ReelScript } from '../types';

interface TTSExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reel: ReelScript;
  language?: 'english' | 'roman-urdu';
}

const GEMINI_VOICES = [
  { id: 'Kore', name: 'Kore', desc: 'Clear, balanced, dynamic viral delivery (Recommended)', tag: 'Best for Reels' },
  { id: 'Puck', name: 'Puck', desc: 'Energetic, fast, engaging podcast host', tag: 'High-Retention' },
  { id: 'Fenrir', name: 'Fenrir', desc: 'Deep, commanding, cinematic trailer tone', tag: 'Authority' },
  { id: 'Charon', name: 'Charon', desc: 'Documentary, dramatic, deep storytelling', tag: 'Storyteller' },
  { id: 'Zephyr', name: 'Zephyr', desc: 'Casual, fast conversational creator style', tag: 'Modern' },
];

const ELEVENLABS_VOICES = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', desc: 'Calm, engaging, high-clarity voice' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', desc: 'Deep, confident, warm authority' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', desc: 'Crisp, energetic, punchy creator' },
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', desc: 'Casual, young conversational' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', desc: 'Expressive, commercial hook style' },
];

export const TTSExportModal: React.FC<TTSExportModalProps> = ({
  isOpen,
  onClose,
  reel,
  language = 'english',
}) => {
  const [engine, setEngine] = useState<'gemini' | 'elevenlabs'>('gemini');
  const [geminiVoice, setGeminiVoice] = useState('Kore');
  const [elevenVoiceId, setElevenVoiceId] = useState('21m00Tcm4TlvDq8ikWAM');
  const [customVoiceId, setCustomVoiceId] = useState('');
  const [elevenApiKey, setElevenApiKey] = useState(() => {
    return localStorage.getItem('viralcut_elevenlabs_key') || '';
  });
  const [elevenModel, setElevenModel] = useState('eleven_multilingual_v2');
  const [stability, setStability] = useState(0.5);
  const [similarityBoost, setSimilarityBoost] = useState(0.75);

  const [scriptScope, setScriptScope] = useState<'full' | 'hook' | 'custom'>('full');
  const [selectedSegmentIdx, setSelectedSegmentIdx] = useState(0);

  // Output audio state
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [audioFileName, setAudioFileName] = useState<string>('voiceover.wav');
  const [isPlaying, setIsPlaying] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Compute text to speak
  const getTextToSpeak = (): string => {
    if (scriptScope === 'hook') {
      return reel.startingPunchline;
    }
    if (scriptScope === 'custom' && reel.segments[selectedSegmentIdx]) {
      return reel.segments[selectedSegmentIdx].spokenScript;
    }
    return reel.segments.map((s) => s.spokenScript).join(' ');
  };

  const handleGenerateTTS = async () => {
    setIsGenerating(true);
    setError(null);
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }

    const text = getTextToSpeak();
    const effectiveVoice =
      engine === 'elevenlabs'
        ? (customVoiceId.trim() || elevenVoiceId)
        : geminiVoice;

    try {
      const res = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          engine,
          voice: effectiveVoice,
          elevenLabsApiKey: elevenApiKey.trim() || undefined,
          modelId: elevenModel,
          stability,
          similarityBoost,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate voiceover');
      }

      if (data.audioBase64) {
        // Create playable blob URL
        const byteCharacters = atob(data.audioBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: data.mimeType || 'audio/wav' });
        const url = URL.createObjectURL(blob);

        setGeneratedAudioUrl(url);
        setAudioFileName(data.fileName || `voiceover.${data.format || 'wav'}`);

        // Persist ElevenLabs API key if provided
        if (elevenApiKey.trim()) {
          localStorage.setItem('viralcut_elevenlabs_key', elevenApiKey.trim());
        }
      }
    } catch (err: any) {
      setError(err.message || 'TTS generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const togglePlayAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleDownload = () => {
    if (!generatedAudioUrl) return;
    const link = document.createElement('a');
    link.href = generatedAudioUrl;
    link.download = audioFileName;
    link.click();
  };

  useEffect(() => {
    return () => {
      if (generatedAudioUrl) {
        URL.revokeObjectURL(generatedAudioUrl);
      }
    };
  }, [generatedAudioUrl]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
              <Mic className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Export Spoken Audio Voiceover (TTS)</h2>
              <p className="text-xs text-zinc-400">
                Generate and download studio-ready voiceover files for CapCut or Premiere Pro.
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

        {/* Engine Tabs */}
        <div className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-zinc-300">Choose Text-to-Speech Engine</label>
            <div className="mt-1.5 grid grid-cols-2 gap-2 rounded-xl border border-zinc-800 bg-zinc-900/90 p-1">
              <button
                type="button"
                onClick={() => setEngine('gemini')}
                className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all ${
                  engine === 'gemini'
                    ? 'bg-amber-500 text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Google Studio Neural TTS</span>
                <span className="text-[10px] opacity-80">(Built-in Free)</span>
              </button>

              <button
                type="button"
                onClick={() => setEngine('elevenlabs')}
                className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all ${
                  engine === 'elevenlabs'
                    ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Volume2 className="h-3.5 w-3.5" />
                <span>ElevenLabs AI Voice API</span>
                <span className="text-[10px] opacity-80">(Multilingual v2)</span>
              </button>
            </div>
          </div>

          {/* Script Scope Selector */}
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300">Portion to Voiceover</span>
              <span className="text-[11px] text-zinc-500 font-mono">
                {language === 'roman-urdu' ? 'Urdu (Roman) script' : 'English script'}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setScriptScope('full')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  scriptScope === 'full'
                    ? 'bg-zinc-800 text-amber-400 border border-amber-500/50'
                    : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                }`}
              >
                Full Reel Voiceover ({reel.segments.length} scenes)
              </button>
              <button
                type="button"
                onClick={() => setScriptScope('hook')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  scriptScope === 'hook'
                    ? 'bg-zinc-800 text-amber-400 border border-amber-500/50'
                    : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                }`}
              >
                0-3s Opening Hook Only
              </button>
              <button
                type="button"
                onClick={() => setScriptScope('custom')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  scriptScope === 'custom'
                    ? 'bg-zinc-800 text-amber-400 border border-amber-500/50'
                    : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                }`}
              >
                Specific Scene
              </button>
            </div>

            {scriptScope === 'custom' && (
              <div className="mt-2.5">
                <select
                  value={selectedSegmentIdx}
                  onChange={(e) => setSelectedSegmentIdx(parseInt(e.target.value, 10))}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-xs text-zinc-200"
                >
                  {reel.segments.map((seg, idx) => (
                    <option key={idx} value={idx}>
                      Scene {idx + 1} ({seg.timecode}): "{seg.spokenScript.slice(0, 50)}..."
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Voice Selector: Gemini */}
          {engine === 'gemini' && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300">
                Select Studio Neural Voice
              </label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {GEMINI_VOICES.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setGeminiVoice(v.id)}
                    className={`flex flex-col justify-between rounded-xl border p-3 text-left transition-all ${
                      geminiVoice === v.id
                        ? 'border-amber-500 bg-amber-950/20 shadow-sm'
                        : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${geminiVoice === v.id ? 'text-white' : 'text-zinc-200'}`}>
                        {v.name}
                      </span>
                      <span className="text-[10px] text-amber-400 font-mono">{v.tag}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-400 leading-tight">{v.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Voice Selector: ElevenLabs */}
          {engine === 'elevenlabs' && (
            <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <div>
                <label className="text-xs font-semibold text-zinc-300">ElevenLabs API Key</label>
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Key className="h-3.5 w-3.5 text-zinc-500" />
                  </div>
                  <input
                    type="password"
                    value={elevenApiKey}
                    onChange={(e) => setElevenApiKey(e.target.value)}
                    placeholder="xi-... (or leave empty if configured on server)"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 py-2 pl-9 pr-4 text-xs text-zinc-200 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300">Select Preset Voice</label>
                <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {ELEVENLABS_VOICES.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        setElevenVoiceId(v.id);
                        setCustomVoiceId('');
                      }}
                      className={`rounded-lg border p-2 text-left text-xs transition-all ${
                        elevenVoiceId === v.id && !customVoiceId
                          ? 'border-emerald-500 bg-emerald-950/30 text-white font-bold'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      <div className="truncate font-semibold">{v.name}</div>
                      <div className="truncate text-[10px] text-zinc-400">{v.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-400">
                  Or Paste Custom Voice ID (Cloned Voice)
                </label>
                <input
                  type="text"
                  value={customVoiceId}
                  onChange={(e) => setCustomVoiceId(e.target.value)}
                  placeholder="e.g. 21m00Tcm4TlvDq8ikWAM"
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:outline-none"
                />
              </div>

              {/* Sliders */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <div className="flex justify-between text-[11px] text-zinc-400">
                    <span>Stability</span>
                    <span className="font-mono text-zinc-200">{stability}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={stability}
                    onChange={(e) => setStability(parseFloat(e.target.value))}
                    className="mt-1 w-full accent-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-zinc-400">
                    <span>Similarity / Boost</span>
                    <span className="font-mono text-zinc-200">{similarityBoost}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={similarityBoost}
                    onChange={(e) => setSimilarityBoost(parseFloat(e.target.value))}
                    className="mt-1 w-full accent-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Script Preview Box */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Spoken Script Preview ({getTextToSpeak().split(' ').length} words)
            </span>
            <p className="mt-1 text-xs text-zinc-300 leading-relaxed max-h-24 overflow-y-auto font-mono">
              "{getTextToSpeak()}"
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-800/50 bg-rose-950/20 p-3 text-xs text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <p>{error}</p>
            </div>
          )}

          {/* Audio Player Card (when generated) */}
          {generatedAudioUrl && (
            <div className="rounded-2xl border border-emerald-500/40 bg-zinc-900/90 p-4 shadow-xl">
              <audio
                ref={audioRef}
                src={generatedAudioUrl}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={togglePlayAudio}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-zinc-950 shadow-md hover:bg-emerald-400 transition-colors"
                  >
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white truncate max-w-xs">
                        {audioFileName}
                      </span>
                      <span className="rounded bg-emerald-950 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
                        Ready
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-400">
                      Generated via {engine === 'elevenlabs' ? 'ElevenLabs' : 'Google Studio Neural'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 px-4 py-2 text-xs font-bold text-zinc-950 hover:opacity-95 shadow-md transition-all"
                >
                  <Download className="h-4 w-4" />
                  <span>Download Audio</span>
                </button>
              </div>
            </div>
          )}

          {/* Primary Action Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleGenerateTTS}
              disabled={isGenerating}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500 bg-[length:200%_auto] py-3 text-xs font-bold text-zinc-950 shadow-lg hover:opacity-95 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Synthesizing Studio Audio Voiceover...</span>
                </>
              ) : (
                <>
                  <FileAudio className="h-4 w-4" />
                  <span>
                    {generatedAudioUrl ? 'Regenerate Audio File' : 'Generate & Download Voiceover Audio'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
