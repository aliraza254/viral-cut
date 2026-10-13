import { describe, it, expect, setContext } from '../harness';
import { CodeAuditor } from '../helpers/code-auditor';

setContext(1, 'F11');

describe('Feature F11: Vite Dev Proxy & API Client', () => {
  it('TC-T1-F11-01: vite.config.ts configures dev proxy or api handler for /api routes', () => {
    const proxyAudit = CodeAuditor.verifyViteProxyConfig();
    expect(proxyAudit.configured).toBe(true);
  });

  it('TC-T1-F11-02: src/services/apiClient.ts exists and exports required API client methods', () => {
    expect(CodeAuditor.fileExists('src/services/apiClient.ts')).toBe(true);
    const content = CodeAuditor.readFile('src/services/apiClient.ts') || '';

    expect(content).toContain('checkHealth');
    expect(content).toContain('extractYoutube');
    expect(content).toContain('transcribeAudio');
    expect(content).toContain('renderVideo');
  });

  it('TC-T1-F11-03: apiClient defines structured error handling for backend unavailable states', () => {
    const content = CodeAuditor.readFile('src/services/apiClient.ts') || '';
    expect(content).toContain('backend service unavailable');
  });

  it('TC-T1-F11-04: apiClient configures standard Content-Type application/json headers', () => {
    const content = CodeAuditor.readFile('src/services/apiClient.ts') || '';
    expect(content).toContain("'Content-Type': 'application/json'");
  });

  it('TC-T1-F11-05: apiClient supports configurable base URL via environment variable', () => {
    const content = CodeAuditor.readFile('src/services/apiClient.ts') || '';
    expect(content).toContain('VITE_API_BASE_URL');
  });
});
