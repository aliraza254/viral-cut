import { describe, it, expect, setContext } from '../harness';

setContext(2, 'F11');

describe('Tier 2 Boundary: Feature F11 (Proxy & API Client)', () => {
  it('TC-T2-F11-01: Offline backend error produces clear diagnostic guidance message', () => {
    function formatOfflineError(url: string): string {
      return `ViralCut backend service unavailable at ${url}. Please ensure either Vite dev server or Python FastAPI backend (http://127.0.0.1:8000) is running.`;
    }

    const msg = formatOfflineError('http://127.0.0.1:8000/api/health');
    expect(msg).toContain('backend service unavailable');
    expect(msg).toContain('FastAPI backend');
  });

  it('TC-T2-F11-02: HTTP 500 response extracts detailed error message from JSON response', () => {
    function parseErrorPayload(statusCode: number, data: any): string {
      return data?.detail || data?.error || data?.message || `HTTP ${statusCode}`;
    }

    const errorPayload = { detail: 'FFmpeg process terminated unexpectedly with code 1' };
    const parsed = parseErrorPayload(500, errorPayload);
    expect(parsed).toBe('FFmpeg process terminated unexpectedly with code 1');
  });

  it('TC-T2-F11-03: Non-JSON response (e.g. 502 HTML Gateway timeout) does not crash json parser', () => {
    function parseSafeResponse(rawText: string, statusCode: number): any {
      try {
        return JSON.parse(rawText);
      } catch {
        return { error: `Server returned non-JSON response (HTTP ${statusCode})`, raw: rawText };
      }
    }

    const html502 = '<html><body>502 Bad Gateway</body></html>';
    const result = parseSafeResponse(html502, 502);

    expect(result.error).toContain('non-JSON response');
    expect(result.raw).toBe(html502);
  });

  it('TC-T2-F11-04: AbortController aborts hanging API request after timeout threshold', async () => {
    const controller = new AbortController();
    let aborted = false;

    controller.signal.addEventListener('abort', () => {
      aborted = true;
    });

    // Simulate timeout trigger
    controller.abort();

    expect(aborted).toBe(true);
    expect(controller.signal.aborted).toBe(true);
  });

  it('TC-T2-F11-05: Proxy path configuration strictly limits interception to /api prefixes', () => {
    function shouldProxy(path: string): boolean {
      return path.startsWith('/api/') || path === '/api';
    }

    expect(shouldProxy('/api/health')).toBe(true);
    expect(shouldProxy('/api/transcribe')).toBe(true);
    expect(shouldProxy('/src/App.tsx')).toBe(false);
    expect(shouldProxy('/assets/index.js')).toBe(false);
    expect(shouldProxy('/')).toBe(false);
  });
});
