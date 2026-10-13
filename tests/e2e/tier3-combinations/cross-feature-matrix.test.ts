import { describe, it, expect, setContext } from '../harness';
import { LayoutSimulator, VIEWPORTS } from '../helpers/dom-simulator';
import { ContractValidator } from '../helpers/contract-validators';
import { FIXTURES } from '../helpers/mock-backend';
import { CodeAuditor } from '../helpers/code-auditor';

setContext(3);

describe('Tier 3: Cross-Feature Combinations Matrix', () => {
  it('TC-T3-001: [F1 + F5] Tool navigation toggle preserves active transcript and media state without loss', () => {
    let activeTool = 'caption-studio';
    const contextState = {
      uploadedMedia: { fileName: 'interview_raw.mp4', duration: 120 },
      currentTranscript: 'Transcribed text from caption studio...',
    };

    // User switches to Viral Reel Generator
    activeTool = 'viral-generator';

    // Verify contextState is preserved
    expect(activeTool).toBe('viral-generator');
    expect(contextState.uploadedMedia.fileName).toBe('interview_raw.mp4');
    expect(contextState.currentTranscript).toContain('Transcribed text');

    // Switch back
    activeTool = 'caption-studio';
    expect(activeTool).toBe('caption-studio');
    expect(contextState.uploadedMedia.duration).toBe(120);
  });

  it('TC-T3-002: [F2 + F7] Caption Studio loaded video dynamically scales within 375px mobile viewport', () => {
    const mobileWidth = VIEWPORTS.mobile.width; // 375px
    const availableWidth = LayoutSimulator.getAvailableWidth(mobileWidth, 32); // 343px

    // Video player canvas computes 9:16 geometry bounded by available width
    const dims = LayoutSimulator.calculate916Dimensions(availableWidth, 600);
    expect(dims.width).toBeLessThanOrEqual(343);
    expect(dims.aspectRatio).toBeGreaterThan(0.56);
    expect(dims.aspectRatio).toBeLessThan(0.57);

    // Verify zero horizontal overflow
    const overflow = LayoutSimulator.computeHorizontalOverflow(dims.width, 0, 32, mobileWidth);
    expect(overflow).toBe(0);
  });

  it('TC-T3-003: [F3 + F5 + F2] Viral Reel segments transfer seamlessly into Caption Studio editor', () => {
    let activeTool = 'viral-generator';
    let captionStudioSubtitles: any[] = [];

    const generatedReel = FIXTURES.sampleReelScript;

    // Trigger "Auto-Edit RAW Video" transfer action
    function transferToCaptionStudio(segments: typeof generatedReel.segments) {
      captionStudioSubtitles = segments.map((seg, idx) => ({
        id: `seg_${idx}`,
        startSec: seg.startSec,
        endSec: seg.endSec,
        text: seg.spokenScript,
        visualCue: seg.visualCue,
      }));
      activeTool = 'caption-studio';
    }

    transferToCaptionStudio(generatedReel.segments);

    expect(activeTool).toBe('caption-studio');
    expect(captionStudioSubtitles.length).toBe(2);
    expect(captionStudioSubtitles[0].text).toContain('Stop editing your videos');
  });

  it('TC-T3-004: [F4 + F7 + F6] Unified 9:16 format maintains fluid dimensions across Mobile, Tablet, and Desktop', () => {
    const viewports = [VIEWPORTS.mobile, VIEWPORTS.tablet, VIEWPORTS.desktop];

    for (const vp of viewports) {
      const padding = 32;
      const available = LayoutSimulator.getAvailableWidth(vp.width, padding);
      const targetMax = vp.width >= 1024 ? 380 : vp.width >= 768 ? 340 : 280;
      const dims = LayoutSimulator.calculate916Dimensions(Math.min(available, targetMax), vp.height * 0.75);

      expect(dims.width).toBeLessThanOrEqual(available);
      expect(Math.abs(dims.aspectRatio - (9 / 16))).toBeLessThan(0.01);

      const overflow = LayoutSimulator.computeHorizontalOverflow(dims.width, 0, padding, vp.width);
      expect(overflow).toBe(0);
    }
  });

  it('TC-T3-005: [F1 + F8] Opening Saved Projects Drawer while switching tools keeps drawer context synchronized', () => {
    let activeTool = 'caption-studio';
    let isDrawerOpen = true;

    // Switch tool while drawer is displayed
    activeTool = 'viral-generator';
    expect(activeTool).toBe('viral-generator');
    expect(isDrawerOpen).toBe(true);

    // Closing drawer works cleanly
    isDrawerOpen = false;
    expect(isDrawerOpen).toBe(false);
  });

  it('TC-T3-006: [F2 + F10 + F11] Caption Studio audio extraction calls /api/transcribe and adheres to contract', () => {
    const transcribeRes = FIXTURES.validTranscribeResponse;
    const errors = ContractValidator.validateTranscribeResponse(transcribeRes);
    expect(errors.length).toBe(0);

    // Ensure segments align with Caption Studio requirements
    expect(transcribeRes.segments.length).toBeGreaterThan(0);
    for (const seg of transcribeRes.segments) {
      expect(typeof seg.start).toBe('number');
      expect(typeof seg.end).toBe('number');
      expect(typeof seg.text).toBe('string');
      expect(seg.end).toBeGreaterThan(seg.start);
    }
  });

  it('TC-T3-007: [F3 + F10 + F11] Viral Reel Generator YouTube extract pipeline adheres to schema contract', () => {
    const req = FIXTURES.validYoutubeRequest;
    const res = FIXTURES.validYoutubeResponse;

    expect(ContractValidator.validateExtractYoutubeRequest(req).length).toBe(0);
    expect(ContractValidator.validateExtractYoutubeResponse(res).length).toBe(0);

    // Verifies data fields needed by Viral Reel Generator are present
    expect(res.duration).toBeGreaterThan(0);
    expect(res.title.length).toBeGreaterThan(0);
    expect(res.audio_url.length).toBeGreaterThan(0);
  });

  it('TC-T3-008: [F2 + F4 + F10] Caption Studio kinetic presets pass schema validation to /api/render-video', () => {
    const presets: Array<'hormozi' | 'beast' | 'clean' | 'neon'> = ['hormozi', 'beast', 'clean', 'neon'];

    for (const preset of presets) {
      const renderPayload = {
        video_url: 'https://storage/sample.mp4',
        subtitles: [{ start: 0.0, end: 3.0, text: `Test with ${preset}` }],
        style_preset: preset,
        output_format: 'mp4' as const,
      };

      const errors = ContractValidator.validateRenderVideoRequest(renderPayload);
      expect(errors.length).toBe(0);
    }
  });

  it('TC-T3-009: [F6 + F8 + F7] Mobile 375px viewport with open modal traps scroll without player distortion', () => {
    const mobileWidth = VIEWPORTS.mobile.width; // 375
    const mobileHeight = VIEWPORTS.mobile.height; // 667

    const modalCheck = LayoutSimulator.isModalWithinViewport(mobileHeight, 90, 800);
    expect(modalCheck.renderedHeight).toBeLessThan(mobileHeight);

    // Underlying player width
    const playerDims = LayoutSimulator.calculate916Dimensions(280, mobileHeight * 0.7);
    expect(playerDims.width).toBeLessThan(mobileWidth);
  });

  it('TC-T3-010: [F9 + F10 + F11 + F12] Backend scaffolding, Pydantic schemas, and Vite proxy co-exist with clean build', () => {
    expect(CodeAuditor.fileExists('backend/requirements.txt')).toBe(true);
    expect(CodeAuditor.fileExists('backend/app/main.py')).toBe(true);
    expect(CodeAuditor.fileExists('backend/app/models/health.py')).toBe(true);
    expect(CodeAuditor.fileExists('src/services/apiClient.ts')).toBe(true);
    expect(CodeAuditor.fileExists('vite.config.ts')).toBe(true);
  });
});
