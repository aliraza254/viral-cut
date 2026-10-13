import React, { useState } from 'react';
import {
  Wand2,
  Flame,
  FileCode,
  Sparkles,
  ArrowRight,
  Video,
  Layers,
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { AIVideoEditor } from '../components/AIVideoEditor';
import { NLEExportModal } from '../components/NLEExportModal';

export const CaptionStudio: React.FC = () => {
  const {
    activeReel,
    uploadedMedia,
    setUploadedMedia,
    language,
    setActiveTool,
    setCurrentTranscript,
    setCurrentVideoTitle,
    currentVideoTitle,
  } = useProject();

  const [isNLEModalOpen, setIsNLEModalOpen] = useState(false);

  // Transfer transcribed audio/captions back to Viral Reel Generator for script creation
  const handleTransferToReelGenerator = () => {
    if (uploadedMedia?.subtitles && uploadedMedia.subtitles.length > 0) {
      const fullText = uploadedMedia.subtitles.map((s) => s.text).join(' ');
      setCurrentTranscript(fullText);
      if (uploadedMedia.fileName) {
        setCurrentVideoTitle(`Reels from: ${uploadedMedia.fileName}`);
      }
    }
    setActiveTool('viral-generator');
  };

  return (
    <div className="space-y-6">
      {/* Studio Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5 shadow-xl backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 text-zinc-950 shadow-md">
            <Wand2 className="h-5 w-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">
                Video Auto-Caption & Styling Studio
              </h1>
              <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-400 border border-amber-500/20">
                Tool 1 • 9:16 Vertical
              </span>
            </div>
            <p className="text-xs text-zinc-400 hidden sm:block">
              Burn kinetic typography (Hormozi, MrBeast, Clean, Neon) into vertical footage with zero cloud lag.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {uploadedMedia?.subtitles && uploadedMedia.subtitles.length > 0 && (
            <button
              type="button"
              onClick={handleTransferToReelGenerator}
              className="flex items-center gap-1.5 rounded-xl border border-amber-500/60 bg-amber-950/40 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-900/50 transition-colors cursor-pointer"
              title="Use transcribed video text in Viral Reel Generator"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Generate Viral Script from Video</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsNLEModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-blue-500/60 bg-blue-950/40 px-3 py-1.5 text-xs font-bold text-blue-300 hover:bg-blue-900/40 transition-colors cursor-pointer"
            title="Export Premiere Pro XML, DaVinci Resolve EDL, or JSON"
          >
            <FileCode className="h-3.5 w-3.5" />
            <span>Export NLE</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTool('viral-generator')}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 hover:text-white transition-colors cursor-pointer"
            title="Switch to Tool 2: Viral Reel Generator"
          >
            <Flame className="h-3.5 w-3.5 text-rose-400" />
            <span>Go to Reel Generator</span>
            <ArrowRight className="h-3 w-3 text-zinc-400" />
          </button>
        </div>
      </div>

      {/* Editor Core Engine */}
      <AIVideoEditor
        reel={activeReel}
        platform="vertical-9-16"
        language={language}
        initialVideoUrl={uploadedMedia?.videoUrl}
        initialFileName={uploadedMedia?.fileName}
        initialSubtitles={uploadedMedia?.subtitles}
        onMediaUpload={(media) => setUploadedMedia(media)}
        onOpenNLEModal={() => setIsNLEModalOpen(true)}
      />

      {/* NLE Export Modal */}
      {activeReel && (
        <NLEExportModal
          isOpen={isNLEModalOpen}
          onClose={() => setIsNLEModalOpen(false)}
          reel={activeReel}
          platform="vertical-9-16"
          onOpenAIEditor={() => setIsNLEModalOpen(false)}
        />
      )}
    </div>
  );
};

export default CaptionStudio;
