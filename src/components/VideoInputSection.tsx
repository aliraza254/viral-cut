import React, { useState, useRef } from 'react';
import {
  Youtube,
  FileText,
  Sparkles,
  Link2,
  CheckCircle2,
  Clock,
  Zap,
  Target,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  Sliders,
  Upload,
  Film,
  Download,
  Check,
  FileCode,
  Layers,
  Play,
  Volume2,
} from 'lucide-react';
import { SAMPLE_VIDEOS, SampleVideo } from '../data/samples';
import { extractAudioFromMediaFile, subtitlesToSRT, subtitlesToVTT, subtitlesToJSON } from '../utils/audioExtractor';
import { triggerFileDownload } from '../utils/nleExport';
import { VideoSubtitleSegment, ExtractedSubtitlesResult } from '../types';

interface VideoInputSectionProps {
  onGenerate: (payload: {
    transcript: string;
    videoTitle: string;
    platform: 'tiktok' | 'reels' | 'shorts';
    language: 'english' | 'roman-urdu';
    viralStyle: string;
    clipDuration: string;
    targetAudience: string;
    videoUrl?: string;
  }) => Promise<void>;
  isLoading: boolean;
  platform: 'tiktok' | 'reels' | 'shorts';
  onPlatformChange: (p: 'tiktok' | 'reels' | 'shorts') => void;
  language: 'english' | 'roman-urdu';
  onLanguageChange: (lang: 'english' | 'roman-urdu') => void;
  onVideoExtracted?: (data: {
    videoUrl: string;
    fileName: string;
    subtitles: VideoSubtitleSegment[];
    fullTranscript: string;
    suggestedTitle: string;
  }) => void;
  onOpenVideoEditor?: () => void;
}

const VIRAL_STYLES = [
  {
    id: 'pattern-interrupt',
    label: 'Pattern Interrupt',
    desc: 'Visceral contrarian opening that shocks the viewer out of autopilot scrolling.',
    icon: Zap,
    tag: 'Highest 3s Retention',
  },
  {
    id: 'curiosity-loop',
    label: 'Curiosity Loop',
    desc: 'Open cliffhangers and withholding tactics that force the viewer to wait for the reveal.',
    icon: Sliders,
    tag: 'Longest Watch-Time',
  },
  {
    id: 'high-stakes',
    label: 'High-Stakes Warning',
    desc: 'Urgent loss-aversion angles ("Stop doing this immediately or you will lose X").',
    icon: AlertCircle,
    tag: 'High Share Rate',
  },
  {
    id: 'story-arc',
    label: 'Fast Story Arc',
    desc: '45-second micro-story with immediate friction, emotional twist, and moral resolution.',
    icon: Sparkles,
    tag: 'High Relatability',
  },
  {
    id: 'actionable-breakdown',
    label: 'Actionable Breakdown',
    desc: 'Punchy 3-step tactical framework with rapid visual proof and practical ROI.',
    icon: Target,
    tag: 'High Save Rate',
  },
];

export const VideoInputSection: React.FC<VideoInputSectionProps> = ({
  onGenerate,
  isLoading,
  platform,
  onPlatformChange,
  language,
  onLanguageChange,
  onVideoExtracted,
  onOpenVideoEditor,
}) => {
  const [inputMode, setInputMode] = useState<'upload' | 'url' | 'transcript'>('upload');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [transcript, setTranscript] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [viralStyle, setViralStyle] = useState('pattern-interrupt');
  const [clipDuration, setClipDuration] = useState('30-60s');
  const [targetAudience, setTargetAudience] = useState('Founders, creators, and ambitious mobile scrollers');
  const [fetchingInfo, setFetchingInfo] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchedVideoData, setFetchedVideoData] = useState<{
    videoId: string;
    title: string;
    author: string;
    thumbnailUrl: string;
    hasTranscript: boolean;
  } | null>(null);

  // Uploaded Video & Subtitles State
  const [uploadedVideoFile, setUploadedVideoFile] = useState<File | null>(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [isTranscribingVideo, setIsTranscribingVideo] = useState(false);
  const [transcribeStatusText, setTranscribeStatusText] = useState('');
  const [extractedSubtitles, setExtractedSubtitles] = useState<VideoSubtitleSegment[]>([]);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [copiedSubtitles, setCopiedSubtitles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load sample video
  const handleSelectSample = (sample: SampleVideo) => {
    setYoutubeUrl(sample.youtubeUrl);
    setTranscript(sample.transcript);
    setVideoTitle(sample.title);
    setInputMode('url');
    setFetchedVideoData({
      videoId: sample.videoId,
      title: sample.title,
      author: sample.creator,
      thumbnailUrl: `https://img.youtube.com/vi/${sample.videoId}/hqdefault.jpg`,
      hasTranscript: true,
    });
    setFetchError(null);
  };

  // Handle local video/audio file selection
  const handleFileChange = async (file: File) => {
    if (!file) return;
    setUploadedVideoFile(file);
    const url = URL.createObjectURL(file);
    setUploadedVideoUrl(url);
    setFetchError(null);
    setVideoTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '));

    // Automatically trigger audio extraction & subtitle transcription
    await processVideoFile(file, url);
  };

  // Extract audio & call transcribe endpoint
  const processVideoFile = async (file: File, url: string) => {
    setIsTranscribingVideo(true);
    setTranscribeStatusText('Reading media file...');
    setFetchError(null);

    try {
      // 1. Extract lightweight mono 16kHz WAV from video in browser
      const { audioBase64, mimeType } = await extractAudioFromMediaFile(file, 300, (status) => {
        setTranscribeStatusText(status);
      });

      setTranscribeStatusText('AI model transcribing speech & timestamps with Gemini 3.8 Flash...');

      // 2. Call backend transcription API
      const res = await fetch('/api/transcribe-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64,
          mimeType,
          language: language === 'roman-urdu' ? 'roman-urdu' : 'auto',
          videoTitle: file.name,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        let msg = data.error || 'Failed to extract subtitles from video';
        try {
          const parsed = typeof msg === 'string' ? JSON.parse(msg) : msg;
          if (parsed?.error?.message) msg = parsed.error.message;
        } catch {}
        throw new Error(msg);
      }

      const result: ExtractedSubtitlesResult = data;
      setExtractedSubtitles(result.subtitles || []);
      setDetectedLanguage(result.detectedLanguage || 'English');

      if (result.suggestedTitle) {
        setVideoTitle(result.suggestedTitle);
      }

      if (result.fullTranscript) {
        setTranscript(result.fullTranscript);
      }

      // Propagate upward if parent handler exists
      onVideoExtracted?.({
        videoUrl: url,
        fileName: file.name,
        subtitles: result.subtitles || [],
        fullTranscript: result.fullTranscript || '',
        suggestedTitle: result.suggestedTitle || file.name,
      });
    } catch (err: any) {
      console.error('Transcription error:', err);
      let cleanErr = err.message || 'Could not extract subtitles from uploaded video.';
      try {
        const parsed = JSON.parse(cleanErr);
        if (parsed?.error?.message) cleanErr = parsed.error.message;
      } catch {}
      setFetchError(cleanErr);
    } finally {
      setIsTranscribingVideo(false);
      setTranscribeStatusText('');
    }
  };

  // Export extracted subtitles
  const handleDownloadSRT = () => {
    if (extractedSubtitles.length === 0) return;
    const srt = subtitlesToSRT(extractedSubtitles);
    triggerFileDownload(
      srt,
      `${(videoTitle || 'subtitles').replace(/\s+/g, '_').toLowerCase()}.srt`,
      'text/plain;charset=utf-8'
    );
  };

  const handleDownloadVTT = () => {
    if (extractedSubtitles.length === 0) return;
    const vtt = subtitlesToVTT(extractedSubtitles);
    triggerFileDownload(
      vtt,
      `${(videoTitle || 'subtitles').replace(/\s+/g, '_').toLowerCase()}.vtt`,
      'text/vtt;charset=utf-8'
    );
  };

  const handleDownloadJSON = () => {
    if (extractedSubtitles.length === 0) return;
    const json = subtitlesToJSON(extractedSubtitles, {
      title: videoTitle,
      language: detectedLanguage,
    });
    triggerFileDownload(
      json,
      `${(videoTitle || 'subtitles').replace(/\s+/g, '_').toLowerCase()}_captions.json`,
      'application/json;charset=utf-8'
    );
  };

  // Fetch YouTube data
  const handleFetchYouTube = async () => {
    if (!youtubeUrl.trim()) {
      setFetchError('Please enter a YouTube video URL.');
      return;
    }

    setFetchingInfo(true);
    setFetchError(null);

    try {
      const res = await fetch('/api/extract-youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: youtubeUrl }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to extract video');
      }

      setFetchedVideoData({
        videoId: data.videoId,
        title: data.title,
        author: data.author,
        thumbnailUrl: data.thumbnailUrl,
        hasTranscript: data.hasTranscript,
      });
      setVideoTitle(data.title);

      if (data.transcript) {
        setTranscript(data.transcript);
      } else {
        setFetchError('Video metadata found, but YouTube automatic captions are disabled for this video. You can paste the transcript or notes manually below!');
        setInputMode('transcript');
      }
    } catch (err: any) {
      setFetchError(err.message || 'Could not fetch YouTube video.');
    } finally {
      setFetchingInfo(false);
    }
  };

  const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;
  const estimatedReadSec = Math.round((wordCount / 140) * 60);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transcript.trim()) {
      setFetchError('Please provide or extract a transcript to analyze.');
      return;
    }

    onGenerate({
      transcript,
      videoTitle: videoTitle || 'Untitled Video',
      platform,
      language,
      viralStyle,
      clipDuration,
      targetAudience,
      videoUrl: inputMode === 'upload' ? (uploadedVideoUrl || undefined) : (youtubeUrl || undefined),
    });
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-7 shadow-xl">
      {/* Sample Quick Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span className="font-medium text-zinc-300">Quick Test Samples:</span>
          <span>Pick a proven high-converting talk</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {SAMPLE_VIDEOS.map((sample) => (
            <button
              key={sample.id}
              type="button"
              onClick={() => handleSelectSample(sample)}
              className="rounded-lg border border-zinc-700/60 bg-zinc-800/70 px-2.5 py-1 text-xs text-zinc-300 hover:border-amber-500/60 hover:bg-zinc-800 hover:text-white transition-all flex items-center gap-1.5"
            >
              <Youtube className="h-3 w-3 text-red-500" />
              <span>{sample.creator}</span>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Ingestion Mode Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setInputMode('upload')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
              inputMode === 'upload'
                ? 'bg-amber-500 text-zinc-950 shadow-sm font-bold'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Upload className="h-4 w-4" />
            <span>Upload RAW Video (Auto Subtitles)</span>
            <span className="rounded bg-zinc-950/20 px-1.5 py-0.5 text-[10px] uppercase font-bold text-zinc-950">
              AI
            </span>
          </button>

          <button
            type="button"
            onClick={() => setInputMode('url')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
              inputMode === 'url'
                ? 'bg-amber-500 text-zinc-950 shadow-sm font-bold'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Youtube className="h-4 w-4" />
            <span>YouTube Video URL</span>
          </button>

          <button
            type="button"
            onClick={() => setInputMode('transcript')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
              inputMode === 'transcript'
                ? 'bg-amber-500 text-zinc-950 shadow-sm font-bold'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Direct Transcript / Notes</span>
          </button>
        </div>

        {/* Mode 1: Upload Video & Auto-Extract Subtitles */}
        {inputMode === 'upload' && (
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,audio/*,.mp4,.mov,.webm,.m4v,.mp3,.wav"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileChange(file);
              }}
              className="hidden"
            />

            {!uploadedVideoUrl && (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFileChange(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
                  isDragOver
                    ? 'border-amber-400 bg-amber-950/20 shadow-lg scale-[1.01]'
                    : 'border-zinc-700/80 bg-zinc-950/50 hover:border-zinc-600 hover:bg-zinc-900/60'
                }`}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 mb-3 border border-amber-500/20">
                  <Film className="h-7 w-7" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">
                  Upload RAW Video to Extract Subtitles & Captions
                </h4>
                <p className="text-xs text-zinc-400 max-w-md mb-4">
                  Drag and drop your video (MP4, MOV, WebM, M4V) or audio file. AI extracts the audio track and transcribes word-level subtitles with millisecond timestamps via Gemini 3.8 Flash.
                </p>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-zinc-950 shadow-md hover:bg-amber-400 transition-all"
                >
                  <Upload className="h-4 w-4" />
                  <span>Choose Video File</span>
                </button>
              </div>
            )}

            {/* In-Flight Transcribing State */}
            {isTranscribingVideo && (
              <div className="rounded-2xl border border-amber-500/40 bg-amber-950/20 p-5 text-center space-y-3">
                <div className="flex items-center justify-center gap-3">
                  <RefreshCw className="h-6 w-6 animate-spin text-amber-400" />
                  <span className="text-sm font-bold text-amber-300">
                    Extracting Subtitles & Transcribing Audio...
                  </span>
                </div>
                <p className="text-xs font-mono text-amber-200/80">
                  {transcribeStatusText || 'Processing media audio track...'}
                </p>
                <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden max-w-md mx-auto">
                  <div className="bg-amber-400 h-full w-2/3 animate-pulse" />
                </div>
              </div>
            )}

            {/* Video Preview & Subtitles Results Card */}
            {uploadedVideoUrl && !isTranscribingVideo && (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Film className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white truncate max-w-xs">
                          {uploadedVideoFile?.name || 'Uploaded Video'}
                        </span>
                        {detectedLanguage && (
                          <span className="rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 text-[10px] font-mono">
                            {detectedLanguage}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-zinc-400">
                        {extractedSubtitles.length} subtitle segments generated ({wordCount} words)
                      </span>
                    </div>
                  </div>

                  {/* Actions & Subtitle Exports */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadSRT}
                      disabled={extractedSubtitles.length === 0}
                      className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/80 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-200 hover:bg-zinc-700 hover:text-white transition-all disabled:opacity-50"
                      title="Download SubRip .SRT subtitle file"
                    >
                      <Download className="h-3.5 w-3.5 text-amber-400" />
                      <span>.SRT</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadVTT}
                      disabled={extractedSubtitles.length === 0}
                      className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/80 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-200 hover:bg-zinc-700 hover:text-white transition-all disabled:opacity-50"
                      title="Download WebVTT .VTT subtitle file"
                    >
                      <Download className="h-3.5 w-3.5 text-blue-400" />
                      <span>.VTT</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadJSON}
                      disabled={extractedSubtitles.length === 0}
                      className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/80 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-200 hover:bg-zinc-700 hover:text-white transition-all disabled:opacity-50"
                      title="Download structured JSON captions"
                    >
                      <FileCode className="h-3.5 w-3.5 text-purple-400" />
                      <span>.JSON</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-lg border border-zinc-700 bg-zinc-800/80 px-2.5 py-1.5 text-[11px] font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-all"
                    >
                      Replace Video
                    </button>
                  </div>
                </div>

                {/* Video Media Player & Subtitles Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                  <div className="md:col-span-5 rounded-xl overflow-hidden border border-zinc-800 bg-black aspect-[9/16] max-h-72 w-full mx-auto relative flex items-center justify-center">
                    <video
                      src={uploadedVideoUrl}
                      controls
                      playsInline
                      className="h-full w-full object-contain"
                    />
                  </div>

                  <div className="md:col-span-7 space-y-2">
                    <div className="flex items-center justify-between text-xs text-zinc-400 pb-1">
                      <span className="font-semibold text-zinc-200">
                        Extracted Captions & Timestamps:
                      </span>
                      <span className="font-mono text-[10px] text-amber-400">
                        {extractedSubtitles.length} Cuts
                      </span>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 text-xs">
                      {extractedSubtitles.map((sub, i) => (
                        <div
                          key={sub.id || i}
                          className="rounded-xl border border-zinc-800/80 bg-zinc-900/80 p-2.5 hover:border-zinc-700 transition-all"
                        >
                          <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
                            <span className="font-mono text-amber-400 font-semibold">
                              {sub.timecode || `00:${String(Math.floor(sub.startSec)).padStart(2, '0')} - 00:${String(Math.floor(sub.endSec)).padStart(2, '0')}`}
                            </span>
                            {sub.onScreenText && (
                              <span className="rounded bg-amber-500/10 text-amber-300 px-1.5 py-0.2 border border-amber-500/20 font-bold uppercase text-[9px]">
                                {sub.onScreenText}
                              </span>
                            )}
                          </div>
                          <p className="text-zinc-200 font-medium leading-relaxed">
                            {sub.text}
                          </p>
                          {sub.visualCue && (
                            <span className="mt-1 block text-[10px] text-zinc-500 truncate">
                              Cue: {sub.visualCue}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mode 2: YouTube URL Mode */}
        {inputMode === 'url' && (
          <div className="space-y-3">
            <label className="block text-xs font-medium text-zinc-300">
              YouTube Video Link
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <Link2 className="h-4 w-4 text-zinc-500" />
                </div>
                <input
                  type="text"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
                />
              </div>
              <button
                type="button"
                onClick={handleFetchYouTube}
                disabled={fetchingInfo || !youtubeUrl.trim()}
                className="flex items-center gap-2 rounded-xl bg-zinc-800 px-4 py-2.5 text-xs font-semibold text-zinc-100 hover:bg-zinc-700 disabled:opacity-50 transition-colors"
              >
                {fetchingInfo ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-amber-400" />
                    <span>Extracting...</span>
                  </>
                ) : (
                  <>
                    <span>Extract Info</span>
                  </>
                )}
              </button>
            </div>

            {/* Fetched Preview Card */}
            {fetchedVideoData && (
              <div className="flex items-center gap-4 rounded-xl border border-zinc-800/90 bg-zinc-950/70 p-3">
                <img
                  src={fetchedVideoData.thumbnailUrl}
                  alt={fetchedVideoData.title}
                  className="h-16 w-28 rounded-lg object-cover border border-zinc-800"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white truncate">
                      {fetchedVideoData.title}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-zinc-400">
                    <span>{fetchedVideoData.author}</span>
                    <span aria-hidden="true">·</span>
                    {fetchedVideoData.hasTranscript ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Captions ready
                      </span>
                    ) : (
                      <span className="text-amber-400">Captions not found, paste below</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Transcript Field */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-zinc-300">
              Video Transcript or Key Content Body
            </label>
            <div className="flex items-center gap-3 text-xs text-zinc-500">
              <span>{wordCount} words</span>
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> ~{estimatedReadSec}s speech
              </span>
            </div>
          </div>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={5}
            placeholder="Paste raw transcript, video spoken text, podcast notes, or monologue here..."
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 font-mono text-xs leading-relaxed text-zinc-200 placeholder-zinc-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
          />
        </div>

        {/* Error message */}
        {fetchError && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-800/50 bg-amber-950/40 p-3.5 text-xs text-amber-300">
            <div className="flex items-start gap-2.5 max-w-xl">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <div>
                <span className="font-semibold text-amber-200">Transcription Notice: </span>
                <span>{fetchError}</span>
              </div>
            </div>
            {uploadedVideoFile && uploadedVideoUrl && (
              <button
                type="button"
                onClick={() => processVideoFile(uploadedVideoFile, uploadedVideoUrl)}
                disabled={isTranscribingVideo}
                className="flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 px-3 py-1.5 text-xs font-bold text-zinc-950 transition-all shadow-sm shrink-0 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isTranscribingVideo ? 'animate-spin' : ''}`} />
                <span>Retry Transcription</span>
              </button>
            )}
          </div>
        )}

        {/* Viral Parameters Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Output Language */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-zinc-300">Output Language</label>
              <span className="text-[10px] text-amber-400 font-mono">
                {language === 'roman-urdu' ? 'Roman Urdu' : 'English'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1 rounded-xl border border-zinc-800 bg-zinc-950 p-1">
              <button
                type="button"
                onClick={() => onLanguageChange('english')}
                className={`rounded-lg py-1.5 text-xs font-semibold transition-all ${
                  language === 'english'
                    ? 'bg-amber-500 text-zinc-950 shadow-sm font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => onLanguageChange('roman-urdu')}
                className={`rounded-lg py-1.5 text-xs font-semibold transition-all ${
                  language === 'roman-urdu'
                    ? 'bg-emerald-500 text-zinc-950 shadow-sm font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Urdu (Roman)
              </button>
            </div>
          </div>

          {/* Platform */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">Target Platform</label>
            <div className="grid grid-cols-3 gap-1 rounded-xl border border-zinc-800 bg-zinc-950 p-1">
              <button
                type="button"
                onClick={() => onPlatformChange('tiktok')}
                className={`rounded-lg py-1.5 text-xs font-medium transition-all ${
                  platform === 'tiktok'
                    ? 'bg-rose-950/80 text-rose-200 border border-rose-800/80'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                TikTok
              </button>
              <button
                type="button"
                onClick={() => onPlatformChange('reels')}
                className={`rounded-lg py-1.5 text-xs font-medium transition-all ${
                  platform === 'reels'
                    ? 'bg-purple-950/80 text-purple-200 border border-purple-800/80'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Reels
              </button>
              <button
                type="button"
                onClick={() => onPlatformChange('shorts')}
                className={`rounded-lg py-1.5 text-xs font-medium transition-all ${
                  platform === 'shorts'
                    ? 'bg-red-950/80 text-red-200 border border-red-800/80'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Shorts
              </button>
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">Target Duration</label>
            <div className="grid grid-cols-3 gap-1 rounded-xl border border-zinc-800 bg-zinc-950 p-1">
              {['15-30s', '30-60s', '60-90s'].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setClipDuration(d)}
                  className={`rounded-lg py-1.5 text-xs font-medium transition-all ${
                    clipDuration === d
                      ? 'bg-zinc-800 text-amber-400 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Target Audience */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">Target Audience Focus</label>
            <input
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g. Gen Z investors, productivity nerds"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 focus:border-amber-500 focus:outline-none"
            />
          </div>
        </div>

        {language === 'roman-urdu' && (
          <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/20 px-3.5 py-2 text-xs text-emerald-300 flex items-center gap-2">
            <span className="font-bold text-emerald-400">🇵🇰 Urdu (Roman) Active:</span>
            <span>Spoken voiceover, 0-3s hooks, and kinetic captions will be generated in Roman Urdu for Pakistan & South Asian viral retention.</span>
          </div>
        )}

        {/* Viral Hook Psychology Styles */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-300">
            Psychological Retention Angle (Algorithm Driver)
          </label>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
            {VIRAL_STYLES.map((style) => {
              const Icon = style.icon;
              const isSelected = viralStyle === style.id;
              return (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => setViralStyle(style.id)}
                  className={`group relative flex flex-col justify-between rounded-xl border p-3 text-left transition-all ${
                    isSelected
                      ? 'border-amber-500/80 bg-amber-950/20 shadow-sm shadow-amber-950/30'
                      : 'border-zinc-800/90 bg-zinc-950/60 hover:border-zinc-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <Icon
                        className={`h-4 w-4 ${
                          isSelected ? 'text-amber-400' : 'text-zinc-500 group-hover:text-zinc-300'
                        }`}
                      />
                      <span className="text-[10px] text-zinc-400">{style.tag}</span>
                    </div>
                    <div
                      className={`mt-2 text-xs font-semibold ${
                        isSelected ? 'text-white' : 'text-zinc-300'
                      }`}
                    >
                      {style.label}
                    </div>
                    <p className="mt-1 text-[11px] leading-tight text-zinc-400">{style.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Primary CTA */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading || !transcript.trim()}
            className="relative flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500 bg-[length:200%_auto] px-6 py-3.5 text-sm font-bold text-zinc-950 shadow-lg shadow-rose-950/20 hover:opacity-95 disabled:opacity-50 transition-all cursor-pointer"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-zinc-950" />
                <span>Deconstructing Content & Engineering Viral Hooks...</span>
              </div>
            ) : (
              <>
                <Sparkles className="h-4 w-4 fill-zinc-950" />
                <span>Generate High-Retention Viral Reels & Scripts</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
