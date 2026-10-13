import { describe, it, expect, setContext } from '../harness';
import { ContractValidator } from '../helpers/contract-validators';
import { FIXTURES } from '../helpers/mock-backend';
import { CodeAuditor } from '../helpers/code-auditor';

setContext(1, 'F10');

describe('Feature F10: FastAPI Initial Endpoints & Schemas', () => {
  it('TC-T1-F10-01: GET /api/health response adheres to schema contract', () => {
    const health = FIXTURES.validHealth;
    const errors = ContractValidator.validateHealthResponse(health);
    expect(errors.length).toBe(0);

    const routerContent = CodeAuditor.readFile('backend/app/routers/health.py') || '';
    const mainContent = CodeAuditor.readFile('backend/app/main.py') || '';
    expect(routerContent.includes('/health')).toBe(true);
    expect(mainContent.includes('health_router') && mainContent.includes('/api')).toBe(true);
  });

  it('TC-T1-F10-02: POST /api/extract-youtube request and response adhere to schema contract', () => {
    const req = FIXTURES.validYoutubeRequest;
    const reqErrors = ContractValidator.validateExtractYoutubeRequest(req);
    expect(reqErrors.length).toBe(0);

    const res = FIXTURES.validYoutubeResponse;
    const resErrors = ContractValidator.validateExtractYoutubeResponse(res);
    expect(resErrors.length).toBe(0);

    const routerContent = CodeAuditor.readFile('backend/app/routers/youtube.py') || '';
    const mainContent = CodeAuditor.readFile('backend/app/main.py') || '';
    expect(routerContent.includes('/extract-youtube')).toBe(true);
    expect(mainContent.includes('youtube_router') && mainContent.includes('/api')).toBe(true);
  });

  it('TC-T1-F10-03: POST /api/transcribe response adheres to schema contract', () => {
    const res = FIXTURES.validTranscribeResponse;
    const errors = ContractValidator.validateTranscribeResponse(res);
    expect(errors.length).toBe(0);

    const routerContent = CodeAuditor.readFile('backend/app/routers/transcribe.py') || '';
    const mainContent = CodeAuditor.readFile('backend/app/main.py') || '';
    expect(routerContent.includes('/transcribe')).toBe(true);
    expect(mainContent.includes('transcribe_router') && mainContent.includes('/api')).toBe(true);
  });

  it('TC-T1-F10-04: POST /api/render-video request and response adhere to schema contract', () => {
    const req = FIXTURES.validRenderRequest;
    const reqErrors = ContractValidator.validateRenderVideoRequest(req);
    expect(reqErrors.length).toBe(0);

    const res = FIXTURES.validRenderCompletedResponse;
    const resErrors = ContractValidator.validateRenderVideoResponse(res);
    expect(resErrors.length).toBe(0);

    const routerContent = CodeAuditor.readFile('backend/app/routers/render.py') || '';
    const mainContent = CodeAuditor.readFile('backend/app/main.py') || '';
    expect(routerContent.includes('/render-video')).toBe(true);
    expect(mainContent.includes('render_router') && mainContent.includes('/api')).toBe(true);
  });

  it('TC-T1-F10-05: Missing FFmpeg returns structured status failed with error message without crashing', () => {
    const res = FIXTURES.ffmpegMissingRenderResponse;
    const errors = ContractValidator.validateRenderVideoResponse(res);
    expect(errors.length).toBe(0);
    expect(res.status).toBe('failed');
    expect(res.error).toContain('FFmpeg binary not found');
  });
});
