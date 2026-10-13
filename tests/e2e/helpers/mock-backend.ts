/**
 * Mock Backend Data Fixtures and Simulated Service Engine
 * Provides compliant and adversarial test payloads for end-to-end verification.
 */

export const FIXTURES = {
  validHealth: {
    status: 'ok',
    version: '1.0.0',
    ffmpeg_available: false, // Windows host without ffmpeg
    python_version: '3.14.4',
  },

  validHealthWithFfmpeg: {
    status: 'ok',
    version: '1.0.0',
    ffmpeg_available: true,
    python_version: '3.14.4',
  },

  validYoutubeRequest: {
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    preferred_quality: '1080p',
  },

  validYoutubeResponse: {
    video_id: 'dQw4w9WgXcQ',
    title: 'Never Gonna Give You Up (Official Music Video)',
    duration: 212,
    audio_url: 'https://stream.provider/audio/dQw4w9WgXcQ.mp3',
    video_url: 'https://stream.provider/video/dQw4w9WgXcQ.mp4',
  },

  validTranscribeResponse: {
    transcript: 'We know the game and we are going to play it. Never gonna give you up.',
    language: 'en',
    segments: [
      { start: 0.0, end: 3.5, text: 'We know the game' },
      { start: 3.5, end: 7.2, text: 'and we are going to play it.' },
      { start: 7.2, end: 11.0, text: 'Never gonna give you up.' },
    ],
  },

  validRenderRequest: {
    video_url: 'https://storage.googleapis.com/viralcut/raw/sample_01.mp4',
    subtitles: [
      { start: 0.0, end: 2.5, text: 'THIS HOOK WILL BLOW YOUR MIND' },
      { start: 2.5, end: 5.0, text: 'Watch until the very end' },
    ],
    style_preset: 'beast' as const,
    output_format: 'mp4' as const,
  },

  validRenderPendingResponse: {
    task_id: 'render_task_98765',
    status: 'pending' as const,
  },

  validRenderCompletedResponse: {
    task_id: 'render_task_98765',
    status: 'completed' as const,
    output_url: 'https://storage.googleapis.com/viralcut/rendered/out_98765.mp4',
  },

  ffmpegMissingRenderResponse: {
    task_id: 'render_task_failed',
    status: 'failed' as const,
    error: 'FFmpeg binary not found on PATH. Video burning disabled in this environment.',
  },

  sampleReelScript: {
    id: 'reel_concept_01',
    title: 'The Psychological Secret of Viral Retention',
    hookType: 'Contrarian Question',
    startingPunchline: 'Stop editing your videos like a 2018 YouTuber.',
    closingPunchline: 'Comment "VIRAL" and I will send you the full breakdown.',
    estimatedDuration: '45s',
    viralityScore: 94,
    whyItWillBlowUp: [
      'Subverts common editing assumption in first 1.5 seconds',
      'Rapid kinetic pacing aligns with TikTok & Reels algorithms',
      'High open-loop retention curve',
    ],
    soundBiteQuote: 'If your hook is boring, your content is invisible.',
    hashtags: ['#contentcreator', '#viralvideo', '#videoediting', '#growthhack'],
    segments: [
      {
        timecode: '00:00 - 00:03',
        startSec: 0,
        endSec: 3,
        spokenScript: 'Stop editing your videos like a 2018 YouTuber.',
        visualCue: 'Fast zoom-in on face with red warning overlay',
        onScreenText: 'STOP DOING THIS ❌',
        soundEffect: 'whoosh_bass_drop',
        bRollKeywords: ['camera timeline', 'boring cut'],
      },
      {
        timecode: '00:03 - 00:08',
        startSec: 3,
        endSec: 8,
        spokenScript: 'Here is what top 1% creators actually do in their first three seconds.',
        visualCue: 'Split screen comparison: slow vs fast hook retention',
        onScreenText: 'TOP 1% SECRET 🔑',
        soundEffect: 'camera_shutter_click',
        bRollKeywords: ['analytics spike', 'viral graph'],
      },
    ],
    retentionGraph: [
      { second: 0, retentionPct: 100 },
      { second: 1, retentionPct: 98 },
      { second: 2, retentionPct: 94 },
      { second: 3, retentionPct: 91 },
      { second: 5, retentionPct: 88 },
      { second: 8, retentionPct: 84 },
    ],
  },
};
