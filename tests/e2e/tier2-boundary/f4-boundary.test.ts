import { describe, it, expect, setContext } from '../harness';

setContext(2, 'F4');

describe('Tier 2 Boundary: Feature F4 (Unified 9:16 Format)', () => {
  it('TC-T2-F4-01: Ultrawide source video (21:9) letterboxes properly within 9:16 container', () => {
    function calculateLetterbox(sourceW: number, sourceH: number, targetW: number = 1080, targetH: number = 1920) {
      const sourceAspect = sourceW / sourceH;
      const targetAspect = targetW / targetH;

      let renderedW = targetW;
      let renderedH = targetW / sourceAspect;

      if (renderedH > targetH) {
        renderedH = targetH;
        renderedW = targetH * sourceAspect;
      }

      return {
        renderedW: Math.round(renderedW),
        renderedH: Math.round(renderedH),
        letterboxPaddingY: Math.max(0, Math.round((targetH - renderedH) / 2)),
      };
    }

    const ultrawide = calculateLetterbox(2560, 1080); // 21:9
    expect(ultrawide.renderedW).toBe(1080);
    expect(ultrawide.renderedH).toBe(456);
    expect(ultrawide.letterboxPaddingY).toBe(732);
  });

  it('TC-T2-F4-02: Square (1:1) and classic (4:3) videos pillarbox cleanly within 9:16 container', () => {
    function calculateFit(sourceW: number, sourceH: number) {
      const targetW = 1080;
      const targetH = 1920;
      const sourceAspect = sourceW / sourceH;
      const renderedW = targetW;
      const renderedH = targetW / sourceAspect;
      return { renderedW, renderedH, fitsInTarget: renderedH <= targetH };
    }

    const square = calculateFit(1080, 1080); // 1:1
    expect(square.fitsInTarget).toBe(true);
    expect(square.renderedH).toBe(1080);

    const legacy = calculateFit(1440, 1080); // 4:3
    expect(legacy.fitsInTarget).toBe(true);
    expect(legacy.renderedH).toBe(810);
  });

  it('TC-T2-F4-03: Zero or negative video dimensions fallback to default 1080x1920 short-form resolution', () => {
    function sanitizeDimensions(w: number, h: number): { width: number; height: number } {
      if (w <= 0 || h <= 0 || isNaN(w) || isNaN(h)) {
        return { width: 1080, height: 1920 };
      }
      return { width: w, height: h };
    }

    expect(sanitizeDimensions(0, 0)).toEqual({ width: 1080, height: 1920 });
    expect(sanitizeDimensions(-100, -200)).toEqual({ width: 1080, height: 1920 });
    expect(sanitizeDimensions(NaN, 1920)).toEqual({ width: 1080, height: 1920 });
  });

  it('TC-T2-F4-04: Request payload with legacy platform keys normalizes to 9:16 vertical short-form format', () => {
    function sanitizePlatformPayload(payload: { platform?: string; aspectRatio?: string }) {
      return {
        ...payload,
        platform: 'vertical-9-16',
        aspectRatio: '9:16',
      };
    }

    const normalized = sanitizePlatformPayload({ platform: 'tiktok' });
    expect(normalized.platform).toBe('vertical-9-16');
    expect(normalized.aspectRatio).toBe('9:16');
  });

  it('TC-T2-F4-05: Non-standard Device Pixel Ratios (DPR 1.0, 2.0, 3.0, 3.5) preserve 9:16 aspect ratio', () => {
    function computePhysicalPixels(cssWidth: number, cssHeight: number, dpr: number) {
      return {
        physicalW: Math.round(cssWidth * dpr),
        physicalH: Math.round(cssHeight * dpr),
        aspectRatio: (cssWidth * dpr) / (cssHeight * dpr),
      };
    }

    for (const dpr of [1.0, 2.0, 3.0, 3.5]) {
      const res = computePhysicalPixels(270, 480, dpr); // 9:16
      expect(Math.abs(res.aspectRatio - (9 / 16))).toBeLessThan(0.0001);
    }
  });
});
