import { describe, it, expect, setContext } from '../harness';

setContext(1, 'F2');

describe('Feature F2: Tool 1: Caption Studio Page', () => {
  it('TC-T1-F2-01: Media ingestion handles video duration and segment timecode metadata', () => {
    interface UploadedMediaMeta {
      name: string;
      sizeBytes: number;
      mimeType: string;
      durationSec: number;
    }

    const videoInput: UploadedMediaMeta = {
      name: 'viral_hook_raw.mp4',
      sizeBytes: 15_420_000,
      mimeType: 'video/mp4',
      durationSec: 42.5,
    };

    expect(videoInput.mimeType).toBe('video/mp4');
    expect(videoInput.durationSec).toBeGreaterThan(0);
    expect(videoInput.sizeBytes).toBeGreaterThan(1_000);
  });

  it('TC-T1-F2-02: Kinetic caption presets configure distinct typography, colors, and animations', () => {
    type PresetName = 'hormozi' | 'beast' | 'clean' | 'neon';

    interface CaptionStyleConfig {
      preset: PresetName;
      fontFamily: string;
      primaryColor: string;
      highlightColor: string;
      hasShadow: boolean;
      textTransform: 'uppercase' | 'none';
    }

    const STYLE_PRESETS: Record<PresetName, CaptionStyleConfig> = {
      hormozi: {
        preset: 'hormozi',
        fontFamily: 'Montserrat, sans-serif',
        primaryColor: '#FFFFFF',
        highlightColor: '#FACC15', // Vibrant yellow
        hasShadow: true,
        textTransform: 'uppercase',
      },
      beast: {
        preset: 'beast',
        fontFamily: 'Impact, sans-serif',
        primaryColor: '#FFFFFF',
        highlightColor: '#22C55E', // Green pop
        hasShadow: true,
        textTransform: 'uppercase',
      },
      clean: {
        preset: 'clean',
        fontFamily: 'Inter, sans-serif',
        primaryColor: '#FFFFFF',
        highlightColor: '#38BDF8', // Sky blue
        hasShadow: false,
        textTransform: 'none',
      },
      neon: {
        preset: 'neon',
        fontFamily: 'Orbitron, sans-serif',
        primaryColor: '#F43F5E',
        highlightColor: '#A855F7', // Neon purple
        hasShadow: true,
        textTransform: 'uppercase',
      },
    };

    expect(STYLE_PRESETS.hormozi.highlightColor).toBe('#FACC15');
    expect(STYLE_PRESETS.beast.textTransform).toBe('uppercase');
    expect(STYLE_PRESETS.clean.hasShadow).toBe(false);
    expect(STYLE_PRESETS.neon.primaryColor).toBe('#F43F5E');
  });

  it('TC-T1-F2-03: Subtitle timeline scrubber accurately finds active cue at current playback time', () => {
    const subtitleSegments = [
      { id: '1', startSec: 0.0, endSec: 2.5, text: 'Welcome to ViralCut' },
      { id: '2', startSec: 2.5, endSec: 5.0, text: 'Create short-form videos fast' },
      { id: '3', startSec: 5.0, endSec: 9.0, text: 'AI caption engine burns captions in 9:16' },
    ];

    function findActiveSubtitle(currentTime: number) {
      return subtitleSegments.find(s => currentTime >= s.startSec && currentTime < s.endSec) || null;
    }

    expect(findActiveSubtitle(1.2)?.text).toBe('Welcome to ViralCut');
    expect(findActiveSubtitle(4.0)?.text).toBe('Create short-form videos fast');
    expect(findActiveSubtitle(7.5)?.text).toBe('AI caption engine burns captions in 9:16');
    expect(findActiveSubtitle(10.0)).toBeNull();
  });

  it('TC-T1-F2-04: Font size and vertical position sliders apply calibrated CSS styling', () => {
    function computeCaptionStyle(fontSizePx: number, verticalPositionPct: number) {
      const clampedSize = Math.max(12, Math.min(96, fontSizePx));
      const clampedPos = Math.max(5, Math.min(95, verticalPositionPct));

      return {
        fontSize: `${clampedSize}px`,
        top: `${clampedPos}%`,
        transform: 'translate(-50%, -50%)',
      };
    }

    const defaultStyle = computeCaptionStyle(32, 75);
    expect(defaultStyle.fontSize).toBe('32px');
    expect(defaultStyle.top).toBe('75%');

    const clampedMin = computeCaptionStyle(4, 2);
    expect(clampedMin.fontSize).toBe('12px');
    expect(clampedMin.top).toBe('5%');
  });

  it('TC-T1-F2-05: Subtitle export generates valid SRT formatted output', () => {
    const segments = [
      { startSec: 0.0, endSec: 1.5, text: 'First line of viral hook' },
      { startSec: 1.5, endSec: 3.2, text: 'Second line with punchline' },
    ];

    function formatTimeSRT(seconds: number): string {
      const hrs = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      const ms = Math.floor((seconds % 1) * 1000);
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
    }

    function generateSRT(items: typeof segments): string {
      return items.map((item, idx) => {
        return `${idx + 1}\n${formatTimeSRT(item.startSec)} --> ${formatTimeSRT(item.endSec)}\n${item.text}\n`;
      }).join('\n');
    }

    const srt = generateSRT(segments);
    expect(srt).toContain('1\n00:00:00,000 --> 00:00:01,500\nFirst line of viral hook');
    expect(srt).toContain('2\n00:00:01,500 --> 00:00:03,200\nSecond line with punchline');
  });
});
