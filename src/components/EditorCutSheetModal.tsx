import React, { useState } from 'react';
import {
  FileText,
  Copy,
  Check,
  Download,
  Share2,
  Film,
  Sparkles,
  Mic,
  FileCode,
  Wand2,
} from 'lucide-react';
import { ReelScript } from '../types';
import { generateStructuredNLEJSON, triggerFileDownload } from '../utils/nleExport';

interface EditorCutSheetModalProps {
  reel: ReelScript;
  platform: string;
  onOpenTTS?: () => void;
  onOpenNLE?: () => void;
  onOpenAIEditor?: () => void;
}

export const EditorCutSheetModal: React.FC<EditorCutSheetModalProps> = ({
  reel,
  platform,
  onOpenTTS,
  onOpenNLE,
  onOpenAIEditor,
}) => {
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const handleDownloadJSON = () => {
    const data = generateStructuredNLEJSON(reel, platform);
    const jsonStr = JSON.stringify(data, null, 2);
    triggerFileDownload(
      jsonStr,
      `viralcut_${reel.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_timeline.json`,
      'application/json'
    );
  };

  // Generate plain-text editor cut sheet
  const generatePlainTextCutSheet = () => {
    let out = `====================================================\n`;
    out += `VIRALCUT PRODUCTION CUT-SHEET (${platform.toUpperCase()})\n`;
    out += `TITLE: ${reel.title}\n`;
    out += `ESTIMATED DURATION: ${reel.estimatedDuration}\n`;
    out += `VIRALITY SCORE: ${reel.viralityScore}/100\n`;
    out += `HOOK TYPE: ${reel.hookType}\n`;
    out += `====================================================\n\n`;

    out += `🎯 OPENING HOOK (0-3s): "${reel.startingPunchline}"\n`;
    out += `🔄 CLOSING LOOP PUNCHLINE: "${reel.closingPunchline}"\n\n`;

    out += `----------------------------------------------------\n`;
    out += `TIMELINE SCENE-BY-SCENE INSTRUCTIONS:\n`;
    out += `----------------------------------------------------\n\n`;

    reel.segments.forEach((seg, i) => {
      out += `[SCENE ${i + 1}] Timecode: ${seg.timecode}\n`;
      out += `SPOKEN VOICEOVER: "${seg.spokenScript}"\n`;
      out += `VISUAL / CAMERA CUE: ${seg.visualCue}\n`;
      out += `ON-SCREEN TEXT: ${seg.onScreenText || 'N/A'}\n`;
      out += `AUDIO / SFX CUE: ${seg.soundEffect || 'N/A'}\n`;
      if (seg.bRollKeywords && seg.bRollKeywords.length > 0) {
        out += `STOCK B-ROLL TAGS: ${seg.bRollKeywords.join(', ')}\n`;
      }
      out += `\n`;
    });

    out += `====================================================\n`;
    out += `RECOMMENDED HASHTAGS:\n${reel.hashtags.join(' ')}\n`;
    out += `====================================================\n`;

    return out;
  };

  // Generate CSV for Premiere Pro / spreadsheets
  const generateCSV = () => {
    const headers = ['Scene', 'Timecode', 'Spoken Script', 'Visual Cue', 'On-Screen Text', 'SFX', 'B-Roll Tags'];
    const rows = reel.segments.map((seg, i) => [
      `Scene ${i + 1}`,
      `"${seg.timecode}"`,
      `"${seg.spokenScript.replace(/"/g, '""')}"`,
      `"${seg.visualCue.replace(/"/g, '""')}"`,
      `"${(seg.onScreenText || '').replace(/"/g, '""')}"`,
      `"${(seg.soundEffect || '').replace(/"/g, '""')}"`,
      `"${(seg.bRollKeywords || []).join('; ')}"`,
    ]);
    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  };

  // Generate teleprompter spoken script only
  const generateTeleprompterText = () => {
    return reel.segments.map((seg) => seg.spokenScript).join(' ');
  };

  const handleCopy = (content: string, type: string) => {
    navigator.clipboard.writeText(content);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleDownloadTxt = () => {
    const content = generatePlainTextCutSheet();
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ViralCut_CutSheet_${reel.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Film className="h-4 w-4 text-blue-400" />
            <h3 className="text-base font-bold text-white">Video Editor Cut-Sheet & Export</h3>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            Hand-off ready timeline for Premiere Pro, Final Cut, DaVinci Resolve, or CapCut editors.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleCopy(generatePlainTextCutSheet(), 'full')}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition-colors"
          >
            {copiedType === 'full' ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-zinc-400" />
            )}
            <span>Copy Full Cut-Sheet</span>
          </button>

          <button
            onClick={() => handleCopy(generateTeleprompterText(), 'teleprompter')}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition-colors"
          >
            {copiedType === 'teleprompter' ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <FileText className="h-3.5 w-3.5 text-zinc-400" />
            )}
            <span>Copy Spoken Script Only</span>
          </button>

          <button
            onClick={() => handleCopy(generateCSV(), 'csv')}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition-colors"
          >
            {copiedType === 'csv' ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-zinc-400" />
            )}
            <span>Copy CSV</span>
          </button>

          {onOpenNLE && (
            <button
              onClick={onOpenNLE}
              className="flex items-center gap-1.5 rounded-xl border border-blue-500/60 bg-blue-950/40 px-3.5 py-2 text-xs font-bold text-blue-300 hover:bg-blue-900/50 transition-colors"
              title="Export structured JSON, Premiere XML, or DaVinci EDL"
            >
              <FileCode className="h-3.5 w-3.5" />
              <span>NLE Exporter (.JSON / .XML / .EDL)</span>
            </button>
          )}

          <button
            onClick={handleDownloadJSON}
            className="flex items-center gap-1.5 rounded-xl border border-amber-500/60 bg-zinc-800 px-3.5 py-2 text-xs font-semibold text-amber-300 hover:bg-zinc-700 transition-colors"
            title="Download complete structured NLE timeline JSON file"
          >
            <Download className="h-3.5 w-3.5 text-amber-400" />
            <span>Download .JSON Timeline</span>
          </button>

          {onOpenAIEditor && (
            <button
              onClick={onOpenAIEditor}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 px-3.5 py-2 text-xs font-bold text-zinc-950 hover:brightness-110 transition-all shadow-md shadow-amber-500/20"
              title="Let AI edit your RAW video with dynamic captions"
            >
              <Wand2 className="h-3.5 w-3.5" />
              <span>Auto-Edit RAW Video</span>
            </button>
          )}

          {onOpenTTS && (
            <button
              onClick={onOpenTTS}
              className="flex items-center gap-1.5 rounded-xl border border-amber-500/60 bg-amber-950/30 px-3.5 py-2 text-xs font-bold text-amber-400 hover:bg-amber-900/50 transition-colors"
            >
              <Mic className="h-3.5 w-3.5" />
              <span>Voiceover Audio (TTS)</span>
            </button>
          )}

          <button
            onClick={handleDownloadTxt}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-zinc-950 hover:bg-amber-400 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download .TXT</span>
          </button>
        </div>
      </div>

      {/* Structured Table Layout */}
      <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-950 shadow-xl">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/80 text-zinc-400 uppercase tracking-wider font-semibold text-[10px]">
              <th className="py-3 px-4">Timecode</th>
              <th className="py-3 px-4">Spoken Voiceover</th>
              <th className="py-3 px-4">Visual Scene & Camera Cue</th>
              <th className="py-3 px-4">Kinetic Caption</th>
              <th className="py-3 px-4">Audio / SFX</th>
              <th className="py-3 px-4">B-Roll Search Tags</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {reel.segments.map((seg, idx) => (
              <tr
                key={idx}
                className={`transition-colors ${
                  idx === 0 ? 'bg-amber-950/15' : 'hover:bg-zinc-900/40'
                }`}
              >
                <td className="py-3.5 px-4 font-mono font-semibold text-amber-400 whitespace-nowrap align-top">
                  {seg.timecode}
                  {idx === 0 && (
                    <span className="block mt-0.5 text-[9px] font-bold text-amber-500 uppercase">
                      Hook Zone
                    </span>
                  )}
                </td>
                <td className="py-3.5 px-4 font-medium text-zinc-100 max-w-xs align-top">
                  "{seg.spokenScript}"
                </td>
                <td className="py-3.5 px-4 text-zinc-300 max-w-xs align-top">
                  {seg.visualCue}
                </td>
                <td className="py-3.5 px-4 font-mono font-bold text-amber-300 whitespace-nowrap align-top">
                  {seg.onScreenText ? `[${seg.onScreenText}]` : '-'}
                </td>
                <td className="py-3.5 px-4 text-rose-300/90 whitespace-nowrap align-top">
                  {seg.soundEffect || '-'}
                </td>
                <td className="py-3.5 px-4 align-top">
                  {seg.bRollKeywords && seg.bRollKeywords.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {seg.bRollKeywords.map((k, kIdx) => (
                        <span
                          key={kIdx}
                          className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300"
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-zinc-600">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Raw Preview Box */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <span className="text-xs font-semibold text-zinc-300">Raw Text Production Cut-Sheet</span>
          <span className="text-[11px] text-zinc-500 font-mono">
            {reel.segments.length} Scenes · {reel.estimatedDuration}
          </span>
        </div>
        <pre className="mt-4 max-h-60 overflow-y-auto font-mono text-[11px] leading-relaxed text-zinc-400 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/80">
          {generatePlainTextCutSheet()}
        </pre>
      </div>
    </div>
  );
};
