import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  FlipHorizontal,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Music2,
  Repeat,
  Sparkles,
} from 'lucide-react';
import { ReelScript, Segment } from '../types';
import { speechPreviewer } from '../utils/audio';

interface MobileReelSimulatorProps {
  reel: ReelScript;
  platform: 'tiktok' | 'reels' | 'shorts';
  language?: 'english' | 'roman-urdu';
  onActiveSegmentChange?: (index: number) => void;
}

export const MobileReelSimulator: React.FC<MobileReelSimulatorProps> = ({
  reel,
  platform,
  language = 'english',
  onActiveSegmentChange,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef(false);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.1);
  const [isLooping, setIsLooping] = useState(false);
  const [isTeleprompterFullscreen, setIsTeleprompterFullscreen] = useState(false);
  const [isMirrorMode, setIsMirrorMode] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const totalDuration = reel.segments.reduce((acc, s) => Math.max(acc, s.endSec), 45);

  const currentSegment: Segment | undefined = reel.segments[currentSegmentIndex] || reel.segments[0];

  // Split words for dynamic kinetic subtitle highlighting
  const spokenWords = currentSegment ? currentSegment.spokenScript.split(' ') : [];

  // Handle Play / Pause
  const togglePlay = () => {
    if (isPlaying) {
      pausePlayback();
    } else {
      startPlayback();
    }
  };

  const startPlayback = () => {
    isPlayingRef.current = true;
    setIsPlaying(true);
    playSegmentAudio(currentSegmentIndex);
  };

  const clearAllTimers = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  };

  const pausePlayback = () => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    speechPreviewer.stop();
    clearAllTimers();
  };

  const resetPlayback = () => {
    pausePlayback();
    setCurrentSegmentIndex(0);
    setCurrentWordIndex(0);
    setElapsedSec(0);
  };

  const playSegmentAudio = (segIndex: number) => {
    if (!isPlayingRef.current) return;

    if (segIndex >= reel.segments.length) {
      if (isLooping && isPlayingRef.current) {
        // Seamless loop
        setCurrentSegmentIndex(0);
        setCurrentWordIndex(0);
        setElapsedSec(0);
        playSegmentAudio(0);
      } else {
        pausePlayback();
      }
      return;
    }

    const seg = reel.segments[segIndex];
    if (onActiveSegmentChange) {
      onActiveSegmentChange(segIndex);
    }

    // Approximate word tick
    const words = seg.spokenScript.split(' ');
    const segDurationSec = Math.max(1, seg.endSec - seg.startSec);
    const msPerWord = (segDurationSec * 1000) / Math.max(1, words.length);

    let wIdx = 0;
    setCurrentWordIndex(0);
    clearAllTimers();

    timerRef.current = setInterval(() => {
      if (!isPlayingRef.current) {
        clearAllTimers();
        return;
      }
      wIdx++;
      if (wIdx < words.length) {
        setCurrentWordIndex(wIdx);
      }
      setElapsedSec((prev) => Math.min(totalDuration, prev + msPerWord / 1000));
    }, msPerWord);

    if (!isAudioMuted) {
      const started = speechPreviewer.speak(
        seg.spokenScript,
        playbackSpeed,
        () => {
          clearAllTimers();
          if (!isPlayingRef.current) return;
          const nextIndex = segIndex + 1;
          if (nextIndex < reel.segments.length) {
            setCurrentSegmentIndex(nextIndex);
            playSegmentAudio(nextIndex);
          } else if (isLooping && isPlayingRef.current) {
            setCurrentSegmentIndex(0);
            playSegmentAudio(0);
          } else {
            pausePlayback();
          }
        },
        (charIndex) => {
          if (!isPlayingRef.current) return;
          const textUpToChar = seg.spokenScript.substring(0, charIndex);
          const wordsCount = textUpToChar.trim().split(/\s+/).length;
          setCurrentWordIndex(Math.min(words.length - 1, wordsCount));
        },
        language
      );

      if (!started) {
        fallbackTimerRef.current = setTimeout(() => {
          clearAllTimers();
          if (!isPlayingRef.current) return;
          const nextIndex = segIndex + 1;
          if (nextIndex < reel.segments.length) {
            setCurrentSegmentIndex(nextIndex);
            playSegmentAudio(nextIndex);
          } else if (isLooping && isPlayingRef.current) {
            setCurrentSegmentIndex(0);
            playSegmentAudio(0);
          } else {
            pausePlayback();
          }
        }, segDurationSec * 1000);
      }
    } else {
      fallbackTimerRef.current = setTimeout(() => {
        clearAllTimers();
        if (!isPlayingRef.current) return;
        const nextIndex = segIndex + 1;
        if (nextIndex < reel.segments.length) {
          setCurrentSegmentIndex(nextIndex);
          playSegmentAudio(nextIndex);
        } else if (isLooping && isPlayingRef.current) {
          setCurrentSegmentIndex(0);
          playSegmentAudio(0);
        } else {
          pausePlayback();
        }
      }, segDurationSec * 1000);
    }
  };

  useEffect(() => {
    pausePlayback();
    setCurrentSegmentIndex(0);
    setCurrentWordIndex(0);
    setElapsedSec(0);
    return () => {
      pausePlayback();
    };
  }, [reel.id]);

  const progressPercent = Math.min(100, (elapsedSec / Math.max(1, totalDuration)) * 100);

  return (
    <div className="flex flex-col items-center">
      {/* Simulator Control Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900/90 p-2.5">
        <div className="flex items-center gap-1.5">
          <button
            onClick={togglePlay}
            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              isPlaying
                ? 'bg-amber-500 text-zinc-950'
                : 'bg-zinc-800 text-white hover:bg-zinc-700'
            }`}
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            <span>{isPlaying ? 'Pause' : 'Play Sim'}</span>
          </button>

          <button
            onClick={resetPlayback}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
            title="Restart from Hook"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => setIsLooping(!isLooping)}
            className={`rounded-lg p-1.5 text-xs transition-colors ${
              isLooping ? 'text-amber-400 bg-zinc-800' : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title={isLooping ? 'Infinite Loop Active' : 'Loop Off'}
          >
            <Repeat className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Mute Audio */}
          <button
            onClick={() => {
              const newMuted = !isAudioMuted;
              setIsAudioMuted(newMuted);
              if (newMuted) speechPreviewer.stop();
            }}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
            title={isAudioMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isAudioMuted ? <VolumeX className="h-3.5 w-3.5 text-rose-400" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>

          {/* Speed */}
          <select
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
            className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-[11px] font-medium text-zinc-300 focus:outline-none"
          >
            <option value="1.0">1.0x</option>
            <option value="1.1">1.1x</option>
            <option value="1.25">1.25x</option>
            <option value="1.4">1.4x (Punchy)</option>
          </select>

          {/* Fullscreen Teleprompter toggle */}
          <button
            onClick={() => setIsTeleprompterFullscreen(!isTeleprompterFullscreen)}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
            title="Fullscreen Recording Prompter"
          >
            {isTeleprompterFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* 9:16 Mobile Phone Frame */}
      <div
        className={`relative flex flex-col justify-between overflow-hidden rounded-[40px] border-4 border-zinc-700 bg-zinc-950 shadow-2xl transition-all ${
          isTeleprompterFullscreen
            ? 'fixed inset-0 z-50 rounded-none border-none max-w-none'
            : 'h-[640px] w-[340px]'
        } ${isMirrorMode ? 'scale-x-[-1]' : ''}`}
      >
        {/* Notch / Speaker bar */}
        {!isTeleprompterFullscreen && (
          <div className="absolute top-2.5 left-1/2 z-30 h-4 w-28 -translate-x-1/2 rounded-full bg-zinc-800/90" />
        )}

        {/* Dynamic Visual Scene Background Layer */}
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black">
          {/* Ambient visual cue banner */}
          <div className="absolute inset-0 opacity-25">
            <div className="h-full w-full bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />
          </div>

          {/* Dynamic Scene Card Indicator at Top */}
          <div className="absolute top-10 inset-x-4 z-10 rounded-xl border border-zinc-800/80 bg-zinc-900/80 p-2.5 backdrop-blur-md">
            <div className="flex items-center justify-between text-[10px] text-zinc-400">
              <span className="font-semibold text-amber-400 flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Scene {currentSegmentIndex + 1}/{reel.segments.length}
              </span>
              <span className="font-mono text-zinc-300">{currentSegment?.timecode}</span>
            </div>
            <p className="mt-1 text-[11px] font-medium leading-tight text-zinc-200">
              {currentSegment?.visualCue}
            </p>
          </div>
        </div>

        {/* Top Overlay Bar */}
        <div className="relative z-20 mt-14 flex items-center justify-between px-4 text-xs font-medium text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold tracking-wider text-[11px] uppercase">
              {platform}
            </span>
            <span className="text-zinc-600" aria-hidden="true">·</span>
            <span className="text-[11px] text-zinc-400">
              Score: <strong className="text-amber-400">{reel.viralityScore}%</strong>
            </span>
          </div>

          {/* Teleprompter Mirror Toggle */}
          {isTeleprompterFullscreen && (
            <button
              onClick={() => setIsMirrorMode(!isMirrorMode)}
              className="flex items-center gap-1 rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-200"
            >
              <FlipHorizontal className="h-3 w-3" />
              <span>Mirror</span>
            </button>
          )}
        </div>

        {/* CENTER: Kinetic Subtitles / Teleprompter Display */}
        <div className="relative z-20 flex flex-1 flex-col items-center justify-center px-5 text-center">
          {/* Bold On-Screen Headline Sticker */}
          {currentSegment?.onScreenText && (
            <div className="mb-4 inline-block transform -rotate-1 rounded-lg bg-amber-400 px-3 py-1 font-black uppercase tracking-tight text-zinc-950 shadow-lg text-sm sm:text-base animate-pulse">
              {currentSegment.onScreenText}
            </div>
          )}

          {/* Spoken Text Kinetic Teleprompter */}
          <div className="space-y-2">
            <p className="text-lg font-black leading-snug tracking-tight text-white drop-shadow-md sm:text-xl">
              {spokenWords.map((word, wIdx) => {
                const isCurrent = wIdx === currentWordIndex;
                const isPast = wIdx < currentWordIndex;
                return (
                  <span
                    key={wIdx}
                    className={`inline-block mx-0.5 transition-all ${
                      isCurrent
                        ? 'text-amber-400 scale-110 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                        : isPast
                        ? 'text-white'
                        : 'text-zinc-500'
                    }`}
                  >
                    {word}
                  </span>
                );
              })}
            </p>

            {/* Sound Effect Notice */}
            {currentSegment?.soundEffect && (
              <div className="mt-2 text-[11px] text-rose-400 font-mono">
                🔊 SFX: {currentSegment.soundEffect}
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM: Mobile Social Overlay UI & Timeline */}
        <div className="relative z-20 space-y-3 pb-4">
          <div className="flex items-end justify-between px-4">
            {/* Creator Caption Info */}
            <div className="max-w-[210px] space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-amber-500 to-rose-500" />
                <span className="text-xs font-bold text-white">@viralcreator</span>
                <span className="text-[10px] font-semibold text-rose-400">Follow</span>
              </div>
              <p className="text-[11px] leading-tight text-zinc-200 line-clamp-2">
                {reel.startingPunchline}
              </p>
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                <Music2 className="h-3 w-3 animate-spin text-zinc-400" />
                <span className="truncate">{currentSegment?.musicMood || 'Original Viral Audio'}</span>
              </div>
            </div>

            {/* Right Action Icons (TikTok/Reels style) */}
            <div className="flex flex-col items-center gap-3 text-white">
              <button className="flex flex-col items-center gap-0.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800/80 backdrop-blur-sm">
                  <Heart className="h-4 w-4 text-rose-500 fill-rose-500" />
                </div>
                <span className="text-[10px] font-semibold">124K</span>
              </button>

              <button className="flex flex-col items-center gap-0.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800/80 backdrop-blur-sm">
                  <MessageCircle className="h-4 w-4 text-white" />
                </div>
                <span className="text-[10px] font-semibold">1.8K</span>
              </button>

              <button className="flex flex-col items-center gap-0.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800/80 backdrop-blur-sm">
                  <Bookmark className="h-4 w-4 text-amber-400 fill-amber-400" />
                </div>
                <span className="text-[10px] font-semibold">34K</span>
              </button>

              <button className="flex flex-col items-center gap-0.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800/80 backdrop-blur-sm">
                  <Share2 className="h-4 w-4 text-white" />
                </div>
                <span className="text-[10px] font-semibold">Share</span>
              </button>
            </div>
          </div>

          {/* Timeline scrub bar */}
          <div className="px-4">
            <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-rose-500 transition-all duration-100"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-zinc-500 font-mono">
              <span>{Math.round(elapsedSec)}s</span>
              <span>{totalDuration}s</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
