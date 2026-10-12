import React, { useState, useMemo } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  Film,
  FileCode,
  FileText,
  Layers,
  Sparkles,
  HelpCircle,
  ExternalLink,
  Wand2,
} from 'lucide-react';
import { ReelScript } from '../types';
import {
  generateStructuredNLEJSON,
  generatePremiereProXML,
  generateDaVinciEDL,
  generateSRTSubtitles,
  generateVTTSubtitles,
  triggerFileDownload,
} from '../utils/nleExport';

interface NLEExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reel: ReelScript;
  platform: string;
  onOpenAIEditor?: () => void;
}

export const NLEExportModal: React.FC<NLEExportModalProps> = ({
  isOpen,
  onClose,
  reel,
  platform,
  onOpenAIEditor,
}) => {
  const [activeFormat, setActiveFormat] = useState<'json' | 'premiere' | 'davinci' | 'srt' | 'vtt'>('json');
  const [copied, setCopied] = useState(false);

  // Generate outputs
  const structuredJsonData = useMemo(() => generateStructuredNLEJSON(reel, platform), [reel, platform]);
  const jsonString = useMemo(() => JSON.stringify(structuredJsonData, null, 2), [structuredJsonData]);
  const premiereXmlString = useMemo(() => generatePremiereProXML(reel, platform), [reel, platform]);
  const davinciEdlString = useMemo(() => generateDaVinciEDL(reel, platform), [reel, platform]);
  const srtString = useMemo(() => generateSRTSubtitles(reel), [reel]);
  const vttString = useMemo(() => generateVTTSubtitles(reel), [reel]);

  if (!isOpen) return null;

  const currentContent = {
    json: jsonString,
    premiere: premiereXmlString,
    davinci: davinciEdlString,
    srt: srtString,
    vtt: vttString,
  }[activeFormat];

  const currentFileExt = {
    json: 'json',
    premiere: 'xml',
    davinci: 'edl',
    srt: 'srt',
    vtt: 'vtt',
  }[activeFormat];

  const currentMimeType = {
    json: 'application/json',
    premiere: 'application/xml',
    davinci: 'text/plain',
    srt: 'text/plain',
    vtt: 'text/vtt',
  }[activeFormat];

  const safeTitle = reel.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const currentFileName = `viralcut_${safeTitle}_${activeFormat}.${currentFileExt}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    triggerFileDownload(currentContent, currentFileName, currentMimeType);
  };

  const handleDownloadAll = () => {
    triggerFileDownload(jsonString, `viralcut_${safeTitle}_timeline.json`, 'application/json');
    setTimeout(() => {
      triggerFileDownload(premiereXmlString, `viralcut_${safeTitle}_premiere.xml`, 'application/xml');
    }, 200);
    setTimeout(() => {
      triggerFileDownload(davinciEdlString, `viralcut_${safeTitle}_davinci.edl`, 'text/plain');
    }, 400);
    setTimeout(() => {
      triggerFileDownload(srtString, `viralcut_${safeTitle}_captions.srt`, 'text/plain');
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5">
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Film className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">NLE Timeline & Asset Exporter</h2>
                <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-400 border border-blue-500/30">
                  Premiere · DaVinci · CapCut
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Import complete multitrack cuts, captions, SFX markers, and zoom keyframes directly into your NLE.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Format Selector Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 bg-zinc-900/60 px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setActiveFormat('json')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                activeFormat === 'json'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-zinc-800/70 text-zinc-300 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <FileCode className="h-3.5 w-3.5 text-amber-300" />
              <span>Structured Timeline (.JSON)</span>
            </button>

            <button
              onClick={() => setActiveFormat('premiere')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                activeFormat === 'premiere'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-zinc-800/70 text-zinc-300 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <Film className="h-3.5 w-3.5 text-purple-400" />
              <span>Premiere Pro (.XML)</span>
            </button>

            <button
              onClick={() => setActiveFormat('davinci')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                activeFormat === 'davinci'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-zinc-800/70 text-zinc-300 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <Layers className="h-3.5 w-3.5 text-rose-400" />
              <span>DaVinci Resolve (.EDL)</span>
            </button>

            <button
              onClick={() => setActiveFormat('srt')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                activeFormat === 'srt'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-zinc-800/70 text-zinc-300 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <FileText className="h-3.5 w-3.5 text-emerald-400" />
              <span>Subtitles (.SRT)</span>
            </button>

            <button
              onClick={() => setActiveFormat('vtt')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                activeFormat === 'vtt'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-zinc-800/70 text-zinc-300 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <FileText className="h-3.5 w-3.5 text-cyan-400" />
              <span>WebVTT (.VTT)</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-zinc-400" />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-500 transition-colors shadow-sm"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download .{currentFileExt.toUpperCase()}</span>
            </button>
          </div>
        </div>

        {/* Format Specific Callout & Guide */}
        <div className="bg-zinc-900/40 px-4 py-2.5 sm:px-5 border-b border-zinc-800/60 text-xs">
          {activeFormat === 'json' && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-zinc-400">
              <span className="flex items-center gap-1.5 text-zinc-300">
                <FileCode className="h-3.5 w-3.5 text-amber-400" />
                <span>Complete OpenTimelineIO-compatible multitrack schema with A-Roll punch-ins, B-roll overlays, SFX cues, and color markers.</span>
              </span>
              <span className="text-[11px] font-mono text-zinc-500">1080x1920 (9:16) · 30 FPS</span>
            </div>
          )}
          {activeFormat === 'premiere' && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-zinc-400">
              <span className="flex items-center gap-1.5 text-zinc-300">
                <Film className="h-3.5 w-3.5 text-purple-400" />
                <span>Standard FCP XML v5 sequence with 3 video tracks (A-Roll cuts, caption generators) + 2 audio tracks (VO dialogue & SFX).</span>
              </span>
              <span className="text-[11px] text-purple-300 font-mono">Premiere Pro: File → Import</span>
            </div>
          )}
          {activeFormat === 'davinci' && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-zinc-400">
              <span className="flex items-center gap-1.5 text-zinc-300">
                <Layers className="h-3.5 w-3.5 text-rose-400" />
                <span>CMX 3600 Edit Decision List for DaVinci Resolve conform timeline with clip comments, caption lines, and SFX markers.</span>
              </span>
              <span className="text-[11px] text-rose-300 font-mono">DaVinci: File → Import → Timeline...</span>
            </div>
          )}
          {activeFormat === 'srt' && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-zinc-400">
              <span className="flex items-center gap-1.5 text-zinc-300">
                <FileText className="h-3.5 w-3.5 text-emerald-400" />
                <span>Industry-standard SubRip subtitle format ready for YouTube Shorts, TikTok caption upload, or NLE subtitle tracks.</span>
              </span>
              <span className="text-[11px] text-emerald-400 font-mono">{reel.segments.length} Synchronized Captions</span>
            </div>
          )}
          {activeFormat === 'vtt' && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-zinc-400">
              <span className="flex items-center gap-1.5 text-zinc-300">
                <FileText className="h-3.5 w-3.5 text-cyan-400" />
                <span>Modern WebVTT subtitle track supported by web players, HTML5 video, and social media platforms.</span>
              </span>
              <span className="text-[11px] text-cyan-300 font-mono">WebVTT Compliant</span>
            </div>
          )}
        </div>

        {/* Code Content Area */}
        <div className="flex-1 overflow-hidden p-4 sm:p-5">
          <div className="relative h-72 sm:h-80 w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/90 shadow-inner">
            <pre className="h-full w-full overflow-auto p-4 font-mono text-[11px] leading-relaxed text-zinc-300 select-text">
              {currentContent}
            </pre>
          </div>
        </div>

        {/* Modal Footer with AI RAW Video Editor Callout */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 bg-zinc-950 p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadAll}
              className="flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              <Download className="h-3.5 w-3.5 text-zinc-400" />
              <span>Download All 4 Formats (Package)</span>
            </button>
          </div>

          {onOpenAIEditor && (
            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-zinc-400 sm:inline">
                Want the browser AI to edit your video automatically?
              </span>
              <button
                onClick={() => {
                  onClose();
                  onOpenAIEditor();
                }}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 px-4 py-2 text-xs font-bold text-zinc-950 hover:brightness-110 shadow-lg shadow-amber-500/10 transition-all cursor-pointer"
              >
                <Wand2 className="h-4 w-4" />
                <span>Auto-Edit RAW Video with AI</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
