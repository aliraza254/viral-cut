import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Upload,
  Download,
  Sparkles,
  Scissors,
  Wand2,
  Layers,
  Film,
  ZoomIn,
  Mic,
  FileCode,
  Check,
  ChevronRight,
  Eye,
  Sliders,
  Settings2,
  Maximize2,
  RefreshCw,
  Edit3,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { ReelScript, Segment, VideoSubtitleSegment, ExtractedSubtitlesResult } from '../types';
import { parseTimecodeRange, generateStructuredNLEJSON, generatePremiereProXML, generateDaVinciEDL, generateSRTSubtitles, triggerFileDownload } from '../utils/nleExport';
import { extractAudioFromMediaFile, subtitlesToSRT, subtitlesToVTT, subtitlesToJSON } from '../utils/audioExtractor';
import { sfx } from '../utils/sfxAudio';

interface AIVideoEditorProps {
  reel: ReelScript;
  platform: string;
  language?: 'english' | 'roman-urdu';
  onOpenNLEModal?: () => void;
  initialVideoUrl?: string | null;
  initialFileName?: string | null;
  initialSubtitles?: VideoSubtitleSegment[];
}

// Preset sample RAW video options for instant testing
const SAMPLE_RAW_VIDEOS = [
  {
    id: 'tech-speaker',
    label: 'Tech Creator (Talking Head)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumb: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    description: 'Crisp studio lighting talking head video, ideal for tech breakdowns.',
  },
  {
    id: 'podcast-creator',
    label: 'Podcast / Studio Host',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    thumb: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    description: 'Warm cinematic mic setup, ideal for business and storytelling hooks.',
  },
  {
    id: 'lifestyle-vlog',
    label: 'Dynamic Lifestyle Speaker',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    thumb: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80',
    description: 'Dynamic scenery vlog clip, ideal for high-energy retention pacing.',
  },
];

type CaptionStylePreset = 'hormozi' | 'beast' | 'clean' | 'neon';

export const AIVideoEditor: React.FC<AIVideoEditorProps> = ({
  reel,
  platform,
  language = 'english',
  onOpenNLEModal,
  initialVideoUrl,
  initialFileName,
  initialSubtitles,
}) => {
  // Video source state
  const [videoSourceUrl, setVideoSourceUrl] = useState<string>(
    initialVideoUrl || SAMPLE_RAW_VIDEOS[0].url
  );
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(
    initialFileName || null
  );
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Subtitle extraction & custom timing state
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeStatus, setTranscribeStatus] = useState('');
  const [transcribeError, setTranscribeError] = useState<string | null>(null);
  const [extractedSubtitles, setExtractedSubtitles] = useState<VideoSubtitleSegment[]>(
    initialSubtitles || []
  );
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [useExtractedSubtitles, setUseExtractedSubtitles] = useState<boolean>(
    Boolean(initialSubtitles && initialSubtitles.length > 0)
  );

  // Custom converted segments from extracted subtitles
  const [customSegments, setCustomSegments] = useState<Segment[] | null>(() => {
    if (initialSubtitles && initialSubtitles.length > 0) {
      return initialSubtitles.map((sub, i) => ({
        timecode: sub.timecode || `00:${String(Math.floor(sub.startSec)).padStart(2, '0')} - 00:${String(Math.floor(sub.endSec)).padStart(2, '0')}`,
        startSec: sub.startSec,
        endSec: sub.endSec,
        spokenScript: sub.text,
        visualCue: sub.visualCue || (i === 0 ? 'Close-up punch-in' : 'Medium shot cut'),
        onScreenText: sub.onScreenText || sub.text.split(' ').slice(0, 3).join(' ').toUpperCase(),
        soundEffect: sub.soundEffect || (i === 0 ? 'Impact boom' : 'Whoosh'),
        bRollKeywords: [],
      }));
    }
    return null;
  });

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');

  // Playback & Timing state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(30);
  const [isMuted, setIsMuted] = useState(false);

  // AI Editing Features State
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiAppliedTimestamp, setAiAppliedTimestamp] = useState<number | null>(Date.now());
  const [enablePunchInZooms, setEnablePunchInZooms] = useState(true);
  const [enableSFXAudio, setEnableSFXAudio] = useState(true);
  const [enableBRollOverlays, setEnableBRollOverlays] = useState(true);
  const [enableCaptions, setEnableCaptions] = useState(true);
  const [captionStyle, setCaptionStyle] = useState<CaptionStylePreset>('hormozi');
  const [captionPositionY, setCaptionPositionY] = useState<number>(75); // percent from top
  const [captionFontSize, setCaptionFontSize] = useState<number>(24);

  // Export recording state
  const [isExportingVideo, setIsExportingVideo] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastSfxTriggerRef = useRef<number>(-1);

  // Segments selection: use extracted subtitles segments if toggled, otherwise reel segments
  const activeSourceSegments = useMemo(() => {
    if (useExtractedSubtitles && customSegments && customSegments.length > 0) {
      return customSegments;
    }
    return reel.segments;
  }, [useExtractedSubtitles, customSegments, reel.segments]);

  // Normalized segments with calculated timing
  const normalizedSegments = useMemo(() => {
    return activeSourceSegments.map((seg, idx) => {
      const range = (seg.startSec !== undefined && seg.endSec !== undefined && seg.endSec > seg.startSec)
        ? { startSec: seg.startSec, endSec: seg.endSec }
        : parseTimecodeRange(seg.timecode, idx, 3.5);
      return {
        ...seg,
        ...range,
        duration: Math.max(1, range.endSec - range.startSec),
        isPunchIn: idx === 0 || idx % 2 === 1, // Hook & alternating punchlines
      };
    });
  }, [activeSourceSegments]);

  const totalCalculatedDuration = useMemo(() => {
    return normalizedSegments.reduce((max, s) => Math.max(max, s.endSec), 0) || 30;
  }, [normalizedSegments]);

  // Current active scene
  const currentSegmentIndex = useMemo(() => {
    const idx = normalizedSegments.findIndex(
      seg => currentTime >= seg.startSec && currentTime < seg.endSec
    );
    if (idx !== -1) return idx;
    if (currentTime >= totalCalculatedDuration) return normalizedSegments.length - 1;
    return 0;
  }, [normalizedSegments, currentTime, totalCalculatedDuration]);

  const currentSegment = normalizedSegments[currentSegmentIndex] || normalizedSegments[0];

  // Calculate word-level tracking within the current segment
  const currentWordHighlight = useMemo(() => {
    if (!currentSegment || !currentSegment.spokenScript) return { words: [], activeIndex: 0 };
    const words = currentSegment.spokenScript.trim().split(/\s+/);
    if (words.length === 0) return { words: [], activeIndex: 0 };

    const segDuration = Math.max(0.5, currentSegment.endSec - currentSegment.startSec);
    const segElapsed = Math.max(0, currentTime - currentSegment.startSec);
    const progress = Math.min(1, Math.max(0, segElapsed / segDuration));

    const activeIndex = Math.min(words.length - 1, Math.floor(progress * words.length));
    return { words, activeIndex };
  }, [currentSegment, currentTime]);

  // Handle video loadedmetadata
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || totalCalculatedDuration);
    }
  };

  // Video time update loop
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const t = videoRef.current.currentTime;
    setCurrentTime(t);

    // Trigger SFX on scene transition if enabled
    if (enableSFXAudio) {
      const segIdx = normalizedSegments.findIndex(
        s => t >= s.startSec && t < s.startSec + 0.3
      );
      if (segIdx !== -1 && segIdx !== lastSfxTriggerRef.current) {
        lastSfxTriggerRef.current = segIdx;
        const targetSeg = normalizedSegments[segIdx];
        if (targetSeg.soundEffect && targetSeg.soundEffect !== '-') {
          sfx.playByCue(targetSeg.soundEffect);
        } else if (segIdx === 0) {
          sfx.playWhoosh();
        }
      }
    }
  };

  // Play / Pause toggle
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  // Jump to specific time
  const handleSeek = (newTime: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Rewind
  const handleReset = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    setCurrentTime(0);
    lastSfxTriggerRef.current = -1;
  };

  // Handle user custom file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoSourceUrl(url);
      setUploadedFileName(file.name);
      setUploadedFile(file);
      setIsPlaying(false);
      handleReset();
      // Auto-extract subtitles from the uploaded file
      await handleExtractSubtitles(file);
    }
  };

  // Extract subtitles using audio extractor & Gemini 3.8 Flash
  const handleExtractSubtitles = async (fileToProcess?: File) => {
    const targetFile = fileToProcess || uploadedFile;
    if (!targetFile) {
      fileInputRef.current?.click();
      return;
    }

    setIsTranscribing(true);
    setTranscribeStatus('Reading audio track from video...');
    setTranscribeError(null);

    try {
      const { audioBase64, mimeType } = await extractAudioFromMediaFile(targetFile, 300, (status) => {
        setTranscribeStatus(status);
      });

      setTranscribeStatus('AI transcribing speech & timestamps with Gemini 3.8 Flash...');

      const res = await fetch('/api/transcribe-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64,
          mimeType,
          language: language === 'roman-urdu' ? 'roman-urdu' : 'auto',
          videoTitle: targetFile.name,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        let msg = data.error || 'Failed to extract subtitles';
        try {
          const parsed = typeof msg === 'string' ? JSON.parse(msg) : msg;
          if (parsed?.error?.message) msg = parsed.error.message;
        } catch {}
        throw new Error(msg);
      }

      const result: ExtractedSubtitlesResult = data;
      setExtractedSubtitles(result.subtitles || []);
      setDetectedLanguage(result.detectedLanguage || 'English');

      const converted: Segment[] = (result.subtitles || []).map((sub, i) => ({
        timecode: sub.timecode || `00:${String(Math.floor(sub.startSec)).padStart(2, '0')} - 00:${String(Math.floor(sub.endSec)).padStart(2, '0')}`,
        startSec: sub.startSec,
        endSec: sub.endSec,
        spokenScript: sub.text,
        visualCue: sub.visualCue || (i === 0 ? 'Close-up punch-in' : 'Medium shot cut'),
        onScreenText: sub.onScreenText || sub.text.split(' ').slice(0, 3).join(' ').toUpperCase(),
        soundEffect: sub.soundEffect || (i === 0 ? 'Impact boom' : 'Whoosh'),
        bRollKeywords: [],
      }));

      setCustomSegments(converted);
      setUseExtractedSubtitles(true);
      sfx.playDing();
    } catch (err: any) {
      console.error('Subtitle extraction error:', err);
      let cleanErr = err.message || 'Could not extract subtitles from video.';
      try {
        const parsed = JSON.parse(cleanErr);
        if (parsed?.error?.message) cleanErr = parsed.error.message;
      } catch {}
      setTranscribeError(cleanErr);
    } finally {
      setIsTranscribing(false);
      setTranscribeStatus('');
    }
  };

  // Subtitle download handlers
  const handleDownloadSRT = () => {
    if (extractedSubtitles.length === 0) return;
    const srt = subtitlesToSRT(extractedSubtitles);
    triggerFileDownload(
      srt,
      `${(uploadedFileName || reel.title || 'subtitles').replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.srt`,
      'text/plain;charset=utf-8'
    );
  };

  const handleDownloadVTT = () => {
    if (extractedSubtitles.length === 0) return;
    const vtt = subtitlesToVTT(extractedSubtitles);
    triggerFileDownload(
      vtt,
      `${(uploadedFileName || reel.title || 'subtitles').replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.vtt`,
      'text/vtt;charset=utf-8'
    );
  };

  const handleDownloadJSON = () => {
    if (extractedSubtitles.length === 0) return;
    const json = subtitlesToJSON(extractedSubtitles, {
      videoName: uploadedFileName,
      detectedLanguage,
    });
    triggerFileDownload(
      json,
      `${(uploadedFileName || reel.title || 'subtitles').replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_captions.json`,
      'application/json;charset=utf-8'
    );
  };

  // Inline edit segment text
  const handleSaveSegmentEdit = (index: number) => {
    if (!customSegments) return;
    const updated = [...customSegments];
    updated[index] = {
      ...updated[index],
      spokenScript: editingText,
    };
    setCustomSegments(updated);
    setEditingIndex(null);
  };

  // AI Auto-Edit Alignment Animation Trigger
  const handleTriggerAIAutoEdit = () => {
    setIsAiProcessing(true);
    setTimeout(() => {
      setIsAiProcessing(false);
      setAiAppliedTimestamp(Date.now());
      setEnablePunchInZooms(true);
      setEnableSFXAudio(true);
      setEnableCaptions(true);
      setEnableBRollOverlays(true);
      // Play confirmation SFX
      sfx.playDing();
    }, 1200);
  };

  // Video Export & Render with Captions onto Canvas
  const handleExportVideoWithCaptions = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    setIsExportingVideo(true);
    setExportProgress(0);

    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      setIsExportingVideo(false);
      return;
    }

    try {
      const stream = canvas.captureStream(30);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : 'video/webm',
        videoBitsPerSecond: 6000000,
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ViralCut_AI_Edited_${reel.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsExportingVideo(false);
        setExportProgress(100);
      };

      mediaRecorder.start();

      // Pause regular playback and seek to 0
      video.pause();
      setIsPlaying(false);
      video.currentTime = 0;

      const totalSec = Math.min(duration, totalCalculatedDuration);
      const fps = 30;
      const totalFrames = Math.ceil(totalSec * fps);
      let frame = 0;

      const renderNextFrame = () => {
        if (frame >= totalFrames) {
          mediaRecorder.stop();
          return;
        }

        const t = (frame / fps);
        video.currentTime = t;

        video.onseeked = () => {
          // Draw video with optional zoom
          ctx.fillStyle = '#09090b';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Find current segment for zoom
          const segIdx = normalizedSegments.findIndex(s => t >= s.startSec && t < s.endSec);
          const seg = normalizedSegments[segIdx] || normalizedSegments[0];
          const isZoom = enablePunchInZooms && seg?.isPunchIn;
          const zoomScale = isZoom ? 1.15 : 1.0;

          ctx.save();
          if (isZoom) {
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.scale(zoomScale, zoomScale);
            ctx.translate(-canvas.width / 2, -canvas.height / 2);
          }

          // Draw video covering 9:16
          const vRatio = video.videoWidth / video.videoHeight;
          const cRatio = canvas.width / canvas.height;
          let drawW = canvas.width;
          let drawH = canvas.height;
          let drawX = 0;
          let drawY = 0;

          if (vRatio > cRatio) {
            drawW = canvas.height * vRatio;
            drawX = (canvas.width - drawW) / 2;
          } else {
            drawH = canvas.width / vRatio;
            drawY = (canvas.height - drawH) / 2;
          }

          ctx.drawImage(video, drawX, drawY, drawW, drawH);
          ctx.restore();

          // Draw dynamic caption overlay
          if (enableCaptions && seg) {
            const words = (seg.spokenScript || seg.onScreenText || '').trim().split(/\s+/);
            const segDuration = Math.max(0.5, seg.endSec - seg.startSec);
            const segElapsed = Math.max(0, t - seg.startSec);
            const activeWordIdx = Math.min(words.length - 1, Math.floor((segElapsed / segDuration) * words.length));

            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'bold 58px "Montserrat", system-ui, sans-serif';

            const capY = (canvas.height * captionPositionY) / 100;
            const text = words.join(' ');

            // Shadow / stroke
            ctx.shadowColor = 'rgba(0,0,0,0.9)';
            ctx.shadowBlur = 12;
            ctx.lineWidth = 14;
            ctx.strokeStyle = '#000000';
            ctx.strokeText(text, canvas.width / 2, capY);

            // Fill
            ctx.fillStyle = captionStyle === 'hormozi' ? '#FBBF24' : '#FFFFFF';
            ctx.fillText(text, canvas.width / 2, capY);

            // Active word highlight box
            ctx.restore();
          }

          frame++;
          setExportProgress(Math.round((frame / totalFrames) * 100));
          renderNextFrame();
        };
      };

      renderNextFrame();
    } catch (err) {
      console.error('Export recording failed:', err);
      setIsExportingVideo(false);
    }
  };

  // Zoom scale for live preview
  const currentZoomScale = enablePunchInZooms && currentSegment.isPunchIn ? 1.15 : 1.0;

  return (
    <div className="space-y-6">
      {/* Top Banner / Studio Control Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 shadow-md shadow-rose-950/30">
            <Wand2 className="h-5 w-5 text-zinc-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">AI Video Editor & Auto-Caption Studio</h2>
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400 border border-amber-500/20">
                Direct Browser Video Engine
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Auto-sync generated hooks to RAW video footage with Alex Hormozi dynamic captions, SFX hits, and camera punch-ins.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Trigger Auto-Edit Button */}
          <button
            onClick={handleTriggerAIAutoEdit}
            disabled={isAiProcessing}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 px-4 py-2 text-xs font-bold text-zinc-950 hover:brightness-110 transition-all shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-50"
          >
            {isAiProcessing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 text-zinc-950 fill-zinc-950" />
            )}
            <span>{isAiProcessing ? 'Aligning AI Timeline...' : 'Auto-Edit with AI'}</span>
          </button>

          {/* Export NLE Modal Trigger */}
          {onOpenNLEModal && (
            <button
              onClick={onOpenNLEModal}
              className="flex items-center gap-1.5 rounded-xl border border-blue-500/50 bg-blue-950/40 px-3.5 py-2 text-xs font-bold text-blue-300 hover:bg-blue-900/50 transition-colors"
            >
              <FileCode className="h-3.5 w-3.5" />
              <span>Export NLE Timeline (.JSON / .XML / .EDL)</span>
            </button>
          )}

          {/* Render & Download Video Button */}
          <button
            onClick={handleExportVideoWithCaptions}
            disabled={isExportingVideo}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-500/60 bg-emerald-950/40 px-3.5 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-900/50 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isExportingVideo ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Rendering Video ({exportProgress}%)...</span>
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5" />
                <span>Download Video (.WEBM)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Two-Column Studio Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: 9:16 Vertical Video Player Canvas & Dynamic Overlays (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="w-full max-w-[340px] sm:max-w-[380px] rounded-3xl border-4 border-zinc-800 bg-black shadow-2xl p-2 relative overflow-hidden ring-1 ring-zinc-700/50">
            {/* 9:16 Aspect Container */}
            <div className="relative aspect-[9/16] w-full rounded-2xl overflow-hidden bg-zinc-950 flex items-center justify-center">
              {/* HTML5 Video Element */}
              <video
                ref={videoRef}
                src={videoSourceUrl}
                crossOrigin="anonymous"
                playsInline
                muted={isMuted}
                loop
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                style={{
                  transform: `scale(${currentZoomScale})`,
                  transition: 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
                }}
                className="h-full w-full object-cover pointer-events-none"
              />

              {/* Hook Zone Indicator Badge (0-3s) */}
              {currentTime <= 3.2 && (
                <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 rounded-full bg-amber-500/90 backdrop-blur-md px-3 py-1 shadow-lg animate-pulse">
                  <Sparkles className="h-3 w-3 text-zinc-950" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-950">
                    Hook Zone 0-3s
                  </span>
                </div>
              )}

              {/* Dynamic Zoom Punch-In Active Badge */}
              {enablePunchInZooms && currentSegment.isPunchIn && (
                <div className="absolute top-4 right-4 z-20 flex items-center gap-1 rounded-full bg-zinc-900/80 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-mono text-amber-300 border border-amber-500/40">
                  <ZoomIn className="h-3 w-3" />
                  <span>1.15x Zoom Cut</span>
                </div>
              )}

              {/* B-Roll / Visual Cue Overlay Card */}
              {enableBRollOverlays && currentSegment.bRollKeywords && currentSegment.bRollKeywords.length > 0 && (
                <div className="absolute top-14 left-4 right-4 z-20 rounded-xl border border-zinc-700/80 bg-zinc-900/85 backdrop-blur-md p-2.5 shadow-xl transition-all">
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 font-semibold mb-1">
                    <span className="flex items-center gap-1 text-blue-400">
                      <Layers className="h-3 w-3" />
                      <span>B-Roll Visual Cutaway</span>
                    </span>
                    <span className="text-zinc-500 font-mono">Overlay</span>
                  </div>
                  <p className="text-xs font-medium text-white line-clamp-1">{currentSegment.visualCue}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {currentSegment.bRollKeywords.map((k, i) => (
                      <span key={i} className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] font-mono text-zinc-300">
                        #{k}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* SFX Hit Badge Animation */}
              {enableSFXAudio && currentSegment.soundEffect && currentSegment.soundEffect !== '-' && (
                <div className="absolute bottom-28 left-4 z-20 flex items-center gap-1.5 rounded-full bg-rose-500/90 px-2.5 py-1 text-[10px] font-black uppercase text-white shadow-lg animate-bounce">
                  <Volume2 className="h-3 w-3" />
                  <span>SFX: {currentSegment.soundEffect}</span>
                </div>
              )}

              {/* Kinetic Captions Engine Overlay */}
              {enableCaptions && (
                <div
                  className="absolute left-3 right-3 z-30 pointer-events-none flex flex-col items-center text-center transition-all duration-150"
                  style={{ top: `${captionPositionY}%`, transform: 'translateY(-50%)' }}
                >
                  {/* Alex Hormozi Style: Big Yellow & Green Word Highlight */}
                  {captionStyle === 'hormozi' && (
                    <div className="px-3 py-1.5 select-none">
                      <div className="flex flex-wrap justify-center gap-x-2 gap-y-1 font-black uppercase tracking-tight drop-shadow-[0_4px_6px_rgba(0,0,0,0.95)]">
                        {currentWordHighlight.words.map((word, wIdx) => {
                          const isActive = wIdx === currentWordHighlight.activeIndex;
                          return (
                            <span
                              key={wIdx}
                              style={{ fontSize: `${captionFontSize}px` }}
                              className={`transition-all duration-100 ${
                                isActive
                                  ? 'scale-115 text-emerald-400 -rotate-1 bg-zinc-950/80 px-2 rounded-lg border-2 border-emerald-400'
                                  : 'text-amber-300'
                              }`}
                            >
                              {word}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* MrBeast Style: High Energy Pop Badge */}
                  {captionStyle === 'beast' && (
                    <div className="rounded-2xl border-4 border-black bg-yellow-400 px-4 py-2 shadow-[0_8px_0_#000] select-none transform -rotate-1">
                      <span
                        style={{ fontSize: `${captionFontSize}px` }}
                        className="font-black text-black uppercase tracking-wider block"
                      >
                        {currentSegment.onScreenText || currentSegment.spokenScript}
                      </span>
                    </div>
                  )}

                  {/* Clean TikTok Aesthetic Style */}
                  {captionStyle === 'clean' && (
                    <div className="rounded-full bg-zinc-950/80 backdrop-blur-md px-4 py-1.5 border border-zinc-700/60 shadow-xl select-none">
                      <span
                        style={{ fontSize: `${captionFontSize - 4}px` }}
                        className="font-semibold text-white tracking-wide block"
                      >
                        {currentSegment.spokenScript}
                      </span>
                    </div>
                  )}

                  {/* Cyber Neon Glow Style */}
                  {captionStyle === 'neon' && (
                    <div className="px-3 py-1 select-none">
                      <span
                        style={{
                          fontSize: `${captionFontSize}px`,
                          textShadow: '0 0 10px #06b6d4, 0 0 20px #06b6d4, 0 0 30px #ec4899',
                        }}
                        className="font-black uppercase text-cyan-300 tracking-wider block drop-shadow-lg"
                      >
                        {currentSegment.onScreenText || currentSegment.spokenScript}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Watermark brand subtle */}
              <div className="absolute bottom-3 right-3 z-10 text-[9px] font-mono text-zinc-500/60 tracking-wider">
                VIRALCUT · {platform.toUpperCase()}
              </div>
            </div>

            {/* Quick Player Bar */}
            <div className="mt-2.5 flex items-center justify-between px-2 py-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={togglePlay}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-zinc-950 hover:bg-amber-400 transition-colors cursor-pointer"
                >
                  {isPlaying ? <Pause className="h-4 w-4 fill-zinc-950" /> : <Play className="h-4 w-4 fill-zinc-950 ml-0.5" />}
                </button>
                <button
                  onClick={handleReset}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
                >
                  {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                </button>
              </div>

              <div className="font-mono text-xs text-zinc-400">
                <span className="text-amber-400 font-semibold">{currentTime.toFixed(1)}s</span> / {duration.toFixed(1)}s
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: AI Auto-Edit Controls, Timeline Cuts, & Source Selection (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Step 1: RAW Video Source Picker */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-3">
              <div className="flex items-center gap-2">
                <Film className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">1. Select RAW Footage to Edit</h3>
              </div>
              <label className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition-colors cursor-pointer">
                <Upload className="h-3.5 w-3.5 text-amber-400" />
                <span>Upload Your RAW Video</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {uploadedFileName && (
              <div className="mb-3 rounded-xl border border-emerald-800/60 bg-emerald-950/40 p-3 text-xs text-emerald-300 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span>Custom RAW Video: <strong>{uploadedFileName}</strong></span>
                  </span>
                  {detectedLanguage && (
                    <span className="rounded bg-emerald-900/60 px-2 py-0.5 text-[10px] font-mono text-emerald-300">
                      {detectedLanguage}
                    </span>
                  )}
                </div>

                {/* Subtitle Extraction Controls */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-emerald-800/40">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleExtractSubtitles()}
                      disabled={isTranscribing}
                      className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-zinc-950 hover:bg-amber-400 transition-all disabled:opacity-50"
                    >
                      {isTranscribing ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin text-zinc-950" />
                          <span>Extracting Subtitles...</span>
                        </>
                      ) : (
                        <>
                          <Wand2 className="h-3.5 w-3.5 text-zinc-950" />
                          <span>{extractedSubtitles.length > 0 ? 'Re-Extract Subtitles' : 'Auto-Extract Subtitles from Video'}</span>
                        </>
                      )}
                    </button>

                    {extractedSubtitles.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setUseExtractedSubtitles(!useExtractedSubtitles)}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold border transition-all ${
                          useExtractedSubtitles
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                        }`}
                      >
                        {useExtractedSubtitles ? 'Using Video Subtitles' : 'Using Script Cuts'}
                      </button>
                    )}
                  </div>

                  {extractedSubtitles.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-emerald-400/80 mr-1">Download:</span>
                      <button
                        type="button"
                        onClick={handleDownloadSRT}
                        className="rounded border border-emerald-700/60 bg-emerald-900/40 px-2 py-0.5 text-[10px] font-bold text-emerald-200 hover:bg-emerald-800/60"
                        title="Download SubRip .SRT Subtitles"
                      >
                        .SRT
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadVTT}
                        className="rounded border border-emerald-700/60 bg-emerald-900/40 px-2 py-0.5 text-[10px] font-bold text-emerald-200 hover:bg-emerald-800/60"
                        title="Download WebVTT .VTT Subtitles"
                      >
                        .VTT
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadJSON}
                        className="rounded border border-emerald-700/60 bg-emerald-900/40 px-2 py-0.5 text-[10px] font-bold text-emerald-200 hover:bg-emerald-800/60"
                        title="Download JSON Captions"
                      >
                        .JSON
                      </button>
                    </div>
                  )}
                </div>

                {isTranscribing && (
                  <div className="pt-1 text-[11px] text-amber-300 font-mono flex items-center gap-2">
                    <RefreshCw className="h-3 w-3 animate-spin text-amber-400" />
                    <span>{transcribeStatus || 'Processing media audio...'}</span>
                  </div>
                )}

                {transcribeError && (
                  <div className="flex items-center justify-between gap-2 rounded-lg bg-red-950/50 border border-red-800/60 p-2 text-[11px] text-red-300">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                      <span className="truncate">{transcribeError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleExtractSubtitles()}
                      disabled={isTranscribing}
                      className="rounded bg-red-900/60 hover:bg-red-800/60 border border-red-700/60 px-2 py-0.5 text-[10px] font-bold text-red-200 shrink-0 transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Built-in Sample RAW Clips */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {SAMPLE_RAW_VIDEOS.map(sample => (
                <button
                  key={sample.id}
                  onClick={() => {
                    setVideoSourceUrl(sample.url);
                    setUploadedFileName(null);
                    handleReset();
                  }}
                  className={`flex flex-col text-left rounded-xl border p-2.5 transition-all ${
                    videoSourceUrl === sample.url && !uploadedFileName
                      ? 'border-amber-500 bg-amber-950/20 shadow-md ring-1 ring-amber-500'
                      : 'border-zinc-800 bg-zinc-950/60 hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span className="text-xs font-bold text-white line-clamp-1">{sample.label}</span>
                  <span className="mt-1 text-[10px] text-zinc-400 line-clamp-2">{sample.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: AI Kinetic Caption Styles & Visual Toggles */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white">2. AI Caption & Visual Retention Effects</h3>
              </div>
              <span className="text-[11px] font-mono text-zinc-400">Viral Presets</span>
            </div>

            {/* Caption Style Switcher */}
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-2">
                Kinetic Caption Animation Style:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={() => setCaptionStyle('hormozi')}
                  className={`rounded-xl border p-2.5 text-left transition-all ${
                    captionStyle === 'hormozi'
                      ? 'border-amber-400 bg-amber-950/30 text-white font-bold ring-1 ring-amber-400'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span className="block text-xs font-bold text-amber-400">Alex Hormozi</span>
                  <span className="text-[10px] text-zinc-500">Yellow/Green Pop</span>
                </button>

                <button
                  onClick={() => setCaptionStyle('beast')}
                  className={`rounded-xl border p-2.5 text-left transition-all ${
                    captionStyle === 'beast'
                      ? 'border-yellow-400 bg-yellow-950/30 text-white font-bold ring-1 ring-yellow-400'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span className="block text-xs font-bold text-yellow-300">MrBeast High-Energy</span>
                  <span className="text-[10px] text-zinc-500">Bold Pop Badge</span>
                </button>

                <button
                  onClick={() => setCaptionStyle('clean')}
                  className={`rounded-xl border p-2.5 text-left transition-all ${
                    captionStyle === 'clean'
                      ? 'border-zinc-400 bg-zinc-800 text-white font-bold ring-1 ring-zinc-400'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span className="block text-xs font-bold text-zinc-200">TikTok Aesthetic</span>
                  <span className="text-[10px] text-zinc-500">Minimal Glass Pill</span>
                </button>

                <button
                  onClick={() => setCaptionStyle('neon')}
                  className={`rounded-xl border p-2.5 text-left transition-all ${
                    captionStyle === 'neon'
                      ? 'border-cyan-400 bg-cyan-950/30 text-white font-bold ring-1 ring-cyan-400'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span className="block text-xs font-bold text-cyan-400">Cyber Neon</span>
                  <span className="text-[10px] text-zinc-500">Electric Glow</span>
                </button>
              </div>
            </div>

            {/* Pacing & Retention Features Toggles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <button
                onClick={() => setEnablePunchInZooms(!enablePunchInZooms)}
                className={`flex items-center justify-between rounded-xl border p-2.5 text-xs transition-colors ${
                  enablePunchInZooms
                    ? 'border-amber-500/50 bg-amber-950/20 text-amber-300 font-semibold'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-500'
                }`}
              >
                <span>Dynamic Zooms</span>
                <span className={`text-[10px] ${enablePunchInZooms ? 'text-amber-400' : 'text-zinc-600'}`}>
                  {enablePunchInZooms ? 'ON (1.15x)' : 'OFF'}
                </span>
              </button>

              <button
                onClick={() => setEnableSFXAudio(!enableSFXAudio)}
                className={`flex items-center justify-between rounded-xl border p-2.5 text-xs transition-colors ${
                  enableSFXAudio
                    ? 'border-rose-500/50 bg-rose-950/20 text-rose-300 font-semibold'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-500'
                }`}
              >
                <span>SFX Audio Hits</span>
                <span className={`text-[10px] ${enableSFXAudio ? 'text-rose-400' : 'text-zinc-600'}`}>
                  {enableSFXAudio ? 'ON' : 'OFF'}
                </span>
              </button>

              <button
                onClick={() => setEnableBRollOverlays(!enableBRollOverlays)}
                className={`flex items-center justify-between rounded-xl border p-2.5 text-xs transition-colors ${
                  enableBRollOverlays
                    ? 'border-blue-500/50 bg-blue-950/20 text-blue-300 font-semibold'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-500'
                }`}
              >
                <span>B-Roll Overlays</span>
                <span className={`text-[10px] ${enableBRollOverlays ? 'text-blue-400' : 'text-zinc-600'}`}>
                  {enableBRollOverlays ? 'ON' : 'OFF'}
                </span>
              </button>

              <button
                onClick={() => setEnableCaptions(!enableCaptions)}
                className={`flex items-center justify-between rounded-xl border p-2.5 text-xs transition-colors ${
                  enableCaptions
                    ? 'border-emerald-500/50 bg-emerald-950/20 text-emerald-300 font-semibold'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-500'
                }`}
              >
                <span>Auto-Captions</span>
                <span className={`text-[10px] ${enableCaptions ? 'text-emerald-400' : 'text-zinc-600'}`}>
                  {enableCaptions ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>

            {/* Caption Y-Position & Font Size Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-zinc-800/80">
              <div>
                <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                  <span>Vertical Position:</span>
                  <span className="font-mono text-amber-400">{captionPositionY}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="90"
                  value={captionPositionY}
                  onChange={e => setCaptionPositionY(Number(e.target.value))}
                  className="w-full accent-amber-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                  <span>Font Size:</span>
                  <span className="font-mono text-amber-400">{captionFontSize}px</span>
                </div>
                <input
                  type="range"
                  min="16"
                  max="38"
                  value={captionFontSize}
                  onChange={e => setCaptionFontSize(Number(e.target.value))}
                  className="w-full accent-amber-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Step 3: Interactive Multi-Cut Timeline Scrubber */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Scissors className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">3. Multi-Scene Cut Timeline</h3>
              </div>
              <span className="text-xs font-mono text-zinc-400">
                Scene {currentSegmentIndex + 1} of {normalizedSegments.length}
              </span>
            </div>

            {/* Visual Timeline Blocks */}
            <div className="space-y-1.5">
              <div className="relative flex h-10 w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 p-1 gap-1">
                {normalizedSegments.map((seg, idx) => {
                  const segWidthPct = (seg.duration / totalCalculatedDuration) * 100;
                  const isCurrent = idx === currentSegmentIndex;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSeek(seg.startSec)}
                      style={{ width: `${Math.max(6, segWidthPct)}%` }}
                      className={`relative flex h-full items-center justify-center rounded-lg text-[10px] font-bold transition-all overflow-hidden ${
                        isCurrent
                          ? 'bg-amber-500 text-zinc-950 shadow-md ring-2 ring-amber-300'
                          : idx === 0
                          ? 'bg-amber-950/40 text-amber-300 border border-amber-500/30 hover:bg-amber-900/50'
                          : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700/80'
                      }`}
                    >
                      <span className="truncate px-1">
                        {idx === 0 ? 'HOOK' : `S${idx + 1}`}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Time Scrubber Slider */}
              <input
                type="range"
                min="0"
                max={totalCalculatedDuration}
                step="0.1"
                value={currentTime}
                onChange={e => handleSeek(Number(e.target.value))}
                className="w-full accent-amber-500 h-2 bg-zinc-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Currently Active Cut Details Card */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs space-y-2">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="font-semibold text-white flex items-center gap-2">
                  <span>Scene {currentSegmentIndex + 1}: {currentSegment.timecode}</span>
                  {currentSegmentIndex === 0 && (
                    <span className="rounded bg-amber-500/20 text-amber-400 px-1.5 py-0.5 text-[10px] font-bold uppercase">
                      Hook Zone
                    </span>
                  )}
                  {useExtractedSubtitles && (
                    <span className="rounded bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 text-[9px] font-mono">
                      Synced Subtitle
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 font-mono">Duration: {currentSegment.duration.toFixed(1)}s</span>
                  {editingIndex !== currentSegmentIndex ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingIndex(currentSegmentIndex);
                        setEditingText(currentSegment.spokenScript);
                      }}
                      className="flex items-center gap-1 rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-300 hover:text-white hover:bg-zinc-700"
                    >
                      <Edit3 className="h-3 w-3 text-amber-400" />
                      <span>Edit Subtitle</span>
                    </button>
                  ) : null}
                </div>
              </div>

              {editingIndex === currentSegmentIndex ? (
                <div className="space-y-2 pt-1">
                  <textarea
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-amber-500/60 bg-zinc-900 p-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveSegmentEdit(currentSegmentIndex)}
                      className="rounded bg-amber-500 px-2.5 py-1 text-[11px] font-bold text-zinc-950 hover:bg-amber-400"
                    >
                      Save Caption
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingIndex(null)}
                      className="rounded bg-zinc-800 px-2.5 py-1 text-[11px] font-medium text-zinc-400 hover:text-zinc-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-zinc-200 font-medium leading-relaxed">"{currentSegment.spokenScript}"</p>
              )}

              <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-400 pt-1">
                <span className="text-zinc-300">
                  <strong>Visual:</strong> {currentSegment.visualCue}
                </span>
                {currentSegment.soundEffect && currentSegment.soundEffect !== '-' && (
                  <span className="rounded bg-rose-950/50 text-rose-300 px-1.5 py-0.5 border border-rose-800/50 font-mono">
                    SFX: {currentSegment.soundEffect}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
