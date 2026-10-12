export interface Segment {
  timecode: string;
  startSec: number;
  endSec: number;
  spokenScript: string;
  visualCue: string;
  onScreenText: string;
  soundEffect: string;
  bRollKeywords?: string[];
  musicMood?: string;
}

export interface RetentionPoint {
  second: number;
  retentionPct: number;
}

export interface ReelScript {
  id: string;
  title: string;
  hookType: string;
  startingPunchline: string;
  closingPunchline: string;
  estimatedDuration: string;
  viralityScore: number;
  whyItWillBlowUp: string[];
  soundBiteQuote: string;
  hashtags: string[];
  segments: Segment[];
  retentionGraph: RetentionPoint[];
}

export interface HookVariation {
  type: string;
  spokenLine: string;
  onScreenText: string;
  visualCue: string;
  predictedRetentionImpact?: string;
}

export interface PerformanceLog {
  id: string;
  date: string;
  platform: 'tiktok' | 'reels' | 'shorts';
  title: string;
  hookType: string;
  views: number;
  retentionPct: number; // e.g., 68%
  shares: number;
  comments: number;
  notes?: string;
}

export interface ViralStrategyProfile {
  topHookInsights: string;
  dropOffAnalysis: string;
  directives: string[];
  optimalDuration: string;
  pacingRecommendation?: string;
  updatedPromptWeighting: string;
}

export interface SavedProject {
  id: string;
  userId?: string;
  title: string;
  date: string;
  videoUrl?: string;
  platform: string;
  language?: 'english' | 'roman-urdu';
  reels: ReelScript[];
  selectedReelIndex: number;
}

export interface SubtitleWord {
  word: string;
  startSec: number;
  endSec: number;
}

export interface VideoSubtitleSegment {
  id: string;
  startSec: number;
  endSec: number;
  timecode: string;
  text: string;
  words?: SubtitleWord[];
  onScreenText?: string;
  visualCue?: string;
  soundEffect?: string;
}

export interface ExtractedSubtitlesResult {
  detectedLanguage: string;
  durationSec: number;
  summary: string;
  suggestedTitle: string;
  fullTranscript: string;
  subtitles: VideoSubtitleSegment[];
}
