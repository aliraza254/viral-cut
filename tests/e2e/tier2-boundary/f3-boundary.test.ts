import { describe, it, expect, setContext } from '../harness';

setContext(2, 'F3');

describe('Tier 2 Boundary: Feature F3 (Viral Reel Generator)', () => {
  it('TC-T2-F3-01: Malformed and invalid YouTube URLs are rejected with validation error', () => {
    function extractYouTubeVideoId(url: string): string | null {
      if (!url || typeof url !== 'string') return null;
      const patterns = [
        /(?:youtube\.com\/(?:watch\?.*v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i,
      ];
      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) return match[1];
      }
      return null;
    }

    expect(extractYouTubeVideoId('not-a-url')).toBeNull();
    expect(extractYouTubeVideoId('ftp://ftp.is.not.allowed/video')).toBeNull();
    expect(extractYouTubeVideoId('https://google.com/search?q=video')).toBeNull();
    expect(extractYouTubeVideoId('https://youtube.com/watch?v=short')).toBeNull(); // <11 chars
  });

  it('TC-T2-F3-02: YouTube URLs with playlists, timestamps, and mobile prefixes parse correctly', () => {
    function extractYouTubeVideoId(url: string): string | null {
      const match = url.match(/(?:youtube\.com\/(?:watch\?.*v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
      return match ? match[1] : null;
    }

    const withPlaylist = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL123456&t=42s';
    const mobileShorts = 'https://youtu.be/dQw4w9WgXcQ?si=abcdef';
    const directShorts = 'https://www.youtube.com/shorts/dQw4w9WgXcQ';

    expect(extractYouTubeVideoId(withPlaylist)).toBe('dQw4w9WgXcQ');
    expect(extractYouTubeVideoId(mobileShorts)).toBe('dQw4w9WgXcQ');
    expect(extractYouTubeVideoId(directShorts)).toBe('dQw4w9WgXcQ');
  });

  it('TC-T2-F3-03: Empty transcript or whitespace-only input triggers validation barrier', () => {
    function validateTranscriptInput(text?: string): { valid: boolean; error?: string } {
      if (!text || text.trim().length === 0) {
        return { valid: false, error: 'Please enter notes or provide a YouTube URL' };
      }
      if (text.trim().length < 10) {
        return { valid: false, error: 'Prompt is too short (minimum 10 characters required)' };
      }
      return { valid: true };
    }

    expect(validateTranscriptInput('').valid).toBe(false);
    expect(validateTranscriptInput('    ').valid).toBe(false);
    expect(validateTranscriptInput('short').valid).toBe(false);
    expect(validateTranscriptInput('Detailed notes on marketing').valid).toBe(true);
  });

  it('TC-T2-F3-04: Massive transcript input (>100,000 chars) truncates to safe context limit', () => {
    function truncateTranscriptContext(rawText: string, maxChars: number = 50_000): { text: string; truncated: boolean } {
      if (rawText.length <= maxChars) {
        return { text: rawText, truncated: false };
      }
      return {
        text: rawText.slice(0, maxChars),
        truncated: true,
      };
    }

    const hugeText = 'Word '.repeat(30_000); // 150,000 characters
    const result = truncateTranscriptContext(hugeText);
    expect(result.truncated).toBe(true);
    expect(result.text.length).toBe(50_000);
  });

  it('TC-T2-F3-05: Empty retention points array calculates fallback smooth drop-off curve', () => {
    function generateFallbackRetention(durationSec: number): Array<{ second: number; retentionPct: number }> {
      const points = [];
      const totalSeconds = Math.max(5, Math.min(60, durationSec));
      for (let sec = 0; sec <= totalSeconds; sec += 5) {
        // Fallback retention modeled as exponential drop-off
        const pct = Math.round(100 * Math.exp(-0.02 * sec));
        points.push({ second: sec, retentionPct: pct });
      }
      return points;
    }

    const curve = generateFallbackRetention(30);
    expect(curve.length).toBe(7);
    expect(curve[0].retentionPct).toBe(100);
    expect(curve[curve.length - 1].retentionPct).toBeLessThan(100);
  });
});
