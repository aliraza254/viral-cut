import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Flame,
  Layers,
  Wand2,
  FileCode,
  Mic,
  Copy,
  Check,
  Bookmark,
  Zap,
  Smartphone,
  Plus,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Terminal,
  Database,
  FileSpreadsheet,
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { Segment } from '../types';
import { VideoInputSection } from '../components/VideoInputSection';
import { SegmentEditor } from '../components/SegmentEditor';
import { MobileReelSimulator } from '../components/MobileReelSimulator';
import { RetentionAnalyticsGraph } from '../components/RetentionAnalyticsGraph';
import { HookManagerModal } from '../components/HookManagerModal';
import { TTSExportModal } from '../components/TTSExportModal';
import { NLEExportModal } from '../components/NLEExportModal';
import { EditorCutSheetModal } from '../components/EditorCutSheetModal';

export const ViralReelGenerator: React.FC = () => {
  const {
    currentReels,
    setCurrentReels,
    selectedReelIndex,
    setSelectedReelIndex,
    activeReel,
    currentVideoTitle,
    setCurrentVideoTitle,
    currentTranscript,
    setCurrentTranscript,
    currentVideoUrl,
    setCurrentVideoUrl,
    setUploadedMedia,
    language,
    setLanguage,
    activePlaybackSegment,
    setActivePlaybackSegment,
    activeStrategy,
    authUser,
    transferToCaptionStudio,
    saveCurrentProject,
    projectSavedToast,
    updateSegment,
    deleteSegment,
    moveSegment,
    addSegment,
    applyHook,
  } = useProject();

  // Local UI states
  const [inputCollapsed, setInputCollapsed] = useState(currentReels.length > 0);
  const [copiedScript, setCopiedScript] = useState(false);

  // Modals state
  const [isHookModalOpen, setIsHookModalOpen] = useState(false);
  const [isTTSModalOpen, setIsTTSModalOpen] = useState(false);
  const [isNLEModalOpen, setIsNLEModalOpen] = useState(false);
  const [isCutSheetOpen, setIsCutSheetOpen] = useState(false);

  // Real-Time LLM Streaming State
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingBuffer, setStreamingBuffer] = useState('');
  const [streamCharsCount, setStreamCharsCount] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Copy spoken script only
  const handleCopyScript = () => {
    if (!activeReel) return;
    const fullText = activeReel.segments.map((s) => s.spokenScript).join(' ');
    navigator.clipboard.writeText(fullText);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  // Cancel ongoing SSE stream
  const handleCancelStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
    }
  };

  // Generation handler with real-time SSE streaming and resilient fallback
  const handleGenerate = async (payload: {
    transcript: string;
    videoTitle: string;
    platform?: 'tiktok' | 'reels' | 'shorts' | string;
    language: 'english' | 'roman-urdu';
    viralStyle: string;
    clipDuration: string;
    targetAudience: string;
    videoUrl?: string;
  }) => {
    setIsGenerating(true);
    setStreamingBuffer('');
    setStreamCharsCount(0);
    setCurrentVideoTitle(payload.videoTitle);
    setCurrentTranscript(payload.transcript);
    if (payload.videoUrl) setCurrentVideoUrl(payload.videoUrl);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch('/api/generate-viral-reels-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortController.signal,
        body: JSON.stringify({
          transcript: payload.transcript,
          videoTitle: payload.videoTitle,
          platform: 'vertical-9-16',
          language: payload.language,
          viralStyle: payload.viralStyle,
          clipDuration: payload.clipDuration,
          targetAudience: payload.targetAudience,
          strategyFeedback: activeStrategy
            ? `Top insights: ${activeStrategy.topHookInsights}. Directives: ${activeStrategy.directives.join('; ')}`
            : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Readable stream not supported');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedJson = '';
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunkStr = decoder.decode(value, { stream: !done });
          const lines = chunkStr.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataContent = line.slice(6).trim();
              if (dataContent === '[DONE]') {
                done = true;
                break;
              }
              try {
                const parsed = JSON.parse(dataContent);
                if (parsed.error) {
                  throw new Error(parsed.error);
                }
                if (parsed.text) {
                  accumulatedJson += parsed.text;
                  setStreamingBuffer((prev) => prev + parsed.text);
                  setStreamCharsCount((prev) => prev + parsed.text.length);
                }
              } catch {
                // benign line parse skip
              }
            }
          }
        }
      }

      if (accumulatedJson) {
        const cleanJsonStr = accumulatedJson
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();

        const data = JSON.parse(cleanJsonStr);
        if (data.reels && Array.isArray(data.reels) && data.reels.length > 0) {
          setCurrentReels(data.reels);
          setSelectedReelIndex(0);
          setInputCollapsed(true);
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Streaming failed, attempting fallback endpoint...', err);
        try {
          const fallbackRes = await fetch('/api/generate-viral-reels', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transcript: payload.transcript,
              videoTitle: payload.videoTitle,
              platform: 'vertical-9-16',
              language: payload.language,
              viralStyle: payload.viralStyle,
              clipDuration: payload.clipDuration,
              targetAudience: payload.targetAudience,
            }),
          });
          const fbData = await fallbackRes.json();
          if (fbData.reels) {
            setCurrentReels(fbData.reels);
            setSelectedReelIndex(0);
            setInputCollapsed(true);
          }
        } catch (fbErr: any) {
          alert(`Generation error: ${err.message || fbErr.message}`);
        }
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  // Cross-tool transfer action
  const handleAutoEditInCaptionStudio = () => {
    if (!activeReel) return;
    const fallbackVideoUrl =
      currentVideoUrl ||
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
    transferToCaptionStudio(fallbackVideoUrl, activeReel.segments);
  };

  return (
    <div className="space-y-6">
      {/* Real-Time LLM Streaming Response Modal */}
      {isGenerating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="relative flex w-full max-w-2xl flex-col rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                  <Sparkles className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">Gemini 3.8 Flash • Real-Time Stream</h3>
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Generating viral hooks & scene timestamps live from content...
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-zinc-400">
                  {streamCharsCount.toLocaleString()} chars received
                </span>
                <button
                  type="button"
                  onClick={handleCancelStream}
                  className="rounded-lg bg-zinc-900 border border-zinc-800 px-2.5 py-1 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* Live Streaming Terminal */}
            <div className="mt-4 rounded-xl border border-zinc-800/90 bg-zinc-900/60 p-4 font-mono text-xs">
              <div className="flex items-center justify-between text-[11px] text-zinc-500 pb-2 border-b border-zinc-800 mb-2">
                <span className="flex items-center gap-1.5 text-amber-400">
                  <Terminal className="h-3.5 w-3.5" />
                  <span>Live Model Output Stream</span>
                </span>
                <span className="text-emerald-400">
                  Language: {language === 'roman-urdu' ? 'Urdu (Roman)' : 'English'}
                </span>
              </div>

              <div className="h-56 overflow-y-auto text-zinc-300 leading-relaxed font-mono whitespace-pre-wrap select-text pr-1">
                {streamingBuffer ? (
                  <>
                    {streamingBuffer.slice(-1800)}
                    <span className="inline-block w-2 h-4 ml-1 bg-amber-400 animate-pulse align-middle" />
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-2 py-10">
                    <RefreshCw className="h-5 w-5 animate-spin text-amber-400" />
                    <span>Connecting to Gemini streaming inference engine...</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-[11px] text-zinc-500">
              <span className="flex items-center gap-1.5 text-zinc-400">
                <Database className="h-3.5 w-3.5 text-emerald-400" />
                <span>Unified 9:16 vertical short-form format active</span>
              </span>
              <span className="text-amber-400 font-mono">Real-Time Tokens Active</span>
            </div>
          </div>
        </div>
      )}

      {/* Source Input Section */}
      <section className="mb-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            {currentReels.length > 0 ? 'Source Input & Parameters' : 'Step 1: Input YouTube Video or Transcript'}
          </span>
          {currentReels.length > 0 && (
            <button
              type="button"
              onClick={() => setInputCollapsed(!inputCollapsed)}
              className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-medium transition-colors cursor-pointer"
            >
              <span>{inputCollapsed ? 'Expand Source Input' : 'Collapse Input'}</span>
              {inputCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>

        {(!inputCollapsed || currentReels.length === 0) && (
          <VideoInputSection
            onGenerate={handleGenerate}
            isLoading={isGenerating}
            language={language}
            onLanguageChange={setLanguage}
            transcriptValue={currentTranscript}
            onTranscriptChange={setCurrentTranscript}
            onVideoExtracted={({ videoUrl, fileName, subtitles, fullTranscript, suggestedTitle }) => {
              setUploadedMedia({
                videoUrl,
                fileName,
                subtitles,
              });
              setCurrentTranscript(fullTranscript);
              if (suggestedTitle) setCurrentVideoTitle(suggestedTitle);
            }}
          />
        )}
      </section>

      {/* Main Reel Generation Results Area */}
      {currentReels.length > 0 && activeReel ? (
        <div className="space-y-6">
          {/* Concept Navigation Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 sm:p-4 shadow-xl">
            {/* Concept Variations Switcher */}
            <div className="flex flex-wrap items-center gap-2">
              {currentReels.map((reel, idx) => (
                <button
                  key={reel.id || idx}
                  type="button"
                  onClick={() => setSelectedReelIndex(idx)}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
                    selectedReelIndex === idx
                      ? 'bg-amber-500 text-zinc-950 shadow-md font-bold'
                      : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-800 hover:text-white'
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Concept 0{idx + 1}: {reel.hookType}</span>
                  <span
                    className={`text-[10px] font-bold ${
                      selectedReelIndex === idx ? 'text-zinc-950' : 'text-amber-400'
                    }`}
                  >
                    {reel.viralityScore}%
                  </span>
                </button>
              ))}
            </div>

            {/* Production Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleAutoEditInCaptionStudio}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 px-3 py-1.5 text-xs font-bold text-zinc-950 hover:brightness-110 transition-all shadow-sm shadow-amber-500/20 cursor-pointer"
                title="Open and style these captions in Tool 1: Caption Studio"
              >
                <Wand2 className="h-3.5 w-3.5" />
                <span>Auto-Edit in Caption Studio</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCutSheetOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 transition-colors cursor-pointer"
                title="View full production cut-sheet"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
                <span>Cut-Sheet</span>
              </button>

              <button
                type="button"
                onClick={() => setIsNLEModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-blue-500/60 bg-blue-950/40 px-3 py-1.5 text-xs font-bold text-blue-300 hover:bg-blue-900/40 transition-colors cursor-pointer"
                title="Export structured JSON, Premiere XML, or DaVinci Resolve EDL"
              >
                <FileCode className="h-3.5 w-3.5" />
                <span>Export NLE</span>
              </button>

              <button
                type="button"
                onClick={() => setIsTTSModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-amber-500/60 bg-amber-950/40 px-3 py-1.5 text-xs font-bold text-amber-400 hover:bg-amber-900/40 transition-colors cursor-pointer"
                title="Generate and download TTS audio voiceover"
              >
                <Mic className="h-3.5 w-3.5" />
                <span>TTS Audio</span>
              </button>

              <button
                type="button"
                onClick={handleCopyScript}
                className="flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800/80 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                {copiedScript ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-zinc-400" />}
                <span>{copiedScript ? 'Copied!' : 'Copy Script'}</span>
              </button>

              <button
                type="button"
                onClick={saveCurrentProject}
                className="flex items-center gap-1.5 rounded-xl bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700 border border-zinc-700 transition-colors cursor-pointer"
              >
                <Bookmark className="h-3.5 w-3.5 text-amber-400" />
                <span>Save Project</span>
              </button>
            </div>
          </div>

          {/* Project Saved Toast */}
          {projectSavedToast && (
            <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/40 p-3 text-xs text-emerald-300 flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-400" />
              <span>Project saved to your workspace successfully!</span>
            </div>
          )}

          {/* Viral Hook Spotlight Banner */}
          <div className="relative overflow-hidden rounded-2xl border border-amber-500/50 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 p-5 sm:p-6 shadow-2xl">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-3xl space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                    <Flame className="h-3.5 w-3.5" /> 0-3s Thumb-Stopper Opening Punchline
                  </span>
                  <span className="text-zinc-600" aria-hidden="true">·</span>
                  <span className="text-xs text-zinc-400">{activeReel.estimatedDuration} Total</span>
                  <span className="text-zinc-600" aria-hidden="true">·</span>
                  <span className="text-xs text-amber-400 font-semibold font-mono">
                    9:16 Vertical Short-Form
                  </span>
                </div>
                <h2 className="text-lg font-black tracking-tight text-white sm:text-xl">
                  "{activeReel.startingPunchline}"
                </h2>

                {/* Infinite loop punchline */}
                <div className="mt-3 flex items-start gap-2 pt-2 border-t border-zinc-800/80 text-xs text-zinc-400">
                  <span className="font-semibold text-rose-400 shrink-0">Closing Loop Line:</span>
                  <span className="text-zinc-300 italic">"{activeReel.closingPunchline}"</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsHookModalOpen(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 px-4 py-2 text-xs font-bold text-zinc-950 hover:opacity-95 transition-all shadow-md cursor-pointer"
                >
                  <Zap className="h-3.5 w-3.5 fill-zinc-950" />
                  <span>Test Alternate Hooks</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsTTSModalOpen(true)}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/60 bg-amber-950/40 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-900/50 transition-colors cursor-pointer"
                >
                  <Mic className="h-3.5 w-3.5" />
                  <span>Voiceover Audio (TTS)</span>
                </button>
              </div>
            </div>

            {/* Hashtags bar */}
            <div className="mt-4 flex flex-wrap items-center gap-1.5 pt-3 border-t border-zinc-800/60 text-xs">
              <span className="text-zinc-500 text-[11px]">Recommended tags:</span>
              {activeReel.hashtags.map((tag, idx) => (
                <span
                  key={idx}
                  className="rounded bg-zinc-800/80 px-2 py-0.5 text-[11px] font-medium text-amber-400/90"
                >
                  {tag.startsWith('#') ? tag : `#${tag}`}
                </span>
              ))}
            </div>
          </div>

          {/* Responsive 2-Column Grid: Left Segments / Right Sticky Sim & Retention Curve */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Left Column: Timeline Segments */}
            <div className="md:col-span-6 lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Chronological Scene Segments</h3>
                  <p className="text-xs text-zinc-400">
                    Edit spoken lines, visual cues, kinetic captions, and editor SFX.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addSegment}
                  className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-200 hover:bg-zinc-700 hover:text-white transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Scene</span>
                </button>
              </div>

              <div className="space-y-3">
                {activeReel.segments.map((segment, idx) => (
                  <SegmentEditor
                    key={idx}
                    segment={segment}
                    index={idx}
                    totalSegments={activeReel.segments.length}
                    isActivePlayback={idx === activePlaybackSegment}
                    onUpdate={(updated: Segment) => updateSegment(idx, updated)}
                    onDelete={() => deleteSegment(idx)}
                    onMoveUp={() => moveSegment(idx, idx - 1)}
                    onMoveDown={() => moveSegment(idx, idx + 1)}
                  />
                ))}
              </div>
            </div>

            {/* Right Column: Sticky Mobile Simulator & Retention Curve */}
            <div className="md:col-span-6 lg:col-span-5 space-y-6 md:sticky md:top-20">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5 shadow-xl">
                <div className="flex items-center justify-between mb-4 border-b border-zinc-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-rose-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Interactive 9:16 Mobile Sim
                    </h4>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-400">
                    Word-by-word kinetic captions
                  </span>
                </div>

                <div className="flex justify-center">
                  <MobileReelSimulator
                    reel={activeReel}
                    platform="reels"
                    language={language}
                    onActiveSegmentChange={setActivePlaybackSegment}
                  />
                </div>
              </div>

              {/* Retention Curve Graph */}
              <RetentionAnalyticsGraph reel={activeReel} />
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-8 sm:p-12 text-center shadow-2xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 shadow-xl shadow-rose-950/40">
            <Flame className="h-8 w-8 text-zinc-950 stroke-[2.5]" />
          </div>
          <h2 className="mt-5 text-2xl font-black text-white sm:text-3xl">
            Turn Long YouTube Videos Into High-Retention Viral Reels
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-zinc-400">
            Engineered for TikTok, Instagram Reels, and YouTube Shorts. Generates visceral
            0-3s pattern-interrupt hooks, scene-by-scene editor cut-sheets, kinetic captions,
            and mobile teleprompter scripts.
          </p>
        </div>
      )}

      {/* Alternate Hook Modal */}
      {activeReel && (
        <HookManagerModal
          isOpen={isHookModalOpen}
          onClose={() => setIsHookModalOpen(false)}
          currentHook={activeReel.startingPunchline}
          reelTitle={activeReel.title}
          transcriptContext={currentTranscript || activeReel.segments.map((s) => s.spokenScript).join(' ')}
          language={language}
          onSelectHook={applyHook}
        />
      )}

      {/* TTS Voiceover Export Modal */}
      {activeReel && (
        <TTSExportModal
          isOpen={isTTSModalOpen}
          onClose={() => setIsTTSModalOpen(false)}
          reel={activeReel}
          language={language}
        />
      )}

      {/* NLE Export Modal */}
      {activeReel && (
        <NLEExportModal
          isOpen={isNLEModalOpen}
          onClose={() => setIsNLEModalOpen(false)}
          reel={activeReel}
          platform="vertical-9-16"
          onOpenAIEditor={() => {
            setIsNLEModalOpen(false);
            handleAutoEditInCaptionStudio();
          }}
        />
      )}

      {/* Cut-Sheet Modal */}
      {activeReel && isCutSheetOpen && (
        <EditorCutSheetModal
          reel={activeReel}
          platform="vertical-9-16"
          onOpenTTS={() => {
            setIsCutSheetOpen(false);
            setIsTTSModalOpen(true);
          }}
          onOpenNLE={() => {
            setIsCutSheetOpen(false);
            setIsNLEModalOpen(true);
          }}
          onOpenAIEditor={() => {
            setIsCutSheetOpen(false);
            handleAutoEditInCaptionStudio();
          }}
        />
      )}
    </div>
  );
};

export default ViralReelGenerator;
