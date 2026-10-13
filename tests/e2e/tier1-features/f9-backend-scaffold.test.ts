import { describe, it, expect, setContext } from '../harness';
import { CodeAuditor } from '../helpers/code-auditor';

setContext(1, 'F9');

describe('Feature F9: Python/FastAPI Backend Directory', () => {
  it('TC-T1-F9-01: backend/requirements.txt exists and contains mandated core dependencies', () => {
    expect(CodeAuditor.fileExists('backend/requirements.txt')).toBe(true);

    const required = ['fastapi', 'uvicorn', 'yt-dlp', 'ffmpeg-python', 'google-genai'];
    const result = CodeAuditor.verifyPythonRequirements(required);

    expect(result.missing.length).toBe(0);
    expect(result.found).toContain('fastapi');
    expect(result.found).toContain('uvicorn');
    expect(result.found).toContain('yt-dlp');
    expect(result.found).toContain('ffmpeg-python');
    expect(result.found).toContain('google-genai');
  });

  it('TC-T1-F9-02: backend/app contains modular entry points (main.py, config.py, models, routers, services)', () => {
    expect(CodeAuditor.fileExists('backend/app/main.py')).toBe(true);
    expect(CodeAuditor.fileExists('backend/app/config.py')).toBe(true);
    expect(CodeAuditor.fileExists('backend/app/models/__init__.py')).toBe(true);
    expect(CodeAuditor.fileExists('backend/app/routers/__init__.py')).toBe(true);
    expect(CodeAuditor.fileExists('backend/app/services/__init__.py')).toBe(true);
  });

  it('TC-T1-F9-03: backend/.gitignore includes virtual environment and cache patterns', () => {
    expect(CodeAuditor.fileExists('backend/.gitignore')).toBe(true);
    const content = CodeAuditor.readFile('backend/.gitignore') || '';

    expect(content.includes('__pycache__') || content.includes('*.pyc')).toBe(true);
    expect(content.includes('.venv') || content.includes('venv')).toBe(true);
  });

  it('TC-T1-F9-04: Root .gitignore includes Python cache patterns', () => {
    const rootGitignore = CodeAuditor.readFile('.gitignore') || '';
    expect(rootGitignore.length).toBeGreaterThan(0);
    // Root or backend gitignore must cover pycache
    const hasPycacheExclusion = rootGitignore.includes('pycache') || (CodeAuditor.readFile('backend/.gitignore') || '').includes('pycache');
    expect(hasPycacheExclusion).toBe(true);
  });

  it('TC-T1-F9-05: backend/run.py exists and configures uvicorn server execution', () => {
    expect(CodeAuditor.fileExists('backend/run.py')).toBe(true);
    const runContent = CodeAuditor.readFile('backend/run.py') || '';
    expect(runContent).toContain('uvicorn');
    expect(runContent).toContain('app.main:app');
  });
});
