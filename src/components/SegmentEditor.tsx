import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Video,
  Type,
  Music,
  Trash2,
  ArrowUp,
  ArrowDown,
  Copy,
  Check,
  Tag,
  Edit2,
  Save,
} from 'lucide-react';
import { Segment } from '../types';
import { speechPreviewer } from '../utils/audio';

interface SegmentEditorProps {
  segment: Segment;
  index: number;
  totalSegments: number;
  isActivePlayback?: boolean;
  onUpdate: (updated: Segment) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export const SegmentEditor: React.FC<SegmentEditorProps> = ({
  segment,
  index,
  totalSegments,
  isActivePlayback = false,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [copiedKeyword, setCopiedKeyword] = useState<string | null>(null);

  // Edit local state
  const [spokenScript, setSpokenScript] = useState(segment.spokenScript);
  const [visualCue, setVisualCue] = useState(segment.visualCue);
  const [onScreenText, setOnScreenText] = useState(segment.onScreenText);
  const [soundEffect, setSoundEffect] = useState(segment.soundEffect);
  const [timecode, setTimecode] = useState(segment.timecode);

  const handleSave = () => {
    onUpdate({
      ...segment,
      spokenScript,
      visualCue,
      onScreenText,
      soundEffect,
      timecode,
    });
    setIsEditing(false);
  };

  const handlePlayAudio = () => {
    if (isPlaying) {
      speechPreviewer.stop();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      const started = speechPreviewer.speak(segment.spokenScript, 1.1, () => {
        setIsPlaying(false);
      });
      if (!started) {
        setIsPlaying(false);
      }
    }
  };

  const copyKeyword = (keyword: string) => {
    navigator.clipboard.writeText(keyword);
    setCopiedKeyword(keyword);
    setTimeout(() => setCopiedKeyword(null), 1500);
  };

  const isHookSegment = index === 0;

  return (
    <div
      className={`group relative rounded-xl border p-4 transition-all ${
        isActivePlayback
          ? 'border-amber-400 bg-amber-950/20 shadow-md ring-1 ring-amber-400/40'
          : isHookSegment
          ? 'border-amber-500/40 bg-zinc-900/90'
          : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700/80'
      }`}
    >
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/60 pb-3">
        <div className="flex items-center gap-2">
          {isHookSegment ? (
            <span className="text-xs font-bold text-amber-400">
              01. ⚡ THE HOOK (0-3s THUMB STOPPER)
            </span>
          ) : (
            <span className="text-xs font-semibold text-zinc-300">
              {(index + 1).toString().padStart(2, '0')}. Scene Segment
            </span>
          )}
          <span className="text-zinc-600" aria-hidden="true">·</span>
          {isEditing ? (
            <input
              type="text"
              value={timecode}
              onChange={(e) => setTimecode(e.target.value)}
              className="w-24 rounded border border-zinc-700 bg-zinc-950 px-2 py-0.5 text-xs text-amber-300"
            />
          ) : (
            <span className="font-mono text-xs text-amber-400/90">{segment.timecode}</span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {/* Audio read-aloud */}
          <button
            type="button"
            onClick={handlePlayAudio}
            className={`rounded-lg p-1.5 text-xs transition-colors ${
              isPlaying
                ? 'bg-amber-500 text-zinc-950'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
            }`}
            title="Read segment aloud"
          >
            {isPlaying ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>

          {/* Edit toggle */}
          {isEditing ? (
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-500"
            >
              <Save className="h-3 w-3" />
              <span>Save</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
              title="Edit segment"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Move Up/Down */}
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:opacity-20 transition-colors"
            title="Move Up"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === totalSegments - 1}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:opacity-20 transition-colors"
            title="Move Down"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>

          {/* Delete */}
          {totalSegments > 2 && (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-lg p-1 text-zinc-500 hover:bg-rose-950/60 hover:text-rose-400 transition-colors"
              title="Delete segment"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="mt-3 space-y-3">
        {/* Spoken Script */}
        <div>
          <label className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
            Spoken Script (Creator to Camera)
          </label>
          {isEditing ? (
            <textarea
              value={spokenScript}
              onChange={(e) => setSpokenScript(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 p-2 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
            />
          ) : (
            <p className="mt-1 text-sm font-medium leading-relaxed text-zinc-100">
              "{segment.spokenScript}"
            </p>
          )}
        </div>

        {/* Visual Scene & Editor Instructions Grid */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {/* Visual Scene Suggestion */}
          <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/50 p-2.5">
            <div className="flex items-center gap-1.5 text-xs text-blue-400 font-medium">
              <Video className="h-3.5 w-3.5" />
              <span>Visual Scene Cue (Camera & Actor)</span>
            </div>
            {isEditing ? (
              <textarea
                value={visualCue}
                onChange={(e) => setVisualCue(e.target.value)}
                rows={2}
                className="mt-1.5 w-full rounded border border-zinc-700 bg-zinc-900 p-1.5 text-xs text-zinc-200 focus:outline-none"
              />
            ) : (
              <p className="mt-1 text-xs text-zinc-300 leading-snug">
                {segment.visualCue}
              </p>
            )}
          </div>

          {/* On-Screen Text & SFX */}
          <div className="space-y-2">
            <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/50 p-2.5">
              <div className="flex items-center gap-1.5 text-xs text-amber-400 font-medium">
                <Type className="h-3.5 w-3.5" />
                <span>On-Screen Kinetic Caption</span>
              </div>
              {isEditing ? (
                <input
                  type="text"
                  value={onScreenText}
                  onChange={(e) => setOnScreenText(e.target.value)}
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 p-1 text-xs text-zinc-200 focus:outline-none"
                />
              ) : (
                <div className="mt-1 font-mono text-xs font-bold text-amber-300">
                  [{segment.onScreenText || 'Bold Highlight'}]
                </div>
              )}
            </div>

            <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/50 p-2.5">
              <div className="flex items-center gap-1.5 text-xs text-rose-400 font-medium">
                <Music className="h-3.5 w-3.5" />
                <span>Audio Cue / Sound Effect (SFX)</span>
              </div>
              {isEditing ? (
                <input
                  type="text"
                  value={soundEffect}
                  onChange={(e) => setSoundEffect(e.target.value)}
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 p-1 text-xs text-zinc-200 focus:outline-none"
                />
              ) : (
                <div className="mt-1 text-xs text-zinc-400">
                  {segment.soundEffect}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* B-Roll Search Tags */}
        {segment.bRollKeywords && segment.bRollKeywords.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
            <span className="text-[11px] text-zinc-500 flex items-center gap-1">
              <Tag className="h-3 w-3" /> Stock B-Roll tags:
            </span>
            {segment.bRollKeywords.map((tag, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => copyKeyword(tag)}
                className="flex items-center gap-1 rounded bg-zinc-800/90 px-2 py-0.5 text-[11px] text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                title="Click to copy search term"
              >
                <span>{tag}</span>
                {copiedKeyword === tag ? (
                  <Check className="h-2.5 w-2.5 text-emerald-400" />
                ) : (
                  <Copy className="h-2.5 w-2.5 text-zinc-500" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
