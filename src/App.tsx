import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Zap,
  Bookmark,
  Share2,
  Copy,
  Check,
  Plus,
  RefreshCw,
  Sliders,
  TrendingUp,
  FileSpreadsheet,
  Smartphone,
  ChevronDown,
  ChevronUp,
  Layers,
  ArrowRight,
  Flame,
  Mic,
  Database,
  Terminal,
  FileCode,
  Wand2,
} from 'lucide-react';
import { ReelScript, Segment, SavedProject, ViralStrategyProfile, VideoSubtitleSegment } from './types';
import { Header } from './components/Header';
import { VideoInputSection } from './components/VideoInputSection';
import { SegmentEditor } from './components/SegmentEditor';
import { MobileReelSimulator } from './components/MobileReelSimulator';
import { RetentionAnalyticsGraph } from './components/RetentionAnalyticsGraph';
import { HookManagerModal } from './components/HookManagerModal';
import { EditorCutSheetModal } from './components/EditorCutSheetModal';
import { AnalyticsTracker } from './components/AnalyticsTracker';
import { SavedProjectsDrawer } from './components/SavedProjectsDrawer';
import { TTSExportModal } from './components/TTSExportModal';
import { AIVideoEditor } from './components/AIVideoEditor';
import { NLEExportModal } from './components/NLEExportModal';
import { SAMPLE_VIDEOS, DEFAULT_SAMPLE_REEL } from './data/samples';
import {
  saveProjectToFirestore,
  loadProjectsFromFirestore,
  deleteProjectFromFirestore,
  subscribeToProjects,
  signInWithGoogle,
  signOutUser,
  onAuthUserChanged,
} from './lib/firebase';
import { User } from 'firebase/auth';

export default function App() {
  const [activeTab, setActiveTab] = useState<'studio' | 'editor' | 'simulator' | 'cutsheet' | 'analytics'>('studio');
  const [platform, setPlatform] = useState<'tiktok' | 'reels' | 'shorts'>('tiktok');
  const [language, setLanguage] = useState<'english' | 'roman-urdu'>('english');

  // Google Authentication State
  const [authUser, setAuthUser] = useState<User | null>(null);

  const [currentReels, setCurrentReels] = useState<ReelScript[]>([DEFAULT_SAMPLE_REEL]);
  const [selectedReelIndex, setSelectedReelIndex] = useState(0);
  const [currentVideoTitle, setCurrentVideoTitle] = useState('How to Charge 10x More for the Exact Same Thing');
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | undefined>(undefined);
  const [uploadedMediaVideoUrl, setUploadedMediaVideoUrl] = useState<string | null>(null);
  const [uploadedMediaFileName, setUploadedMediaFileName] = useState<string | null>(null);
  const [uploadedMediaSubtitles, setUploadedMediaSubtitles] = useState<VideoSubtitleSegment[]>([]);

  // Real-time LLM Streaming State
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingBuffer, setStreamingBuffer] = useState('');
  const [streamCharsCount, setStreamCharsCount] = useState(0);
  const [inputCollapsed, setInputCollapsed] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [activePlaybackSegment, setActivePlaybackSegment] = useState(0);
  const [isHookModalOpen, setIsHookModalOpen] = useState(false);
  const [isTTSModalOpen, setIsTTSModalOpen] = useState(false);
  const [isNLEModalOpen, setIsNLEModalOpen] = useState(false);
  const [isSavedDrawerOpen, setIsSavedDrawerOpen] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [projectSavedToast, setProjectSavedToast] = useState(false);

  // Firestore Database Persistence
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [activeStrategy, setActiveStrategy] = useState<ViralStrategyProfile | null>(() => {
    const saved = localStorage.getItem('viralcut_active_strategy');
    return saved ? JSON.parse(saved) : null;
  });

  const activeReel: ReelScript = currentReels[selectedReelIndex] || currentReels[0] || DEFAULT_SAMPLE_REEL;

  // Subscribe to auth state and real-time Firestore database updates
  useEffect(() => {
    const unsubAuth = onAuthUserChanged((user) => {
      setAuthUser(user);
    });

    const unsubscribeProjects = subscribeToProjects((projects) => {
      setSavedProjects(projects);
    });

    return () => {
      unsubAuth();
      unsubscribeProjects();
    };
  }, []);

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        console.error('Sign-in error:', err);
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
    } catch (err) {
      console.error('Sign-out error:', err);
    }
  };

  // Handle generation call using real-time LLM streaming
  const handleGenerate = async (payload: {
    transcript: string;
    videoTitle: string;
    platform: 'tiktok' | 'reels' | 'shorts';
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
    setCurrentVideoUrl(payload.videoUrl);

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
          platform: payload.platform,
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
              } catch (e: any) {
                // benign line parse skip
              }
            }
          }
        }
      }

      // Parse assembled JSON response
      if (accumulatedJson) {
        // Clean markdown backticks if model wrapped JSON
        const cleanJsonStr = accumulatedJson
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();

        const data = JSON.parse(cleanJsonStr);
        if (data.reels && data.reels.length > 0) {
          setCurrentReels(data.reels);
          setSelectedReelIndex(0);
          setInputCollapsed(true);
          setActiveTab('studio');

          // Automatically persist generated scripts directly to Firestore Database
          const newProject: SavedProject = {
            id: `proj-${Date.now()}`,
            title: payload.videoTitle || 'Viral Reel Concept',
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            videoUrl: payload.videoUrl,
            platform: payload.platform,
            language: payload.language,
            reels: data.reels,
            selectedReelIndex: 0,
          };

          if (authUser) {
            try {
              await saveProjectToFirestore(newProject);
              setProjectSavedToast(true);
              setTimeout(() => setProjectSavedToast(false), 3000);
            } catch (dbErr) {
              console.warn('Firestore auto-save error:', dbErr);
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Streaming generation error:', err);
        // Fallback to standard non-streaming endpoint if streaming encounters network issue
        try {
          const fallbackRes = await fetch('/api/generate-viral-reels', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transcript: payload.transcript,
              videoTitle: payload.videoTitle,
              platform: payload.platform,
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
            setActiveTab('studio');
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

  const handleCancelStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
    }
  };

  // Update a segment in the active reel
  const handleUpdateSegment = (segIndex: number, updated: Segment) => {
    if (!activeReel) return;
    const newSegments = [...activeReel.segments];
    newSegments[segIndex] = updated;

    const newReel = {
      ...activeReel,
      segments: newSegments,
      startingPunchline: segIndex === 0 ? updated.spokenScript : activeReel.startingPunchline,
    };

    const newReels = [...currentReels];
    newReels[selectedReelIndex] = newReel;
    setCurrentReels(newReels);
  };

  // Delete segment
  const handleDeleteSegment = (segIndex: number) => {
    if (!activeReel || activeReel.segments.length <= 2) return;
    const newSegments = activeReel.segments.filter((_, idx) => idx !== segIndex);
    const newReel = { ...activeReel, segments: newSegments };
    const newReels = [...currentReels];
    newReels[selectedReelIndex] = newReel;
    setCurrentReels(newReels);
  };

  // Move segment up/down
  const handleMoveSegment = (fromIndex: number, toIndex: number) => {
    if (!activeReel) return;
    const newSegments = [...activeReel.segments];
    const [moved] = newSegments.splice(fromIndex, 1);
    newSegments.splice(toIndex, 0, moved);

    const newReel = {
      ...activeReel,
      segments: newSegments,
      startingPunchline: newSegments[0].spokenScript,
    };
    const newReels = [...currentReels];
    newReels[selectedReelIndex] = newReel;
    setCurrentReels(newReels);
  };

  // Add new segment
  const handleAddSegment = () => {
    if (!activeReel) return;
    const lastSeg = activeReel.segments[activeReel.segments.length - 1];
    const newStart = lastSeg ? lastSeg.endSec : 30;
    const newEnd = newStart + 8;

    const newSegment: Segment = {
      timecode: `00:${newStart.toString().padStart(2, '0')} - 00:${newEnd.toString().padStart(2, '0')}`,
      startSec: newStart,
      endSec: newEnd,
      spokenScript: 'And that is the exact reason why this changes everything.',
      visualCue: 'Sudden cut to medium shot, intense gaze into camera lens.',
      onScreenText: 'KEY TAKEAWAY ⚡',
      soundEffect: 'Fast riser whoosh',
      bRollKeywords: ['focused entrepreneur', 'digital screen'],
      musicMood: 'Tension build',
    };

    const newReel = {
      ...activeReel,
      segments: [...activeReel.segments, newSegment],
    };
    const newReels = [...currentReels];
    newReels[selectedReelIndex] = newReel;
    setCurrentReels(newReels);
  };

  // Apply hook variation from HookManagerModal
  const handleApplyHook = (newHook: string, onScreenText?: string, visualCue?: string) => {
    if (!activeReel) return;
    const firstSeg = activeReel.segments[0];
    const updatedFirstSeg: Segment = {
      ...firstSeg,
      spokenScript: newHook,
      onScreenText: onScreenText || firstSeg.onScreenText,
      visualCue: visualCue || firstSeg.visualCue,
    };

    const newSegments = [updatedFirstSeg, ...activeReel.segments.slice(1)];
    const newReel = {
      ...activeReel,
      startingPunchline: newHook,
      segments: newSegments,
    };

    const newReels = [...currentReels];
    newReels[selectedReelIndex] = newReel;
    setCurrentReels(newReels);
  };

  // Save current project to Firestore
  const handleSaveProject = async () => {
    if (currentReels.length === 0) return;
    const project: SavedProject = {
      id: `proj-${Date.now()}`,
      title: currentVideoTitle || 'Viral Reel Concept',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      videoUrl: currentVideoUrl,
      platform,
      language,
      reels: currentReels,
      selectedReelIndex,
    };

    try {
      await saveProjectToFirestore(project);
      setProjectSavedToast(true);
      setTimeout(() => setProjectSavedToast(false), 2500);
    } catch (err) {
      console.error('Error saving project to Firestore:', err);
    }
  };

  // Load project from drawer
  const handleSelectProject = (proj: SavedProject) => {
    setCurrentReels(proj.reels);
    setSelectedReelIndex(proj.selectedReelIndex || 0);
    setCurrentVideoTitle(proj.title);
    setCurrentVideoUrl(proj.videoUrl);
    setPlatform((proj.platform as any) || 'tiktok');
    if (proj.language) setLanguage(proj.language);
    setIsSavedDrawerOpen(false);
    setActiveTab('studio');
  };

  const handleDeleteSavedProject = async (id: string) => {
    try {
      await deleteProjectFromFirestore(id);
      setSavedProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error('Error deleting project from Firestore:', err);
    }
  };

  const handleCopyScriptOnly = () => {
    if (!activeReel) return;
    const fullText = activeReel.segments.map((s) => s.spokenScript).join(' ');
    navigator.clipboard.writeText(fullText);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-amber-500 selection:text-zinc-950">
      {/* Header */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        savedCount={savedProjects.length}
        onOpenSaved={() => setIsSavedDrawerOpen(true)}
        platform={platform}
        onPlatformChange={setPlatform}
        user={authUser}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
      />

      {/* Main Workspace */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
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
                    onClick={handleCancelStream}
                    className="rounded-lg bg-zinc-900 border border-zinc-800 px-2.5 py-1 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              {/* Streaming Live Terminal Window */}
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
                  <span>Will automatically persist to Firestore Database when finished</span>
                </span>
                <span className="text-amber-400 font-mono">Real-Time Tokens Active</span>
              </div>
            </div>
          </div>
        )}

        {/* Input Section (Collapsible when results exist) */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              {currentReels.length > 0 ? 'Source Input & Parameters' : 'Step 1: Input YouTube Video or Transcript'}
            </span>
            {currentReels.length > 0 && (
              <button
                onClick={() => setInputCollapsed(!inputCollapsed)}
                className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-medium transition-colors"
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
              platform={platform}
              onPlatformChange={setPlatform}
              language={language}
              onLanguageChange={setLanguage}
              onVideoExtracted={({ videoUrl, fileName, subtitles, fullTranscript, suggestedTitle }) => {
                setUploadedMediaVideoUrl(videoUrl);
                setUploadedMediaFileName(fileName);
                setUploadedMediaSubtitles(subtitles);
                setCurrentTranscript(fullTranscript);
                if (suggestedTitle) setCurrentVideoTitle(suggestedTitle);
              }}
              onOpenVideoEditor={() => setActiveTab('editor')}
            />
          )}
        </section>

        {/* Tab Views */}
        {activeTab === 'analytics' && (
          <AnalyticsTracker
            activeStrategy={activeStrategy}
            onStrategyUpdated={(strat) => {
              setActiveStrategy(strat);
              localStorage.setItem('viralcut_active_strategy', JSON.stringify(strat));
            }}
          />
        )}

        {activeTab === 'editor' && activeReel && (
          <AIVideoEditor
            reel={activeReel}
            platform={platform}
            language={language}
            onOpenNLEModal={() => setIsNLEModalOpen(true)}
            initialVideoUrl={uploadedMediaVideoUrl}
            initialFileName={uploadedMediaFileName}
            initialSubtitles={uploadedMediaSubtitles}
          />
        )}

        {activeTab === 'cutsheet' && activeReel && (
          <EditorCutSheetModal
            reel={activeReel}
            platform={platform}
            onOpenTTS={() => setIsTTSModalOpen(true)}
            onOpenNLE={() => setIsNLEModalOpen(true)}
            onOpenAIEditor={() => setActiveTab('editor')}
          />
        )}

        {activeTab === 'simulator' && activeReel && (
          <div className="flex flex-col items-center justify-center py-4">
            <MobileReelSimulator
              reel={activeReel}
              platform={platform}
              language={language}
              onActiveSegmentChange={setActivePlaybackSegment}
            />
          </div>
        )}

        {activeTab === 'studio' && (
          <>
            {currentReels.length > 0 && activeReel ? (
              <div className="space-y-6">
                {/* Concepts Navigation Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 sm:p-4 shadow-xl">
                  {/* Concept Tabs */}
                  <div className="flex flex-wrap items-center gap-2">
                    {currentReels.map((reel, idx) => (
                      <button
                        key={reel.id || idx}
                        onClick={() => setSelectedReelIndex(idx)}
                        className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                          selectedReelIndex === idx
                            ? 'bg-amber-500 text-zinc-950 shadow-md'
                            : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-800 hover:text-white'
                        }`}
                      >
                        <Layers className="h-3.5 w-3.5" />
                        <span>Concept 0{idx + 1}: {reel.hookType}</span>
                        <span className={`text-[10px] font-bold ${selectedReelIndex === idx ? 'text-zinc-950' : 'text-amber-400'}`}>
                          {reel.viralityScore}%
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Top Bar Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setActiveTab('editor')}
                      className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 px-3 py-1.5 text-xs font-bold text-zinc-950 hover:brightness-110 transition-all shadow-sm shadow-amber-500/20"
                      title="Let AI automatically edit your RAW video footage with captions"
                    >
                      <Wand2 className="h-3.5 w-3.5" />
                      <span>Auto-Edit RAW Video</span>
                    </button>

                    <button
                      onClick={() => setIsNLEModalOpen(true)}
                      className="flex items-center gap-1.5 rounded-xl border border-blue-500/60 bg-blue-950/40 px-3 py-1.5 text-xs font-bold text-blue-300 hover:bg-blue-900/40 transition-colors"
                      title="Export structured JSON, Premiere XML, or DaVinci Resolve EDL"
                    >
                      <FileCode className="h-3.5 w-3.5" />
                      <span>Export NLE (.JSON / .XML)</span>
                    </button>

                    <button
                      onClick={() => setIsTTSModalOpen(true)}
                      className="flex items-center gap-1.5 rounded-xl border border-amber-500/60 bg-amber-950/40 px-3 py-1.5 text-xs font-bold text-amber-400 hover:bg-amber-900/40 transition-colors"
                      title="Generate and download TTS audio voiceover"
                    >
                      <Mic className="h-3.5 w-3.5" />
                      <span>Export Audio (TTS)</span>
                    </button>

                    <button
                      onClick={handleCopyScriptOnly}
                      className="flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800/80 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 transition-colors"
                    >
                      {copiedScript ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-zinc-400" />}
                      <span>{copiedScript ? 'Copied!' : 'Copy Spoken Script'}</span>
                    </button>

                    <button
                      onClick={handleSaveProject}
                      className="flex items-center gap-1.5 rounded-xl bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700 border border-zinc-700 transition-colors"
                    >
                      <Bookmark className="h-3.5 w-3.5 text-amber-400" />
                      <span>Save Project</span>
                    </button>
                  </div>
                </div>

                {projectSavedToast && (
                  <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/40 p-3 text-xs text-emerald-300 flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span>Project saved to your local workspace successfully!</span>
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
                        <span className={`text-xs font-semibold ${language === 'roman-urdu' ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {language === 'roman-urdu' ? '🇵🇰 Urdu (Roman)' : '🇬🇧 English'}
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
                        onClick={() => setIsHookModalOpen(true)}
                        className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 px-4 py-2 text-xs font-bold text-zinc-950 hover:opacity-95 transition-all shadow-md cursor-pointer"
                      >
                        <Zap className="h-3.5 w-3.5 fill-zinc-950" />
                        <span>Test Alternate Hooks</span>
                      </button>

                      <button
                        onClick={() => setIsTTSModalOpen(true)}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/60 bg-amber-950/40 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-900/50 transition-colors"
                      >
                        <Mic className="h-3.5 w-3.5" />
                        <span>Voiceover Audio (TTS)</span>
                      </button>

                      <button
                        onClick={() => setActiveTab('simulator')}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 transition-colors"
                      >
                        <Smartphone className="h-3.5 w-3.5 text-rose-400" />
                        <span>Launch 9:16 Sim</span>
                      </button>
                    </div>
                  </div>

                  {/* Hashtags bar */}
                  <div className="mt-4 flex flex-wrap items-center gap-1.5 pt-3 border-t border-zinc-800/60 text-xs">
                    <span className="text-zinc-500 text-[11px]">Recommended tags:</span>
                    {activeReel.hashtags.map((tag, idx) => (
                      <span key={idx} className="rounded bg-zinc-800/80 px-2 py-0.5 text-[11px] font-medium text-amber-400/90">
                        {tag.startsWith('#') ? tag : `#${tag}`}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 2-Column Desktop Grid: Left Timeline Editor / Right Simulator Preview */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                  {/* Left Column: Timeline Segments */}
                  <div className="lg:col-span-7 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-white">Chronological Scene Segments</h3>
                        <p className="text-xs text-zinc-400">
                          Edit spoken lines, visual cues, kinetic captions, and editor SFX.
                        </p>
                      </div>
                      <button
                        onClick={handleAddSegment}
                        className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-200 hover:bg-zinc-700 hover:text-white transition-colors"
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
                          onUpdate={(updated) => handleUpdateSegment(idx, updated)}
                          onDelete={() => handleDeleteSegment(idx)}
                          onMoveUp={() => handleMoveSegment(idx, idx - 1)}
                          onMoveDown={() => handleMoveSegment(idx, idx + 1)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Right Column: Sticky Mobile Simulator & Retention Curve */}
                  <div className="lg:col-span-5 space-y-6">
                    <div className="sticky top-20 space-y-6">
                      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-xl">
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

                        <MobileReelSimulator
                          reel={activeReel}
                          platform={platform}
                          language={language}
                          onActiveSegmentChange={setActivePlaybackSegment}
                        />
                      </div>

                      {/* Retention Curve Graph */}
                      <RetentionAnalyticsGraph reel={activeReel} />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Empty state / Introduction banner */
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

                {/* 3 Step Breakdown */}
                <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3 text-left">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
                    <div className="text-amber-400 font-mono text-xs font-bold">01. INGEST</div>
                    <h3 className="mt-2 text-sm font-bold text-white">Deconstruct Any Talk</h3>
                    <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                      Paste a YouTube URL or transcript. ViralCut extracts the core psychological ideas and trims the fluff.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
                    <div className="text-rose-400 font-mono text-xs font-bold">02. HOOK & RE-WRITE</div>
                    <h3 className="mt-2 text-sm font-bold text-white">0-3s Thumb-Stoppers</h3>
                    <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                      Re-writes the message with contrarian pattern interrupts, visceral stakes, and seamless infinite loop closures.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
                    <div className="text-emerald-400 font-mono text-xs font-bold">03. PRODUCE & EDIT</div>
                    <h3 className="mt-2 text-sm font-bold text-white">Full Editor Cut-Sheet</h3>
                    <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                      Export timecoded visual scene cues, B-roll stock search tags, SFX markers, and mobile kinetic captions.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Alternate Hook Modal */}
      {activeReel && (
        <HookManagerModal
          isOpen={isHookModalOpen}
          onClose={() => setIsHookModalOpen(false)}
          currentHook={activeReel.startingPunchline}
          reelTitle={activeReel.title}
          transcriptContext={currentTranscript || activeReel.segments.map((s) => s.spokenScript).join(' ')}
          language={language}
          onSelectHook={handleApplyHook}
        />
      )}

      {/* Text-To-Speech (TTS) Voiceover Export Modal */}
      {activeReel && (
        <TTSExportModal
          isOpen={isTTSModalOpen}
          onClose={() => setIsTTSModalOpen(false)}
          reel={activeReel}
          language={language}
        />
      )}

      {/* NLE Timeline & Asset Exporter Modal */}
      {activeReel && (
        <NLEExportModal
          isOpen={isNLEModalOpen}
          onClose={() => setIsNLEModalOpen(false)}
          reel={activeReel}
          platform={platform}
          onOpenAIEditor={() => {
            setIsNLEModalOpen(false);
            setActiveTab('editor');
          }}
        />
      )}

      {/* Saved Projects Drawer */}
      <SavedProjectsDrawer
        isOpen={isSavedDrawerOpen}
        onClose={() => setIsSavedDrawerOpen(false)}
        projects={savedProjects}
        onSelectProject={handleSelectProject}
        onDeleteProject={handleDeleteSavedProject}
        user={authUser}
        onSignIn={handleSignIn}
      />
    </div>
  );
}
