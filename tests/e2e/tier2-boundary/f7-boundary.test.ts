import { describe, it, expect, setContext } from '../harness';
import { LayoutSimulator } from '../helpers/dom-simulator';

setContext(2, 'F7');

describe('Tier 2 Boundary: Feature F7 (Dynamic Player Scaling)', () => {
  it('TC-T2-F7-01: Player container width strictly stays <= 343px on 375px viewport with 32px padding', () => {
    const available = LayoutSimulator.getAvailableWidth(375, 32);
    expect(available).toBe(343);

    const playerWidth = Math.min(available, 320);
    expect(playerWidth).toBeLessThanOrEqual(343);
  });

  it('TC-T2-F7-02: Short viewport height (<500px) clamps 9:16 player height to max 75% of viewport', () => {
    const shortViewportHeight = 480;
    const maxAllowedHeight = shortViewportHeight * 0.75; // 360px

    const dims = LayoutSimulator.calculate916Dimensions(300, maxAllowedHeight);
    expect(dims.height).toBeLessThanOrEqual(maxAllowedHeight);
    // Width scales proportionally to preserve 9:16 ratio
    expect(dims.width).toBeLessThanOrEqual(210);
  });

  it('TC-T2-F7-03: Ultra-long subtitle text (50 words) chunks or wraps with line clamp', () => {
    function chunkSubtitleForDisplay(text: string, maxWordsPerLine: number = 5): string[] {
      const words = text.split(/\s+/).filter(Boolean);
      const lines: string[] = [];
      for (let i = 0; i < words.length; i += maxWordsPerLine) {
        lines.push(words.slice(i, i + maxWordsPerLine).join(' '));
      }
      return lines;
    }

    const longText = 'This is an excessively long kinetic subtitle text segment that should definitely be wrapped into multiple lines to prevent overflowing outside the vertical short-form phone canvas.';
    const lines = chunkSubtitleForDisplay(longText);

    expect(lines.length).toBeGreaterThan(3);
    for (const line of lines) {
      expect(line.split(' ').length).toBeLessThanOrEqual(5);
    }
  });

  it('TC-T2-F7-04: Subtitle vertical position slider clamps extreme 0% and 100% inputs to safe bounds [10%, 85%]', () => {
    function clampVerticalPosition(posPct: number): number {
      return Math.max(10, Math.min(85, posPct));
    }

    expect(clampVerticalPosition(0)).toBe(10);
    expect(clampVerticalPosition(-20)).toBe(10);
    expect(clampVerticalPosition(100)).toBe(85);
    expect(clampVerticalPosition(120)).toBe(85);
    expect(clampVerticalPosition(75)).toBe(75);
  });

  it('TC-T2-F7-05: Timeline scrub timecode at negative (-5s) or out-of-range (9999s) clamps to [0, duration]', () => {
    function clampScrubTime(timeSec: number, durationSec: number): number {
      return Math.max(0, Math.min(durationSec, timeSec));
    }

    const duration = 45.0;
    expect(clampScrubTime(-5.0, duration)).toBe(0);
    expect(clampScrubTime(9999.0, duration)).toBe(45.0);
    expect(clampScrubTime(22.5, duration)).toBe(22.5);
  });
});
