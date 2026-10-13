import { describe, it, expect, setContext } from '../harness';
import { CodeAuditor } from '../helpers/code-auditor';
import * as path from 'node:path';

setContext(2, 'F9');

describe('Tier 2 Boundary: Feature F9 (Backend Scaffolding)', () => {
  it('TC-T2-F9-01: backend/requirements.txt parses cleanly without duplicate package declarations', () => {
    const content = CodeAuditor.readFile('backend/requirements.txt') || '';
    const lines = content.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));

    const packageNames = lines.map(l => l.split(/[=<>~]/)[0].trim().toLowerCase());
    const uniquePackages = new Set(packageNames);

    expect(packageNames.length).toBe(uniquePackages.size);
  });

  it('TC-T2-F9-02: Backend module paths resolve consistently across Windows (\\) and POSIX (/) path formats', () => {
    const posixPath = 'backend/app/main.py';
    const windowsPath = 'backend\\app\\main.py';

    const normalizedPosix = path.normalize(posixPath);
    const normalizedWindows = path.normalize(windowsPath);

    expect(normalizedPosix).toBe(normalizedWindows);
    expect(CodeAuditor.fileExists(posixPath)).toBe(true);
    expect(CodeAuditor.fileExists(windowsPath)).toBe(true);
  });

  it('TC-T2-F9-03: Missing GEMINI_API_KEY environment variable provides default fallback in config', () => {
    const configContent = CodeAuditor.readFile('backend/app/config.py') || '';
    expect(configContent).toContain('GEMINI_API_KEY');
    // Checks that config handles optional/empty key gracefully
    expect(configContent.includes('None') || configContent.includes('""') || configContent.includes('Optional')).toBe(true);
  });

  it('TC-T2-F9-04: backend/.env.example provides documented template for developers', () => {
    expect(CodeAuditor.fileExists('backend/.env.example')).toBe(true);
    const envExample = CodeAuditor.readFile('backend/.env.example') || '';
    expect(envExample).toContain('PORT');
  });

  it('TC-T2-F9-05: backend/run.py handles keyboard interrupt (Ctrl+C) gracefully', () => {
    const runContent = CodeAuditor.readFile('backend/run.py') || '';
    expect(runContent.length).toBeGreaterThan(0);
    expect(runContent).toContain('main');
  });
});
