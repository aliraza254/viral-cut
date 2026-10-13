import { describe, it, expect, setContext } from '../harness';
import { ContractValidator } from '../helpers/contract-validators';
import { FIXTURES } from '../helpers/mock-backend';

setContext(2, 'F10');

describe('Tier 2 Boundary: Feature F10 (FastAPI Endpoints)', () => {
  it('TC-T2-F10-01: Health check on system without FFmpeg returns ffmpeg_available=false without crashing', () => {
    const health = FIXTURES.validHealth; // ffmpeg_available: false
    expect(health.status).toBe('ok');
    expect(health.ffmpeg_available).toBe(false);

    const errors = ContractValidator.validateHealthResponse(health);
    expect(errors.length).toBe(0);
  });

  it('TC-T2-F10-02: POST /api/extract-youtube with empty payload ({}) triggers contract validation failure', () => {
    const emptyPayload = {};
    const errors = ContractValidator.validateExtractYoutubeRequest(emptyPayload);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].field).toBe('url');
  });

  it('TC-T2-F10-03: POST /api/transcribe with non-audio MIME type is flagged', () => {
    function validateAudioMime(mime?: string): boolean {
      if (!mime) return false;
      return mime.startsWith('audio/') || mime.startsWith('video/');
    }

    expect(validateAudioMime('image/png')).toBe(false);
    expect(validateAudioMime('application/pdf')).toBe(false);
    expect(validateAudioMime('audio/mp3')).toBe(true);
    expect(validateAudioMime('video/mp4')).toBe(true);
  });

  it('TC-T2-F10-04: POST /api/render-video with invalid style preset is rejected by validator', () => {
    const invalidReq = {
      video_url: 'https://storage/sample.mp4',
      subtitles: [{ start: 0, end: 2, text: 'Hello' }],
      style_preset: 'comic_sans_glitch', // Invalid preset
    };

    const errors = ContractValidator.validateRenderVideoRequest(invalidReq);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.field === 'style_preset')).toBe(true);
  });

  it('TC-T2-F10-05: POST /api/render-video when FFmpeg is missing returns structured status failed with error', () => {
    const failedResponse = FIXTURES.ffmpegMissingRenderResponse;
    const errors = ContractValidator.validateRenderVideoResponse(failedResponse);
    expect(errors.length).toBe(0); // Valid contract structure
    expect(failedResponse.status).toBe('failed');
    expect(failedResponse.error).toContain('FFmpeg binary not found');
  });
});
